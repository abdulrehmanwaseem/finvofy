import { z } from "zod";

// Enums
export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

// Payment Schemas
export const createPaymentSchema = z.object({
  invoiceId: z.string().cuid(),
  provider: z.string().min(1),
  providerPaymentId: z.string().optional(),
  amount: z.number().min(0),
  currency: z.string().default("USD"),
  method: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;

// Payment Interface
export interface Payment {
  id: string;
  tenantId: string;
  invoiceId: string;
  provider: string;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  paidAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
}
