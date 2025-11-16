import { z } from "zod";

// Enums
export enum Role {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  BILLING = "BILLING",
}

// Zod Schemas for Validation
export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  tenantName: z.string().min(2, "Company name must be at least 2 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// TypeScript Types
export type SignupDto = z.infer<typeof signupSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

// Auth Response Types
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    tenantId: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  tenantId: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
