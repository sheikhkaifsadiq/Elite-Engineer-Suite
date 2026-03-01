# Clipora.ai — AI Video Repurposing SaaS

## Overview
Clipora.ai is an AI-powered web SaaS that automatically converts long-form videos into short-form viral clips with subtitles, highlights, and optimized formatting for social platforms.

## Architecture
- **Frontend**: React + TypeScript + TailwindCSS + shadcn/ui + Wouter (routing) + TanStack Query
- **Backend**: Express.js + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Replit built-in)
- **Auth**: Session-based (express-session + connect-pg-simple + bcrypt)
- **AI Processing**: Simulated async background worker (worker.ts)

## Key Features
- User registration/login with session-based auth
- Video upload (MP4, MOV, MKV, AVI, WebM) up to 2GB
- AI-simulated video processing pipeline:
  - Audio transcription (Whisper simulation)
  - Highlight detection & virality scoring
  - Clip generation (3 clips per video)
  - Vertical 9:16 formatting
- Real-time job status polling (3-second interval)
- Clip management: edit, delete, download
- Subscription plans: Free (3 videos/month) vs Pro (unlimited)
- Dark/light mode toggle

## Routes
### Frontend Pages
- `/` — Landing page (marketing)
- `/login` — Login
- `/register` — Registration
- `/dashboard` — Video library (auth required)
- `/upload` — Upload video (auth required)
- `/video/:id` — Video detail with clips & transcript (auth required)
- `/pricing` — Pricing plans

### Backend API (all prefixed with `/api/v1/`)
- `POST /auth/register` — Register
- `POST /auth/login` — Login
- `POST /auth/logout` — Logout
- `GET /auth/me` — Get current user
- `POST /videos/upload` — Upload video (multipart/form-data)
- `GET /videos/list` — List user's videos
- `GET /videos/:id` — Get video with job and clips
- `DELETE /videos/:id` — Delete video
- `POST /videos/:id/process` — Queue video for processing
- `GET /videos/:id/clips` — Get clips for video
- `GET /clips/:id` — Get individual clip
- `PATCH /clips/:id` — Update clip title/description
- `DELETE /clips/:id` — Delete clip
- `GET /jobs/:id` — Get job status

## Database Schema
- **users**: id, email, username, password, plan, videoCount, createdAt
- **videos**: id, userId, title, originalFilename, fileSize, duration, status, transcript, thumbnailUrl, createdAt, updatedAt
- **clips**: id, videoId, title, description, hashtags, startTime, endTime, duration, viralityScore, filename, transcriptSegment, createdAt
- **jobs**: id, videoId, status, progress, currentStep, errorLog, retryCount, createdAt, updatedAt

## Background Worker (server/worker.ts)
Polls for pending jobs every 5 seconds and simulates the AI processing pipeline:
1. Audio extraction (2s delay)
2. Whisper transcription (3s delay)
3. Highlight detection (2s delay)
4. Virality scoring (1.5s delay)
5. Title/hashtag generation (1.5s delay)
6. Clip creation (3 clips per video)
7. FFmpeg rendering simulation (2s delay)

## File Structure
```
client/src/
  pages/          — landing, login, register, dashboard, upload, video-detail, pricing, not-found
  components/     — app-sidebar, clip-card, video-card, theme-toggle
  components/ui/  — shadcn components
  context/        — AuthContext
  lib/            — api.ts, queryClient.ts, utils.ts

server/
  index.ts        — Express entry point + session setup + worker startup
  routes.ts       — All API routes
  storage.ts      — Database storage interface
  db.ts           — Drizzle database connection
  worker.ts       — Background video processing worker

shared/
  schema.ts       — Drizzle schema + Zod types
```

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Session signing secret

## User Preferences
- Purple/violet primary color (already configured in index.css)
- Dark mode supported via ThemeToggle
