/**
 * BACKWARD COMPATIBILITY LAYER
 * File ini dipindahkan fungsinya ke ai-service.ts untuk mendukung multi-provider.
 * Kita tetap mempertahankan file ini agar route yang sudah ada tidak rusak.
 */

import { callAI } from './ai-service';

export async function callGemini(prompt: string) {
  const result = await callAI(prompt);
  return result ? result.text : null;
}

/**
 * Fungsi khusus untuk terjemahan (Standardisasi prompt)
 */
export async function translateIndoToEnglish(text: string) {
  if (!text) return null;
  const prompt = `Translate this Indonesian text to English. Only return the translated text, no quotes, no explanations: "${text}"`;
  return await callGemini(prompt);
}
