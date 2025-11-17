"use client";

import { AIAssistant } from "@/components/ai-assistant";
import { motion } from "motion/react";

export default function AIPage() {
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground mt-2">
          Use AI-powered tools to generate invoice descriptions, payment
          reminders, analyze data, and more
        </p>
      </motion.div>

      <AIAssistant />
    </div>
  );
}
