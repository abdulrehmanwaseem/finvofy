"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aiClient, AI_MODELS } from "@/lib/ai-client";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";

type ModelProvider = "gpt" | "claude" | "gemini";
type PromptType = "invoice" | "reminder" | "analysis" | "terms" | "custom";

export function AIAssistant() {
  const [provider, setProvider] = useState<ModelProvider>("claude");
  const [model, setModel] = useState<string>("claude-sonnet-4.5");
  const [promptType, setPromptType] = useState<PromptType>("custom");
  const [prompt, setPrompt] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const modelsByProvider = {
    gpt: [
      { value: "gpt-5", label: "GPT-5" },
      { value: "gpt-5.1", label: "GPT-5.1 (Preview)" },
      { value: "gpt-5.1-codex", label: "GPT-5.1-Codex (Preview)" },
      { value: "gpt-5.1-codex-mini", label: "GPT-5.1-Codex-Mini (Preview)" },
      { value: "gpt-5-codex", label: "GPT-5-Codex (Preview)" },
      { value: "gpt-4", label: "GPT-4" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
    claude: [
      { value: "claude-haiku-4.5", label: "Claude Haiku 4.5" },
      { value: "claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
      { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
      { value: "claude-3-opus", label: "Claude 3 Opus" },
      { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
      { value: "claude-3-haiku", label: "Claude 3 Haiku" },
    ],
    gemini: [
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "gemini-pro", label: "Gemini Pro" },
      { value: "gemini-ultra", label: "Gemini Ultra" },
    ],
  };

  const promptTemplates = {
    invoice: {
      label: "Generate Invoice Description",
      placeholder:
        'Enter details: "Customer: John Doe, Items: 5x Web Design at $100, 2x Logo Design at $50"',
    },
    reminder: {
      label: "Generate Payment Reminder",
      placeholder:
        'Enter details: "Customer: Jane Smith, Invoice: INV-001, Amount: $500, Due: 2024-01-15, Tone: friendly"',
    },
    analysis: {
      label: "Analyze Invoice Data",
      placeholder:
        "Enter invoice data in JSON format or describe the data you want analyzed",
    },
    terms: {
      label: "Generate Payment Terms",
      placeholder:
        'Enter customer history: "Average payment: 45 days, Late payments: 3 out of 10 invoices"',
    },
    custom: {
      label: "Custom Prompt",
      placeholder: "Enter your custom prompt here...",
    },
  };

  const handleProviderChange = (newProvider: ModelProvider) => {
    setProvider(newProvider);
    // Set default model for the new provider
    setModel(modelsByProvider[newProvider][0].value);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse("");

    try {
      let result: string;

      if (provider === "claude") {
        // Use Anthropic API for Claude
        const anthropicResponse = await aiClient.anthropicMessages({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
        });
        result = anthropicResponse.content[0].text;
      } else {
        // Use OpenAI API for GPT and Gemini
        const chatResponse = await aiClient.chatCompletion({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful AI assistant for invoice management and financial tasks.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 2000,
        });
        result = chatResponse.choices[0].message.content;
      }

      setResponse(result);
    } catch (error) {
      console.error("Error generating response:", error);
      setResponse(
        "Error: Failed to generate response. Please ensure the Copilot API proxy is running at http://localhost:4141"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!response) return;

    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadQuickExample = (type: PromptType) => {
    const examples = {
      invoice:
        "Generate a professional invoice description for ABC Corp with the following items: 10x Consulting Hours at $150, 5x Design Mockups at $200",
      reminder:
        "Write a friendly payment reminder email for Tech Startup Inc. Invoice #INV-2024-001, amount $2,500, due date January 20, 2024",
      analysis:
        "Analyze invoice data: Total: 45 invoices, $125,000 total amount, 35 paid, 5 overdue, 5 pending",
      terms:
        "Customer pays in 60 days on average, has 8 late payments out of 25 invoices. Suggest appropriate payment terms.",
      custom: "",
    };

    setPrompt(examples[type]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Assistant</CardTitle>
          </div>
          <CardDescription>
            Powered by GitHub Copilot API - Generate invoices, reminders, and
            insights using GPT, Claude, or Gemini
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => handleProviderChange(v as ModelProvider)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt">GPT (OpenAI)</SelectItem>
                  <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                  <SelectItem value="gemini">Gemini (Google)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelsByProvider[provider].map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prompt Type Selection */}
          <Tabs
            value={promptType}
            onValueChange={(v) => setPromptType(v as PromptType)}
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="custom">Custom</TabsTrigger>
              <TabsTrigger value="invoice">Invoice</TabsTrigger>
              <TabsTrigger value="reminder">Reminder</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
            </TabsList>

            <TabsContent value={promptType} className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{promptTemplates[promptType].label}</Label>
                  {promptType !== "custom" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadQuickExample(promptType)}
                      className="h-8 text-xs"
                    >
                      Load Example
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder={promptTemplates[promptType].placeholder}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate with {provider.toUpperCase()}
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          {/* Response */}
          {response && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <Label>Response</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {response}
                </p>
              </div>
            </motion.div>
          )}

          {/* Info Banner */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Make sure the Copilot API proxy is running
              at{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted">
                http://localhost:4141
              </code>
              <br />
              Start it with:{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted">
                npx copilot-api@latest start
              </code>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
