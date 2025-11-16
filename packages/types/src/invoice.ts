import { z } from "zod";

// Enums
export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

// Line Item Schema
export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be positive"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  taxRate: z.number().min(0).max(100).optional().default(0),
  total: z.number().optional(),
});

export type LineItem = z.infer<typeof lineItemSchema>;

// Invoice Schemas
export const createInvoiceSchema = z.object({
  customerId: z.string().cuid(),
  number: z.string().optional(),
  currency: z.string().default("USD"),
  dueDate: z.string().datetime().optional(),
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceDto = z.infer<typeof updateInvoiceSchema>;

// Invoice Interface
export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  number: string;
  publicId: string;
  status: InvoiceStatus;
  currency: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate: Date | null;
  issuedAt: Date;
  paidAt: Date | null;
  pdfUrl: string | null;
  metadata: Record<string, any> | null;
  remindersSent: number;
  createdAt: Date;
  updatedAt: Date;
}
