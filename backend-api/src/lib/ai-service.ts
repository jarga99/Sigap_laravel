/**
 * CENTRALIZED MULTI-PROVIDER AI GATEWAY
 * Logic ini menangani pembagian tugas ke berbagai provider AI (Gemini, Groq, OpenRouter)
 * dengan sistem fallback otomatis jika salah satu provider gagal/limit habis.
 */

interface AIResponse {
  text: string | null;
  provider: string;
  model: string;
}

export async function callAI(prompt: string): Promise<AIResponse | null> {
  if (!prompt) return null;

  // Urutan Provider: Ganti urutan di sini jika ingin mengubah prioritas
  const providers = [
    { name: 'GEMINI', execute: callGeminiInternal },
    { name: 'GROQ', execute: callGroqInternal },
    { name: 'OPENROUTER', execute: callOpenRouterInternal }
  ];

  for (const provider of providers) {
    try {
      console.log(`[AI_GATEWAY] Mencoba provider: ${provider.name}...`);
      const result = await provider.execute(prompt);
      
      if (result) {
        console.log(`[AI_GATEWAY] Sukses menggunakan ${provider.name}`);
        return {
          text: result.text,
          provider: provider.name,
          model: result.model
        };
      }
    } catch (error: any) {
      console.warn(`[AI_GATEWAY] Provider ${provider.name} gagal: ${error.message}`);
      // Lanjut ke provider berikutnya
      continue;
    }
  }

  console.error("[AI_GATEWAY] Semua provider AI gagal.");
  return null;
}

/**
 * 1. GOOGLE GEMINI HANDLER
 */
async function callGeminiInternal(prompt: string) {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  apiKey = apiKey.replace(/^["']|["']$/g, '').trim();

  // Model gemini-2.5-flash terverifikasi tersedia di endpoint v1beta
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  
  for (const model of models) {
    try {
      console.log(`[AI_GATEWAY] Mencoba Gemini Model: ${model}`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(10000) // 10s Timeout
      });

      if (!response.ok) {
        const errData = await response.json();
        console.warn(`[AI_GATEWAY] Gemini ${model} Error ${response.status}: ${JSON.stringify(errData)}`);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return { text, model };
    } catch (err: any) { 
      console.warn(`[AI_GATEWAY] Gemini ${model} Request failed: ${err.message}`);
      continue; 
    }
  }
  return null;
}

/**
 * 2. GROQ HANDLER (Ultra Fast & Multiple Models)
 */
async function callGroqInternal(prompt: string) {
  let apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  apiKey = apiKey.replace(/^["']|["']$/g, '').trim();

  // Daftar model Groq yang akan dicoba berurutan
  const models = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'llama3-8b-8192'];

  for (const model of models) {
    try {
      console.log(`[AI_GATEWAY] Mencoba Groq Model: ${model}`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 500
        }),
        signal: AbortSignal.timeout(10000) // 10s Timeout
      });

      if (!response.ok) {
        console.warn(`[AI_GATEWAY] Groq ${model} API Error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return { text, model };
    } catch (err: any) { 
      console.warn(`[AI_GATEWAY] Groq ${model} Request failed: ${err.message}`);
      continue; 
    }
  }
  return null;
}

/**
 * 3. OPENROUTER HANDLER (Benteng pertahanan paling berlapis)
 */
async function callOpenRouterInternal(prompt: string) {
  let apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  apiKey = apiKey.replace(/^["']|["']$/g, '').trim();

  // Daftar model GRATIS di OpenRouter (selalu update)
  const models = [
    'google/gemini-2.0-flash-exp:free',
    'deepseek/deepseek-chat:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'qwen/qwen-2.5-72b-instruct:free',
    'mistralai/mistral-7b-instruct:free'
  ];

  for (const model of models) {
    try {
      console.log(`[AI_GATEWAY] Mencoba OpenRouter Model: ${model}`);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://sigap.id',
          'X-Title': 'Sigap Platform'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500
        }),
        signal: AbortSignal.timeout(10000) // 10s Timeout
      });

      if (!response.ok) {
        console.warn(`[AI_GATEWAY] OpenRouter ${model} API Error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return { text, model };
    } catch (err: any) { 
      console.warn(`[AI_GATEWAY] OpenRouter ${model} Request failed: ${err.message}`);
      continue; 
    }
  }
  return null;
}
