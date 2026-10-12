import { CONFIG } from '../config.js';

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hashPassword(password) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(CONFIG.PASSWORD_SALT), iterations: CONFIG.PASSWORD_ITERATIONS },
    key, 256);
  return hex(bits);
}

export const isConfigured = () => !!CONFIG.PASSWORD_HASH;
export async function check(password) { return (await hashPassword(password)) === CONFIG.PASSWORD_HASH; }
