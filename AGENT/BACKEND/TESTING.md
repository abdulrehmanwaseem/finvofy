# Testing Strategy

This document outlines the testing approach for the Finvofy backend, including unit tests, integration tests, and E2E tests.

## Testing Levels

### 1. Unit Tests

Test individual functions and class methods in isolation.

**Tools:**

- Jest (test runner)
- `@nestjs/testing` (NestJS test utilities)

**What to test:**

- Service methods (invoice calculation, JWT issuance, etc.)
- Utility functions (date formatting, number formatting, etc.)
- Guards and decorators
- DTOs and validation schemas

**Example:**

```typescript
// invoices/invoices.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { InvoicesService } from "./invoices.service";
import { PrismaService } from "../prisma/prisma.service";

describe("InvoicesService", () => {
  let service: InvoicesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: PrismaService,
          useValue: {
            invoice: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe("calculateTotals", () => {
    it("should calculate subtotal, tax, and total correctly", () => {
      const items = [
        { description: "Item 1", quantity: 2, unitPrice: 100, taxRate: 10 },
        { description: "Item 2", quantity: 1, unitPrice: 50, taxRate: 10 },
      ];

      const result = service.calculateTotals(items);

      expect(result.subtotal).toBe(250);
      expect(result.tax).toBe(25);
      expect(result.total).toBe(275);
    });

    it("should handle zero tax rate", () => {
      const items = [
        { description: "Item 1", quantity: 1, unitPrice: 100, taxRate: 0 },
      ];

      const result = service.calculateTotals(items);

      expect(result.subtotal).toBe(100);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(100);
    });
  });

  describe("generateInvoiceNumber", () => {
    it("should generate invoice number with correct format", async () => {
      jest.spyOn(prisma.invoice, "count").mockResolvedValue(5);

      const number = await service.generateInvoiceNumber("tenant_123");

      expect(number).toBe("INV-006");
    });
  });
});
```

**Run unit tests:**

```powershell
cd apps/api
pnpm test
```

### 2. Integration Tests

Test API endpoints with a test database.

**Tools:**

- Jest
- `supertest` (HTTP assertions)
- Test Postgres database

**What to test:**

- API endpoints (request/response)
- Database operations
- Authentication flows
- Error handling

**Setup test database:**

```typescript
// test/setup.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST,
    },
  },
});

beforeAll(async () => {
  await prisma.$connect();
  // Run migrations
  // await execSync('pnpm prisma migrate deploy');
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database between tests
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
});
```

**Example:**

```typescript
// invoices/invoices.controller.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("InvoicesController (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let customerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Create test tenant and user
    const tenant = await prisma.tenant.create({
      data: { name: "Test Tenant" },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: "test@example.com",
        name: "Test User",
        passwordHash: await bcrypt.hash("password", 12),
        role: "OWNER",
      },
    });

    // Login to get auth token
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "test@example.com", password: "password" });

    authToken = loginRes.body.accessToken;

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: "Test Customer",
        email: "customer@example.com",
      },
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /invoices", () => {
    it("should create an invoice", async () => {
      const response = await request(app.getHttpServer())
        .post("/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          customerId,
          items: [
            {
              description: "Web Design",
              quantity: 1,
              unitPrice: 1000,
              taxRate: 10,
            },
          ],
          currency: "USD",
        })
        .expect(201);

      expect(response.body.invoice).toBeDefined();
      expect(response.body.invoice.number).toMatch(/INV-\d{3}/);
      expect(response.body.invoice.total).toBe(1100);
    });

    it("should return 401 without auth token", async () => {
      await request(app.getHttpServer()).post("/invoices").send({}).expect(401);
    });
  });

  describe("GET /invoices", () => {
    beforeEach(async () => {
      await prisma.invoice.create({
        data: {
          tenantId,
          customerId,
          number: "INV-001",
          items: [],
          subtotal: 1000,
          tax: 100,
          total: 1100,
          currency: "USD",
        },
      });
    });

    it("should return invoices for tenant", async () => {
      const response = await request(app.getHttpServer())
        .get("/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.invoices).toHaveLength(1);
      expect(response.body.invoices[0].number).toBe("INV-001");
    });

    it("should filter by status", async () => {
      const response = await request(app.getHttpServer())
        .get("/invoices?status=DRAFT")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.invoices).toHaveLength(1);
    });
  });
});
```

**Run integration tests:**

```powershell
cd apps/api
pnpm test:e2e
```

### 3. E2E Tests

Test complete user flows across frontend and backend.

**Tools:**

- Playwright or Cypress (frontend E2E)
- Supertest (backend API flows)

**What to test:**

- Complete user journeys (signup → create invoice → send → pay)
- Multi-step workflows
- Error handling and edge cases

**Example (API flow):**

```typescript
// test/invoice-flow.e2e-spec.ts
describe("Invoice Flow (E2E)", () => {
  it("should complete full invoice lifecycle", async () => {
    // 1. Signup
    const signupRes = await request(app.getHttpServer())
      .post("/auth/signup")
      .send({
        email: "newuser@example.com",
        password: "password123",
        name: "New User",
        tenantName: "New Tenant",
      })
      .expect(201);

    const { accessToken } = signupRes.body;

    // 2. Create customer
    const customerRes = await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "John Doe",
        email: "john@example.com",
      })
      .expect(201);

    const customerId = customerRes.body.customer.id;

    // 3. Create invoice
    const invoiceRes = await request(app.getHttpServer())
      .post("/invoices")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        customerId,
        items: [
          {
            description: "Consulting",
            quantity: 10,
            unitPrice: 150,
            taxRate: 10,
          },
        ],
      })
      .expect(201);

    const invoiceId = invoiceRes.body.invoice.id;

    // 4. Send invoice
    await request(app.getHttpServer())
      .post(`/invoices/${invoiceId}/send`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    // 5. Verify invoice status changed to SENT
    const getInvoiceRes = await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(getInvoiceRes.body.invoice.status).toBe("SENT");

    // 6. Simulate payment (webhook)
    await request(app.getHttpServer())
      .post("/webhooks/stripe")
      .set("stripe-signature", "test_signature")
      .send({
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test",
            metadata: { invoiceId, tenantId: signupRes.body.tenant.id },
            amount: 165000, // $1,650
            currency: "usd",
          },
        },
      })
      .expect(200);

    // 7. Verify invoice marked as PAID
    const paidInvoiceRes = await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(paidInvoiceRes.body.invoice.status).toBe("PAID");
    expect(paidInvoiceRes.body.invoice.paidAt).toBeDefined();
  });
});
```

## Test Coverage

**Run coverage report:**

```powershell
cd apps/api
pnpm test:cov
```

**Coverage targets:**

- Services: 70%+
- Controllers: 60%+
- Utilities: 80%+
- Overall: 65%+

**View coverage:**

```powershell
# Generate HTML report
pnpm test:cov

# Open in browser
start coverage/lcov-report/index.html
```

## Mocking & Fixtures

**Mock Prisma:**

```typescript
const mockPrisma = {
  invoice: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};
```

**Mock Queues:**

```typescript
const mockEmailQueue = {
  add: jest.fn(),
};
```

**Test Fixtures:**

```typescript
// test/fixtures/invoice.fixture.ts
export const invoiceFixture = (overrides = {}) => ({
  id: "inv_test",
  tenantId: "tenant_test",
  customerId: "customer_test",
  number: "INV-001",
  status: "DRAFT",
  currency: "USD",
  items: [
    {
      description: "Test Item",
      quantity: 1,
      unitPrice: 100,
      taxRate: 10,
      total: 110,
    },
  ],
  subtotal: 100,
  tax: 10,
  total: 110,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

## CI/CD Integration

**GitHub Actions workflow:**

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install
      - run: pnpm --filter api prisma migrate deploy
      - run: pnpm --filter api test
      - run: pnpm --filter api test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/api/coverage/lcov.info
```

## Testing Best Practices

1. **Isolation:** Each test should be independent and repeatable.
2. **Cleanup:** Clear database between tests to avoid state pollution.
3. **Fixtures:** Use test fixtures for consistent test data.
4. **Mocking:** Mock external services (Stripe, email providers) in unit tests.
5. **Test Names:** Use descriptive names (`should create invoice with correct totals`).
6. **Arrange-Act-Assert:** Structure tests with clear setup, action, and assertion phases.
7. **Fast Tests:** Keep unit tests fast (<50ms each); integration tests can be slower.
8. **CI Integration:** Run tests on every commit and PR.

## Test Commands Summary

```powershell
# Unit tests
pnpm test

# Watch mode (re-run on changes)
pnpm test:watch

# Integration tests
pnpm test:e2e

# Coverage report
pnpm test:cov

# Run specific test file
pnpm test invoices.service.spec.ts

# Run tests matching pattern
pnpm test --testNamePattern="should create invoice"
```

## Debugging Tests

**VS Code launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache", "${fileBasename}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

**Set breakpoints** in test files and press F5 to debug.

## Next Steps

1. Write unit tests for core services (invoices, auth, payments)
2. Add integration tests for all API endpoints
3. Set up E2E test for invoice payment flow
4. Configure CI pipeline with test automation
5. Monitor test coverage and improve to 70%+
