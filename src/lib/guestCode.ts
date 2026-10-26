/**
 * Utility for encoding and decoding guest names + quota to/from random-looking URL-safe codes.
 * Quota (1..10) is embedded inside the 4-char hex salt (h2 = signature nibble, h3 = quota nibble)
 * so that:
 * 1) The URL never exposes `&pax=...` when using random code links (`?c=...`).
 * 2) Even legacy decoders that only decode the XORed payload see 100% pure `name` without `:::pax`.
 */

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeGuestCode(name: string, maxGuests?: number): string {
  if (!name || !name.trim()) return '';
  // Selalu enkripsi nama murni saja agar tidak pernah memunculkan angka/::: di layar sapaan template
  const cleanName = name.trim();
  const quota =
    typeof maxGuests === 'number' && !isNaN(maxGuests) && maxGuests >= 1 && maxGuests <= 10
      ? Math.floor(maxGuests)
      : 2;

  const h0 = Math.floor(Math.random() * 15) + 1; // 1..15
  const h1 = Math.floor(Math.random() * 15) + 1; // 1..15
  const h2 = (h0 ^ h1 ^ 0xa) & 0xf;
  const h3 = (h0 + h1 + quota) & 0xf;

  const salt = h0.toString(16) + h1.toString(16) + h2.toString(16) + h3.toString(16);
  const saltNum = parseInt(salt, 16);
  const bytes = new TextEncoder().encode(cleanName);
  const scrambled = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const keyByte = (saltNum >> ((i % 2) * 8)) & 0xff;
    scrambled[i] = bytes[i] ^ (keyByte || 0x5a);
  }
  return salt + base64UrlEncode(scrambled);
}

export function decodeGuestCode(code: string | null | undefined): string | null {
  if (!code || typeof code !== 'string') return null;
  const clean = code.trim();
  if (clean.length < 5) return null;
  const salt = clean.slice(0, 4);
  const b64 = clean.slice(4);
  const saltNum = parseInt(salt, 16);
  if (isNaN(saltNum)) return null;

  try {
    const scrambled = base64UrlDecode(b64);
    const bytes = new Uint8Array(scrambled.length);
    for (let i = 0; i < scrambled.length; i++) {
      const keyByte = (saltNum >> ((i % 2) * 8)) & 0xff;
      bytes[i] = scrambled[i] ^ (keyByte || 0x5a);
    }
    let decoded = new TextDecoder().decode(bytes).trim();
    if (!decoded) return null;
    // Bersihkan jika ada format :::pax dari kode sebelumnya agar nama selalu murni tanpa angka
    if (decoded.includes(':::')) {
      decoded = decoded.split(':::')[0].trim();
    }
    return decoded || null;
  } catch {
    return null;
  }
}

export function decodeGuestQuota(code: string | null | undefined): number | null {
  if (!code || typeof code !== 'string') return null;
  const clean = code.trim();
  if (clean.length < 5) return null;
  const salt = clean.slice(0, 4);
  const b64 = clean.slice(4);
  const saltNum = parseInt(salt, 16);
  if (isNaN(saltNum)) return null;

  try {
    const scrambled = base64UrlDecode(b64);
    const bytes = new Uint8Array(scrambled.length);
    for (let i = 0; i < scrambled.length; i++) {
      const keyByte = (saltNum >> ((i % 2) * 8)) & 0xff;
      bytes[i] = scrambled[i] ^ (keyByte || 0x5a);
    }
    const raw = new TextDecoder().decode(bytes).trim();
    if (raw.includes(':::')) {
      const q = parseInt(raw.split(':::')[1], 10);
      if (!isNaN(q) && q >= 1 && q <= 10) return q;
    }

    const h0 = parseInt(salt[0], 16);
    const h1 = parseInt(salt[1], 16);
    const h2 = parseInt(salt[2], 16);
    const h3 = parseInt(salt[3], 16);
    if (!isNaN(h0) && !isNaN(h1) && !isNaN(h2) && !isNaN(h3)) {
      if (h2 === ((h0 ^ h1 ^ 0xa) & 0xf)) {
        const q = (h3 - h0 - h1 + 32) & 0xf;
        if (q >= 1 && q <= 10) return q;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generates the deterministic Pass ID matching the invitation's AccessCard.tsx
 * (`VIP-2026-xxx`) so the QR code on the digital invitation matches the dashboard.
 */
export function generateGuestPassId(guestName: string): string {
  const clean = (guestName || 'Guest').trim();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const numeric = Math.abs(hash % 900) + 100;
  return `VIP-2026-${numeric}`;
}

/**
 * Generates the clean joyever myqrcode URL requested by the user:
 * joyever.id/myqrcode/[link undangan pasangan]/[kode barcode]
 * Contoh: https://joyever.id/myqrcode/demo-joyfulday.joyever.id/380-6aac106eb14f4
 */
export function buildGuestPassUrl(params: {
  slug?: string;
  guestName: string;
  code?: string;
  passId?: string;
  domain?: string;
  invitationLink?: string;
}): string {
  let coupleLink =
    params.invitationLink ||
    params.domain ||
    (params.slug ? `${params.slug}.joyever.id` : 'demo-joyfulday.joyever.id');

  coupleLink = coupleLink.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
  if (!coupleLink.includes('.')) {
    coupleLink = `${coupleLink}.joyever.id`;
  }

  const rawCode = params.code || encodeGuestCode(params.guestName);
  const passId = params.passId || generateGuestPassId(params.guestName);
  const numId = passId.replace(/\D/g, '') || '380';

  return `https://joyever.id/myqrcode/${coupleLink}/${numId}-${rawCode}`;
}

export function parseGuestPassUrl(url: string): {
  slug?: string;
  domain?: string;
  passId?: string;
  code?: string;
  guestName?: string;
} | null {
  if (!url) return null;
  const trimmed = url.trim();

  try {
    if (trimmed.includes('myqrcode/')) {
      // Modern Joyever format: myqrcode/[link undangan]/[numeric-code]
      const modernMatch = trimmed.match(/myqrcode\/([^/?#]+)\/(?:(?:VIP-2026-)?(\d+)-)?([A-Za-z0-9_-]+)/i);
      if (modernMatch) {
        const domain = modernMatch[1];
        const numeric = modernMatch[2];
        const code = modernMatch[3];
        const passId = numeric ? `VIP-2026-${numeric}` : undefined;
        const guestName = decodeGuestCode(code) || undefined;
        const slug = domain.split('.')[0];
        return { domain, slug, passId, code, guestName };
      }

      // Legacy format: myqrcode/richardbella.viding.co-948096-6aac106eb14f4
      const legacyMatch = trimmed.match(/myqrcode\/([^.-]+)\.[^-]+-(\d+)-([A-Za-z0-9_-]+)/i);
      if (legacyMatch) {
        const slug = legacyMatch[1];
        const numeric = legacyMatch[2];
        const code = legacyMatch[3];
        const passId = `VIP-2026-${numeric}`;
        const guestName = decodeGuestCode(code) || undefined;
        return { slug, passId, code, guestName };
      }
    }

    if (trimmed.includes('?c=') || trimmed.includes('&c=')) {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://joyever.id/${trimmed}`);
      const code = urlObj.searchParams.get('c') || urlObj.searchParams.get('code') || undefined;
      if (code) {
        const guestName = decodeGuestCode(code) || undefined;
        return { code, guestName };
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Builds the standard QR payload for a guest's Entrance Pass.
 * Generates the clickable URL so camera scanner displays:
 * https://joyever.id/myqrcode/demo-joyfulday.joyever.id/380-6aac106eb14f4
 */
export function buildGuestQrPayload(params: {
  coupleNames?: string;
  guestName: string;
  code?: string;
  passId?: string;
  eventDate?: string;
  maxGuests?: number;
  category?: string;
  tableName?: string;
  slug?: string;
  domain?: string;
  invitationLink?: string;
}): string {
  const passId = params.passId || generateGuestPassId(params.guestName);
  const coupleLink =
    params.invitationLink ||
    params.domain ||
    (params.slug ? `${params.slug}.joyever.id` : 'demo-joyfulday.joyever.id');

  return buildGuestPassUrl({
    invitationLink: coupleLink,
    slug: params.slug,
    guestName: params.guestName,
    code: params.code,
    passId,
  });
}

