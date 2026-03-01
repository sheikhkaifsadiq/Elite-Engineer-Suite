import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  plan: text("plan").notNull().default("free"),
  videoCount: integer("video_count").notNull().default(0),
  role: text("role").notNull().default("user"),
  authProvider: text("auth_provider").notNull().default("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileSize: integer("file_size"),
  duration: real("duration"),
  status: text("status").notNull().default("pending"),
  transcript: text("transcript"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clips = pgTable("clips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => videos.id),
  title: text("title").notNull(),
  description: text("description"),
  hashtags: text("hashtags").array(),
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  duration: real("duration").notNull(),
  viralityScore: integer("virality_score").notNull().default(0),
  filename: text("filename"),
  transcriptSegment: text("transcript_segment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => videos.id),
  status: text("status").notNull().default("pending"),
  progress: real("progress").notNull().default(0),
  currentStep: text("current_step"),
  errorLog: text("error_log"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const connectedAccounts = pgTable("connected_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(),
  platformUsername: text("platform_username"),
  platformDisplayName: text("platform_display_name"),
  platformAvatar: text("platform_avatar"),
  connected: boolean("connected").notNull().default(true),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  connectedAt: timestamp("connected_at").defaultNow(),
});

export const exports = pgTable("exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clipId: varchar("clip_id").notNull().references(() => clips.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoHashtags: text("seo_hashtags").array(),
  status: text("status").notNull().default("pending"),
  platformPostUrl: text("platform_post_url"),
  errorLog: text("error_log"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClipSchema = createInsertSchema(clips).omit({
  id: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConnectedAccountSchema = createInsertSchema(connectedAccounts).omit({
  id: true,
  connectedAt: true,
});

export const insertExportSchema = createInsertSchema(exports).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertClip = z.infer<typeof insertClipSchema>;
export type Clip = typeof clips.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type InsertConnectedAccount = z.infer<typeof insertConnectedAccountSchema>;
export type Export = typeof exports.$inferSelect;
export type InsertExport = z.infer<typeof insertExportSchema>;
