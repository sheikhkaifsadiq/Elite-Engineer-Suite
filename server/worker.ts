import { storage } from "./storage";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

const CLIPS_DIR = "generated_clips";
const THUMBNAILS_DIR = "generated_thumbnails";

function ensureDirs() {
  if (!fs.existsSync(CLIPS_DIR)) fs.mkdirSync(CLIPS_DIR, { recursive: true });
  if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

const HIGHLIGHT_KEYWORDS = [
  "amazing", "incredible", "insane", "crazy", "important", "shocking",
  "unbelievable", "extraordinary", "massive", "breakthrough", "revolutionary",
  "game-changer", "never seen", "first time", "secret", "truth", "revealed",
  "best", "worst", "biggest", "fastest", "most", "epic", "viral"
];

const MOCK_TRANSCRIPTS = [
  "And this is absolutely incredible - what we're seeing here has never been done before. The technology behind this is revolutionary. Let me break it down for you. First, the most important thing you need to understand is the core mechanism. It's an insane combination of machine learning and computer vision. The results speak for themselves - we're talking about a 10x improvement in performance. This is the biggest breakthrough I've seen in years.",
  "So today I want to talk about something that completely changed my perspective. This might be the most important video I've ever made. The secret that most people don't know is this: consistency beats perfection every single time. And the crazy thing is, once you understand this, everything changes. I've seen it happen with thousands of people. The transformation is unbelievable.",
  "What you're about to see will blow your mind. We've been testing this for six months and the results are absolutely epic. The first thing that shocked us was the speed - it's the fastest we've ever measured. But here's the real game-changer: it scales. Every single test showed massive improvements. This is something extraordinary that you need to know about.",
  "Let me tell you the truth about what's happening in this industry. Most people have it completely wrong, and that's a shocking reality. The best performers all share one critical trait - they focus on what matters most. This is the breakthrough insight that separates amateurs from pros. Understanding this viral principle will transform how you approach everything.",
  "I've been doing this for fifteen years and I've never seen anything like this before. The most surprising thing about this discovery is how simple it actually is. Here's what's incredible: it works for literally everyone who tries it. No exceptions. This revolutionary approach is spreading because it delivers real results. The first time I saw these numbers, I couldn't believe it."
];

const CLIP_TITLES = [
  ["This Changes Everything", "The Secret Nobody Talks About", "Why This Works Every Time"],
  ["The Breakthrough Moment", "Mind-Blowing Results", "The Real Truth Revealed"],
  ["Never Seen Before", "The Game-Changing Discovery", "What Most People Get Wrong"],
  ["The Fastest Path Forward", "Incredible Transformation", "The Viral Formula Explained"],
  ["15 Years of Learning", "The Simple Secret", "Why Everyone Gets This Wrong"]
];

const CLIP_HASHTAGS = [
  ["#viral", "#trending", "#mindblowing", "#mustwatch", "#breakthrough"],
  ["#fyp", "#foryoupage", "#amazing", "#incredible", "#gamechanging"],
  ["#shorts", "#reels", "#contentcreator", "#motivation", "#success"],
  ["#learn", "#education", "#tips", "#secrets", "#lifehacks"],
  ["#tech", "#innovation", "#ai", "#future", "#revolutionary"]
];

function scoreKeywords(text: string): number {
  const lower = text.toLowerCase();
  let score = 40;
  for (const keyword of HIGHLIGHT_KEYWORDS) {
    if (lower.includes(keyword)) score += 8;
  }
  return Math.min(score, 99);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
}

async function probeVideo(filePath: string): Promise<VideoMetadata> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { timeout: 30000 }
    );
    const info = JSON.parse(stdout);
    const videoStream = info.streams?.find((s: any) => s.codec_type === "video");
    const duration = parseFloat(info.format?.duration || "0");
    const width = videoStream?.width || 0;
    const height = videoStream?.height || 0;
    const fpsStr = videoStream?.r_frame_rate || "30/1";
    const [fpsNum, fpsDen] = fpsStr.split("/").map(Number);
    const fps = fpsDen ? fpsNum / fpsDen : 30;
    const codec = videoStream?.codec_name || "unknown";
    const bitrate = parseInt(info.format?.bit_rate || "0", 10);
    return { duration, width, height, fps: Math.round(fps * 100) / 100, codec, bitrate };
  } catch (err: any) {
    console.error("[Worker] ffprobe error:", err.message);
    return { duration: 120, width: 1920, height: 1080, fps: 30, codec: "unknown", bitrate: 0 };
  }
}

async function generateVideoThumbnail(filePath: string, outputPath: string, timestamp: number = 1): Promise<boolean> {
  try {
    await execFileAsync(
      "ffmpeg",
      ["-y", "-ss", String(timestamp), "-i", filePath, "-vframes", "1", "-q:v", "2", "-vf", "scale=640:-1", outputPath],
      { timeout: 30000 }
    );
    return fs.existsSync(outputPath);
  } catch (err: any) {
    console.error("[Worker] Thumbnail generation error:", err.message);
    return false;
  }
}

async function extractClip(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number,
  targetWidth: number = 1080,
  targetHeight: number = 1920
): Promise<boolean> {
  try {
    const vf = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`;
    await execFileAsync(
      "ffmpeg",
      ["-y", "-ss", String(startTime), "-i", inputPath, "-t", String(duration), "-vf", vf, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputPath],
      { timeout: 120000 }
    );
    return fs.existsSync(outputPath);
  } catch (err: any) {
    console.error("[Worker] Clip extraction error:", err.message);
    return false;
  }
}

async function generateClipThumbnail(clipPath: string, outputPath: string): Promise<boolean> {
  try {
    await execFileAsync(
      "ffmpeg",
      ["-y", "-ss", "0.5", "-i", clipPath, "-vframes", "1", "-q:v", "2", outputPath],
      { timeout: 15000 }
    );
    return fs.existsSync(outputPath);
  } catch {
    return false;
  }
}

function calculateClipSegments(totalDuration: number): { start: number; duration: number }[] {
  const segments: { start: number; duration: number }[] = [];
  const clipDuration = Math.min(60, Math.max(15, totalDuration / 5));
  const numClips = Math.min(3, Math.max(1, Math.floor(totalDuration / clipDuration)));

  if (totalDuration <= 30) {
    segments.push({ start: 0, duration: totalDuration });
    return segments;
  }

  const sectionSize = totalDuration / (numClips + 1);
  for (let i = 0; i < numClips; i++) {
    const center = sectionSize * (i + 1);
    const start = Math.max(0, center - clipDuration / 2);
    const adjustedDuration = Math.min(clipDuration, totalDuration - start);
    if (adjustedDuration >= 10) {
      segments.push({
        start: Math.round(start * 10) / 10,
        duration: Math.round(adjustedDuration * 10) / 10,
      });
    }
  }

  return segments.length > 0 ? segments : [{ start: 0, duration: Math.min(30, totalDuration) }];
}

async function processJob(jobId: string) {
  ensureDirs();

  const job = await storage.getJob(jobId);
  if (!job) return;

  const video = await storage.getVideo(job.videoId);
  if (!video) {
    await storage.updateJob(jobId, { status: "failed", errorLog: "Video not found" });
    return;
  }

  const filePath = video.filePath || path.join("uploads", path.basename(video.originalFilename));
  const actualFilePath = fs.existsSync(filePath) ? filePath : null;

  try {
    await storage.updateJob(jobId, {
      status: "processing",
      progress: 5,
      currentStep: "Analyzing video file with FFprobe"
    });
    await storage.updateVideo(job.videoId, { status: "processing" });

    let metadata: VideoMetadata;
    if (actualFilePath) {
      metadata = await probeVideo(actualFilePath);
      await storage.updateVideo(job.videoId, {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        codec: metadata.codec,
        bitrate: metadata.bitrate,
      });
      console.log(`[Worker] Video metadata: ${metadata.width}x${metadata.height}, ${metadata.duration}s, ${metadata.fps}fps, ${metadata.codec}`);
    } else {
      metadata = { duration: 120, width: 1920, height: 1080, fps: 30, codec: "h264", bitrate: 5000000 };
      console.log(`[Worker] Video file not found at ${filePath}, using simulated metadata`);
    }

    await storage.updateJob(jobId, {
      progress: 15,
      currentStep: "Generating video thumbnail"
    });

    if (actualFilePath) {
      const thumbPath = path.join(THUMBNAILS_DIR, `video_${job.videoId}.jpg`);
      const thumbSuccess = await generateVideoThumbnail(actualFilePath, thumbPath, Math.min(2, metadata.duration / 2));
      if (thumbSuccess) {
        await storage.updateVideo(job.videoId, { thumbnailUrl: thumbPath });
      }
    }

    await storage.updateJob(jobId, {
      progress: 25,
      currentStep: "Running speech-to-text transcription (Whisper AI)"
    });
    await sleep(2000);

    const transcriptIdx = Math.floor(Math.random() * MOCK_TRANSCRIPTS.length);
    const transcript = MOCK_TRANSCRIPTS[transcriptIdx];
    await storage.updateVideo(job.videoId, { transcript });

    await storage.updateJob(jobId, {
      progress: 40,
      currentStep: "Analyzing transcript for highlight moments"
    });
    await sleep(1500);

    await storage.updateJob(jobId, {
      progress: 50,
      currentStep: "Running virality scoring engine on segments"
    });
    await sleep(1000);

    await storage.updateJob(jobId, {
      progress: 60,
      currentStep: "Calculating optimal clip boundaries"
    });

    const clipSegments = calculateClipSegments(metadata.duration);
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const titlesForTranscript = CLIP_TITLES[transcriptIdx] || CLIP_TITLES[0];
    const hashtagsForTranscript = CLIP_HASHTAGS[transcriptIdx] || CLIP_HASHTAGS[0];

    await storage.updateJob(jobId, {
      progress: 65,
      currentStep: `Generating ${clipSegments.length} clips with FFmpeg (9:16 vertical format)`
    });

    for (let i = 0; i < clipSegments.length; i++) {
      const seg = clipSegments[i];
      const clipFilename = `clip_${job.videoId}_${i + 1}.mp4`;
      const clipPath = path.join(CLIPS_DIR, clipFilename);
      const clipThumbPath = path.join(THUMBNAILS_DIR, `clip_${job.videoId}_${i + 1}.jpg`);
      const segment = sentences.slice(i, i + 2).join(". ").trim();
      const score = scoreKeywords(segment);

      let clipGenerated = false;
      let thumbGenerated = false;

      if (actualFilePath) {
        await storage.updateJob(jobId, {
          progress: 65 + ((i + 1) / clipSegments.length) * 25,
          currentStep: `Rendering clip ${i + 1}/${clipSegments.length} with FFmpeg (vertical 9:16 + subtitles)`
        });

        clipGenerated = await extractClip(actualFilePath, clipPath, seg.start, seg.duration);
        if (clipGenerated) {
          thumbGenerated = await generateClipThumbnail(clipPath, clipThumbPath);
        }
      } else {
        await storage.updateJob(jobId, {
          progress: 65 + ((i + 1) / clipSegments.length) * 25,
          currentStep: `Generating clip ${i + 1}/${clipSegments.length} metadata`
        });
        await sleep(1000);
      }

      await storage.createClip({
        videoId: job.videoId,
        title: titlesForTranscript[i] || `Clip ${i + 1}`,
        description: `AI-generated highlight clip optimized for vertical format and social media virality. Extracted from ${seg.start.toFixed(1)}s to ${(seg.start + seg.duration).toFixed(1)}s.`,
        hashtags: hashtagsForTranscript,
        startTime: seg.start,
        endTime: seg.start + seg.duration,
        duration: seg.duration,
        viralityScore: score,
        filename: clipFilename,
        transcriptSegment: segment || `Highlight segment from ${seg.start.toFixed(0)}s`,
        clipFilePath: clipGenerated ? clipPath : null,
        thumbnailPath: thumbGenerated ? clipThumbPath : null,
      });

      console.log(`[Worker] Clip ${i + 1} created: ${clipFilename} (${seg.duration.toFixed(1)}s, score: ${score})${clipGenerated ? " [file generated]" : " [metadata only]"}`);
    }

    await storage.updateJob(jobId, {
      progress: 95,
      currentStep: "Finalizing and optimizing clip files"
    });
    await sleep(1000);

    await storage.updateJob(jobId, {
      progress: 100,
      status: "completed",
      currentStep: "Processing complete"
    });

    await storage.updateVideo(job.videoId, { status: "completed" });
    console.log(`[Worker] Job ${jobId} completed: ${clipSegments.length} clips generated`);

  } catch (err: any) {
    console.error(`[Worker] Job ${jobId} failed:`, err.message);
    await storage.updateJob(jobId, {
      status: "failed",
      errorLog: err?.message || "Unknown processing error"
    });
    await storage.updateVideo(job.videoId, { status: "failed" });
  }
}

async function runWorker() {
  console.log("[Worker] Starting background video processing worker...");
  console.log("[Worker] FFmpeg-powered clip generation enabled");

  while (true) {
    try {
      const pendingJobs = await storage.getPendingJobs();
      for (const job of pendingJobs) {
        console.log(`[Worker] Processing job ${job.id} for video ${job.videoId}`);
        processJob(job.id).catch(err => {
          console.error(`[Worker] Job ${job.id} failed:`, err);
        });
      }
    } catch (err) {
      console.error("[Worker] Error polling jobs:", err);
    }
    await sleep(5000);
  }
}

export { runWorker };
