import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Fixed bcrypt hash used to keep failed-login timing uniform whether or not an
// account exists, defeating user enumeration via response time (P2-3).
const DUMMY_HASH = '$2b$12$F.MBYp.svphyzIKYJJ5oTu6EbPMQl2xBrG.kOAYmJTfw6KK4t1Viy';
const MAX_FAILS = 8;
const LOCK_MINUTES = 15;

type AuthedUser = { id: string; email: string; name: string; role: 'admin' | 'vendor' };

async function isLockedOut(email: string): Promise<boolean> {
  try {
    const r = await pool.query('SELECT locked_until FROM login_attempts WHERE email=$1', [email]);
    const lu = r.rows[0]?.locked_until;
    return !!lu && new Date(lu) > new Date();
  } catch {
    return false;
  }
}

async function recordFailure(email: string): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO login_attempts (email, failed_count, locked_until, updated_at)
       VALUES ($1, 1, NULL, NOW())
       ON CONFLICT (email) DO UPDATE SET
         failed_count = login_attempts.failed_count + 1,
         locked_until = CASE WHEN login_attempts.failed_count + 1 >= $2
                             THEN NOW() + ($3 || ' minutes')::interval ELSE NULL END,
         updated_at = NOW()`,
      [email, MAX_FAILS, String(LOCK_MINUTES)]
    );
  } catch {
    /* throttle is best-effort; never block login flow on its failure */
  }
}

async function resetAttempts(email: string): Promise<void> {
  try {
    await pool.query('DELETE FROM login_attempts WHERE email=$1', [email]);
  } catch {
    /* best-effort */
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        // Per-account lockout (P1-1): refuse while locked, regardless of correctness.
        if (await isLockedOut(email)) return null;

        let authed: AuthedUser | null = null;
        try {
          // Admin credential is a bcrypt hash in admin_users (P1-3) — no plaintext
          // env compare, no NEXTAUTH_SECRET fallback.
          const adminRes = await pool.query(
            'SELECT name, password_hash FROM admin_users WHERE email=$1',
            [email]
          );
          if (adminRes.rows.length > 0) {
            if (await bcrypt.compare(password, adminRes.rows[0].password_hash)) {
              authed = { id: 'admin', email, name: adminRes.rows[0].name || 'Administrator', role: 'admin' };
            }
          } else {
            const vres = await pool.query(
              'SELECT id, legal_name, email, portal_password_hash FROM vendor_registry WHERE email=$1 AND portal_access=true',
              [email]
            );
            const vendor = vres.rows[0];
            if (vendor?.portal_password_hash &&
                (await bcrypt.compare(password, vendor.portal_password_hash))) {
              authed = { id: vendor.id, email: vendor.email, name: vendor.legal_name, role: 'vendor' };
            } else {
              // Uniform timing when the account is absent / has no password (P2-3).
              await bcrypt.compare(password, DUMMY_HASH);
            }
          }
        } catch {
          return null;
        }

        if (!authed) {
          await recordFailure(email);
          return null;
        }
        await resetAttempts(email);
        return authed;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = (user as { role?: string }).role; token.id = user.id; }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as { role?: string; id?: string }).role = token.role as string;
        (session.user as { role?: string; id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: { signIn: '/portal' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
});
