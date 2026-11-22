/**
 * Sistem Keselamatan & Perlindungan Data Dr. Roket Platinium
 * - Penyulitan (Encryption/Obfuscation) data dalam storan pelayar dengan tandatangan integriti (Checksum)
 * - Sanitasi input terhadap serangan XSS / Script Injection
 * - Kawalan sesi & kunci percubaan log masuk (Anti-Brute Force)
 */

const VAULT_SECRET_KEY = 'DR_ROKET_PLATINIUM_VAULT_KEY_2026_SECURE_#991';
const VAULT_PREFIX = 'DR_ENC_V1::';

/**
 * Generates a deterministic 32-bit FNV-1a integrity signature hash
 */
export function computeIntegritySignature(payload: string): string {
  let hash = 0x811c9dc5;
  const combined = `${payload}::${VAULT_SECRET_KEY}`;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Encrypts & signs application data before saving to localStorage
 * so raw member data (emails, phone numbers, research titles) cannot be read in plain text.
 */
export function encryptVaultData(data: unknown): string {
  try {
    const jsonStr = JSON.stringify(data);
    const encodedUri = encodeURIComponent(jsonStr);
    const keyLen = VAULT_SECRET_KEY.length;
    const xoredChars: number[] = [];

    for (let i = 0; i < encodedUri.length; i++) {
      const charCode = encodedUri.charCodeAt(i);
      const keyChar = VAULT_SECRET_KEY.charCodeAt(i % keyLen);
      xoredChars.push(charCode ^ (keyChar & 0x1f));
    }

    // Process in chunks to avoid stack overflow on large strings
    let binaryStr = '';
    const chunkSize = 8192;
    for (let i = 0; i < xoredChars.length; i += chunkSize) {
      binaryStr += String.fromCharCode(...xoredChars.slice(i, i + chunkSize));
    }

    const base64Payload = btoa(binaryStr);
    const signature = computeIntegritySignature(base64Payload);
    return `${VAULT_PREFIX}${signature}::${base64Payload}`;
  } catch {
    return '';
  }
}

/**
 * Decrypts & verifies integrity of vault data from localStorage.
 * Also supports seamless migration from legacy unencrypted JSON.
 */
export function decryptVaultData<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    // Check if already encrypted with DR_ENC_V1
    if (raw.startsWith(VAULT_PREFIX)) {
      const withoutPrefix = raw.slice(VAULT_PREFIX.length);
      const sepIdx = withoutPrefix.indexOf('::');
      if (sepIdx === -1) return null;

      const signature = withoutPrefix.slice(0, sepIdx);
      const base64Payload = withoutPrefix.slice(sepIdx + 2);

      // Verify tamper signature
      const expectedSig = computeIntegritySignature(base64Payload);
      if (signature !== expectedSig) {
        // Tampering detected! Reject altered payload
        return null;
      }

      const binaryStr = atob(base64Payload);
      const keyLen = VAULT_SECRET_KEY.length;
      const restoredChars: number[] = [];

      for (let i = 0; i < binaryStr.length; i++) {
        const charCode = binaryStr.charCodeAt(i);
        const keyChar = VAULT_SECRET_KEY.charCodeAt(i % keyLen);
        restoredChars.push(charCode ^ (keyChar & 0x1f));
      }

      let encodedUri = '';
      const chunkSize = 8192;
      for (let i = 0; i < restoredChars.length; i += chunkSize) {
        encodedUri += String.fromCharCode(
          ...restoredChars.slice(i, i + chunkSize)
        );
      }

      const jsonStr = decodeURIComponent(encodedUri);
      return JSON.parse(jsonStr) as T;
    }

    // Legacy plain JSON fallback (will be encrypted on next save)
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Sanitizes string inputs to prevent Cross-Site Scripting (XSS) & HTML/Script injection
 */
export function sanitizeInputString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/[<>]/g, '');
}

/**
 * Recursively sanitizes all string fields in an object/array (preserving data:image base64 URLs)
 */
export function sanitizeDataPayload<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/')) {
      return obj;
    }
    return sanitizeInputString(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeDataPayload(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeDataPayload(val);
    }
    return result as T;
  }
  return obj;
}
