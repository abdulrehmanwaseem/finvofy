/**
 * AI Client for interacting with Copilot API Proxy
 * Supports GPT, Claude, and Gemini models
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicOptions {
  model: string;
  messages: AnthropicMessage[];
  max_tokens?: number;
  temperature?: number;
  system?: string;
}

export class AIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(
    baseUrl: string = "http://localhost:4141",
    apiKey: string = "dummy"
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Get available models
   */
  async getModels(): Promise<{ id: string; object: string }[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching models:", error);
      throw error;
    }
  }

  /**
   * OpenAI-compatible chat completion (GPT models)
   */
  async chatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2000,
          stream: options.stream ?? false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat completion failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error in chat completion:", error);
      throw error;
    }
  }

  /**
   * Anthropic-compatible messages API (Claude models)
   */
  async anthropicMessages(options: AnthropicOptions): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          max_tokens: options.max_tokens ?? 2000,
          temperature: options.temperature ?? 0.7,
          system: options.system,
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic messages failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error in Anthropic messages:", error);
      throw error;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/usage`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch usage: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching usage:", error);
      throw error;
    }
  }

  /**
   * Generate invoice description using AI
   */
  async generateInvoiceDescription(
    customerName: string,
    items: { description: string; quantity: number; rate: number }[]
  ): Promise<string> {
    const itemsText = items
      .map((item) => `${item.quantity}x ${item.description} at $${item.rate}`)
      .join(", ");

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a professional invoice assistant. Generate clear, professional invoice descriptions.",
      },
      {
        role: "user",
        content: `Generate a professional invoice description for ${customerName} with the following items: ${itemsText}`,
      },
    ];

    const response = await this.chatCompletion({
      model: "gpt-4",
      messages,
      max_tokens: 200,
    });

    return response.choices[0].message.content;
  }

  /**
   * Generate payment reminder email using AI
   */
  async generatePaymentReminder(
    customerName: string,
    invoiceNumber: string,
    amount: number,
    dueDate: string,
    tone: "friendly" | "formal" | "urgent" = "friendly"
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a professional email assistant. Generate ${tone} payment reminder emails.`,
      },
      {
        role: "user",
        content: `Write a ${tone} payment reminder email for ${customerName}. Invoice #${invoiceNumber}, amount $${amount}, due date ${dueDate}.`,
      },
    ];

    const response = await this.chatCompletion({
      model: "gpt-4",
      messages,
      max_tokens: 300,
    });

    return response.choices[0].message.content;
  }

  /**
   * Analyze invoice data and provide insights
   */
  async analyzeInvoiceData(invoiceData: any[]): Promise<string> {
    const summary = {
      totalInvoices: invoiceData.length,
      totalAmount: invoiceData.reduce((sum, inv) => sum + inv.amount, 0),
      paidCount: invoiceData.filter((inv) => inv.status === "PAID").length,
      overdueCount: invoiceData.filter((inv) => inv.status === "OVERDUE")
        .length,
    };

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a financial analyst. Provide concise insights and recommendations based on invoice data.",
      },
      {
        role: "user",
        content: `Analyze this invoice data and provide insights: ${JSON.stringify(summary)}`,
      },
    ];

    const response = await this.chatCompletion({
      model: "gpt-4",
      messages,
      max_tokens: 400,
    });

    return response.choices[0].message.content;
  }

  /**
   * Generate smart invoice terms based on customer history
   */
  async generateInvoiceTerms(customerHistory: {
    averagePaymentDays: number;
    latePaymentCount: number;
    totalInvoices: number;
  }): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a payment terms specialist. Generate appropriate invoice payment terms based on customer payment history.",
      },
      {
        role: "user",
        content: `Customer pays in ${customerHistory.averagePaymentDays} days on average, has ${customerHistory.latePaymentCount} late payments out of ${customerHistory.totalInvoices} invoices. Suggest appropriate payment terms.`,
      },
    ];

    const response = await this.chatCompletion({
      model: "gpt-4",
      messages,
      max_tokens: 200,
    });

    return response.choices[0].message.content;
  }
}

// Export singleton instance
export const aiClient = new AIClient();

// Export model constants
export const AI_MODELS = {
  GPT: {
    GPT5: "gpt-5",
    GPT5_1: "gpt-5.1",
    GPT5_1_CODEX: "gpt-5.1-codex",
    GPT5_1_CODEX_MINI: "gpt-5.1-codex-mini",
    GPT5_CODEX: "gpt-5-codex",
    GPT4: "gpt-4",
    GPT4_TURBO: "gpt-4-turbo",
    GPT35: "gpt-3.5-turbo",
  },
  CLAUDE: {
    HAIKU_4_5: "claude-haiku-4.5",
    SONNET_4_5: "claude-sonnet-4.5",
    SONNET_4: "claude-sonnet-4",
    OPUS_3: "claude-3-opus",
    SONNET_3: "claude-3-sonnet",
    HAIKU_3: "claude-3-haiku",
  },
  GEMINI: {
    PRO_2_5: "gemini-2.5-pro",
    PRO: "gemini-pro",
    ULTRA: "gemini-ultra",
  },
} as const;
