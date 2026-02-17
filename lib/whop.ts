import Whop from '@whop/sdk'

let _whopSdk: Whop | null = null

/**
 * Lazily initializes and returns the Whop SDK client.
 * Server-side only — used to verify x-whop-user-token headers from the Whop iframe proxy.
 */
export function getWhopSdk(): Whop {
  if (!_whopSdk) {
    const appID = process.env.NEXT_PUBLIC_WHOP_APP_ID
    const apiKey = process.env.WHOP_API_KEY

    if (!appID || !apiKey) {
      throw new Error(
        'Missing Whop environment variables. Ensure NEXT_PUBLIC_WHOP_APP_ID and WHOP_API_KEY are set.'
      )
    }

    _whopSdk = new Whop({ appID, apiKey })
  }

  return _whopSdk
}
