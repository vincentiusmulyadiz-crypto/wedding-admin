/**
 * Utility for encoding and decoding guest names to/from random-looking URL-safe codes.
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

function base64UrlDecode(str: string): Uint8Array {
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

export function encodeGuestCode(name: string): string {
  if (!name || !name.trim()) return '';
  const salt = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
  const saltNum = parseInt(salt, 16);
  const bytes = new TextEncoder().encode(name.trim());
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
    const decoded = new TextDecoder().decode(bytes).trim();
    return decoded || null;
  } catch {
    return null;
  }
}
