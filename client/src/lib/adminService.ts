import { apiRequest } from "@/lib/queryClient";

export interface AdminUser {
  email: string;
  addedBy?: string;
  addedAt?: Date;
}

// Get all admin emails
export const getAdminEmails = async (): Promise<AdminUser[]> => {
  return await apiRequest<AdminUser[]>("/api/admin/users", "GET");
};

// Add a new admin by email
export const addAdminEmail = async (email: string): Promise<AdminUser> => {
  return await apiRequest<AdminUser>("/api/admin/users", "POST", { email });
};

// Remove an admin by email
export const removeAdminEmail = async (email: string): Promise<boolean> => {
  return await apiRequest<boolean>(`/api/admin/users/${encodeURIComponent(email)}`, "DELETE");
};