import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertVideoSchema } from "@shared/schema";
import bcrypt from "bcrypt";
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

  return httpServer;
}
