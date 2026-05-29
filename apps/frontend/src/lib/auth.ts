import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

        const adminEmail = process.env.ADMIN_EMAIL || 'procurement@burgergov.com';
        const adminSecret = process.env.ADMIN_PASSWORD || process.env.NEXTAUTH_SECRET || '';

        if (credentials.email === adminEmail && credentials.password === adminSecret) {
          return { id: 'admin', email: adminEmail, name: 'Timothy J. Burger', role: 'admin' };
        }

        try {
          const result = await pool.query(
            'SELECT id, legal_name, email, portal_password_hash FROM vendor_registry WHERE email=$1 AND portal_access=true',
            [credentials.email]
          );
          if (result.rows.length === 0) return null;
          const vendor = result.rows[0];
          if (!vendor.portal_password_hash) return null;
          const valid = await bcrypt.compare(credentials.password as string, vendor.portal_password_hash);
          if (!valid) return null;
          return { id: vendor.id, email: vendor.email, name: vendor.legal_name, role: 'vendor' };
        } catch {
          return null;
        }
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
