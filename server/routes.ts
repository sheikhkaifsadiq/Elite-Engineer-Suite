import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertVideoSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";

const VALID_PLATFORMS = ["instagram", "tiktok", "youtube", "twitter", "facebook", "linkedin"] as const;

const connectAccountSchema = z.object({
  platform: z.enum(VALID_PLATFORMS),
  platformEmail: z.string().email("Valid email is required"),
  platformPassword: z.string().min(1, "Password is required"),
  platformUsername: z.string().min(1, "Username is required").max(100),
  platformDisplayName: z.string().max(100).optional(),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
});

const createExportSchema = z.object({
  clipId: z.string().min(1),
  platform: z.enum(VALID_PLATFORMS),
});

const generateSEOSchema = z.object({
  clipId: z.string().min(1),
  platform: z.enum(VALID_PLATFORMS),
});
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [".mp4", ".mov", ".mkv", ".avi", ".webm"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only MP4, MOV, MKV, AVI, and WebM files are allowed."));
    }
  },
});

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, error: "Authentication required", code: 401 });
  }
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  if (!fs.existsSync("uploads")) fs.mkdirSync("uploads", { recursive: true });

  app.post("/api/v1/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.errors[0].message, code: 400 });
      }
      const { email, username, password } = parsed.data;

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ success: false, error: "Email already registered", code: 409 });
      }
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ success: false, error: "Username already taken", code: 409 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ email, username, password: hashedPassword });

      req.session!.userId = user.id;
      res.json({ success: true, data: { id: user.id, email: user.email, username: user.username, plan: user.plan }, message: "Registration successful" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "Registration failed", code: 500 });
    }
  });

  app.post("/api/v1/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Invalid email or password format", code: 400 });
      }
      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, error: "Invalid email or password", code: 401 });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ success: false, error: "Invalid email or password", code: 401 });
      }
      req.session!.userId = user.id;
      res.json({ success: true, data: { id: user.id, email: user.email, username: user.username, plan: user.plan, videoCount: user.videoCount }, message: "Login successful" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "Login failed", code: 500 });
    }
  });

  app.post("/api/v1/auth/logout", (req, res) => {
    req.session!.destroy((err) => {
      if (err) return res.status(500).json({ success: false, error: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  app.get("/api/v1/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, error: "Not authenticated", code: 401 });
    }
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session!.destroy(() => {});
        return res.status(401).json({ success: false, error: "User not found", code: 401 });
      }
      res.json({ success: true, data: { id: user.id, email: user.email, username: user.username, plan: user.plan, videoCount: user.videoCount } });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch user", code: 500 });
    }
  });

  app.post("/api/v1/videos/upload", requireAuth as any, upload.single("video"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No video file provided", code: 400 });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(401).json({ success: false, error: "Unauthorized", code: 401 });

      if (user.plan === "free" && user.videoCount >= 3) {
        fs.unlink(req.file.path, () => {});
        return res.status(403).json({ success: false, error: "Free plan limit reached. Upgrade to Pro for unlimited uploads.", code: 403 });
      }

      const title = (req.body.title as string) || path.basename(req.file.originalname, path.extname(req.file.originalname));
      const video = await storage.createVideo({
        userId: req.session.userId,
        title,
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        filePath: req.file.path,
        status: "pending",
      });

      await storage.incrementVideoCount(req.session.userId);

      const job = await storage.createJob({
        videoId: video.id,
        status: "pending",
        progress: 0,
        currentStep: "Waiting for worker",
        retryCount: 0,
      });

      res.json({ success: true, data: { video, job }, message: "Video uploaded successfully" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "Upload failed: " + err.message, code: 500 });
    }
  });

  app.get("/api/v1/videos/list", requireAuth as any, async (req: any, res) => {
    try {
      const videoList = await storage.getVideosByUser(req.session.userId);
      const videosWithJobs = await Promise.all(videoList.map(async (video) => {
        const job = await storage.getJobByVideo(video.id);
        const clipCount = (await storage.getClipsByVideo(video.id)).length;
        return { ...video, job, clipCount };
      }));
      res.json({ success: true, data: videosWithJobs });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch videos", code: 500 });
    }
  });

  app.get("/api/v1/videos/:id", requireAuth as any, async (req: any, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Video not found", code: 404 });
      }
      const job = await storage.getJobByVideo(video.id);
      const clipList = await storage.getClipsByVideo(video.id);
      res.json({ success: true, data: { ...video, job, clips: clipList } });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch video", code: 500 });
    }
  });

  app.delete("/api/v1/videos/:id", requireAuth as any, async (req: any, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Video not found", code: 404 });
      }
      await storage.deleteVideo(req.params.id);
      res.json({ success: true, message: "Video deleted" });
    } catch {
      res.status(500).json({ success: false, error: "Failed to delete video", code: 500 });
    }
  });

  app.post("/api/v1/videos/:id/process", requireAuth as any, async (req: any, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Video not found", code: 404 });
      }
      const existingJob = await storage.getJobByVideo(video.id);
      if (existingJob && (existingJob.status === "pending" || existingJob.status === "processing")) {
        return res.status(409).json({ success: false, error: "Video is already being processed", code: 409 });
      }

      const job = await storage.createJob({
        videoId: video.id,
        status: "pending",
        progress: 0,
        currentStep: "Queued for processing",
        retryCount: 0,
      });
      await storage.updateVideo(video.id, { status: "pending" });
      res.json({ success: true, data: job, message: "Processing started" });
    } catch {
      res.status(500).json({ success: false, error: "Failed to start processing", code: 500 });
    }
  });

  app.get("/api/v1/videos/:id/clips", requireAuth as any, async (req: any, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Video not found", code: 404 });
      }
      const clipList = await storage.getClipsByVideo(req.params.id);
      res.json({ success: true, data: clipList });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch clips", code: 500 });
    }
  });

  app.get("/api/v1/clips/:id", requireAuth as any, async (req: any, res) => {
    try {
      const clip = await storage.getClip(req.params.id);
      if (!clip) return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      const video = await storage.getVideo(clip.videoId);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      }
      res.json({ success: true, data: clip });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch clip", code: 500 });
    }
  });

  app.patch("/api/v1/clips/:id", requireAuth as any, async (req: any, res) => {
    try {
      const clip = await storage.getClip(req.params.id);
      if (!clip) return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      const video = await storage.getVideo(clip.videoId);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      }
      const { title, description, startTime, endTime } = req.body;
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (startTime !== undefined) updates.startTime = startTime;
      if (endTime !== undefined) {
        updates.endTime = endTime;
        if (startTime !== undefined) updates.duration = endTime - startTime;
        else updates.duration = endTime - clip.startTime;
      }
      const updated = await storage.updateClip(req.params.id, updates);
      res.json({ success: true, data: updated });
    } catch {
      res.status(500).json({ success: false, error: "Failed to update clip", code: 500 });
    }
  });

  app.delete("/api/v1/clips/:id", requireAuth as any, async (req: any, res) => {
    try {
      const clip = await storage.getClip(req.params.id);
      if (!clip) return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      const video = await storage.getVideo(clip.videoId);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      }
      await storage.deleteClip(req.params.id);
      res.json({ success: true, message: "Clip deleted" });
    } catch {
      res.status(500).json({ success: false, error: "Failed to delete clip", code: 500 });
    }
  });

  app.get("/api/v1/jobs/:id", requireAuth as any, async (req: any, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ success: false, error: "Job not found", code: 404 });
      const video = await storage.getVideo(job.videoId);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Job not found", code: 404 });
      }
      res.json({ success: true, data: job });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch job", code: 500 });
    }
  });

  app.get("/api/v1/jobs/user/all", requireAuth as any, async (req: any, res) => {
    try {
      const jobList = await storage.getJobsByUser(req.session.userId);
      res.json({ success: true, data: jobList });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch jobs", code: 500 });
    }
  });

  app.get("/api/v1/accounts/connected", requireAuth as any, async (req: any, res) => {
    try {
      const accounts = await storage.getConnectedAccounts(req.session.userId);
      res.json({ success: true, data: accounts });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch connected accounts", code: 500 });
    }
  });

  app.post("/api/v1/accounts/connect", requireAuth as any, async (req: any, res) => {
    try {
      const parsed = connectAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.errors[0].message, code: 400 });
      }
      const { platform, platformEmail, platformUsername, platformDisplayName, permissions } = parsed.data;

      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(401).json({ success: false, error: "User not found", code: 401 });

      const originalUsername = platformUsername;
      const cliporaUsername = generateCliporaUsername(platformUsername, platform);
      const cliporaPageUrl = `https://${platform === "twitter" ? "x" : platform}.com/clipora`;
      const cliporaBio = `Powered by Clipora.ai | Short-form content creator | ${cliporaPageUrl}`;

      const existing = await storage.getConnectedAccountByPlatform(req.session.userId, platform);
      if (existing) {
        const updated = await storage.updateConnectedAccount(existing.id, {
          platformUsername: cliporaUsername,
          platformDisplayName: platformDisplayName || cliporaUsername,
          platformEmail,
          connected: true,
          authorized: true,
          permissions,
          originalUsername,
          originalBio: `${platformDisplayName || platformUsername}'s profile`,
          modifiedUsername: cliporaUsername,
          modifiedBio: cliporaBio,
          profileModified: true,
          accessToken: `sim_${platform}_${Date.now()}`,
          refreshToken: `sim_rf_${platform}_${Date.now()}`,
        });
        return res.json({
          success: true,
          data: updated,
          profileChanges: {
            username: { from: originalUsername, to: cliporaUsername },
            bio: { from: `${platformDisplayName || platformUsername}'s profile`, to: cliporaBio },
            avatar: { changed: true, to: "Clipora.ai logo" },
          },
          message: `${platform} account reconnected and profile updated`,
        });
      }

      const account = await storage.createConnectedAccount({
        userId: req.session.userId,
        platform,
        platformUsername: cliporaUsername,
        platformDisplayName: platformDisplayName || cliporaUsername,
        platformEmail,
        connected: true,
        authorized: true,
        permissions,
        originalUsername,
        originalBio: `${platformDisplayName || platformUsername}'s profile`,
        modifiedUsername: cliporaUsername,
        modifiedBio: cliporaBio,
        profileModified: true,
        accessToken: `sim_${platform}_${Date.now()}`,
        refreshToken: `sim_rf_${platform}_${Date.now()}`,
      });

      res.json({
        success: true,
        data: account,
        profileChanges: {
          username: { from: originalUsername, to: cliporaUsername },
          bio: { from: `${platformDisplayName || platformUsername}'s profile`, to: cliporaBio },
          avatar: { changed: true, to: "Clipora.ai logo" },
        },
        message: `${platform} account connected with ${permissions.length} permissions granted and profile updated`,
      });
    } catch {
      res.status(500).json({ success: false, error: "Failed to connect account", code: 500 });
    }
  });

  app.delete("/api/v1/accounts/:id", requireAuth as any, async (req: any, res) => {
    try {
      const account = await storage.getConnectedAccount(req.params.id);
      if (!account || account.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Account not found", code: 404 });
      }
      await storage.deleteConnectedAccount(req.params.id);
      res.json({ success: true, message: "Account disconnected" });
    } catch {
      res.status(500).json({ success: false, error: "Failed to disconnect account", code: 500 });
    }
  });

  app.post("/api/v1/exports/create", requireAuth as any, async (req: any, res) => {
    try {
      const parsed = createExportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.errors[0].message, code: 400 });
      }
      const { clipId, platform } = parsed.data;

      const clip = await storage.getClip(clipId);
      if (!clip) return res.status(404).json({ success: false, error: "Clip not found", code: 404 });

      const video = await storage.getVideo(clip.videoId);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      }

      const connectedAccount = await storage.getConnectedAccountByPlatform(req.session.userId, platform);
      if (!connectedAccount || !connectedAccount.connected || !connectedAccount.authorized) {
        return res.status(400).json({ success: false, error: `No authorized ${platform} account found. Please connect your account with full permissions first.`, code: 400 });
      }

      const seoData = generateSEOContent(clip.title, clip.description || "", clip.transcriptSegment || "", platform, clip.hashtags || []);

      const exportRecord = await storage.createExport({
        clipId,
        userId: req.session.userId,
        platform,
        seoTitle: seoData.title,
        seoDescription: seoData.description,
        seoHashtags: seoData.hashtags,
        status: "pending",
      });

      setTimeout(async () => {
        try {
          await storage.updateExport(exportRecord.id, {
            status: "published",
            platformPostUrl: `https://${platform}.com/p/${exportRecord.id.slice(0, 8)}`,
          });
        } catch (err) {
          await storage.updateExport(exportRecord.id, {
            status: "failed",
            errorLog: "Simulated export error",
          });
        }
      }, 3000);

      res.json({ success: true, data: { ...exportRecord, seo: seoData }, message: `Export to ${platform} started` });
    } catch {
      res.status(500).json({ success: false, error: "Failed to create export", code: 500 });
    }
  });

  app.get("/api/v1/exports/clip/:clipId", requireAuth as any, async (req: any, res) => {
    try {
      const clip = await storage.getClip(req.params.clipId);
      if (!clip) return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      const video = await storage.getVideo(clip.videoId);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      }
      const exportList = await storage.getExportsByClip(req.params.clipId);
      res.json({ success: true, data: exportList });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch exports", code: 500 });
    }
  });

  app.get("/api/v1/exports/user", requireAuth as any, async (req: any, res) => {
    try {
      const exportList = await storage.getExportsByUser(req.session.userId);
      res.json({ success: true, data: exportList });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch exports", code: 500 });
    }
  });

  app.post("/api/v1/exports/generate-seo", requireAuth as any, async (req: any, res) => {
    try {
      const parsed = generateSEOSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.errors[0].message, code: 400 });
      }
      const { clipId, platform } = parsed.data;
      const clip = await storage.getClip(clipId);
      if (!clip) return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      const video = await storage.getVideo(clip.videoId);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      }

      const seo = generateSEOContent(clip.title, clip.description || "", clip.transcriptSegment || "", platform, clip.hashtags || []);
      res.json({ success: true, data: seo });
    } catch {
      res.status(500).json({ success: false, error: "Failed to generate SEO content", code: 500 });
    }
  });

  app.get("/api/v1/clips/:id/download", requireAuth as any, async (req: any, res) => {
    try {
      const clip = await storage.getClip(req.params.id);
      if (!clip) return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      const video = await storage.getVideo(clip.videoId);
      if (!video || video.userId !== req.session.userId) {
        return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      }
      if (clip.clipFilePath && fs.existsSync(clip.clipFilePath)) {
        const filename = clip.filename || `clip_${clip.id}.mp4`;
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "video/mp4");
        return fs.createReadStream(clip.clipFilePath).pipe(res);
      }
      return res.status(404).json({ success: false, error: "Clip file not yet generated or unavailable", code: 404 });
    } catch {
      res.status(500).json({ success: false, error: "Failed to download clip", code: 500 });
    }
  });

  app.get("/api/v1/clips/:id/thumbnail", async (req: any, res) => {
    try {
      const clip = await storage.getClip(req.params.id);
      if (!clip) return res.status(404).json({ success: false, error: "Clip not found", code: 404 });
      if (clip.thumbnailPath && fs.existsSync(clip.thumbnailPath)) {
        res.setHeader("Content-Type", "image/jpeg");
        return fs.createReadStream(clip.thumbnailPath).pipe(res);
      }
      return res.status(404).json({ success: false, error: "Thumbnail not available", code: 404 });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch thumbnail", code: 500 });
    }
  });

  app.get("/api/v1/videos/:id/thumbnail", async (req: any, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) return res.status(404).json({ success: false, error: "Video not found", code: 404 });
      if (video.thumbnailUrl && fs.existsSync(video.thumbnailUrl)) {
        res.setHeader("Content-Type", "image/jpeg");
        return fs.createReadStream(video.thumbnailUrl).pipe(res);
      }
      return res.status(404).json({ success: false, error: "Thumbnail not available", code: 404 });
    } catch {
      res.status(500).json({ success: false, error: "Failed to fetch thumbnail", code: 500 });
    }
  });

  return httpServer;
}

function generateCliporaUsername(originalUsername: string, platform: string): string {
  const clean = originalUsername.replace(/^@/, "").replace(/\s+/g, "").toLowerCase();
  const variations = [
    `${clean}.clipora`,
    `${clean}_clipora`,
    `${clean}clipora`,
  ];
  return variations[0];
}

function generateSEOContent(title: string, description: string, transcript: string, platform: string, existingHashtags: string[]) {
  const platformConfigs: Record<string, { maxTitle: number; maxDesc: number; hashtagCount: number; style: string }> = {
    instagram: { maxTitle: 60, maxDesc: 2200, hashtagCount: 15, style: "engaging and visual" },
    tiktok: { maxTitle: 80, maxDesc: 300, hashtagCount: 8, style: "trendy and catchy" },
    youtube: { maxTitle: 100, maxDesc: 5000, hashtagCount: 10, style: "SEO-optimized and searchable" },
    twitter: { maxTitle: 50, maxDesc: 280, hashtagCount: 5, style: "concise and impactful" },
    facebook: { maxTitle: 80, maxDesc: 1000, hashtagCount: 5, style: "engaging and shareable" },
    linkedin: { maxTitle: 80, maxDesc: 700, hashtagCount: 5, style: "professional and insightful" },
  };

  const config = platformConfigs[platform] || platformConfigs.instagram;

  const seoTitleOptions: Record<string, string[]> = {
    instagram: [
      `This will blow your mind - ${title}`,
      `You need to see this: ${title}`,
      `Wait for it... ${title}`,
    ],
    tiktok: [
      `POV: ${title} hits different`,
      `No one talks about this - ${title}`,
      `This changed everything: ${title}`,
    ],
    youtube: [
      `${title} - The Complete Breakdown`,
      `Why ${title} Changes Everything`,
      `${title} Explained in Under 60 Seconds`,
    ],
    twitter: [
      `Thread: ${title}`,
      `Hot take: ${title}`,
      `${title} - here's why it matters`,
    ],
    facebook: [
      `Have you seen this? ${title}`,
      `${title} - Share if you agree`,
      `Mind-blowing: ${title}`,
    ],
    linkedin: [
      `Key Insight: ${title}`,
      `${title} - A Perspective Worth Sharing`,
      `Lessons from: ${title}`,
    ],
  };

  const titleOptions = seoTitleOptions[platform] || seoTitleOptions.instagram;
  const seoTitle = titleOptions[Math.floor(Math.random() * titleOptions.length)].slice(0, config.maxTitle);

  const descParts = [
    description || transcript.slice(0, 100),
    `\n\nGenerated by Clipora.ai - AI Video Repurposing`,
  ];
  const seoDescription = descParts.join("").slice(0, config.maxDesc);

  const platformHashtags: Record<string, string[]> = {
    instagram: ["#reels", "#viral", "#trending", "#explorepage", "#fyp", "#contentcreator", "#instagood"],
    tiktok: ["#fyp", "#foryoupage", "#viral", "#trending", "#tiktokviral", "#foryou"],
    youtube: ["#shorts", "#youtubeShorts", "#viral", "#trending", "#subscribe"],
    twitter: ["#trending", "#viral", "#mustwatch", "#content"],
    facebook: ["#viral", "#trending", "#sharethis", "#amazing"],
    linkedin: ["#professional", "#insights", "#leadership", "#growth"],
  };

  const baseHashtags = platformHashtags[platform] || platformHashtags.instagram;
  const combined = [...new Set([...existingHashtags, ...baseHashtags])];
  const seoHashtags = combined.slice(0, config.hashtagCount);

  return { title: seoTitle, description: seoDescription, hashtags: seoHashtags, platform, config };
}
