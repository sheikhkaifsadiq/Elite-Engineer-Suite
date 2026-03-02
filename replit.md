# Clipora.ai — AI Video Repurposing SaaS

## Overview
Clipora.ai is an AI-powered web SaaS that automatically converts long-form videos into short-form viral clips with subtitles, highlights, and optimized formatting for social platforms.

## Architecture
- **Frontend**: React + TypeScript + TailwindCSS + shadcn/ui + Wouter (routing) + TanStack Query
- **Backend**: Express.js + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Replit built-in)
- **Auth**: Session-based (express-session + connect-pg-simple + bcrypt)
- **Video Processing**: FFmpeg-powered background worker with real clip extraction

## Key Features
- User registration/login with session-based auth
- Social login buttons (Google, Facebook, GitHub, Apple) — UI ready, OAuth pending API keys
- Admin account: admin@clipora.ai / Admin@123 (role=admin, plan=pro)
- Video upload (MP4, MOV, MKV, AVI, WebM) up to 2GB
- Real video processing pipeline with FFmpeg:
  - FFprobe metadata analysis (resolution, fps, codec, bitrate, duration)
  - Video thumbnail generation
  - Highlight detection & virality scoring
  - Real clip extraction in 9:16 vertical format (libx264 + AAC)
  - Clip thumbnail generation
  - Transcript simulation (Whisper AI placeholder)
- Real-time job status polling (3-second interval)
- Clip management: edit, delete, download (real MP4 files)
- OAuth-like social account connection:
  - Platform login (email + password + username)
  - Permission consent screen (manage content, edit profile, change avatar, upload media, read analytics, manage comments, delete content)
  - Automatic profile modifications: username → username.clipora, bio → Clipora branding, avatar → Clipora logo
  - Original profile data preserved for revert on disconnect
- Direct export with AI-generated SEO titles, descriptions, and hashtags per platform
- Subscription plans: Free (3 videos/month) vs Pro (unlimited)
- Dark/light mode toggle

## Routes
### Frontend Pages
- `/` — Landing page (marketing)
- `/login` — Login (with social login buttons)
- `/register` — Registration (with social login buttons)
- `/dashboard` — Video library (auth required)
- `/upload` — Upload video (auth required)
- `/video/:id` — Video detail with clips, transcript & export (auth required)
- `/settings` — Account info, connected social accounts with OAuth, subscription (auth required)
- `/pricing` — Pricing plans

### Backend API (all prefixed with `/api/v1/`)
- `POST /auth/register` — Register
- `POST /auth/login` — Login
- `POST /auth/logout` — Logout
- `GET /auth/me` — Get current user
- `POST /videos/upload` — Upload video (multipart/form-data, saves filePath)
- `GET /videos/list` — List user's videos
- `GET /videos/:id` — Get video with job and clips
- `DELETE /videos/:id` — Delete video
- `POST /videos/:id/process` — Queue video for processing
- `GET /videos/:id/clips` — Get clips for video
- `GET /videos/:id/thumbnail` — Serve video thumbnail image
- `GET /clips/:id` — Get individual clip
- `GET /clips/:id/download` — Download clip MP4 file
- `GET /clips/:id/thumbnail` — Serve clip thumbnail
- `PATCH /clips/:id` — Update clip title/description
- `DELETE /clips/:id` — Delete clip
- `GET /jobs/:id` — Get job status
- `GET /accounts/connected` — List connected social accounts
- `POST /accounts/connect` — OAuth-like connect (email+password+username+permissions)
- `DELETE /accounts/:id` — Disconnect and revert profile
- `POST /exports/create` — Export clip (requires authorized account)
- `GET /exports/clip/:clipId` — Get exports for clip
- `GET /exports/user` — Get all user exports
- `POST /exports/generate-seo` — Preview AI SEO content

## Database Schema
- **users**: id, email, username, password, plan, videoCount, role, authProvider, createdAt
- **videos**: id, userId, title, originalFilename, fileSize, duration, status, transcript, thumbnailUrl, filePath, width, height, fps, codec, bitrate, createdAt, updatedAt
- **clips**: id, videoId, title, description, hashtags, startTime, endTime, duration, viralityScore, filename, transcriptSegment, clipFilePath, thumbnailPath, createdAt
- **jobs**: id, videoId, status, progress, currentStep, errorLog, retryCount, createdAt, updatedAt
- **connected_accounts**: id, userId, platform, platformUsername, platformDisplayName, platformAvatar, platformEmail, connected, authorized, permissions[], originalUsername, originalBio, originalAvatar, modifiedUsername, modifiedBio, profileModified, accessToken, refreshToken, connectedAt
- **exports**: id, clipId, userId, platform, seoTitle, seoDescription, seoHashtags, status, platformPostUrl, errorLog, createdAt

## Background Worker (server/worker.ts)
FFmpeg-powered real video processing:
1. FFprobe analysis — extract video metadata (resolution, fps, codec, bitrate, duration)
2. Thumbnail generation — extract frame at key timestamp
3. Whisper AI transcription (simulated with realistic content)
4. Highlight detection — keyword-based virality scoring
5. Clip boundary calculation — intelligent segment selection based on duration
6. FFmpeg clip extraction — real vertical 9:16 clips with libx264 encoding
7. Clip thumbnail generation per clip
8. Falls back to metadata-only mode if video file unavailable

## File Structure
```
client/src/
  pages/          — landing, login, register, dashboard, upload, video-detail, settings, pricing, not-found
  components/     — app-sidebar, clip-card, video-card, theme-toggle, social-login-buttons, export-dialog, connect-account-dialog
  components/ui/  — shadcn components
  context/        — AuthContext
  lib/            — api.ts, queryClient.ts, utils.ts

server/
  index.ts        — Express entry point + session setup + worker startup + admin seed
  routes.ts       — All API routes (auth, videos, clips, jobs, accounts, exports, file serving)
  storage.ts      — Database storage interface
  db.ts           — Drizzle database connection
  worker.ts       — FFmpeg-powered background video processing worker
  seed.ts         — Admin account seeder

shared/
  schema.ts       — Drizzle schema + Zod types

generated_clips/   — FFmpeg-generated clip MP4 files
generated_thumbnails/ — FFmpeg-generated thumbnail JPGs
uploads/           — Raw uploaded video files
```

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Session signing secret

## User Preferences
- Purple/violet primary color (already configured in index.css)
- Dark mode supported via ThemeToggle
