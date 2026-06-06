import { auth } from '@/lib/auth';
import { adminToken, gatewayToken, isSameOrigin, mintVendorToken } from '@/lib/backend-auth';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.INTERNAL_API_URL || 'http://localhost:8000';

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const session = await auth();
  const user = session?.user as { role?: string; id?: string } | undefined;

  if (!user?.role || (user.role !== 'vendor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // CSRF: reject cross-origin state-changing requests (P4-3).
  if (req.method !== 'GET' && req.method !== 'HEAD' && !isSameOrigin(req)) {
    return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
  }

  const search = req.nextUrl.searchParams.toString();
  const url = `${BACKEND}/${path.join('/')}${search ? '?' + search : ''}`;

  const headers: Record<string, string> = { 'X-Gateway-Token': gatewayToken() };
  // Bind the vendor identity with a signed, short-lived token rather than a raw header.
  if (user.role === 'vendor' && user.id) headers['X-Vendor-Token'] = mintVendorToken(user.id);
  if (user.role === 'admin') headers['X-Admin-Token'] = adminToken();
  const ct = req.headers.get('content-type');
  if (ct) headers['Content-Type'] = ct;

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(url, init);
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
