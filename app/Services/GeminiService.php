<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected $apiKey;
    // Base URL tanpa model name
    protected $baseEndpoint = 'https://generativelanguage.googleapis.com/v1/models/';

    public function __construct()
    {
        $this->apiKey = env('GEMINI_API_KEY');
        // Clean API Key if it has quotes
        if ($this->apiKey) {
            $this->apiKey = trim($this->apiKey, '"\' ');
        }
    }

    /**
     * Generate content based on a prompt
     */
    public function generate($prompt)
    {
        if (!$this->apiKey) {
            Log::warning('Gemini API Key missing');
            return null;
        }

        // Daftar model yang dicoba berurutan
        $models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

        foreach ($models as $model) {
            try {
                $url = "{$this->baseEndpoint}{$model}:generateContent?key={$this->apiKey}";
                
                $response = Http::timeout(10)->post($url, [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt]
                            ]
                        ]
                    ]
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
                    if ($text) return $text;
                }

                Log::warning("Gemini Model {$model} failed or not found. Response: " . $response->status());
            } catch (\Exception $e) {
                Log::error("Gemini Service Exception for {$model}: " . $e->getMessage());
                continue;
            }
        }

        return null;
    }

    /**
     * Translate text from Indonesian to English
     */
    public function translateToEnglish($text)
    {
        if (empty($text)) return '';
        // Simpler prompt for better reliability
        $prompt = "Translate this Indonesian text to professional English. Return ONLY the translated text, no quotes, no explanations: \"{$text}\"";
        $result = $this->generate($prompt);
        return trim($result ?? $text);
    }

    /**
     * Generate a tagline/slogan based on app name
     */
    public function generateTagline($appName)
    {
        if (empty($appName)) return '';
        $prompt = "Buatkan 1 slogan/tagline profesional, singkat, dan menarik untuk aplikasi portal layanan bernama \"{$appName}\". Jangan gunakan tanda kutip, jangan beri penjelasan apapun, hanya slogan tersebut dalam Bahasa Indonesia.";
        $result = $this->generate($prompt);
        return trim($result ?? '');
    }
}
