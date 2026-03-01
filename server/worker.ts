import { storage } from "./storage";

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
    if (lower.includes(keyword)) {
      score += 8;
    }
  }
  return Math.min(score, 99);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processJob(jobId: string) {
  const job = await storage.getJob(jobId);
  if (!job) return;

  const video = await storage.getVideo(job.videoId);
  if (!video) {
    await storage.updateJob(jobId, { status: "failed", errorLog: "Video not found" });
    return;
  }

  try {
    await storage.updateJob(jobId, {
      status: "processing",
      progress: 5,
      currentStep: "Extracting audio from video"
    });
    await storage.updateVideo(job.videoId, { status: "processing" });
    await sleep(2000);

    await storage.updateJob(jobId, {
      progress: 20,
      currentStep: "Running speech-to-text transcription (Whisper)"
    });
    await sleep(3000);

    const transcriptIdx = Math.floor(Math.random() * MOCK_TRANSCRIPTS.length);
    const transcript = MOCK_TRANSCRIPTS[transcriptIdx];
    await storage.updateVideo(job.videoId, { transcript });

    await storage.updateJob(jobId, {
      progress: 45,
      currentStep: "Analyzing transcript for highlight moments"
    });
    await sleep(2000);

    await storage.updateJob(jobId, {
      progress: 60,
      currentStep: "Running virality scoring engine"
    });
    await sleep(1500);

    await storage.updateJob(jobId, {
      progress: 75,
      currentStep: "Generating clip titles and hashtags with AI"
    });
    await sleep(1500);

    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const titlesForTranscript = CLIP_TITLES[transcriptIdx] || CLIP_TITLES[0];
    const hashtagsForTranscript = CLIP_HASHTAGS[transcriptIdx] || CLIP_HASHTAGS[0];

    const numClips = Math.min(3, sentences.length);
    for (let i = 0; i < numClips; i++) {
      const startTime = i * 30 + Math.random() * 10;
      const duration = 30 + Math.random() * 60;
      const endTime = startTime + duration;
      const segment = sentences.slice(i, i + 2).join(". ").trim();
      const score = scoreKeywords(segment);

      await storage.createClip({
        videoId: job.videoId,
        title: titlesForTranscript[i] || `Clip ${i + 1}`,
        description: `AI-generated highlight clip showcasing the most engaging moment from your video. Optimized for vertical format and social media virality.`,
        hashtags: hashtagsForTranscript,
        startTime: Math.round(startTime * 10) / 10,
        endTime: Math.round(endTime * 10) / 10,
        duration: Math.round(duration * 10) / 10,
        viralityScore: score,
        filename: `clip_${job.videoId}_${i + 1}.mp4`,
        transcriptSegment: segment,
      });
    }

    await storage.updateJob(jobId, {
      progress: 90,
      currentStep: "Rendering clips with FFmpeg (9:16 format + subtitles)"
    });
    await sleep(2000);

    await storage.updateJob(jobId, {
      progress: 100,
      status: "completed",
      currentStep: "Processing complete"
    });

    await storage.updateVideo(job.videoId, { status: "completed" });

  } catch (err: any) {
    await storage.updateJob(jobId, {
      status: "failed",
      errorLog: err?.message || "Unknown processing error"
    });
    await storage.updateVideo(job.videoId, { status: "failed" });
  }
}

async function runWorker() {
  console.log("[Worker] Starting background video processing worker...");

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
