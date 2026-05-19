export type UserRole = "admin" | "employee";

export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
};
