# **1 — Full System Architecture (high level)**

**Goal:** single product that handles invoice creation, sending (email), payment collection, reminders, and dashboards — multitenant SaaS.

**Major components**

- **Frontend (Next.js)** — App Router, pages: Dashboard, Invoices, Create Invoice, Customers, Payments, Templates, Settings, Payment view (client-facing invoice \+ pay).

- **API Backend (NestJS)** — REST/GraphQL endpoints for CRUD \+ webhooks.

- **DB (Postgres)** — multi-tenant via `tenantId` (schema-per-tenant optional later).

- **Payments** — Stripe primary, PayPal optional, bank transfer links.

- **Email** — Resend / Brevo / SendGrid for transactional emails.

- **Queues/Jobs** — BullMQ \+ Redis for scheduled reminders, retries, PDF generation.

- **PDF service** — server-side HTML → PDF (Puppeteer) or wkhtmltopdf microservice.

- **Storage** — S3-compatible for attachments and invoice PDFs.

- **Worker service** — processes payments, retries, webhooks, reconciliation.

- **Observability** — Sentry, Prometheus/Grafana, structured logs.

- **Auth** — JWT \+ refresh tokens for API, NextAuth-like session for frontend; optional 2FA (speakeasy).

- **Deploy** — Docker, Kubernetes or serverless (Vercel for frontend, Render/Heroku/GCP App Engine for backend) \+ managed Postgres \+ Redis.

# **2 — Database Schema (Prisma models — copy to `schema.prisma`)**

generator client {  
 provider \= "prisma-client-js"  
}

datasource db {  
 provider \= "postgresql"  
 url \= env("DATABASE_URL")  
}

model Tenant {  
 id String @id @default(cuid())  
 name String  
 domain String? // custom domain  
 createdAt DateTime @default(now())  
 users User\[\]  
 customers Customer\[\]  
 invoices Invoice\[\]  
 payments Payment\[\]  
 templates Template\[\]  
 settings Json?  
}

model User {  
 id String @id @default(cuid())  
 tenant Tenant @relation(fields: \[tenantId\], references: \[id\])  
 tenantId String  
 email String @unique  
 name String?  
 passwordHash String?  
 role Role @default(MEMBER)  
 isActive Boolean @default(true)  
 createdAt DateTime @default(now())  
 sessions Session\[\]  
}

model Session {  
 id String @id @default(cuid())  
 user User @relation(fields: \[userId\], references: \[id\])  
 userId String  
 refreshToken String  
 expiresAt DateTime  
}

enum Role {  
 OWNER  
 ADMIN  
 MEMBER  
 BILLING  
}

model Customer {  
 id String @id @default(cuid())  
 tenant Tenant @relation(fields: \[tenantId\], references: \[id\])  
 tenantId String  
 name String  
 email String?  
 phone String?  
 address String?  
 metadata Json?  
 invoices Invoice\[\]  
 createdAt DateTime @default(now())  
}

model Invoice {  
 id String @id @default(cuid())  
 tenant Tenant @relation(fields: \[tenantId\], references: \[id\])  
 tenantId String  
 customer Customer @relation(fields: \[customerId\], references: \[id\])  
 customerId String  
 number String  
 status InvoiceStatus @default(DRAFT)  
 currency String @default("USD")  
 items Json // \[{desc, qty, unit, tax, total}\]  
 subtotal Float  
 tax Float  
 total Float  
 dueDate DateTime?  
 issuedAt DateTime @default(now())  
 paidAt DateTime?  
 pdfUrl String?  
 metadata Json?  
 payments Payment\[\]  
 remindersSent Int @default(0)  
 createdAt DateTime @default(now())  
 updatedAt DateTime @updatedAt  
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
 id String @id @default(cuid())  
 tenant Tenant @relation(fields: \[tenantId\], references: \[id\])  
 tenantId String  
 invoice Invoice @relation(fields: \[invoiceId\], references: \[id\])  
 invoiceId String  
 provider String // stripe, paypal, bank_transfer  
 providerPaymentId String?  
 amount Float  
 currency String  
 status PaymentStatus @default(PENDING)  
 method String? // card, bank, wallet  
 paidAt DateTime?  
 metadata Json?  
 createdAt DateTime @default(now())  
}

enum PaymentStatus {  
 PENDING  
 SUCCEEDED  
 FAILED  
 REFUNDED  
}

model Template {  
 id String @id @default(cuid())  
 tenant Tenant @relation(fields: \[tenantId\], references: \[id\])  
 tenantId String  
 name String  
 html String // email/html template  
 meta Json?  
 createdAt DateTime @default(now())  
}

**Notes:** Items stored in JSON for flexibility; can normalize later. Index `tenantId` on heavy tables.

# **3 — Branding & Naming**

**Name ideas (pick one)**

- Finvofy (clean & available for SaaS)
- Finvo
- PayMint
- InvoiceFlow
- BillableAI
- PromptInvoice

**Taglines**

- “Create. Send. Get paid — smarter.”

- “Beautiful invoices. Faster payments.”

- “Invoices that pay themselves.”

**Logo concept**

- Minimal monogram “F” or stylized invoice icon \+ lightning bolt to imply speed.

- Color palette: deep blue (\#0B61FF), emerald green for paid state, soft gray for neutral.

- Font: Inter or Poppins — clean and modern. And some unique one’s

# **4 — Full Landing Page Copy (hero \+ features \+ pricing \+ CTA)**

**Hero**

**Finvofy — Invoicing that actually gets you paid.**  
 Create beautiful invoices, send them instantly, accept payments directly, and automate follow-ups — all in one dashboard.  
 **Get started free** · **Book a demo**

**Features (short bullets)**

- Create branded invoices in seconds with templates.

- Accept card, PayPal and bank transfers from a single invoice link.

- Automated payment reminders and overdue workflows.

- Real-time cashflow dashboard & AI insights.

- Email delivery tracking \+ receipts.

**How it works (3-step)**

1. Create your invoice → 2\. Email or send a payment link → 3\. Get paid — receipts sent automatically.

**Pricing (example)**

- **Starter — Free**: 5 invoices/month, email delivery, watermark, Stripe payments (2.9% \+ 30¢).

- **Pro — $15/mo**: unlimited invoices, recurring invoices, custom branding, 0.9% platform fee.

- **Scale — $49/mo**: team seats, accounting exports, priority support, reduced platform fee.  
   (Offer 14-day trial; waivable transaction fees for enterprise)

**FAQ (samples)**

- Q: Can I accept credit cards? A: Yes — Stripe/PayPal supported.

- Q: Do you store customer data? A: Yes, securely in your tenant DB, exportable anytime.

- Q: Can I send recurring invoices? A: Yes (Pro \+).

**CTA**

- Button: “Start Free — Create your first invoice”

# **5 — MVP Roadmap (8-week sprint plan, lean)**

**Goal:** launch a usable product so freelancers can create invoices, email them, accept payments, and receive receipts.

**Week 0 — Prep**

- Set up repo, infra, CI, Postgres, Redis, Stripe account, email provider account.

**Week 1 — Core data \+ auth**

- Prisma models → migrations.

- NestJS basic auth (JWT), user \+ tenant creation.

- Next.js skeleton \+ login/signup flows.

**Week 2 — Invoice CRUD \+ PDF**

- Invoice model CRUD endpoints.

- Create invoice UI \+ templates.

- Basic HTML invoice → PDF (Puppeteer) and store in S3.

**Week 3 — Email sending \+ templates**

- Integrate Resend/SendGrid for transactional emails.

- Send invoice email with link \+ PDF attachment.

**Week 4 — Payment integration**

- Stripe Checkout / Payment Links or Stripe PaymentIntents integrated.

- Client-facing invoice page that shows invoice details \+ pay button.

- Handle webhooks to mark invoice as PAID, record Payment.

**Week 5 — Reminders & Jobs**

- Redis \+ BullMQ job to schedule reminders.

- Email reminders triggered; update `remindersSent`.

**Week 6 — Dashboard & basic analytics**

- Dashboard UI: counts (paid/unpaid/overdue), recent invoices, cashflow chart.

- Export CSV for invoices and payments.

**Week 7 — UX polish \+ templates**

- Branding customization, invoice number patterns, tax settings.

- Email open tracking (simple pixel) if supported by provider.

**Week 8 — QA & Launch**

- End-to-end testing, security review, deploy to production.

- Create landing page and payment for Pro subscription.

# **6 — UI/UX Page Structure (components & flows)**

**Global layout**

- Left sidebar: Dashboard, Invoices, Customers, Payments, Templates, Settings, Team.

- Topbar: Search, New Invoice button, User menu, Notifications.

**Pages**

- **Dashboard**: KPIs, recent activity, upcoming due invoices, quick create.

- **Invoices list**: filter by status, search, bulk actions.

- **Invoice editor**: line items, tax, notes, preview, email/send, save as template.

- **Invoice public view**: simple responsive page showing invoice, with Pay button. Accepts card and other methods.

- **Create payment flow**: embed Stripe Elements on pay page or redirect to Stripe Checkout.

- **Customers**: contact details, invoice history.

- **Templates**: WYSIWYG or HTML templates.

- **Settings**: Company info, branding (logo, colors), payment providers, email config, tax settings.

- **Billing**: subscription, usage, team seats, invoices for the SaaS itself.

**Design notes**

- Mobile-first responsive.

- Clear payment CTA on public invoice.

- Microcopy: show fees and currency conversion info.

# **7 — Complete SaaS Technical Plan (detailed)**

## **Authentication & Security**

- **Auth flow:** Next.js session for UI; NestJS issues JWT \+ refresh tokens.

- **Password:** bcrypt (cost 12+) or Argon2.

- **2FA:** optional speakeasy TOTP for owner/admins.

- **Roles:** OWNER, ADMIN, MEMBER, BILLING. Enforce RBAC in NestJS guards.

- **Encryption:** TLS everywhere. Use server-side encryption for S3 objects.

- **Secrets management:** Vault or cloud secret manager.

## **Billing & Payment Workflows**

- **Stripe Setup**
  1. Use Stripe Connect if you plan marketplace payouts; otherwise standard Stripe for platform charges.

  2. For invoices: create a PaymentIntent when user opens pay link OR use Stripe Checkout for quick integration.

  3. Webhooks: `payment_intent.succeeded`, `charge.refunded`, `invoice.payment_failed`.

- **Flow**
  1. Create invoice in your DB, generate `invoice.number` and `invoice.publicId` (unguessable).

  2. Generate public invoice URL: `/pay/{publicId}`.

  3. On client open, optionally create PaymentIntent for exact amount with metadata `{invoiceId, tenantId}` or use Checkout session.

  4. Stripe webhooks \-\> update Payment record & Invoice status, send receipt email.

- **Fees:** show Stripe fee breakdown if you want transparency. Optionally apply platform fee.

## **Email & Notifications**

- **Provider:** Resend / Brevo / SendGrid.

- **Templates:** store HTML in DB; inject invoice data server-side for emails.

- **Tracking:** add tracking pixel or link UTM for opens/clicks. Respect privacy laws (GDPR); provide opt-outs.

## **Jobs & Scheduling**

- Use **BullMQ \+ Redis**:
  - Reminder jobs (schedule by `dueDate - X days`)

  - Retry failed email sends

  - Reconciliation jobs for daily payment checks with Stripe API

## **Multi-tenant approach**

- **TenantID column** per resource (simplest).

- Enforce `tenantId` at service layer / Prisma middleware to prevent cross-tenant leakage.

- Optionally: schema-per-tenant if strict isolation needed (adds complexity).

## **Webhooks & Security**

- Validate signatures for Stripe and email provider webhooks.

- Idempotency keys for repeated webhook delivery.

## **PDFs and Storage**

- Generate HTML invoice templates server-side, render to PDF via Puppeteer.

- Store PDFs in S3 with path `/{tenantId}/invoices/{invoiceId}.pdf`. Serve signed URLs.

## **Observability & Ops**

- **Monitoring:** Prometheus metrics, Grafana dashboards (request latency, job queue length, webhook failures).

- **Error tracking:** Sentry.

- **Logs:** structured JSON logs shipped to Logflare/Datadog.

- **Backups:** daily DB backups, tested restore.

## **Deployment & CI**

- **CI:** GitHub Actions lint \-\> tests \-\> build docker images \-\> push (staging/prod).

- **Infra:**
  - Frontend: Vercel (Edge)

  - Backend: Docker on Kubernetes / Render / Fly.io / AWS ECS Fargate

  - DB: Managed Postgres (Supabase, RDS)

  - Redis: Managed Redis (Upstash, Elasticache)

  - Storage: S3 (AWS/GCP/Backblaze)

- **Scaling:** stateless API horizontally; workers scale based on queue depth.

## **Compliance & Legal**

- Provide Data Processing Agreement (DPA) for enterprise.

- PCI: avoid storing card data; use Stripe to limit PCI scope.

- GDPR: export & delete user data features.

# **8 — Example API endpoints (NestJS style)**

POST /api/auth/signup  
POST /api/auth/login  
GET /api/invoices?status=PAID|SENT|OVERDUE  
POST /api/invoices // create invoice  
GET /api/invoices/:id  
POST /api/invoices/:id/send // email invoice  
GET /pay/:publicId // public invoice view (no auth)  
POST /webhooks/stripe  
POST /api/customers  
GET /api/payments

Implement guards to ensure `req.user.tenantId` is applied.

# **9 — Example Next.js component (public invoice page skeleton)**

// app/pay/\[publicId\]/page.tsx (Next.js App Router)  
import StripeCheckout from "@/components/StripeCheckout";

export default async function PayPage({ params }) {  
 const { publicId } \= params;  
 // fetch invoice with server-side call to API  
 const invoice \= await fetch(\`${process.env.API\_URL}/invoices/public/${publicId}\`).then(r \=\> r.json());

return (  
 \<main className="max-w-3xl mx-auto p-6"\>  
 \<header\>  
 \<h1\>Invoice {invoice.number}\</h1\>  
 \<p\>Due {new Date(invoice.dueDate).toLocaleDateString()}\</p\>  
 \</header\>  
 \<section\>  
 {/\* invoice items table \*/}  
 \</section\>  
 \<aside\>  
 \<StripeCheckout amount={invoice.total} currency={invoice.currency} metadata={{ invoiceId: invoice.id }} /\>  
 \</aside\>  
 \</main\>  
 );  
}

# **10 — Minimal email sequence (automation)**

- **On send:** Invoice email with link \+ PDF. Status → SENT.

- **Reminder 1 (due \- 3 days):** polite reminder, show pay link.

- **Reminder 2 (due \+ 1 day):** firmer tone.

- **Final (due \+ 7 days):** escalation / CC account owner / offer partial payment.

- **On payment:** receipt \+ thank you email, update invoice.

# **11 — Risks & Mitigations**

- **Risk:** Payment disputes/chargebacks.  
   **Mitigation:** keep detailed logs, send receipts, integrate Stripe dispute handling.

- **Risk:** Data leakage cross-tenant.  
   **Mitigation:** middleware to always filter by tenantId and enforce RBAC tests.

- **Risk:** Failed email deliverability.  
   **Mitigation:** use verified domain, DKIM/SPF, resend strategy, fallback provider.

# **12 — Next concrete steps (what I’ll deliver if you want more)**

I can now generate any (pick multiple, I’ll produce immediately):

- ✅ Full Prisma \+ seed script (sample tenants, users, demo invoices)

- ✅ Complete NestJS project skeleton (auth, invoices, payments webhook handlers)

- ✅ Next.js public invoice \+ dashboard templates (Tailwind \+ shadcn)

- ✅ Payment integration snippets (Stripe PaymentIntent \+ webhooks)

- ✅ Landing page static copy \+ Tailwind layout

- ✅ CI/CD GitHub Actions workflow

- ✅ Email templates (HTML) for invoice, reminders, receipts

Tell me which of the above artifacts you want me to generate first and I’ll produce the code & files right away.

Perfect\! Let’s summarize your **final, production-ready tech stack** for your invoice \+ payment SaaS — optimized for MVP, scalability, and later growth. I’ll also explain **why each choice** is made.

---

# **🛠 Final Full Tech Stack**

## **1️⃣ Frontend**

| Layer                          | Technology                                               | Reason / Notes                                                                                                          |
| ------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Framework                      | **Next.js 16 (App Router)**                              | Server Components, React 19, React Compiler, fast routing, SEO-friendly, can handle server-side rendering for invoices. |
| Styling                        | **Tailwind CSS \+ shadcn/ui \+ react/motion \+ tweakcn** | Rapid UI development, consistent component library.                                                                     |
| State/Data                     | **React Query**                                          | Server state management, caching, and background refetching.                                                            |
| Auth (optional frontend layer) | **By nestjs Backend apis**                               | You will handle auth in NestJS backend, frontend session can be JWT or cookie-based.                                    |
| Deployment                     | **Vercel**                                               | Free tier, optimized for Next.js, global CDN, fast frontend delivery.                                                   |

---

## **2️⃣ Backend**

| Layer        | Technology                                            | Reason / Notes                                                                                                                                     |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | **NestJS**                                            | Structured backend, supports REST APIs, webhooks, cron/jobs, multi-tenant SaaS, background workers.                                                |
| API Type     | **REST**                                              | Simpler for payment webhooks, mobile apps, public invoice endpoints.                                                                               |
| Auth         | **JWT \+ Refresh Tokens \+ Optional 2FA (Speakeasy)** | Full RBAC support (OWNER, ADMIN, MEMBER, BILLING), tenant isolation.                                                                               |
| DB ORM       | **Prisma**                                            | Type-safe, easy migrations, works perfectly with Postgres, multi-tenant ready.                                                                     |
| Database     | **Postgres (Neon.tech)**                              | Free tier for MVP, reliable relational DB for invoices, payments, and multi-tenant data.                                                           |
| Queues/Jobs  | **BullMQ \+ Upstash Redis**                           | Handles scheduled reminders, PDF generation, retries, heavy async tasks.                                                                           |
| File Storage | **Cloudflare R2**                                     | Stores user-generated files (invoice PDFs, logos, product images, exports). Optional: Supabase Storage for app assets (templates, default images). |
| Email        | **Resend (free tier)**                                | Transactional email delivery (invoice emails, reminders, receipts). Alternative: Brevo or Mailgun.                                                 |
| Payments     | **Stripe**                                            | Handles card/PayPal/bank payments, recurring payments, webhooks.                                                                                   |

---

## **3️⃣ Asset Management**

| Type                                                                 | Storage                         | Notes                                                       |
| -------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Static frontend assets (icons, logos, default images)                | **Next.js `/public` folder**    | Easy, fast, no external dependency.                         |
| App PDF templates, large static assets                               | **Supabase Storage (optional)** | Dynamic use by backend, can update without redeploy.        |
| User-generated assets (logos, invoice PDFs, product images, exports) | **Cloudflare R2**               | Cheap, scalable, global CDN, signed URLs for secure access. |

---

---

## **5️⃣ DevOps / Deployment**

| Layer            | Technology                                    | Notes                                               |
| ---------------- | --------------------------------------------- | --------------------------------------------------- |
| Frontend hosting | **Vercel**                                    | Optimized for Next.js, free tier MVP.               |
| Backend hosting  | **Railway / Render / Fly.io**                 | Free tiers, can run NestJS API \+ workers \+ Redis. |
| Postgres         | **Neon / Supabase**                           | Free tier for MVP, reliable multi-tenant DB.        |
| Redis            | **Upstash Redis**                             | Free tier, integrates with BullMQ.                  |
| Storage          | **Cloudflare R2**                             | Free-ish, cheap for growing files.                  |
| CI/CD            | **GitHub Actions**                            | Build → Test → Deploy pipelines.                    |
| Monitoring       | **Sentry / Logflare / Prometheus \+ Grafana** | Free tiers, error tracking, performance monitoring. |

---

## **6️⃣ Security & Compliance**

- **TLS everywhere** (HTTPS)

- **JWT \+ refresh tokens**

- **RBAC and tenant isolation**

- **Stripe handles PCI compliance** (don’t store card data)

- **Email authentication**: SPF, DKIM, DMARC

- **Optional 2FA** for admins

---

## **7️⃣ Architecture Summary**

\[Next.js Frontend\]  
 |  
 | REST API  
 v  
\[NestJS Backend\] \----\> \[Postgres DB\]  
 |-- BullMQ \+ Redis (jobs & reminders)  
 |-- Cloudflare R2 (user files)  
 |-- Supabase Storage (optional app assets)  
 |-- Stripe (payments)  
 |-- Resend/Brevo (emails)

- Frontend serves dashboard, invoice creation, templates

- Backend handles API, multi-tenant logic, PDFs, payments, webhooks, queues

- Assets and generated PDFs stored in object storage

- Emails & payments handled via external providers

---

## **8️⃣ Why this stack is ideal**

- Fully **scalable** for future enterprise clients

- Handles **payments, invoices, emails, PDFs, jobs, multi-tenancy**

- **Mobile-ready** if you add Expo app later

- Free/cheap for MVP

- Easy to maintain, modern TS stack

- Industry-standard architecture for SaaS

---

If you want, I can also create the **“Final MVP Folder Structure”** showing where everything goes:

- Frontend assets

- Backend modules (auth, invoices, payments, templates)

- Supabase/R2 buckets

- Jobs/queues

- PDF templates

---

## **9 Email Sequences (Resend/Brevo/SendGrid)**

**1\. Invoice Sent Email**
Subject: "New Invoice from {CompanyName} Due {dueDate}"
Body: Hi {customerName}, You have a new invoice #{number} for {total}. \[View Invoice\] \[Pay Now\]

**2\. Payment Reminder (Day before due)**
Subject: "Reminder: Invoice #{number} is due tomorrow"
Body: Hi {customerName}, Your invoice #{number} for {total} is due {dueDate}. \[Pay Now\]

**3\. Payment Overdue (Day after due)**
Subject: "Invoice #{number} is now overdue"
Body: Hi {customerName}, We noticed invoice #{number} hasn't been paid. Please review and pay. \[Pay Now\]

**4\. Payment Confirmation**
Subject: "Payment Received for Invoice #{number}"
Body: Thank you\! We received your payment of {amount} for invoice #{number}. \[View Receipt\]

**5\. Trial Reminder (SaaS subscription)**
Subject: "Your trial ends in 3 days"
Body: Hi {userName}, Your trial period ends on {endDate}. Upgrade to continue invoicing. \[Upgrade\]

**6\. Subscription Cancelled**
Subject: "We're sorry to see you go"
Body: Your subscription has been cancelled. You can reactivate anytime. \[Reactivate\]

**Email Provider Setup (Resend / Brevo / SendGrid)**
\- Pick Resend for simplicity (free 3k emails/month) or Brevo (300 emails/day free).
\- Store API keys in `.env`
\- Create templates in the provider dashboard or inline HTML in code.
\- Call from BullMQ job processor or directly from API endpoints.

---

## ** Risks & Mitigation**

| Risk                            | Mitigation                                                   |
| :------------------------------ | :----------------------------------------------------------- |
| Payment processor downtime      | Multiple providers (Stripe, PayPal). Cache status.           |
| Large file uploads slow         | Limit file size (10MB), use streaming, offload to workers.   |
| Email delivery (spam)           | Use verified domain, SPF/DKIM, reputable provider.           |
| PDF generation latency          | Offload to BullMQ job, cache PDFs, optimize HTML templates.  |
| Multi-tenancy data leaks        | Enforce tenantId checks in Prisma queries, add middleware.   |
| Scalability at 10k invoices/day | Queue system, read replicas, horizontal scaling for workers. |
| Fraudulent payments             | Webhook signature verification, idempotency keys.            |
| Security (XSS, CSRF)            | Helmet, CORS, Zod validation, JWT expiry.                    |

---

## **11 UI/UX Page Structure**

(See `AGENT/UI/UI-UX.md` for full visual design brief Supabase-inspired, dark-first, shadcn/ui with Supabase theme.)

**Dashboard** (`/dashboard`)
\- KPI cards: Total revenue, invoices sent, outstanding amount, overdue count
\- Quick actions: "New Invoice", "Add Customer"
\- Recent activity table (last 10 invoices)

**Invoices** (`/invoices`)
\- Data table with filters (status, customer, date range)
\- Bulk actions (send, delete, export CSV)
\- Row actions: View, Edit, Duplicate, Delete, Send

**Create/Edit Invoice** (`/invoices/new`, `/invoices/:id/edit`)
\- Form grid: Customer select, invoice number, due date
\- Line items table (add rows, delete rows)
\- Live preview pane (right side or modal)
\- Save draft / Send now

**Public Invoice View** (`/pay/:publicId`)
\- Minimal layout: Invoice details, line items, total
\- Prominent "Pay Now" button (Stripe Checkout or embedded form)
\- Status badge (Paid / Overdue / Pending)

**Customers** (`/customers`)
\- Data table with search
\- Side panel (Sheet) for quick edits
\- Add customer button (Dialog/Sheet)

**Payments** (`/payments`)
\- Table with filters (status, date, customer)
\- Export to CSV
\- Refund button for admins

**Templates** (`/templates`)
\- Email/PDF template editor
\- Preview toggle
\- Save versioning

**Settings** (`/settings`)
\- Tabs: General, Billing, Team, Integrations
\- Forms with validation
\- Stripe Connect onboarding link

---

## **12 Technical Implementation Plan**

**Phase 1: Core Backend (NestJS)**

1. Auth module (JWT, guards, DTOs)
2. Tenants + Users CRUD
3. Customers CRUD
4. Invoices CRUD (with line items JSON)
5. Payments module (Stripe webhook)
6. Email service (Resend/Brevo)
7. PDF service (Puppeteer)
8. BullMQ jobs (reminders, retries)

**Phase 2: Core Frontend (Next.js)**

1. Auth pages (login, signup, forgot password)
2. Dashboard shell (sidebar, topbar, cards)
3. Invoices table + filters
4. Create/Edit Invoice form
5. Public invoice view
6. Customers table
7. Payments table

**Phase 3: Payments & Webhooks**

1. Stripe integration (Checkout session, webhook handler)
2. PayPal integration (optional)
3. Payment reconciliation job
4. Refund flow

**Phase 4: Jobs & Reminders**

1. BullMQ setup (Redis)
2. Reminder jobs (day before due, overdue)
3. Email queue (retry logic)
4. PDF generation queue

**Phase 5: Multi-Tenancy & Permissions**

1. Tenant context middleware
2. RBAC (Owner, Admin, Member, Billing)
3. Invite flow
4. Audit logs

**Phase 6: Templates & Customization**

1. Template editor UI
2. Save/load templates
3. Preview email/PDF with test data
4. Version control for templates

**Phase 7: Billing & Subscription (SaaS)**

1. Stripe subscription plans
2. Usage tracking (invoices sent/month)
3. Upgrade/downgrade flow
4. Trial period logic

**Phase 8: Observability & Testing**

1. Sentry for error tracking
2. Structured logs (Winston/Pino)
3. Unit tests (Jest)
4. E2E tests (Playwright)
5. CI/CD pipeline (GitHub Actions)

---

## **1️⃣3️⃣ AI Agent Playbook**

This section guides an AI coding agent through autonomous implementation of the project. It includes turborepo architecture, package management, coding standards, definition of done, environment variables, API contracts, testing policies, and step-by-step task breakdown.

### **🏗️ Turborepo Architecture**

This project uses **Turborepo** for monorepo management with **pnpm workspaces**.

**How Turborepo Works:**

1. **Root-level package.json** defines shared scripts (`dev`, `build`, `test`, `lint`)
2. **turbo.json** configures task pipelines (dependencies, caching, outputs)
3. **pnpm-workspace.yaml** defines workspace packages (`apps/*`, `packages/*`)
4. When you run `pnpm dev` at root, Turborepo runs `dev` task in all apps simultaneously
5. Tasks are cached - if code hasn't changed, Turbo skips rebuilding

**Key Benefits:**

- Run all apps with single command (`pnpm dev` runs web + docs + api together)
- Shared dependencies in root node_modules (disk space savings)
- Incremental builds (only rebuild changed apps)
- Parallel task execution (faster CI/CD)

**Structure:**

```
finvofy/                      # Root directory
├─ apps/
│  ├─ web/                    # Next.js client (runs on port 3000)
│  ├─ docs/                   # Next.js marketing (runs on port 3002)
│  └─ api/                    # NestJS backend (runs on port 3001)
├─ packages/
│  ├─ ui/                     # Shared React components
│  ├─ types/                  # Shared TypeScript types (User, Invoice, etc.)
│  ├─ eslint-config/          # Shared ESLint configs
│  └─ typescript-config/      # Shared tsconfig.json
├─ pnpm-workspace.yaml        # Workspace definition
├─ turbo.json                 # Turbo task pipeline config
└─ package.json               # Root package with shared scripts
```

### **📦 Package Management Guidelines**

**CRITICAL: Always use `pnpm add` commands instead of hardcoding versions in package.json**

**Why:**

1. Gets latest compatible versions automatically
2. Resolves peer dependencies correctly
3. Updates lockfile properly
4. Avoids version conflicts

**Installation Patterns:**

**Root-level (shared dev tools):**

```powershell
# At root (finvofy/)
pnpm add -D turbo prettier eslint typescript
pnpm add -D -w vitest  # -w flag for workspace root
```

**App-specific packages:**

```powershell
# Install in specific app
pnpm --filter web add next react react-dom
pnpm --filter web add -D @types/react @types/node
pnpm --filter api add @nestjs/core @nestjs/common reflect-metadata

# Or navigate to app directory
cd apps/web
pnpm add next react react-dom
```

**Shared packages:**

```powershell
# Install in shared package
pnpm --filter @finvofy/types add zod
pnpm --filter @finvofy/ui add react @radix-ui/react-slot

# Use workspace protocol to link shared packages
cd apps/web
pnpm add @finvofy/types@workspace:*
pnpm add @finvofy/ui@workspace:*
```

**Key Shared Packages (install once, use everywhere):**

- `zod` - Schema validation (backend DTOs + frontend forms)
- `@finvofy/types` - Shared TypeScript interfaces (User, Invoice, Customer, Payment)
- `date-fns` - Date utilities (both frontend and backend)

### **🚀 Quickstart Commands (PowerShell)**

```powershell
# Clone and install
git clone <repo-url> finvofy; cd finvofy; pnpm install

# Start all apps simultaneously (web + docs + api)
pnpm dev

# Run specific app only
pnpm --filter web dev       # Next.js client on port 3000
pnpm --filter docs dev      # Marketing site on port 3002
pnpm --filter api dev       # NestJS backend on port 3001

# Install package in specific app
pnpm --filter web add @tanstack/react-query
pnpm --filter api add @nestjs/jwt passport-jwt

# Install shared package
pnpm --filter @finvofy/types add zod

# Use shared package in app
cd apps/web
pnpm add @finvofy/types@workspace:*

# Prisma commands (in apps/api directory)
cd apps/api
pnpm prisma migrate dev --name <migration-name>  # Create migration
pnpm prisma generate                             # Generate Prisma client
pnpm prisma studio                               # Open Prisma Studio
pnpm prisma db seed                              # Run seed script

# Build all apps
pnpm build

# Run tests
pnpm test              # All apps
pnpm --filter api test # Backend tests only

# Lint and format
pnpm lint
pnpm format

# Add dependency to root (dev tools only)
pnpm add -D -w prettier
```

### **📁 Repository Structure**

```
finvofy/
├─ apps/
│  ├─ web/            # Next.js client (dashboard, invoices, customers, payments)
│  ├─ docs/           # Next.js marketing site (landing, pricing, docs)
│  └─ api/            # NestJS backend (REST API, webhooks, jobs)
├─ packages/
│  ├─ ui/             # Shared React components (buttons, forms, tables)
│  ├─ types/          # Shared TypeScript types (User, Invoice, Payment, etc.)
│  ├─ eslint-config/  # Shared ESLint configs
│  └─ typescript-config/ # Shared tsconfig.json
├─ AGENT/             # AI agent documentation (this folder)
│  ├─ AI_AGENT_PROMPT.md
│  ├─ PROJECT_OVERVIEW.md (this file)
│  ├─ UI/
│  │  ├─ UI-UX.md
│  │  ├─ shadcn-components.md
│  │  └─ shadcn-registries.md
│  └─ BACKEND/
│     ├─ README.md
│     ├─ ENV_VARS.md
│     ├─ API.md
│     ├─ PRISMA.md
│     ├─ ARCHITECTURE.md
│     ├─ JOBS_WEBHOOKS.md
│     └─ TESTING.md
├─ pnpm-workspace.yaml
├─ turbo.json
└─ package.json
```

### **📐 Coding Standards**

1. **TypeScript:** Strict mode enabled. Use `interface` for public APIs, `type` for internal structures.
2. **Naming:**  
   \- React components: PascalCase (`InvoiceTable.tsx`)  
   \- Functions/variables: camelCase (`getUserById`)  
   \- Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)  
   \- Files: kebab-case for utilities (`date-utils.ts`), PascalCase for components (`Button.tsx`)
3. **Imports:** Absolute imports with `@/` alias for app-level imports. Group imports: React → third-party → internal.
4. **Components:** Prefer function components with hooks. Keep components under 250 lines; extract sub-components.
5. **Styling:** Tailwind utility-first. Extract complex patterns into shadcn/ui components.
6. **Error Handling:** Use try-catch in async functions. Return structured errors from API (`{ error: string, code: number }`).
7. **Comments:** Avoid obvious comments. Use JSDoc for exported functions/types.
8. **Git:** Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).

### **✅ Definition of Done (DoD)**

A task is complete when:

- Code is written and follows coding standards above.
- TypeScript compiles with no errors (`pnpm check-types`).
- ESLint passes with no warnings (`pnpm lint`).
- Unit tests written for critical logic (auth, payments, invoice calculations).
- Integration/E2E tests added for new API endpoints or user flows.
- Manual testing performed (start app, test feature in browser/Postman).
- Documentation updated (if API changes, update `AGENT/BACKEND/API.md`).
- Committed with conventional commit message.
- PR created (if multi-dev) or pushed to main (if solo).

### **🔐 Environment Variables**

See `AGENT/BACKEND/ENV_VARS.md` for the full list. Key variables:

- `DATABASE_URL` (Neon.tech Postgres connection string)
- `REDIS_URL` (Upstash Redis for BullMQ)
- `JWT_SECRET` (32+ char random string)
- `JWT_REFRESH_SECRET` (32+ char random string)
- `STRIPE_SECRET_KEY` (Stripe API key)
- `STRIPE_WEBHOOK_SECRET` (Stripe webhook signing secret)
- `RESEND_API_KEY` (Resend email provider)
- `S3_ENDPOINT` (Cloudflare R2 endpoint)
- `S3_BUCKET` (Cloudflare R2 bucket name)
- `S3_ACCESS_KEY` (Cloudflare R2 access key)
- `S3_SECRET_KEY` (Cloudflare R2 secret key)
- `FRONTEND_URL` (Next.js app URL for emails/redirects)

Create `.env` files in `apps/api/` and `apps/web/` as needed. Never commit `.env` files.

### **🔗 API Contracts**

See `AGENT/BACKEND/API.md` for full endpoint documentation. Key patterns:

- **Auth:** `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- **Invoices:** `GET /invoices`, `POST /invoices`, `GET /invoices/:id`, `PATCH /invoices/:id`, `DELETE /invoices/:id`, `POST /invoices/:id/send`
- **Customers:** `GET /customers`, `POST /customers`, `PATCH /customers/:id`, `DELETE /customers/:id`
- **Payments:** `GET /payments`, `POST /payments`, `GET /payments/:id`
- **Webhooks:** `POST /webhooks/stripe` (handles Stripe events)
- **Public:** `GET /pay/:publicId` (client-facing invoice view)

All protected routes require `Authorization: Bearer <JWT>` header. Multitenancy enforced via `tenantId` in JWT payload.

### **📊 Page → Component Mapping**

| Page           | Route                                 | Key Components                                         |
| :------------- | :------------------------------------ | :----------------------------------------------------- |
| Dashboard      | `/dashboard`                          | `KpiCard`, `RecentActivityTable`, `QuickActionButtons` |
| Invoices       | `/invoices`                           | `InvoiceTable`, `InvoiceFilters`, `BulkActions`        |
| Invoice Editor | `/invoices/new`, `/invoices/:id/edit` | `InvoiceForm`, `LineItemsTable`, `InvoicePreview`      |
| Public Invoice | `/pay/:publicId`                      | `PublicInvoiceView`, `PayButton`, `StatusBadge`        |
| Customers      | `/customers`                          | `CustomerTable`, `CustomerSheet` (side panel)          |
| Payments       | `/payments`                           | `PaymentTable`, `PaymentFilters`, `RefundButton`       |
| Templates      | `/templates`                          | `TemplateEditor`, `TemplatePreview`                    |
| Settings       | `/settings`                           | `SettingsTabs`, `SettingsForm`                         |

All components built with shadcn/ui primitives (see `AGENT/UI/shadcn-components.md` for 350+ available components).

### **🧪 Testing Policy**

- **Unit Tests:** Required for services, utilities, and complex logic (e.g., invoice total calculation, JWT issuance).
- **Integration Tests:** Required for API endpoints (use supertest in NestJS).
- **E2E Tests:** Required for critical user flows (login → create invoice → send → pay). Use Playwright.
- **Coverage Target:** 70%+ for backend services, 50%+ for frontend components.
- **Seed Data:** Maintain a `prisma/seed.ts` with demo tenant, users, customers, invoices for local testing.

### **📝 Step-by-Step Task Breakdown (Week 1-4 MVP)**

This section breaks down the MVP implementation into manageable, sequential tasks. Complete tasks in order to avoid confusion and ensure dependencies are met.

---

#### **🔹 WEEK 1: Foundation Setup**

**Task 1.1: Initialize Shared Types Package**

```powershell
# Create shared types package
cd packages/types
pnpm add zod

# Create type files
# - src/common.ts (Result<T>, ApiError, PaginatedResponse<T>)
# - src/user.ts (User, Role, Session types)
# - src/index.ts (export all)
```

**DoD:**

- TypeScript compiles without errors
- Types exported from `@finvofy/types` package
- Other apps can import with `@finvofy/types@workspace:*`

**Task 1.2: Setup Prisma & Database**

```powershell
cd apps/api
pnpm add prisma @prisma/client
pnpm add -D ts-node

# Copy schema from AGENT/BACKEND/PRISMA.md to prisma/schema.prisma
# Create .env file with DATABASE_URL (use Neon.tech free tier)
pnpm prisma migrate dev --name init
pnpm prisma generate
```

**DoD:**

- Prisma schema matches AGENT/BACKEND/PRISMA.md
- Initial migration created and applied
- Prisma Client generated successfully
- Can run `pnpm prisma studio` to view DB

**Task 1.3: Create Prisma Seed Script**

```powershell
# Create prisma/seed.ts (copy from AGENT/BACKEND/PRISMA.md)
# Add seed config to package.json
pnpm prisma db seed
```

**DoD:**

- Demo tenant created (Acme Inc)
- Owner user created (owner@acme.com / password123)
- Demo customer created (Jane Smith)
- Draft invoice created (INV-001)
- Can login with seeded credentials

**Task 1.4: Setup NestJS Auth Module**

```powershell
cd apps/api
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
pnpm add -D @types/passport-jwt @types/bcrypt

# Create auth module structure
# - auth/auth.module.ts
# - auth/auth.controller.ts
# - auth/auth.service.ts
# - auth/dto/login.dto.ts (use Zod from @finvofy/types)
# - auth/dto/signup.dto.ts
# - auth/guards/jwt-auth.guard.ts
# - auth/strategies/jwt.strategy.ts
```

**DoD:**

- POST /auth/signup creates tenant + user, returns JWT
- POST /auth/login validates credentials, returns JWT
- POST /auth/refresh rotates tokens
- POST /auth/logout invalidates refresh token
- JWT guards protect routes
- Unit tests for auth.service.ts
- Integration tests for auth endpoints

**Task 1.5: Setup Next.js Client Skeleton**

```powershell
cd apps/web
pnpm add @tanstack/react-query axios @finvofy/types@workspace:*
pnpm add -D @types/node

# Initialize shadcn/ui
pnpm dlx shadcn@latest init

# Add Supabase theme
pnpm dlx shadcn@latest add https://tweakcn.com/r/themes/supabase.json

# Create app structure
# - app/(auth)/login/page.tsx
# - app/(auth)/signup/page.tsx
# - app/(dashboard)/layout.tsx (Sidebar + Topbar shell)
# - app/(dashboard)/page.tsx (Dashboard placeholder)
# - lib/api-client.ts (axios wrapper with JWT interceptor)
```

**DoD:**

- Login page functional (calls API, stores JWT in localStorage)
- Signup page functional (creates tenant + user)
- Dashboard layout renders (sidebar + topbar)
- Protected routes redirect to login if not authenticated
- API client automatically adds JWT to requests

---

#### **🔹 WEEK 2: Customers & Invoices CRUD (Backend)**

**Task 2.1: Customers Module (Backend)**

```powershell
cd apps/api
# Create customers module
# - customers/customers.module.ts
# - customers/customers.controller.ts
# - customers/customers.service.ts
# - customers/dto/create-customer.dto.ts (use Zod)
```

**DoD:**

- GET /customers (with pagination, search)
- POST /customers (create customer)
- PATCH /customers/:id (update customer)
- DELETE /customers/:id (soft delete)
- All endpoints enforce tenantId isolation
- Integration tests for CRUD

**Task 2.2: Add Customer Types to Shared Package**

```powershell
cd packages/types
# Add src/customer.ts (Customer interface, CreateCustomerDto, UpdateCustomerDto)
# Export from src/index.ts
```

**DoD:**

- Customer types available in `@finvofy/types`
- Used in both frontend and backend

**Task 2.3: Invoices Module (Backend)**

```powershell
cd apps/api
# Create invoices module
# - invoices/invoices.module.ts
# - invoices/invoices.controller.ts
# - invoices/invoices.service.ts (implement calculateTotals, generateInvoiceNumber)
# - invoices/dto/create-invoice.dto.ts
# - invoices/dto/update-invoice.dto.ts
```

**DoD:**

- GET /invoices (with filters: status, customerId, pagination)
- POST /invoices (create invoice, auto-calculate totals)
- GET /invoices/:id (single invoice)
- PATCH /invoices/:id (update draft invoice)
- DELETE /invoices/:id (soft delete draft)
- POST /invoices/:id/send (mark as SENT, trigger email job)
- Invoice number auto-generated (INV-001, INV-002, etc.)
- Unit tests for calculateTotals and generateInvoiceNumber
- Integration tests for all endpoints

**Task 2.4: Add Invoice Types to Shared Package**

```powershell
cd packages/types
# Add src/invoice.ts (Invoice, InvoiceStatus, CreateInvoiceDto, etc.)
# Export from src/index.ts
```

---

#### **🔹 WEEK 3: Frontend - Customers & Invoices UI**

**Task 3.1: Customers Page (Frontend)**

```powershell
cd apps/web
pnpm dlx shadcn@latest add table dialog button input label form

# Create components
# - app/(dashboard)/customers/page.tsx
# - components/CustomerTable.tsx
# - components/CustomerSheet.tsx (side panel for add/edit)
```

**DoD:**

- Customers table with search, pagination
- Add customer button opens dialog/sheet
- Edit customer inline or in sheet
- Delete customer with confirmation
- Data fetched from API using TanStack Query

**Task 3.2: Invoices List Page (Frontend)**

```powershell
cd apps/web
pnpm dlx shadcn@latest add badge dropdown-menu

# Create components
# - app/(dashboard)/invoices/page.tsx
# - components/InvoiceTable.tsx
# - components/InvoiceFilters.tsx (status, customer, date range)
```

**DoD:**

- Invoices table with filters
- Status badges (DRAFT, SENT, PAID, OVERDUE)
- Row actions: View, Edit, Send, Delete
- Pagination working

**Task 3.3: Create/Edit Invoice Page (Frontend)**

```powershell
cd apps/web
pnpm dlx shadcn@latest add select card

# Create components
# - app/(dashboard)/invoices/new/page.tsx
# - app/(dashboard)/invoices/[id]/edit/page.tsx
# - components/InvoiceForm.tsx
# - components/LineItemsTable.tsx (add/remove line items)
```

**DoD:**

- Invoice form with customer select, due date, line items
- Add/remove line item rows
- Subtotal, tax, total calculated in real-time
- Save as draft or send immediately
- Navigate back to invoices list after save

---

#### **🔹 WEEK 4: Payments & Stripe Integration**

**Task 4.1: Setup Cloudflare R2 Storage**

```powershell
cd apps/api
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Create storage module
# - storage/storage.module.ts
# - storage/storage.service.ts (uploadFile, getSignedUrl, deleteFile)
# Add S3_* env vars to .env (from AGENT/BACKEND/ENV_VARS.md)
```

**DoD:**

- Can upload files to R2 bucket
- Can generate signed URLs for private files
- Can delete files

**Task 4.2: PDF Generation Module**

```powershell
cd apps/api
pnpm add puppeteer

# Create PDF module
# - pdf/pdf.module.ts
# - pdf/pdf.service.ts (generateInvoicePdf)
# - pdf/templates/invoice.html (invoice HTML template)
```

**DoD:**

- Can generate PDF from invoice data
- PDF uploaded to R2
- Invoice.pdfUrl updated with R2 URL

**Task 4.3: BullMQ Job Queues Setup**

```powershell
cd apps/api
pnpm add @nestjs/bull bull

# Create jobs module
# - jobs/jobs.module.ts
# - jobs/processors/email.processor.ts
# - jobs/processors/pdf.processor.ts
# - jobs/queues/bull.config.ts
# Add REDIS_URL to .env (Upstash Redis)
```

**DoD:**

- Email queue configured
- PDF queue configured
- Can add jobs to queue
- Jobs process successfully

**Task 4.4: Email Service Integration**

```powershell
cd apps/api
pnpm add resend

# Create email module
# - email/email.module.ts
# - email/email.service.ts (sendInvoiceEmail, sendReminderEmail, sendReceiptEmail)
# - email/templates/ (HTML email templates)
# Add RESEND_API_KEY to .env
```

**DoD:**

- Can send invoice email with PDF attachment
- Can send reminder emails
- Can send receipt emails
- Email jobs process from queue

**Task 4.5: Stripe Payments Integration**

```powershell
cd apps/api
pnpm add stripe

# Create payments module
# - payments/payments.module.ts
# - payments/payments.controller.ts
# - payments/payments.service.ts
# Create webhooks module
# - webhooks/webhooks.module.ts
# - webhooks/webhooks.controller.ts
# - webhooks/webhooks.service.ts (verify signature, process events)
# Add STRIPE_* env vars to .env
```

**DoD:**

- POST /payments creates payment record
- GET /payments lists payments
- POST /webhooks/stripe handles payment_intent.succeeded
- Invoice status updated to PAID when payment succeeds
- Receipt email sent after payment
- Webhook signature verification working

**Task 4.6: Public Invoice Payment Page**

```powershell
cd apps/web
pnpm add @stripe/stripe-js @stripe/react-stripe-js

# Create public page
# - app/pay/[publicId]/page.tsx (no auth required)
# - components/PublicInvoiceView.tsx
# - components/PayButton.tsx (Stripe Checkout integration)
```

**DoD:**

- Public invoice page accessible without login
- Shows invoice details, line items, total
- "Pay Now" button redirects to Stripe Checkout
- After payment, redirects back with success message
- Invoice status updated via webhook

---

### **📋 Task Execution Checklist**

For each task:

1. **Read Documentation:** Review relevant AGENT/\*.md files
2. **Install Packages:** Use `pnpm add` commands (never hardcode versions)
3. **Implement Code:** Follow coding standards (see below)
4. **Write Tests:** Unit + integration tests as specified in DoD
5. **Run Tests:** `pnpm test` must pass
6. **Lint:** `pnpm lint` must pass with no warnings
7. **Type Check:** `pnpm check-types` must pass
8. **Commit:** Use conventional commit message (`feat:`, `fix:`, etc.)
9. **Mark Complete:** Update task status in todo list

---

### **📝 Task Templates (Reference)**

**Example: Implement Invoice CRUD**

1. **Backend (NestJS):**
   - Create `invoices.module.ts`, `invoices.controller.ts`, `invoices.service.ts`
   - Define DTOs: `CreateInvoiceDto`, `UpdateInvoiceDto`
   - Add Prisma queries with `tenantId` filter
   - Write unit tests for service methods
   - Write integration tests for controller endpoints

2. **Frontend (Next.js):**
   - Create `/invoices` page with `InvoiceTable` component
   - Add `/invoices/new` page with `InvoiceForm` component
   - Fetch invoices with TanStack Query
   - Add filters (status, customer, date range)
   - Add row actions (Edit, Delete, Send)

3. **Shared Types:**
   - Define `Invoice` interface in `packages/types/src/invoice.ts`
   - Export from `packages/types/src/index.ts`

4. **Testing:**
   - Unit test invoice total calculation
   - Integration test `POST /invoices` endpoint
   - E2E test: Create invoice → view in table → edit → delete

5. **Documentation:**
   - Update `AGENT/BACKEND/API.md` with new endpoints
   - Update this file's "Page → Component Mapping" if needed

---

## **14 Final MVP Folder Structure**

```
finvofy/
 apps/
   web/                          # Next.js client (dashboard)
     app/
       (auth)/
         login/
           page.tsx
         signup/
           page.tsx
         forgot-password/
            page.tsx
       (dashboard)/
         layout.tsx          # Sidebar + Topbar
         page.tsx            # Dashboard page
         invoices/
           page.tsx         # Invoices table
           new/
             page.tsx     # Create invoice
           [id]/
              page.tsx     # View invoice
              edit/
                 page.tsx  # Edit invoice
         customers/
           page.tsx         # Customers table
         payments/
           page.tsx         # Payments table
         templates/
           page.tsx         # Templates editor
         settings/
            page.tsx         # Settings tabs
       pay/
         [publicId]/
            page.tsx         # Public invoice view
       layout.tsx             # Root layout
       globals.css
     components/
       ui/                    # shadcn/ui components
       Sidebar.tsx
       Topbar.tsx
       InvoiceTable.tsx
       InvoiceForm.tsx
       CustomerSheet.tsx
       ...
     lib/
       api-client.ts          # Fetch wrapper for API
       auth.ts                # JWT helpers
       utils.ts               # General utilities
     public/
     next.config.js
     tailwind.config.ts
     components.json           # shadcn config
     package.json

   docs/                         # Next.js marketing site
     app/
       page.tsx               # Landing page
       pricing/
         page.tsx
       docs/
         page.tsx
       layout.tsx
     components/
     public/
     next.config.js
     package.json

   api/                          # NestJS backend
      src/
        main.ts
        app.module.ts
        auth/
          auth.module.ts
          auth.controller.ts
          auth.service.ts
          dto/
            login.dto.ts
            signup.dto.ts
          guards/
            jwt-auth.guard.ts
          strategies/
             jwt.strategy.ts
        tenants/
          tenants.module.ts
          tenants.service.ts
          tenants.controller.ts
        users/
          users.module.ts
          users.service.ts
          users.controller.ts
        invoices/
          invoices.module.ts
          invoices.controller.ts
          invoices.service.ts
          dto/
            create-invoice.dto.ts
            update-invoice.dto.ts
          entities/
             invoice.entity.ts (Prisma type)
        customers/
          customers.module.ts
          customers.controller.ts
          customers.service.ts
          dto/
             create-customer.dto.ts
        payments/
          payments.module.ts
          payments.controller.ts
          payments.service.ts
          dto/
             create-payment.dto.ts
        webhooks/
          webhooks.module.ts
          webhooks.controller.ts
          webhooks.service.ts
        templates/
          templates.module.ts
          templates.controller.ts
          templates.service.ts
        jobs/
          jobs.module.ts
          processors/
            email.processor.ts
            reminder.processor.ts
            pdf.processor.ts
          queues/
             bull.config.ts
        email/
          email.module.ts
          email.service.ts
        pdf/
          pdf.module.ts
          pdf.service.ts
        storage/
          storage.module.ts
          storage.service.ts (Cloudflare R2)
        common/
           filters/
             http-exception.filter.ts
           interceptors/
             logging.interceptor.ts
           middleware/
             tenant-context.middleware.ts
           decorators/
              current-user.decorator.ts
      prisma/
        schema.prisma
        seed.ts
        migrations/
      test/
        app.e2e-spec.ts
        ...
      .env
      nest-cli.json
      tsconfig.json
      package.json

 packages/
   ui/                           # Shared React components
     src/
       button.tsx
       card.tsx
       index.ts
     package.json
     tsconfig.json
   types/                        # Shared TypeScript types
     src/
       user.ts
       invoice.ts
       customer.ts
       payment.ts
       common.ts
       index.ts
     package.json
     tsconfig.json
   eslint-config/                # Shared ESLint configs
     base.js
     next.js
     react-internal.js
     package.json
   typescript-config/            # Shared tsconfig
      base.json
      nextjs.json
      react-library.json
      package.json

 AGENT/                           # AI agent docs (not deployed)
   AI_AGENT_PROMPT.md
   PROJECT_OVERVIEW.md (this file)
   UI/
     UI-UX.md
     shadcn-components.md
     shadcn-registries.md
   BACKEND/
      README.md
      ENV_VARS.md
      API.md
      PRISMA.md
      ARCHITECTURE.md
      JOBS_WEBHOOKS.md
      TESTING.md

 pnpm-workspace.yaml
 turbo.json
 package.json
 .gitignore
 README.md
```

---

**End of PROJECT_OVERVIEW.md**

This document serves as the single source of truth for the Finvofy MVP. All implementation details, architecture decisions, and task guidance are documented here and in the linked `AGENT/` files. Use this as the foundation for AI-driven development.
