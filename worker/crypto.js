/**
 * Cryptographic helpers for the Cloudflare Worker.
 *
 * This module encapsulates the symmetric encryption routines used by the
 * worker. By isolating the low‑level crypto calls the rest of the code
 * remains easier to follow. All functions assume the presence of the
 * global `crypto` Web Crypto API, which is available in the worker
 * runtime. They return Promises because the underlying API is async.
 */

/**
 * Derive an AES‑GCM key from an arbitrary password. The PBKDF2
 * parameters mirror those used in the original worker: SHA‑256, a
 * static salt and 100,000 iterations. The returned key is 256 bits.
 *
 * @param {string} password User‑supplied password or secret
 * @returns {Promise<CryptoKey>} A derived AES‑GCM key
 */
export async function deriveAesKey(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string with AES‑GCM. A random 12‑byte IV is generated
 * automatically and returned alongside the base64‑encoded ciphertext.
 *
 * @param {string} text Plaintext to encrypt
 * @param {string} password Password used to derive the encryption key
 * @returns {Promise<{ encrypted: string, iv: string }>} Encrypted data
 */
export async function encryptData(text, password) {
  const key = await deriveAesKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );
  // Convert ciphertext and IV to base64 strings
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(ct))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

/**
 * Encrypt a binary buffer and prefix the IV. This format is used when
 * uploading encrypted files to archive.org. The first 12 bytes of the
 * returned buffer contain the IV followed by the ciphertext.
 *
 * @param {ArrayBuffer} buf Raw bytes to encrypt
 * @param {string} password Password used to derive the encryption key
 * @returns {Promise<ArrayBuffer>} A new buffer with IV followed by cipher
 */
export async function encryptBytesWithIvPrefix(buf, password) {
  const key = await deriveAesKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    buf
  );
  const out = new Uint8Array(iv.length + enc.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(enc), iv.length);
  return out.buffer;
}

/**
 * Decrypt a buffer that prefixes the IV. The first 12 bytes of the
 * input are interpreted as the IV and the remainder as the AES‑GCM
 * ciphertext. Returns a Promise resolving to a decrypted ArrayBuffer.
 *
 * @param {ArrayBuffer} buf IV‑prefixed buffer to decrypt
 * @param {string} password Password used to derive the encryption key
 * @returns {Promise<ArrayBuffer>} Decrypted plaintext bytes
 */
export async function decryptBytesWithIvPrefix(buf, password) {
  const key = await deriveAesKey(password);
  const arr = new Uint8Array(buf);
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: arr.slice(0, 12) },
    key,
    arr.slice(12)
  );
}