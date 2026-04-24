import { createHmac } from 'node:crypto'

/** Base64url-encode a Buffer (no padding, URL-safe alphabet). */
export function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Sign a claims object as an HS256 JWT. Intended for component tests that
 * need to forge tokens — e.g. expired tokens, tokens signed by a foreign
 * secret, or tokens with custom claims the API under test should reject.
 *
 * Callers supply the full claims object (including `iat`, `exp`, `iss`, etc.)
 * so this helper stays oblivious to the application's token shape.
 */
export function signHS256(claims: Record<string, unknown>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)))
  const encPayload = base64UrlEncode(Buffer.from(JSON.stringify(claims)))
  const signingInput = `${encHeader}.${encPayload}`
  const sig = createHmac('sha256', secret).update(signingInput).digest()
  return `${signingInput}.${base64UrlEncode(sig)}`
}
