"use client";

import { useState, useCallback } from "react";
import { aiClient } from "@/lib/ai-client";

interface UseAIOptions {
  model?: string;
  onSuccess?: (response: string) => void;
  onError?: (error: Error) => void;
}

export function useAI(options: UseAIOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<string>("");

  const generate = useCallback(
    async (prompt: string, systemPrompt?: string) => {
      setLoading(true);
      setError(null);
      setResponse("");

      try {
        const result = await aiClient.chatCompletion({
          model: options.model || "gpt-4",
          messages: [
            ...(systemPrompt
              ? [{ role: "system" as const, content: systemPrompt }]
              : []),
            { role: "user" as const, content: prompt },
          ],
        });

        const content = result.choices[0].message.content;
        setResponse(content);
        options.onSuccess?.(content);
        return content;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const generateInvoiceDescription = useCallback(
    async (
      customerName: string,
      items: { description: string; quantity: number; rate: number }[]
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await aiClient.generateInvoiceDescription(
          customerName,
          items
        );
        setResponse(result);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const generatePaymentReminder = useCallback(
    async (
      customerName: string,
      invoiceNumber: string,
      amount: number,
      dueDate: string,
      tone: "friendly" | "formal" | "urgent" = "friendly"
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await aiClient.generatePaymentReminder(
          customerName,
          invoiceNumber,
          amount,
          dueDate,
          tone
        );
        setResponse(result);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResponse("");
  }, []);

  return {
    loading,
    error,
    response,
    generate,
    generateInvoiceDescription,
    generatePaymentReminder,
    reset,
  };
}
