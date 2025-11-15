# Prisma Schema

Complete database schema for Finvofy multi-tenant invoice SaaS. Copy this to `apps/api/prisma/schema.prisma`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String    @id @default(cuid())
  name      String
  domain    String?   @unique // custom domain
  settings  Json?     // branding, invoice numbering, tax rates
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  users     User[]
  customers Customer[]
  invoices  Invoice[]
  payments  Payment[]
  templates Template[]

  @@index([domain])
}

model User {
  id           String    @id @default(cuid())
  tenant       Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  tenantId     String
  email        String    @unique
  name         String?
  passwordHash String?
  role         Role      @default(MEMBER)
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  sessions     Session[]

  @@index([tenantId])
  @@index([email])
}

model Session {
  id           String   @id @default(cuid())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  @@index([userId])
  @@index([refreshToken])
}

enum Role {
  OWNER
  ADMIN
  MEMBER
  BILLING
}

model Customer {
  id        String    @id @default(cuid())
  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  tenantId  String
  name      String
  email     String?
  phone     String?
  address   String?
  metadata  Json?     // custom fields
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  invoices  Invoice[]

  @@index([tenantId])
  @@index([email])
}

model Invoice {
  id             String        @id @default(cuid())
  tenant         Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  tenantId       String
  customer       Customer      @relation(fields: [customerId], references: [id])
  customerId     String
  number         String        // e.g., INV-001
  publicId       String        @unique @default(cuid()) // for public payment links
  status         InvoiceStatus @default(DRAFT)
  currency       String        @default("USD")
  items          Json          // [{description, quantity, unitPrice, taxRate, total}]
  subtotal       Float
  tax            Float
  total          Float
  dueDate        DateTime?
  issuedAt       DateTime      @default(now())
  paidAt         DateTime?
  pdfUrl         String?       // Cloudflare R2 URL
  notes          String?       @db.Text
  metadata       Json?
  remindersSent  Int           @default(0)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  payments       Payment[]

  @@index([tenantId])
  @@index([customerId])
  @@index([status])
  @@index([publicId])
  @@index([dueDate])
}

enum InvoiceStatus {
  DRAFT
  SENT
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
}

model Payment {
  id                String        @id @default(cuid())
  tenant            Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  tenantId          String
  invoice           Invoice       @relation(fields: [invoiceId], references: [id])
  invoiceId         String
  provider          String        // stripe, paypal, bank_transfer
  providerPaymentId String?       // Stripe payment_intent ID, etc.
  amount            Float
  currency          String
  status            PaymentStatus @default(PENDING)
  method            String?       // card, bank, wallet
  paidAt            DateTime?
  metadata          Json?
  createdAt         DateTime      @default(now())

  @@index([tenantId])
  @@index([invoiceId])
  @@index([status])
  @@index([providerPaymentId])
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

model Template {
  id        String   @id @default(cuid())
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  tenantId  String
  name      String
  type      String   // email, pdf
  html      String   @db.Text
  meta      Json?    // variables, preview data
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@index([type])
}
```

## Notes

1. **Multi-tenancy:** All major tables have `tenantId` column. Enforce tenant isolation in Prisma middleware or service layer.

2. **Indexes:** Added indexes on frequently queried fields (`tenantId`, `email`, `status`, `publicId`, etc.) for performance.

3. **Cascade Deletes:** Tenant deletion cascades to all related records. User deletion cascades to sessions.

4. **JSON Fields:**
   - `Tenant.settings`: Branding (logo URL, colors), invoice numbering format, default tax rates
   - `Customer.metadata`: Custom fields for CRM-like data
   - `Invoice.items`: Line items array (avoids separate table for MVP simplicity)
   - `Invoice.metadata`: Custom fields, tags, internal notes
   - `Payment.metadata`: Stripe metadata, customer details
   - `Template.meta`: Template variables, preview data

5. **Public Invoice Access:** `Invoice.publicId` is a unique, unguessable ID for public payment links (`/pay/:publicId`).

6. **Invoice Numbering:** `Invoice.number` is a human-readable invoice number (e.g., INV-001). Generate in service layer based on tenant settings.

7. **PDF Storage:** `Invoice.pdfUrl` stores Cloudflare R2 URL for generated invoice PDFs.

8. **Payment Reconciliation:** `Payment.providerPaymentId` links to Stripe/PayPal payment IDs for webhook reconciliation.

## Migration Commands

```powershell
# Navigate to API directory
cd apps/api

# Create initial migration
pnpm prisma migrate dev --name init

# Generate Prisma Client
pnpm prisma generate

# Open Prisma Studio (GUI for DB)
pnpm prisma studio

# Reset database (development only)
pnpm prisma migrate reset

# Apply migrations (production)
pnpm prisma migrate deploy
```

## Seed Script

Create `apps/api/prisma/seed.ts` to populate demo data:

```typescript
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Acme Inc",
      domain: "acme.finvofy.com",
      settings: {
        logoUrl: "https://via.placeholder.com/150",
        primaryColor: "#0B61FF",
        invoicePrefix: "INV",
      },
    },
  });

  // Create owner user
  const passwordHash = await bcrypt.hash("password123", 12);
  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "owner@acme.com",
      name: "John Doe",
      passwordHash,
      role: "OWNER",
    },
  });

  // Create demo customer
  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "+1234567890",
      address: "123 Main St, Anytown, USA",
    },
  });

  // Create demo invoice
  await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      number: "INV-001",
      status: "DRAFT",
      currency: "USD",
      items: [
        {
          description: "Web Design Services",
          quantity: 1,
          unitPrice: 1500,
          taxRate: 10,
          total: 1650,
        },
      ],
      subtotal: 1500,
      tax: 150,
      total: 1650,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  console.log("✅ Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add to `apps/api/package.json`:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Run seed:

```powershell
cd apps/api
pnpm prisma db seed
```

## Multitenancy Best Practices

1. **Middleware Enforcement:** Add Prisma middleware to automatically filter by `tenantId`:

```typescript
// apps/api/src/common/middleware/prisma-tenant.middleware.ts
export function tenantMiddleware(tenantId: string) {
  return async (params, next) => {
    if (params.model && params.model !== "Tenant") {
      if (params.action === "create") {
        params.args.data.tenantId = tenantId;
      } else {
        params.args.where = { ...params.args.where, tenantId };
      }
    }
    return next(params);
  };
}
```

2. **Service Layer Guards:** Always pass `tenantId` from JWT to service methods.

3. **Testing:** Write tests to ensure cross-tenant data leakage is prevented.
