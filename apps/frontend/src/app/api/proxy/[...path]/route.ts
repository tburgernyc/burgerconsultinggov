import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.INTERNAL_API_URL || 'http://localhost:8000';
const ADMIN_TOKEN = process.env.BACKEND_ADMIN_TOKEN || '';

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.toString();
  const url = `${BACKEND}/${path.join('/')}${search ? '?' + search : ''}`;

  const init: RequestInit = {
    method: req.method,
    headers: { 'X-Admin-Token': ADMIN_TOKEN, 'Content-Type': 'application/json' },
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    const isBinary =
      contentType.includes('application/vnd.openxmlformats') ||
      contentType.includes('application/octet-stream') ||
      contentType.includes('application/pdf');
    if (isBinary) {
      const buffer = await res.arrayBuffer();
      const headers: Record<string, string> = { 'Content-Type': contentType };
      const cd = res.headers.get('content-disposition');
      if (cd) headers['Content-Disposition'] = cd;
      return new NextResponse(buffer, { status: res.status, headers });
    }
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': contentType || 'application/json' },
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
