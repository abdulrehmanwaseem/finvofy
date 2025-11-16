import { Role } from "./auth";

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
}
