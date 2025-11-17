# AI Assistant Integration Guide

This guide explains how to integrate and use the AI Assistant features in Finvofy using the GitHub Copilot API proxy.

## Overview

Finvofy includes an AI Assistant that leverages GitHub Copilot API to provide access to multiple AI models:

- **GPT Models** (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
- **Claude Models** (Claude 3 Opus, Sonnet, Haiku)
- **Gemini Models** (Gemini Pro, Gemini Ultra)

## Prerequisites

1. **GitHub Copilot Subscription**
   - Individual, Business, or Enterprise plan
   - Active GitHub account

2. **Node.js/Bun Runtime**
   - Bun >= 1.2.x (recommended)
   - OR Node.js >= 18.x

## Setup Instructions

### Step 1: Install Copilot API Proxy

The easiest way to get started is using npx:

```bash
npx copilot-api@latest start
```

This will:

1. Prompt you to authenticate with GitHub (if not already authenticated)
2. Start the proxy server on `http://localhost:4141`
3. Display a usage dashboard URL

### Step 2: Verify the Proxy is Running

Open your browser and visit:

```
http://localhost:4141/usage
```

You should see your Copilot usage statistics.

### Step 3: Start Using AI in Finvofy

1. Navigate to the **AI Assistant** page in your dashboard
2. Select your preferred AI provider (GPT, Claude, or Gemini)
3. Choose a model
4. Select a prompt type or create a custom prompt
5. Click "Generate" to get AI-powered responses

## Features

### 1. Generate Invoice Descriptions

Automatically create professional invoice descriptions based on customer name and items.

**Example:**

```
Customer: ABC Corp
Items: 10x Consulting Hours at $150, 5x Design Mockups at $200
```

**Output:**

```
Professional consulting and design services for ABC Corp including 10 hours of strategic consulting at $150 per hour and 5 comprehensive design mockups at $200 each, totaling $2,500.
```

### 2. Payment Reminder Emails

Generate friendly, formal, or urgent payment reminder emails.

**Example:**

```
Customer: Tech Startup Inc
Invoice: INV-2024-001
Amount: $2,500
Due Date: January 20, 2024
Tone: friendly
```

**Output:**

```
Hi Tech Startup Inc,

I hope this message finds you well! This is a friendly reminder that Invoice INV-2024-001 for $2,500 is due on January 20, 2024.

If you've already processed this payment, please disregard this message. Otherwise, we'd appreciate if you could settle the outstanding amount at your earliest convenience.

Feel free to reach out if you have any questions!

Best regards
```

### 3. Invoice Data Analysis

Analyze invoice trends and get actionable insights.

**Example:**

```
Total: 45 invoices
Amount: $125,000
Paid: 35
Overdue: 5
Pending: 5
```

**Output:**

```
Your invoice data shows strong performance with a 78% payment rate. However, the 11% overdue rate (5 invoices) requires attention. Consider implementing automated reminders for overdue invoices and offering early payment incentives to improve cash flow.
```

### 4. Payment Terms Generation

Get smart payment term recommendations based on customer history.

**Example:**

```
Average payment: 60 days
Late payments: 8 out of 25 invoices
```

**Output:**

```
Based on the customer's payment history, I recommend implementing Net 30 terms with a 2% early payment discount for payments within 10 days. Consider requiring a 50% deposit for future projects and implementing automated payment reminders at the 15-day and 25-day marks.
```

### 5. Custom Prompts

Use the AI for any invoice-related task or question.

## Advanced Configuration

### Running with Custom Port

```bash
npx copilot-api@latest start --port 8080
```

Then update the AI client in `apps/web/lib/ai-client.ts`:

```typescript
export const aiClient = new AIClient("http://localhost:8080");
```

### Rate Limiting

To avoid hitting GitHub's rate limits:

```bash
# Wait 30 seconds between requests
npx copilot-api@latest start --rate-limit 30 --wait
```

### Using with Business/Enterprise Plan

```bash
npx copilot-api@latest start --account-type business
# or
npx copilot-api@latest start --account-type enterprise
```

### Manual Request Approval

Enable manual approval for each request:

```bash
npx copilot-api@latest start --manual
```

### Verbose Logging

```bash
npx copilot-api@latest start --verbose
```

## API Usage

### TypeScript/JavaScript

```typescript
import { aiClient, AI_MODELS } from "@/lib/ai-client";

// Generate invoice description
const description = await aiClient.generateInvoiceDescription("Customer Name", [
  { description: "Web Design", quantity: 1, rate: 1000 },
  { description: "Logo Design", quantity: 1, rate: 500 },
]);

// Generate payment reminder
const reminder = await aiClient.generatePaymentReminder(
  "Customer Name",
  "INV-001",
  1500,
  "2024-01-20",
  "friendly"
);

// Custom chat completion
const response = await aiClient.chatCompletion({
  model: AI_MODELS.GPT.GPT4,
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Generate an invoice for..." },
  ],
  max_tokens: 500,
});
```

## Troubleshooting

### Error: "Failed to generate response"

**Solution:** Ensure the Copilot API proxy is running:

```bash
npx copilot-api@latest start
```

### Error: "Rate limit exceeded"

**Solution:** Use rate limiting:

```bash
npx copilot-api@latest start --rate-limit 30 --wait
```

### Error: "Authentication failed"

**Solution:** Re-authenticate:

```bash
npx copilot-api@latest auth
```

### Proxy Not Starting

**Solution:** Check if port 4141 is already in use:

```bash
# Windows PowerShell
Get-NetTCPConnection -LocalPort 4141

# Use a different port
npx copilot-api@latest start --port 8080
```

## Best Practices

1. **Use Rate Limiting**: Avoid excessive requests to prevent GitHub account warnings
2. **Choose Appropriate Models**:
   - GPT-4: Complex tasks, high-quality output
   - GPT-3.5 Turbo: Fast responses, simpler tasks
   - Claude: Creative writing, detailed analysis
   - Gemini: Balanced performance
3. **Cache Responses**: Store frequently used responses to reduce API calls
4. **Handle Errors Gracefully**: Always implement proper error handling
5. **Monitor Usage**: Check the usage dashboard regularly

## Security Notes

⚠️ **Important:**

- Never commit GitHub tokens to version control
- Use environment variables for sensitive data
- The proxy runs locally - no data is sent to third parties
- Review GitHub's Acceptable Use Policies

## Resources

- [Copilot API Proxy GitHub](https://github.com/ericc-ch/copilot-api)
- [GitHub Copilot Terms](https://docs.github.com/en/copilot/overview-of-github-copilot/about-github-copilot-for-individuals)
- [Usage Dashboard](https://ericc-ch.github.io/copilot-api?endpoint=http://localhost:4141/usage)

## Support

For issues with:

- **Finvofy AI Integration**: Open an issue in your Finvofy repository
- **Copilot API Proxy**: Visit [copilot-api issues](https://github.com/ericc-ch/copilot-api/issues)
- **GitHub Copilot**: Contact GitHub Support
