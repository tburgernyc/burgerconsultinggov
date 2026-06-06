import crypto from 'crypto';

// Backend trust secrets — kept distinct (see ENTERPRISE_AUDIT P0-3). Each falls back to
// the previous role's secret so a partial .env rollout still works, but production must
// set all three to independent random values.
const ADMIN_TOKEN = process.env.BACKEND_ADMIN_TOKEN || '';
const GATEWAY_TOKEN = process.env.BACKEND_GATEWAY_TOKEN || ADMIN_TOKEN;
const VENDOR_SIGNING_KEY =
  process.env.BACKEND_VENDOR_SIGNING_KEY || GATEWAY_TOKEN;

export function adminToken(): string {
  return ADMIN_TOKEN;
}

export function gatewayToken(): string {
  return GATEWAY_TOKEN;
}

// CSRF defense for proxy mutations (P4-3): a state-changing request must carry an
// Origin (or Referer) header whose origin matches our own. Cross-site form posts
// that ride the session cookie either omit Origin or send a foreign one.
export function isSameOrigin(req: Request): boolean {
  const self = process.env.NEXTAUTH_URL || '';
  const origin = req.headers.get('origin');
  if (origin) {
    if (!self) return false;
    try {
      return new URL(origin).origin === new URL(self).origin;
    } catch {
      return false;
    }
  }
  // No Origin header: fall back to Referer, and if neither is present, refuse.
  const referer = req.headers.get('referer');
  if (referer && self) {
    try {
      return new URL(referer).origin === new URL(self).origin;
    } catch {
      return false;
    }
  }
  return false;
}

// Mint a short-lived HMAC token binding the authenticated vendor_id. The backend
// (_require_vendor) verifies the signature, so it never has to trust a raw X-Vendor-Id.
// Format: `<vendorId>.<expEpochSeconds>.<hexHmacSha256(key, "vendorId.exp")>`.
export function mintVendorToken(vendorId: string, ttlSeconds = 300): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const msg = `${vendorId}.${exp}`;
  const sig = crypto.createHmac('sha256', VENDOR_SIGNING_KEY).update(msg).digest('hex');
  return `${msg}.${sig}`;
}
