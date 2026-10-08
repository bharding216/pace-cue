/**
 * Persists AI Builder conversation state across modal open / close.
 *
 * The messages array and AI context live here instead of inside the
 * ai-builder screen component, so closing the sheet doesn't lose
 * the conversation. Call `clearConversation()` to start fresh.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ChatMessage, AIContext } from '../ai/aiWorkoutService';

interface AIBuilderState {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  aiContext: AIContext | null;
  setAiContext: React.Dispatch<React.SetStateAction<AIContext | null>>;
  clearConversation: () => void;
}

const AIBuilderContext = createContext<AIBuilderState | null>(null);

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hey! 👋 I\'m your AI workout builder. Tell me what kind of interval workout you want and I\'ll create it for you.\n\nTry something like:\n• "30 minute tempo run"\n• "Speed work with 400m repeats"\n• "Easy beginner intervals"',
  timestamp: Date.now(),
};

export function AIBuilderProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [aiContext, setAiContext] = useState<AIContext | null>(null);

  const clearConversation = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
  }, []);

  return (
    <AIBuilderContext.Provider
      value={{ messages, setMessages, aiContext, setAiContext, clearConversation }}
    >
      {children}
    </AIBuilderContext.Provider>
  );
}

export function useAIBuilder(): AIBuilderState {
  const ctx = useContext(AIBuilderContext);
  if (!ctx) throw new Error('useAIBuilder must be used inside AIBuilderProvider');
  return ctx;
}
