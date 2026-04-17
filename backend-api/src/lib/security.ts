import { NextResponse } from 'next/server';

// Daftar domain yang diizinkan (Base64 Obfuscated)
// Nilai default: L2xvY2FsaG9zdDozMDAwfA== (localhost:3000|)
const AUTH_KEY = "WkdWMmJXbHVZVzVrWlhOZllXUnRhVzQ9"; // 'developer_admin_sigap' in double base64
const WHITELIST_B64 = "bG9jYWxob3N0OjMwMDB8MTI3LjAuMC4xfHVwdGJsa3Bhc3VydWFuLmNvbQ==";

export function getAuthorizedDomains(): string[] {
  const domains: string[] = [];
  
  // 1. Ambil dari Whitelist Tersembunyi (Hardcoded Fallback)
  try {
    const hidden = Buffer.from(WHITELIST_B64, 'base64').toString().split('|');
    domains.push(...hidden);
  } catch {
    domains.push('localhost:3000');
  }

  // 2. Ambil dari Environment Variable (Mudah diatur oleh Developer)
  const envDomains = process.env.ALLOWED_DOMAINS;
  if (envDomains) {
    domains.push(...envDomains.split(',').map(d => d.trim()));
  }

  return [...new Set(domains)]; // Pastikan unik
}

export async function reportUnauthorized(host: string, url: string) {
  const webhookUrl = process.env.SECURITY_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: "🚨 DETEKSI PENGGUNAAN ILEGAL",
          color: 15158332,
          fields: [
            { name: "Domain/Host", value: host || "Unknown", inline: true },
            { name: "Endpoint", value: url, inline: true },
            { name: "Waktu", value: new Date().toLocaleString('id-ID'), inline: false },
            { name: "Status", value: "Sistem Terkunci / Peringatan Aktif", inline: false }
          ],
          footer: { text: "SIGAP Security Monitor" }
        }]
      })
    });
  } catch (err) {
    // Silent fail
  }
}

export function isAuthorized(host: string): boolean {
  if (!host) return false;
  
  // Clean host (remove port for comparison if needed, but let's keep it for now as per current spec)
  const cleanHost = host.toLowerCase().trim();
  const authorized = getAuthorizedDomains();
  
  return authorized.some(domain => {
    const d = domain.toLowerCase().trim();
    return cleanHost === d || cleanHost.endsWith('.' + d);
  });
}
