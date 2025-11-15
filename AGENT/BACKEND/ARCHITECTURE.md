# NestJS Architecture & Module Structure

This document describes the module organization, layering, and patterns for the Finvofy backend.

## Module Overview

```
src/
├── main.ts                    # Bootstrap application
├── app.module.ts              # Root module
├── auth/                      # Authentication & authorization
├── tenants/                   # Tenant management
├── users/                     # User CRUD
├── invoices/                  # Invoice CRUD & business logic
├── customers/                 # Customer CRUD
├── payments/                  # Payment processing
├── webhooks/                  # Webhook ingestion (Stripe, etc.)
├── templates/                 # Email/PDF template management
├── jobs/                      # BullMQ job processors
├── email/                     # Email service (Resend/Brevo)
├── pdf/                       # PDF generation (Puppeteer)
├── storage/                   # Cloudflare R2 integration
└── common/                    # Shared utilities, guards, decorators
```

## Module Responsibilities

### Auth Module

**Files:**

- `auth.module.ts`
- `auth.controller.ts` - Signup, login, refresh, logout endpoints
- `auth.service.ts` - JWT issuance, password hashing, token validation
- `dto/login.dto.ts`, `dto/signup.dto.ts` - Zod validation schemas
- `guards/jwt-auth.guard.ts` - Protect routes with JWT
- `strategies/jwt.strategy.ts` - Passport JWT strategy

**Responsibilities:**

- Issue JWT access + refresh tokens
- Validate credentials (bcrypt password hashing)
- Refresh token rotation
- Optional 2FA (speakeasy TOTP)

**Dependencies:**

- `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`
- `bcrypt` or `argon2`
- `zod` for DTO validation

### Tenants Module

**Files:**

- `tenants.module.ts`
- `tenants.service.ts` - Tenant CRUD, context resolution
- `tenants.controller.ts` - Admin endpoints for tenant management

**Responsibilities:**

- Tenant creation during signup
- Resolve tenant from JWT payload
- Provide tenant context to all services

### Users Module

**Files:**

- `users.module.ts`
- `users.service.ts` - User CRUD, role management
- `users.controller.ts` - User endpoints (list, update, deactivate)

**Responsibilities:**

- User CRUD within tenant
- RBAC enforcement (OWNER, ADMIN, MEMBER, BILLING)
- Invite flow (create user with temp password)

### Invoices Module

**Files:**

- `invoices.module.ts`
- `invoices.controller.ts` - CRUD + send invoice endpoint
- `invoices.service.ts` - Business logic (calculate totals, status transitions)
- `dto/create-invoice.dto.ts`, `dto/update-invoice.dto.ts`
- `entities/invoice.entity.ts` - Prisma type exports

**Responsibilities:**

- Invoice CRUD with tenant isolation
- Calculate subtotal, tax, total from line items
- Generate invoice number (INV-001, etc.)
- Trigger PDF generation job
- Trigger email send job
- Status transitions (DRAFT → SENT → PAID)

**Dependencies:**

- Prisma for DB operations
- Jobs service for async tasks
- Zod for DTO validation

### Customers Module

**Files:**

- `customers.module.ts`
- `customers.controller.ts` - CRUD endpoints
- `customers.service.ts` - Customer management
- `dto/create-customer.dto.ts`

**Responsibilities:**

- Customer CRUD with tenant isolation
- Search/filter customers
- Link customers to invoices

### Payments Module

**Files:**

- `payments.module.ts`
- `payments.controller.ts` - CRUD + refund endpoints
- `payments.service.ts` - Payment reconciliation, status updates

**Responsibilities:**

- Record payments from webhooks
- Update invoice status when payment succeeds
- Handle refunds
- Generate receipts

**Dependencies:**

- Stripe SDK for refunds
- Email service for receipts

### Webhooks Module

**Files:**

- `webhooks.module.ts`
- `webhooks.controller.ts` - Stripe webhook endpoint
- `webhooks.service.ts` - Signature verification, event processing

**Responsibilities:**

- Validate webhook signatures (Stripe HMAC)
- Process `payment_intent.succeeded`, `charge.refunded`, etc.
- Idempotency handling (prevent duplicate processing)
- Trigger payment service to update records

**Dependencies:**

- Stripe SDK for signature verification
- Payments service

### Templates Module

**Files:**

- `templates.module.ts`
- `templates.controller.ts` - CRUD endpoints
- `templates.service.ts` - Template storage, variable injection

**Responsibilities:**

- Store email/PDF HTML templates
- Inject invoice data into templates
- Version control for templates

### Jobs Module

**Files:**

- `jobs.module.ts`
- `processors/email.processor.ts` - Email sending jobs
- `processors/reminder.processor.ts` - Invoice reminder jobs
- `processors/pdf.processor.ts` - PDF generation jobs
- `queues/bull.config.ts` - BullMQ configuration

**Responsibilities:**

- Schedule reminder jobs (due date - X days)
- Process email queue with retries
- Generate PDFs asynchronously
- Reconcile payments with Stripe API

**Dependencies:**

- `@nestjs/bull`, `bull`
- Redis connection (Upstash)

### Email Module

**Files:**

- `email.module.ts`
- `email.service.ts` - Send emails via Resend/Brevo/SendGrid

**Responsibilities:**

- Send transactional emails (invoice, reminder, receipt)
- Template rendering (inject data into HTML)
- Handle delivery errors and retries

**Dependencies:**

- `resend` SDK (or `@sendgrid/mail`, `sib-api-v3-sdk`)

### PDF Module

**Files:**

- `pdf.module.ts`
- `pdf.service.ts` - Generate PDFs from HTML (Puppeteer)

**Responsibilities:**

- Render invoice HTML to PDF
- Upload PDF to Cloudflare R2
- Return signed URL

**Dependencies:**

- `puppeteer` or `@sparticuz/chromium` (serverless)
- Storage service for R2 upload

### Storage Module

**Files:**

- `storage.module.ts`
- `storage.service.ts` - Cloudflare R2 upload/download/signed URLs

**Responsibilities:**

- Upload files to R2 (S3-compatible)
- Generate signed URLs for private files
- Delete files when invoices are deleted

**Dependencies:**

- `@aws-sdk/client-s3` (S3-compatible)

### Common Module

**Files:**

- `filters/http-exception.filter.ts` - Global error handling
- `interceptors/logging.interceptor.ts` - Request/response logging
- `middleware/tenant-context.middleware.ts` - Extract tenant from JWT
- `decorators/current-user.decorator.ts` - `@CurrentUser()` decorator
- `decorators/roles.decorator.ts` - `@Roles('OWNER', 'ADMIN')` decorator
- `guards/roles.guard.ts` - RBAC enforcement

**Responsibilities:**

- Shared utilities, decorators, guards
- Error handling and logging
- Tenant context management

## Layering Architecture

```
Controller Layer
    ↓ (HTTP requests)
Service Layer
    ↓ (Business logic)
Repository Layer (Prisma)
    ↓ (Database queries)
Database
```

### Controller Layer

- Handle HTTP requests/responses
- Validate DTOs with Zod
- Apply guards (`@UseGuards(JwtAuthGuard, RolesGuard)`)
- Extract user/tenant from request (`@CurrentUser()`)
- Delegate to service layer
- Transform responses

### Service Layer

- Business logic (invoice total calculation, status transitions)
- Orchestrate multiple operations (e.g., create invoice + send email)
- Call repository (Prisma) with tenant isolation
- Throw domain exceptions (e.g., `InvoiceNotFoundException`)

### Repository Layer (Prisma)

- Database queries
- Apply tenant filters
- Handle transactions

## Multi-Tenancy Enforcement

**Middleware Approach:**

```typescript
// common/middleware/tenant-context.middleware.ts
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: Function) {
    const user = req.user; // from JWT strategy
    if (user) {
      req["tenantId"] = user.tenantId;
    }
    next();
  }
}
```

**Service Layer Enforcement:**

```typescript
// invoices/invoices.service.ts
async findAll(tenantId: string): Promise<Invoice[]> {
  return this.prisma.invoice.findMany({
    where: { tenantId },
  });
}
```

**Prisma Middleware (Alternative):**

```typescript
// main.ts or app.module.ts
prisma.$use(async (params, next) => {
  if (params.model && params.model !== "Tenant") {
    const tenantId = getCurrentTenantId(); // from async context
    if (params.action === "create") {
      params.args.data.tenantId = tenantId;
    } else {
      params.args.where = { ...params.args.where, tenantId };
    }
  }
  return next(params);
});
```

## Security Best Practices

1. **Helmet:** Add `helmet()` middleware for HTTP headers security.
2. **CORS:** Configure allowed origins (Next.js frontend domain).
3. **Rate Limiting:** Use `@nestjs/throttler` to prevent abuse.
4. **Input Validation:** Validate all DTOs with Zod (strict schemas).
5. **JWT Expiry:** Short-lived access tokens (15 min), long-lived refresh tokens (7 days).
6. **RBAC:** Enforce role-based access with `@Roles()` decorator and `RolesGuard`.
7. **Webhook Signatures:** Verify Stripe/PayPal webhook signatures before processing.
8. **SQL Injection:** Use Prisma parameterized queries (avoid raw SQL).
9. **Secrets:** Store secrets in environment variables, never hardcode.

## Observability

1. **Structured Logging:** Use `winston` or `pino` with JSON format.
2. **Request Logging:** Log all incoming requests (method, path, tenant, user, duration).
3. **Error Tracking:** Integrate Sentry for exception monitoring.
4. **Metrics:** Expose Prometheus metrics (request count, latency, queue depth).
5. **Health Checks:** Add `/health` endpoint for liveness/readiness probes.

## Testing Strategy

See `TESTING.md` for detailed testing patterns.

- **Unit Tests:** Service logic (invoice calculation, JWT issuance)
- **Integration Tests:** API endpoints with test database
- **E2E Tests:** Full user flows (signup → create invoice → send → pay)

## Example Module Structure

```typescript
// invoices/invoices.module.ts
import { Module } from "@nestjs/common";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import { PrismaModule } from "../prisma/prisma.module";
import { JobsModule } from "../jobs/jobs.module";

@Module({
  imports: [PrismaModule, JobsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
```

```typescript
// invoices/invoices.controller.ts
import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";

@Controller("invoices")
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@CurrentUser("tenantId") tenantId: string) {
    return this.invoicesService.findAll(tenantId);
  }

  @Post()
  create(
    @CurrentUser("tenantId") tenantId: string,
    @Body() dto: CreateInvoiceDto
  ) {
    return this.invoicesService.create(tenantId, dto);
  }
}
```

```typescript
// invoices/invoices.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      include: { customer: true },
    });
  }

  async create(tenantId: string, dto: CreateInvoiceDto) {
    // Calculate totals
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const tax = dto.items.reduce(
      (sum, item) =>
        sum + (item.quantity * item.unitPrice * (item.taxRate || 0)) / 100,
      0
    );
    const total = subtotal + tax;

    // Create invoice
    return this.prisma.invoice.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        number: await this.generateInvoiceNumber(tenantId),
        items: dto.items,
        subtotal,
        tax,
        total,
        currency: dto.currency || "USD",
        dueDate: dto.dueDate,
      },
    });
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.invoice.count({ where: { tenantId } });
    return `INV-${String(count + 1).padStart(3, "0")}`;
  }
}
```

## Recommended NestJS Packages

- `@nestjs/config` - Environment variable management
- `@nestjs/jwt` - JWT utilities
- `@nestjs/passport` - Authentication strategies
- `@nestjs/bull` - Job queues
- `@nestjs/throttler` - Rate limiting
- `@nestjs/swagger` - API documentation (optional)
- `class-validator` + `class-transformer` OR `zod` - DTO validation
- `helmet` - Security headers
- `winston` or `pino` - Structured logging
- `@sentry/node` - Error tracking

## Next Steps

1. Install Prisma and generate client
2. Create auth module with JWT strategy
3. Implement tenant context middleware
4. Build invoice CRUD with tenant isolation
5. Add BullMQ for async jobs
6. Integrate Stripe webhooks
7. Add unit and integration tests
