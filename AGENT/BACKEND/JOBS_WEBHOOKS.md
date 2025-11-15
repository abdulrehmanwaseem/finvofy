# BullMQ Job Queues & Webhook Handling

This document covers asynchronous job processing and webhook ingestion patterns for the Finvofy backend.

## BullMQ Overview

BullMQ is a Redis-based job queue system for handling asynchronous tasks:

- Invoice reminder emails
- PDF generation
- Email sending with retries
- Payment reconciliation

## Queue Setup

**Install dependencies:**

```powershell
cd apps/api
pnpm add @nestjs/bull bull
pnpm add -D @types/bull
```

**Configure BullMQ:**

```typescript
// jobs/queues/bull.config.ts
import { BullModule } from "@nestjs/bull";
import { ConfigService } from "@nestjs/config";

export const bullConfig = BullModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    redis: {
      host: config.get("REDIS_HOST"),
      port: config.get("REDIS_PORT"),
      password: config.get("REDIS_PASSWORD"),
    },
  }),
});
```

**Register queues in `jobs.module.ts`:**

```typescript
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { EmailProcessor } from "./processors/email.processor";
import { ReminderProcessor } from "./processors/reminder.processor";
import { PdfProcessor } from "./processors/pdf.processor";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: "email" },
      { name: "reminder" },
      { name: "pdf" }
    ),
  ],
  providers: [EmailProcessor, ReminderProcessor, PdfProcessor],
  exports: [BullModule],
})
export class JobsModule {}
```

## Job Patterns

### 1. Email Queue

**Producer (add jobs to queue):**

```typescript
// invoices/invoices.service.ts
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

export class InvoicesService {
  constructor(@InjectQueue("email") private emailQueue: Queue) {}

  async sendInvoice(invoiceId: string) {
    await this.emailQueue.add(
      "send-invoice",
      {
        invoiceId,
        type: "invoice",
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );
  }
}
```

**Consumer (process jobs):**

```typescript
// jobs/processors/email.processor.ts
import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { EmailService } from "../../email/email.service";

@Processor("email")
export class EmailProcessor {
  constructor(private readonly emailService: EmailService) {}

  @Process("send-invoice")
  async handleSendInvoice(job: Job) {
    const { invoiceId } = job.data;
    await this.emailService.sendInvoiceEmail(invoiceId);
    return { success: true };
  }

  @Process("send-reminder")
  async handleSendReminder(job: Job) {
    const { invoiceId, reminderType } = job.data;
    await this.emailService.sendReminderEmail(invoiceId, reminderType);
    return { success: true };
  }
}
```

### 2. Reminder Queue

**Schedule reminder jobs:**

```typescript
// invoices/invoices.service.ts
async scheduleReminders(invoice: Invoice) {
  if (!invoice.dueDate) return;

  const threeDaysBefore = new Date(invoice.dueDate);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);

  const oneDayAfter = new Date(invoice.dueDate);
  oneDayAfter.setDate(oneDayAfter.getDate() + 1);

  await this.reminderQueue.add('send-reminder', {
    invoiceId: invoice.id,
    reminderType: 'before-due',
  }, {
    delay: threeDaysBefore.getTime() - Date.now(),
  });

  await this.reminderQueue.add('send-reminder', {
    invoiceId: invoice.id,
    reminderType: 'overdue',
  }, {
    delay: oneDayAfter.getTime() - Date.now(),
  });
}
```

**Process reminder jobs:**

```typescript
// jobs/processors/reminder.processor.ts
import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { InvoicesService } from "../../invoices/invoices.service";
import { EmailService } from "../../email/email.service";

@Processor("reminder")
export class ReminderProcessor {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly emailService: EmailService
  ) {}

  @Process("send-reminder")
  async handleReminder(job: Job) {
    const { invoiceId, reminderType } = job.data;

    const invoice = await this.invoicesService.findOne(invoiceId);

    // Skip if invoice is already paid
    if (invoice.status === "PAID") {
      return { skipped: true, reason: "Invoice already paid" };
    }

    // Send reminder email
    await this.emailService.sendReminderEmail(invoiceId, reminderType);

    // Update reminder count
    await this.invoicesService.incrementReminderCount(invoiceId);

    return { success: true };
  }
}
```

### 3. PDF Generation Queue

**Add PDF job:**

```typescript
// invoices/invoices.service.ts
async generatePdf(invoiceId: string) {
  await this.pdfQueue.add('generate-pdf', {
    invoiceId,
  }, {
    attempts: 2,
    backoff: 3000,
  });
}
```

**Process PDF job:**

```typescript
// jobs/processors/pdf.processor.ts
import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { PdfService } from "../../pdf/pdf.service";
import { InvoicesService } from "../../invoices/invoices.service";

@Processor("pdf")
export class PdfProcessor {
  constructor(
    private readonly pdfService: PdfService,
    private readonly invoicesService: InvoicesService
  ) {}

  @Process("generate-pdf")
  async handleGeneratePdf(job: Job) {
    const { invoiceId } = job.data;

    // Generate PDF
    const pdfUrl = await this.pdfService.generateInvoicePdf(invoiceId);

    // Update invoice with PDF URL
    await this.invoicesService.updatePdfUrl(invoiceId, pdfUrl);

    return { success: true, pdfUrl };
  }
}
```

## Job Options

**Retry Strategy:**

```typescript
{
  attempts: 3,              // Retry up to 3 times
  backoff: {
    type: 'exponential',   // 1s, 2s, 4s, etc.
    delay: 1000,
  },
}
```

**Delayed Jobs:**

```typescript
{
  delay: 86400000,  // 24 hours in milliseconds
}
```

**Priority:**

```typescript
{
  priority: 1,  // Lower number = higher priority
}
```

**Job Removal:**

```typescript
{
  removeOnComplete: true,   // Remove job after completion
  removeOnFail: false,       // Keep failed jobs for debugging
}
```

## Webhook Handling

### Stripe Webhook Signature Verification

**Webhook controller:**

```typescript
// webhooks/webhooks.controller.ts
import { Controller, Post, Headers, RawBodyRequest, Req } from "@nestjs/common";
import { Request } from "express";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post("stripe")
  async handleStripeWebhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    const rawBody = req.rawBody; // Requires raw body parser

    return this.webhooksService.handleStripeEvent(signature, rawBody);
  }
}
```

**Webhook service:**

```typescript
// webhooks/webhooks.service.ts
import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PaymentsService } from "../payments/payments.service";

@Injectable()
export class WebhooksService {
  private stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    private readonly paymentsService: PaymentsService
  ) {
    this.stripe = new Stripe(this.config.get("STRIPE_SECRET_KEY"), {
      apiVersion: "2023-10-16",
    });
  }

  async handleStripeEvent(signature: string, rawBody: Buffer) {
    const webhookSecret = this.config.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${err.message}`
      );
    }

    // Handle event
    switch (event.type) {
      case "payment_intent.succeeded":
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await this.handlePaymentIntentFailed(event.data.object);
        break;
      case "charge.refunded":
        await this.handleChargeRefunded(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ) {
    const invoiceId = paymentIntent.metadata.invoiceId;
    const tenantId = paymentIntent.metadata.tenantId;

    await this.paymentsService.recordPayment({
      invoiceId,
      tenantId,
      provider: "stripe",
      providerPaymentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert cents to dollars
      currency: paymentIntent.currency.toUpperCase(),
      status: "SUCCEEDED",
      method: paymentIntent.payment_method_types[0],
    });
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const invoiceId = paymentIntent.metadata.invoiceId;
    // Log failure, optionally notify customer
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    await this.paymentsService.handleRefund(charge.payment_intent as string);
  }
}
```

**Raw body parser configuration:**

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { json } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for webhook signature verification
  });

  // Use JSON parser for all routes except webhooks
  app.use(
    json({
      verify: (req, res, buf) => {
        if (req.url.startsWith("/webhooks/")) {
          req["rawBody"] = buf;
        }
      },
    })
  );

  await app.listen(3001);
}
bootstrap();
```

## Idempotency

**Store processed webhook IDs:**

```typescript
// Create a WebhookEvent model in Prisma
model WebhookEvent {
  id         String   @id @default(cuid())
  provider   String   // stripe, paypal
  eventId    String   @unique // Stripe event.id
  eventType  String
  processed  Boolean  @default(false)
  payload    Json
  createdAt  DateTime @default(now())
}
```

**Check idempotency before processing:**

```typescript
async handleStripeEvent(signature: string, rawBody: Buffer) {
  const event = this.stripe.webhooks.constructEvent(...);

  // Check if already processed
  const existing = await this.prisma.webhookEvent.findUnique({
    where: { eventId: event.id },
  });

  if (existing) {
    return { received: true, alreadyProcessed: true };
  }

  // Store event
  await this.prisma.webhookEvent.create({
    data: {
      provider: 'stripe',
      eventId: event.id,
      eventType: event.type,
      payload: event,
    },
  });

  // Process event...

  // Mark as processed
  await this.prisma.webhookEvent.update({
    where: { eventId: event.id },
    data: { processed: true },
  });

  return { received: true };
}
```

## Monitoring & Debugging

**Bull Dashboard (optional):**

```powershell
pnpm add @bull-board/api @bull-board/nestjs
```

```typescript
// app.module.ts
import { BullBoardModule } from "@bull-board/nestjs";
import { BullAdapter } from "@bull-board/api/bullAdapter";

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: "/admin/queues",
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: "email",
      adapter: BullAdapter,
    }),
    // ... other queues
  ],
})
export class AppModule {}
```

Access dashboard at `http://localhost:3001/admin/queues`.

**Job Events:**

```typescript
@Processor("email")
export class EmailProcessor {
  @OnQueueActive()
  onActive(job: Job) {
    console.log(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    console.log(`Job ${job.id} completed with result:`, result);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error) {
    console.error(`Job ${job.id} failed:`, error);
  }
}
```

## Best Practices

1. **Retry Strategy:** Use exponential backoff for transient failures.
2. **Timeouts:** Set job timeouts to prevent stuck jobs.
3. **Idempotency:** Always check if webhook has been processed before.
4. **Payload Validation:** Verify webhook signatures before processing.
5. **Error Handling:** Log failures, send alerts for critical jobs.
6. **Queue Priority:** Use priorities for time-sensitive jobs (payment confirmations).
7. **Job Cleanup:** Remove completed jobs to prevent Redis memory issues.
8. **Monitoring:** Track queue depth, processing time, failure rate.

## Testing Jobs

**Mock queue in tests:**

```typescript
// invoices.service.spec.ts
import { Test } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bull";

const mockQueue = {
  add: jest.fn(),
};

const module = await Test.createTestingModule({
  providers: [
    InvoicesService,
    {
      provide: getQueueToken("email"),
      useValue: mockQueue,
    },
  ],
}).compile();

// Test
it("should add email job to queue", async () => {
  await service.sendInvoice("inv_123");
  expect(mockQueue.add).toHaveBeenCalledWith("send-invoice", {
    invoiceId: "inv_123",
  });
});
```
