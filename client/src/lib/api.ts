import { apiRequest } from "./queryClient";

export const api = {
  auth: {
    register: (data: { email: string; username: string; password: string }) =>
      apiRequest("POST", "/api/v1/auth/register", data),
    login: (data: { email: string; password: string }) =>
      apiRequest("POST", "/api/v1/auth/login", data),
    logout: () => apiRequest("POST", "/api/v1/auth/logout"),
    me: () => fetch("/api/v1/auth/me", { credentials: "include" }),
  },
  videos: {
    upload: (formData: FormData) =>
      fetch("/api/v1/videos/upload", { method: "POST", body: formData, credentials: "include" }),
    list: () => fetch("/api/v1/videos/list", { credentials: "include" }),
    get: (id: string) => fetch(`/api/v1/videos/${id}`, { credentials: "include" }),
    process: (id: string) => apiRequest("POST", `/api/v1/videos/${id}/process`),
    delete: (id: string) => apiRequest("DELETE", `/api/v1/videos/${id}`),
    clips: (id: string) => fetch(`/api/v1/videos/${id}/clips`, { credentials: "include" }),
  },
  clips: {
    get: (id: string) => fetch(`/api/v1/clips/${id}`, { credentials: "include" }),
    update: (id: string, data: Partial<{ title: string; description: string; startTime: number; endTime: number }>) =>
      apiRequest("PATCH", `/api/v1/clips/${id}`, data),
    delete: (id: string) => apiRequest("DELETE", `/api/v1/clips/${id}`),
  },
  jobs: {
    get: (id: string) => fetch(`/api/v1/jobs/${id}`, { credentials: "include" }),
  },
  accounts: {
    list: () => fetch("/api/v1/accounts/connected", { credentials: "include" }),
    connect: (data: { platform: string; platformUsername: string; platformDisplayName?: string }) =>
      apiRequest("POST", "/api/v1/accounts/connect", data),
    disconnect: (id: string) => apiRequest("DELETE", `/api/v1/accounts/${id}`),
  },
  exports: {
    create: (data: { clipId: string; platform: string }) =>
      apiRequest("POST", "/api/v1/exports/create", data),
    getByClip: (clipId: string) => fetch(`/api/v1/exports/clip/${clipId}`, { credentials: "include" }),
    getAll: () => fetch("/api/v1/exports/user", { credentials: "include" }),
    generateSEO: (data: { clipId: string; platform: string }) =>
      apiRequest("POST", "/api/v1/exports/generate-seo", data),
  },
};
