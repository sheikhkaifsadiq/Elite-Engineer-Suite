import { storage } from "./storage";
import bcrypt from "bcrypt";

export async function seedAdminAccount() {
  try {
    const existing = await storage.getUserByEmail("admin@clipora.ai");
    if (existing) {
      console.log("[Seed] Admin account already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);
    const admin = await storage.createUser({
      email: "admin@clipora.ai",
      username: "admin",
      password: hashedPassword,
    });
    await storage.updateUserPlan(admin.id, "pro");
    await storage.updateUserRole(admin.id, "admin");

    console.log("[Seed] Admin account created successfully");
    console.log("[Seed]   Email: admin@clipora.ai");
    console.log("[Seed]   Password: Admin@123");
  } catch (err: any) {
    if (err.message?.includes("duplicate")) {
      console.log("[Seed] Admin account already exists (duplicate key)");
    } else {
      console.error("[Seed] Failed to create admin account:", err.message);
    }
  }
}
