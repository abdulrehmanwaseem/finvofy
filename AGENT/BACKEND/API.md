# API Endpoints & DTOs

This document defines all REST API endpoints for the Finvofy backend. All protected routes require `Authorization: Bearer <JWT>` header.

## Base URL

- Development: `http://localhost:3001/api`
- Production: `https://api.finvofy.com/api`

## Authentication Endpoints

### POST /auth/signup

Create a new tenant and owner user.

**Request Body:**

```typescript
{
  email: string; // valid email
  password: string; // min 8 chars
  name: string; // user full name
  tenantName: string; // company/tenant name
}
```

**Response (201):**

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    role: "OWNER";
  }
  tenant: {
    id: string;
    name: string;
  }
  accessToken: string;
  refreshToken: string;
}
```

### POST /auth/login

Authenticate user and receive tokens.

**Request Body:**

```typescript
{
  email: string;
  password: string;
}
```

**Response (200):**

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    role: "OWNER" | "ADMIN" | "MEMBER" | "BILLING";
    tenantId: string;
  }
  accessToken: string;
  refreshToken: string;
}
```

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**

```typescript
{
  refreshToken: string;
}
```

**Response (200):**

```typescript
{
  accessToken: string;
  refreshToken: string;
}
```

### POST /auth/logout

Invalidate refresh token.

**Headers:** `Authorization: Bearer <JWT>`

**Response (200):**

```typescript
{
  message: "Logged out successfully";
}
```

## Invoice Endpoints

### GET /invoices

List all invoices for the authenticated user's tenant.

**Headers:** `Authorization: Bearer <JWT>`

**Query Parameters:**

- `status?: DRAFT | SENT | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED`
- `customerId?: string`
- `page?: number` (default: 1)
- `limit?: number` (default: 20)

**Response (200):**

```typescript
{
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /invoices

Create a new invoice.

**Headers:** `Authorization: Bearer <JWT>`

**Request Body:**

```typescript
{
  customerId: string;
  number: string;           // auto-generated if omitted
  currency: string;         // default: "USD"
  dueDate?: string;         // ISO date
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;       // percentage (e.g., 10 for 10%)
  }>;
  notes?: string;
  metadata?: object;
}
```

**Response (201):**

```typescript
{
  invoice: Invoice;
}
```

### GET /invoices/:id

Get a single invoice by ID.

**Headers:** `Authorization: Bearer <JWT>`

**Response (200):**

```typescript
{
  invoice: Invoice;
}
```

### PATCH /invoices/:id

Update an invoice (only DRAFT invoices can be fully edited).

**Headers:** `Authorization: Bearer <JWT>`

**Request Body:** (all fields optional)

```typescript
{
  customerId?: string;
  dueDate?: string;
  items?: Array<{...}>;
  notes?: string;
  status?: InvoiceStatus;
}
```

**Response (200):**

```typescript
{
  invoice: Invoice;
}
```

### DELETE /invoices/:id

Delete an invoice (soft delete, only DRAFT).

**Headers:** `Authorization: Bearer <JWT>`

**Response (200):**

```typescript
{
  message: "Invoice deleted successfully";
}
```

### POST /invoices/:id/send

Send invoice email to customer and mark as SENT.

**Headers:** `Authorization: Bearer <JWT>`

**Response (200):**

```typescript
{
  invoice: Invoice;
  message: "Invoice sent successfully";
}
```

## Customer Endpoints

### GET /customers

List all customers for the authenticated user's tenant.

**Headers:** `Authorization: Bearer <JWT>`

**Query Parameters:**

- `search?: string`
- `page?: number`
- `limit?: number`

**Response (200):**

```typescript
{
  customers: Customer[];
  total: number;
}
```

### POST /customers

Create a new customer.

**Headers:** `Authorization: Bearer <JWT>`

**Request Body:**

```typescript
{
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  metadata?: object;
}
```

**Response (201):**

```typescript
{
  customer: Customer;
}
```

### PATCH /customers/:id

Update a customer.

**Headers:** `Authorization: Bearer <JWT>`

**Request Body:** (all fields optional)

```typescript
{
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}
```

**Response (200):**

```typescript
{
  customer: Customer;
}
```

### DELETE /customers/:id

Delete a customer (cascade delete invoices or prevent if invoices exist).

**Headers:** `Authorization: Bearer <JWT>`

**Response (200):**

```typescript
{
  message: "Customer deleted successfully";
}
```

## Payment Endpoints

### GET /payments

List all payments for the authenticated user's tenant.

**Headers:** `Authorization: Bearer <JWT>`

**Query Parameters:**

- `invoiceId?: string`
- `status?: PENDING | SUCCEEDED | FAILED | REFUNDED`
- `page?: number`
- `limit?: number`

**Response (200):**

```typescript
{
  payments: Payment[];
  total: number;
}
```

### POST /payments

Create a payment (usually triggered by webhook, but can be manual).

**Headers:** `Authorization: Bearer <JWT>`

**Request Body:**

```typescript
{
  invoiceId: string;
  amount: number;
  currency: string;
  provider: "stripe" | "paypal" | "bank_transfer";
  method?: string;        // card, bank, wallet
  providerPaymentId?: string;
}
```

**Response (201):**

```typescript
{
  payment: Payment;
}
```

### GET /payments/:id

Get a single payment by ID.

**Headers:** `Authorization: Bearer <JWT>`

**Response (200):**

```typescript
{
  payment: Payment;
}
```

## Webhook Endpoints

### POST /webhooks/stripe

Handle Stripe webhook events (payment_intent.succeeded, etc.).

**Headers:** `stripe-signature: <signature>`

**Request Body:** Stripe event payload

**Response (200):**

```typescript
{
  received: true;
}
```

## Public Endpoints (No Auth Required)

### GET /pay/:publicId

Get invoice details for public payment page.

**Response (200):**

```typescript
{
  invoice: {
    id: string;
    number: string;
    customer: {
      name: string;
      email: string;
    };
    items: Array<{...}>;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    dueDate: string;
    status: InvoiceStatus;
  };
  tenant: {
    name: string;
    logo?: string;
  };
}
```

## Common Response Types

### Invoice

```typescript
{
  id: string;
  tenantId: string;
  customerId: string;
  number: string;
  status: "DRAFT" |
    "SENT" |
    "PARTIALLY_PAID" |
    "PAID" |
    "OVERDUE" |
    "CANCELLED";
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  dueDate: string | null;
  issuedAt: string;
  paidAt: string | null;
  pdfUrl: string | null;
  remindersSent: number;
  createdAt: string;
  updatedAt: string;
}
```

### Customer

```typescript
{
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
}
```

### Payment

```typescript
{
  id: string;
  tenantId: string;
  invoiceId: string;
  provider: string;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  method: string | null;
  paidAt: string | null;
  createdAt: string;
}
```

## Error Responses

All endpoints return consistent error responses:

```typescript
{
  error: string;          // Human-readable error message
  code: number;           // HTTP status code
  details?: object;       // Additional error context (validation errors, etc.)
}
```

Common status codes:

- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Conventions

1. **Authentication:** All protected routes require JWT in `Authorization: Bearer <token>` header.
2. **Multitenancy:** `tenantId` automatically enforced via JWT payload; no need to pass in request body.
3. **Validation:** Use Zod schemas for DTO validation.
4. **Idempotency:** Webhook endpoints use idempotency keys to prevent duplicate processing.
5. **Pagination:** Use `page` and `limit` query params; return `total`, `page`, `limit` in response.
6. **Date Format:** ISO 8601 strings (e.g., `2024-01-15T10:30:00Z`).
7. **Currency:** ISO 4217 codes (USD, EUR, GBP, etc.).

## Example cURL Requests

**Login:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"password123"}'
```

**Create Invoice:**

```bash
curl -X POST http://localhost:3001/api/invoices \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust_123",
    "items": [
      {
        "description": "Web Design Services",
        "quantity": 1,
        "unitPrice": 1500,
        "taxRate": 10
      }
    ],
    "dueDate": "2024-02-15T00:00:00Z"
  }'
```

**List Invoices:**

```bash
curl http://localhost:3001/api/invoices?status=PAID&page=1&limit=10 \
  -H "Authorization: Bearer <your-jwt-token>"
```
