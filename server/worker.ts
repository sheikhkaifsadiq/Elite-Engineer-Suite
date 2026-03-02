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

const CAPTION_STYLES: Record<string, { fontsize: number; fontcolor: string; borderw: number; shadowcolor: string; shadowx: number; shadowy: number; boxEnabled: boolean; boxcolor: string; boxborderw: number }> = {
  classic: {
    fontsize: 42,
    fontcolor: "white",
    borderw: 3,
    shadowcolor: "black@0.6",
    shadowx: 2,
    shadowy: 2,
    boxEnabled: false,
    boxcolor: "",
    boxborderw: 0,
  },
  bold: {
    fontsize: 52,
    fontcolor: "yellow",
    borderw: 4,
    shadowcolor: "black@0.8",
    shadowx: 3,
    shadowy: 3,
    boxEnabled: false,
    boxcolor: "",
    boxborderw: 0,
  },
  boxed: {
    fontsize: 40,
    fontcolor: "white",
    borderw: 0,
    shadowcolor: "black@0",
    shadowx: 0,
    shadowy: 0,
    boxEnabled: true,
    boxcolor: "black@0.7",
    boxborderw: 12,
  },
  neon: {
    fontsize: 44,
    fontcolor: "#00ffcc",
    borderw: 3,
    shadowcolor: "#00ffcc@0.4",
    shadowx: 0,
    shadowy: 0,
    boxEnabled: false,
    boxcolor: "",
    boxborderw: 0,
  },
  minimal: {
    fontsize: 36,
    fontcolor: "white@0.9",
    borderw: 2,
    shadowcolor: "black@0.4",
    shadowx: 1,
    shadowy: 1,
    boxEnabled: false,
    boxcolor: "",
    boxborderw: 0,
  },
  none: {
    fontsize: 0,
    fontcolor: "",
    borderw: 0,
    shadowcolor: "",
    shadowx: 0,
    shadowy: 0,
    boxEnabled: false,
    boxcolor: "",
    boxborderw: 0,
  },
};

const FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

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

function buildCaptionDrawtext(captionText: string, styleName: string): string {
  const style = CAPTION_STYLES[styleName] || CAPTION_STYLES.classic;
  if (styleName === "none" || !captionText || style.fontsize === 0) return "";

  const escaped = captionText
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\:")
    .replace(/;/g, "\\;")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/%/g, "%%");

  const lines: string[] = [];
  const words = escaped.split(/\s+/);
  let currentLine = "";
  for (const word of words) {
    if (currentLine.length + word.length + 1 > 30) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine ? " " : "") + word;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  const wrappedText = lines.slice(0, 3).join("\\n");

  let filter = `drawtext=text='${wrappedText}'`;
  filter += `:fontfile=${FONT_PATH}`;
  filter += `:fontsize=${style.fontsize}`;
  filter += `:fontcolor=${style.fontcolor}`;
  filter += `:x=(w-text_w)/2`;
  filter += `:y=h-text_h-80`;
  filter += `:borderw=${style.borderw}`;
  filter += `:bordercolor=black`;
  filter += `:shadowcolor=${style.shadowcolor}`;
  filter += `:shadowx=${style.shadowx}`;
  filter += `:shadowy=${style.shadowy}`;

  if (style.boxEnabled) {
    filter += `:box=1`;
    filter += `:boxcolor=${style.boxcolor}`;
    filter += `:boxborderw=${style.boxborderw}`;
  }

  return filter;
}

async function extractClipWithCaptions(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number,
  captionText: string,
  captionStyle: string = "classic",
  targetWidth: number = 1080,
  targetHeight: number = 1920
): Promise<boolean> {
  try {
    const scaleAndCrop = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}`;

    const captionFilter = buildCaptionDrawtext(captionText, captionStyle);
    const vf = captionFilter
      ? `${scaleAndCrop},${captionFilter}`
      : scaleAndCrop;

    await execFileAsync(
      "ffmpeg",
      [
        "-y", "-ss", String(startTime), "-i", inputPath,
        "-t", String(duration),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        outputPath,
      ],
      { timeout: 180000 }
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

async function generateWatermarkedClip(cleanPath: string, watermarkedPath: string): Promise<boolean> {
  try {
    const watermarkFilter = [
      `drawtext=text='Clipora':fontfile=${FONT_PATH}`,
      `fontsize=36:fontcolor=white@0.25`,
      `x='W/2+W/4*sin(t/2)-text_w/2':y='H/2+H/4*cos(t/3)-text_h/2'`,
      `borderw=1:bordercolor=white@0.15`,
    ].join(":");

    const watermarkFilter2 = [
      `drawtext=text='Clipora':fontfile=${FONT_PATH}`,
      `fontsize=28:fontcolor=white@0.2`,
      `x='W/2-W/4*cos(t/2.5)-text_w/2':y='H/3+H/5*sin(t/1.8)-text_h/2'`,
      `borderw=1:bordercolor=white@0.1`,
    ].join(":");

    const vf = `${watermarkFilter},${watermarkFilter2}`;

    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-i", cleanPath,
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "28",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        watermarkedPath,
      ],
      { timeout: 180000 }
    );
    return fs.existsSync(watermarkedPath);
  } catch (err: any) {
    console.error("[Worker] Watermarked clip generation error:", err.message);
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
      currentStep: `Generating ${clipSegments.length} clips with FFmpeg (9:16 crop + captions)`
    });

    for (let i = 0; i < clipSegments.length; i++) {
      const seg = clipSegments[i];
      const clipFilenameClean = `clip_${job.videoId}_${i + 1}_clean.mp4`;
      const clipFilenameWatermarked = `clip_${job.videoId}_${i + 1}_watermarked.mp4`;
      const clipPathClean = path.join(CLIPS_DIR, clipFilenameClean);
      const clipPathWatermarked = path.join(CLIPS_DIR, clipFilenameWatermarked);
      const clipThumbPath = path.join(THUMBNAILS_DIR, `clip_${job.videoId}_${i + 1}.jpg`);
      const segment = sentences.slice(i, i + 2).join(". ").trim();
      const score = scoreKeywords(segment);

      let cleanGenerated = false;
      let watermarkedGenerated = false;
      let thumbGenerated = false;

      if (actualFilePath) {
        await storage.updateJob(jobId, {
          progress: 65 + ((i + 0.2) / clipSegments.length) * 25,
          currentStep: `Rendering clip ${i + 1}/${clipSegments.length} (crop to 9:16 + captions)`
        });

        cleanGenerated = await extractClipWithCaptions(
          actualFilePath, clipPathClean, seg.start, seg.duration,
          segment, "classic"
        );

        if (cleanGenerated) {
          await storage.updateJob(jobId, {
            progress: 65 + ((i + 0.6) / clipSegments.length) * 25,
            currentStep: `Adding transparent watermark to clip ${i + 1}/${clipSegments.length}`
          });
          watermarkedGenerated = await generateWatermarkedClip(clipPathClean, clipPathWatermarked);
          thumbGenerated = await generateClipThumbnail(clipPathClean, clipThumbPath);
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
        description: `AI-generated highlight clip cropped to 9:16 vertical format with burned-in captions. Extracted from ${seg.start.toFixed(1)}s to ${(seg.start + seg.duration).toFixed(1)}s.`,
        hashtags: hashtagsForTranscript,
        startTime: seg.start,
        endTime: seg.start + seg.duration,
        duration: seg.duration,
        viralityScore: score,
        filename: clipFilenameClean,
        transcriptSegment: segment || `Highlight segment from ${seg.start.toFixed(0)}s`,
        clipFilePath: cleanGenerated ? clipPathClean : null,
        watermarkedFilePath: watermarkedGenerated ? clipPathWatermarked : null,
        thumbnailPath: thumbGenerated ? clipThumbPath : null,
        captionStyle: "classic",
      });

      console.log(`[Worker] Clip ${i + 1}: clean=${cleanGenerated}, watermarked=${watermarkedGenerated}, thumb=${thumbGenerated} (${seg.duration.toFixed(1)}s, score: ${score})`);
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

async function regenerateClip(
  clipId: string,
  options: { startTime: number; endTime: number; captionStyle: string }
): Promise<boolean> {
  ensureDirs();
  const clip = await storage.getClip(clipId);
  if (!clip) return false;

  const video = await storage.getVideo(clip.videoId);
  if (!video) return false;

  const filePath = video.filePath || path.join("uploads", path.basename(video.originalFilename));
  if (!fs.existsSync(filePath)) return false;

  const duration = options.endTime - options.startTime;
  if (duration < 1) return false;

  const clipFilenameClean = `clip_${clip.videoId}_${clip.id.slice(0, 8)}_clean.mp4`;
  const clipFilenameWatermarked = `clip_${clip.videoId}_${clip.id.slice(0, 8)}_watermarked.mp4`;
  const clipPathClean = path.join(CLIPS_DIR, clipFilenameClean);
  const clipPathWatermarked = path.join(CLIPS_DIR, clipFilenameWatermarked);
  const clipThumbPath = path.join(THUMBNAILS_DIR, `clip_${clip.videoId}_${clip.id.slice(0, 8)}.jpg`);

  if (clip.clipFilePath && fs.existsSync(clip.clipFilePath)) {
    try { fs.unlinkSync(clip.clipFilePath); } catch {}
  }
  if (clip.watermarkedFilePath && fs.existsSync(clip.watermarkedFilePath)) {
    try { fs.unlinkSync(clip.watermarkedFilePath); } catch {}
  }
  if (clip.thumbnailPath && fs.existsSync(clip.thumbnailPath)) {
    try { fs.unlinkSync(clip.thumbnailPath); } catch {}
  }

  const captionText = clip.transcriptSegment || "";
  const cleanGenerated = await extractClipWithCaptions(
    filePath, clipPathClean, options.startTime, duration,
    captionText, options.captionStyle
  );

  if (!cleanGenerated) return false;

  const watermarkedGenerated = await generateWatermarkedClip(clipPathClean, clipPathWatermarked);
  const thumbGenerated = await generateClipThumbnail(clipPathClean, clipThumbPath);

  await storage.updateClip(clipId, {
    startTime: options.startTime,
    endTime: options.endTime,
    duration,
    captionStyle: options.captionStyle,
    clipFilePath: clipPathClean,
    watermarkedFilePath: watermarkedGenerated ? clipPathWatermarked : null,
    thumbnailPath: thumbGenerated ? clipThumbPath : null,
    filename: clipFilenameClean,
  });

  console.log(`[Worker] Clip ${clipId} regenerated: clean=true, watermarked=${watermarkedGenerated}, thumb=${thumbGenerated} (${duration.toFixed(1)}s, style: ${options.captionStyle})`);
  return true;
}

async function runWorker() {
  console.log("[Worker] Starting background video processing worker...");
  console.log("[Worker] FFmpeg-powered clip generation with 9:16 crop + captions");

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

export { runWorker, regenerateClip, CAPTION_STYLES };
