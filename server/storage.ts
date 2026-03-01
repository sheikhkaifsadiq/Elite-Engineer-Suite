import { db } from "./db";
import { users, videos, clips, jobs } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type { User, InsertUser, Video, InsertVideo, Clip, InsertClip, Job, InsertJob } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPlan(id: string, plan: string): Promise<User | undefined>;
  incrementVideoCount(id: string): Promise<void>;

  getVideo(id: string): Promise<Video | undefined>;
  getVideosByUser(userId: string): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, data: Partial<Video>): Promise<Video | undefined>;
  deleteVideo(id: string): Promise<void>;

  getClip(id: string): Promise<Clip | undefined>;
  getClipsByVideo(videoId: string): Promise<Clip[]>;
  createClip(clip: InsertClip): Promise<Clip>;
  updateClip(id: string, data: Partial<Clip>): Promise<Clip | undefined>;
  deleteClip(id: string): Promise<void>;

  getJob(id: string): Promise<Job | undefined>;
  getJobByVideo(videoId: string): Promise<Job | undefined>;
  getJobsByUser(userId: string): Promise<Job[]>;
  getPendingJobs(): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, data: Partial<Job>): Promise<Job | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPlan(id: string, plan: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ plan }).where(eq(users.id, id)).returning();
    return user;
  }

  async incrementVideoCount(id: string): Promise<void> {
    const user = await this.getUser(id);
    if (user) {
      await db.update(users).set({ videoCount: user.videoCount + 1 }).where(eq(users.id, id));
    }
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async getVideosByUser(userId: string): Promise<Video[]> {
    return db.select().from(videos).where(eq(videos.userId, userId)).orderBy(desc(videos.createdAt));
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [v] = await db.insert(videos).values(video).returning();
    return v;
  }

  async updateVideo(id: string, data: Partial<Video>): Promise<Video | undefined> {
    const [v] = await db.update(videos).set({ ...data, updatedAt: new Date() }).where(eq(videos.id, id)).returning();
    return v;
  }

  async deleteVideo(id: string): Promise<void> {
    await db.delete(clips).where(eq(clips.videoId, id));
    await db.delete(jobs).where(eq(jobs.videoId, id));
    await db.delete(videos).where(eq(videos.id, id));
  }

  async getClip(id: string): Promise<Clip | undefined> {
    const [clip] = await db.select().from(clips).where(eq(clips.id, id));
    return clip;
  }

  async getClipsByVideo(videoId: string): Promise<Clip[]> {
    return db.select().from(clips).where(eq(clips.videoId, videoId)).orderBy(desc(clips.viralityScore));
  }

  async createClip(clip: InsertClip): Promise<Clip> {
    const [c] = await db.insert(clips).values(clip).returning();
    return c;
  }

  async updateClip(id: string, data: Partial<Clip>): Promise<Clip | undefined> {
    const [c] = await db.update(clips).set(data).where(eq(clips.id, id)).returning();
    return c;
  }

  async deleteClip(id: string): Promise<void> {
    await db.delete(clips).where(eq(clips.id, id));
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getJobByVideo(videoId: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.videoId, videoId)).orderBy(desc(jobs.createdAt));
    return job;
  }

  async getJobsByUser(userId: string): Promise<Job[]> {
    const userVideos = await this.getVideosByUser(userId);
    const videoIds = userVideos.map(v => v.id);
    if (videoIds.length === 0) return [];
    const allJobs: Job[] = [];
    for (const vid of videoIds) {
      const videoJobs = await db.select().from(jobs).where(eq(jobs.videoId, vid));
      allJobs.push(...videoJobs);
    }
    return allJobs.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getPendingJobs(): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.status, "pending"));
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [j] = await db.insert(jobs).values(job).returning();
    return j;
  }

  async updateJob(id: string, data: Partial<Job>): Promise<Job | undefined> {
    const [j] = await db.update(jobs).set({ ...data, updatedAt: new Date() }).where(eq(jobs.id, id)).returning();
    return j;
  }
}

export const storage = new DatabaseStorage();
