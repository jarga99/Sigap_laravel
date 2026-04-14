/**
 * CENTRALIZED GEMINI AI UTILITY
 * Logic ini menangani pemanggilan Google Gemini dengan sistem multi-model fallback,
 * pembersihan API Key otomatis, dan error handling yang seragam.
 */

export async function callGemini(prompt: string) {
  if (!prompt) return null;
  
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[GEMINI_LIB] API Key tidak ditemukan di environment.");
    return null;
  }
  
  // Bersihkan API Key dari tanda kutip atau spasi
  apiKey = apiKey.replace(/^["']|["']$/g, '').trim();

  /**
   * Daftar model yang akan dicoba secara berurutan.
   * Urutan ini didasarkan pada stabilitas Free Tier yang ditemukan selama pengujian.
   */
  const modelsToTry = [
    'gemini-2.0-flash-exp', // Terbaru & Tercepat
    'gemini-1.5-flash',     // Stabil (Fixed typo from 2.5)
    'gemini-flash-latest'   // Fallback umum
  ];
  
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.warn(`[GEMINI_LIB] Model ${model} gagal:`, data.error.message);
        lastError = data.error.message;
        
        // Jika errornya adalah Quota Exceeded atau API Key Expired, kita tetap coba model lain
        // tapi log tetap disimpan
        continue;
      }

      const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (result) {
        console.log(`[GEMINI_LIB] Sukses menggunakan model: ${model}`);
        return result;
      }
      
    } catch (err: any) {
      console.error(`[GEMINI_LIB] Fetch error pada model ${model}:`, err.message);
      lastError = err.message;
    }
  }

  console.error("[GEMINI_LIB] Semua model gagal dicoba. Error terakhir:", lastError);
  return null;
}

/**
 * Fungsi pembantu khusus untuk terjemahan (Standardisasi prompt)
 */
export async function translateIndoToEnglish(text: string) {
  if (!text) return null;
  const prompt = `Translate this Indonesian text to English. Only return the translated text, no quotes, no explanations: "${text}"`;
  return await callGemini(prompt);
}
