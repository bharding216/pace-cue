/**
 * AI Conversation persistence — stores chat threads in Supabase
 * so users can resume conversations across app restarts.
 *
 * Each conversation is a row with a `messages` JSONB column containing
 * the full message array. Conversations are scoped to the authenticated
 * user via RLS.
 */

import { supabase } from '../analytics/supabaseClient';
import { ChatMessage } from './aiWorkoutService';

export interface StoredConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

function rowToConversation(row: ConversationRow): StoredConversation {
  return {
    id: row.id,
    title: row.title,
    messages: row.messages,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

/**
 * Auto-generate a short title from the first user message.
 * Falls back to "New Conversation" if nothing useful is found.
 */
export function deriveTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'New Conversation';

  const text = firstUserMsg.content.trim();
  if (text.length <= 40) return text;
  return text.slice(0, 37) + '…';
}

/**
 * Create a new conversation and return its ID.
 */
export async function createConversation(
  userId: string,
  messages: ChatMessage[],
): Promise<string> {
  const title = deriveTitle(messages);

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: userId,
      title,
      messages,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Update an existing conversation's messages (and title if needed).
 */
export async function updateConversation(
  conversationId: string,
  messages: ChatMessage[],
): Promise<void> {
  const title = deriveTitle(messages);

  const { error } = await supabase
    .from('ai_conversations')
    .update({
      title,
      messages,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (error) throw new Error(error.message);
}

/**
 * Load the most recent conversation for a user.
 * Returns null if there are no conversations.
 */
export async function loadLatestConversation(
  userId: string,
): Promise<StoredConversation | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return rowToConversation(data as ConversationRow);
}

/**
 * Load recent conversations (for a future history list).
 */
export async function loadConversations(
  userId: string,
  limit = 20,
): Promise<StoredConversation[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as ConversationRow[]).map(rowToConversation);
}

/**
 * Delete a conversation.
 */
export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId);

  if (error) throw new Error(error.message);
}
