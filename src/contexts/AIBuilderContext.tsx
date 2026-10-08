/**
 * Persists AI Builder conversation state across modal open / close
 * AND across app restarts via Supabase.
 *
 * On mount (when a user is signed in) the most recent conversation is
 * loaded from the cloud.  Every time the messages array changes the
 * conversation is auto-saved — either by creating a new row or updating
 * the existing one.
 *
 * Call `clearConversation()` to start a fresh thread.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { ChatMessage, AIContext } from '../ai/aiWorkoutService';
import {
  createConversation,
  updateConversation,
  loadLatestConversation,
} from '../ai/conversationStorage';
import { useAuth } from './AuthContext';

interface AIBuilderState {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  aiContext: AIContext | null;
  setAiContext: React.Dispatch<React.SetStateAction<AIContext | null>>;
  clearConversation: () => void;
  /** True while the initial cloud load is in progress */
  loadingConversation: boolean;
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
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [aiContext, setAiContext] = useState<AIContext | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);

  // Track the current Supabase conversation row ID so we know whether
  // to INSERT (null) or UPDATE (existing ID) when persisting.
  const conversationIdRef = useRef<string | null>(null);

  // Guard to avoid persisting the initial welcome-only state before
  // the cloud load has had a chance to run.
  const hasLoadedRef = useRef(false);

  // ── Load most recent conversation on sign-in ──────────────
  useEffect(() => {
    if (!user) {
      // Signed out — reset to welcome state
      conversationIdRef.current = null;
      hasLoadedRef.current = false;
      setMessages([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
      return;
    }

    let cancelled = false;
    setLoadingConversation(true);

    (async () => {
      try {
        const latest = await loadLatestConversation(user.id);
        if (cancelled) return;

        if (latest && latest.messages.length > 1) {
          conversationIdRef.current = latest.id;
          setMessages(latest.messages);
        }
      } catch (err) {
        console.warn('Failed to load AI conversation:', err);
      } finally {
        if (!cancelled) {
          hasLoadedRef.current = true;
          setLoadingConversation(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ── Auto-save whenever messages change ────────────────────
  // Uses a debounce ref so rapid setMessages calls (user msg → AI msg)
  // don't fire multiple writes.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !hasLoadedRef.current) return;

    // Don't save if it's only the welcome message
    const hasUserContent = messages.some((m) => m.role === 'user');
    if (!hasUserContent) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        if (conversationIdRef.current) {
          await updateConversation(conversationIdRef.current, messages);
        } else {
          const newId = await createConversation(user.id, messages);
          conversationIdRef.current = newId;
        }
      } catch (err) {
        console.warn('Failed to save AI conversation:', err);
      }
    }, 600);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, user?.id]);

  // ── Clear / new conversation ──────────────────────────────
  const clearConversation = useCallback(() => {
    conversationIdRef.current = null;
    setMessages([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
  }, []);

  return (
    <AIBuilderContext.Provider
      value={{
        messages,
        setMessages,
        aiContext,
        setAiContext,
        clearConversation,
        loadingConversation,
      }}
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
