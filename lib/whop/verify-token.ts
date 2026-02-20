import { jwtVerify, type JWTPayload } from 'jose'
import { getWhopClientSecret } from './config'

export interface WhopTokenPayload extends JWTPayload {
  sub: string // Whop user ID
}

/**
 * Verify a Whop iframe JWT from the x-whop-user-token header.
 * Returns the decoded payload with the Whop user ID in `sub`.
 * Throws on invalid/expired tokens.
 */
export async function verifyWhopToken(token: string): Promise<WhopTokenPayload> {
  const secret = new TextEncoder().encode(getWhopClientSecret())

  const { payload } = await jwtVerify(token, secret, {
    issuer: 'urn:whop:oauth2',
  })

  if (!payload.sub) {
    throw new Error('Whop JWT missing sub claim')
  }

  return payload as WhopTokenPayload
}
