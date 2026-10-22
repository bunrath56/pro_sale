/**
 * Professional Cryptographic Security & Authentication Utilities
 * Built with Web Crypto API (SubtleCrypto)
 */

export interface PasswordStrength {
  score: number; // 0 to 4
  level: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  passed: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Generate a cryptographically random salt (16 bytes hex)
 */
export function generateSalt(byteLength: number = 16): string {
  const array = new Uint8Array(byteLength);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a SHA-256 hash of a password with salt using the native Web Crypto API
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  // Salt-pepper concatenation
  const data = encoder.encode(`masterit_auth_${salt}_${password}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a plaintext candidate password against a stored salt and hash
 */
export async function verifyPassword(
  candidate: string,
  salt: string,
  storedHash: string
): Promise<boolean> {
  try {
    const candidateHash = await hashPassword(candidate, salt);
    // Constant-time comparison to prevent timing attacks
    if (candidateHash.length !== storedHash.length) return false;
    let result = 0;
    for (let i = 0; i < candidateHash.length; i++) {
      result |= candidateHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    console.error('Cryptographic verification failed:', error);
    return false;
  }
}

/**
 * Evaluate password strength with enterprise-grade heuristics
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const passed = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const feedback: string[] = [];
  if (!passed.minLength) feedback.push('យ៉ាងហោច 8 តួអក្សរ (At least 8 characters)');
  if (!passed.hasLowercase) feedback.push('អក្សរតូច (Lowercase letter a-z)');
  if (!passed.hasUppercase) feedback.push('អក្សរធំ (Uppercase letter A-Z)');
  if (!passed.hasNumber) feedback.push('លេខ (Number 0-9)');
  if (!passed.hasSpecial) feedback.push('និមិត្តសញ្ញាពិសេស (Symbol !@#$%^&*)');

  let score = 0;
  if (passed.minLength) score += 1;
  if (passed.hasLowercase && passed.hasUppercase) score += 1;
  if (passed.hasNumber) score += 1;
  if (passed.hasSpecial) score += 1;

  let level: PasswordStrength['level'] = 'weak';
  if (score >= 4) level = 'strong';
  else if (score === 3) level = 'good';
  else if (score === 2) level = 'fair';
  else level = 'weak';

  return {
    score,
    level,
    feedback,
    passed,
  };
}

/**
 * Generate a cryptographically secure random session token
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(24);
  window.crypto.getRandomValues(array);
  const randomHex = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `mit_${Date.now()}_${randomHex}`;
}

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Mask an email address for secure logging and audit displays
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}
