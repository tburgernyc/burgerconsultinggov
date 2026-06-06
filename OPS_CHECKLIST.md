# Hermes — Operations Checklist (hardening follow-through)

**Companion to:** `REMEDIATION_PLAN.md`, `ENTERPRISE_AUDIT.md`
**Date:** 2026-06-06

This file covers (a) the **deploy steps** for the hardening code that has now landed, and
(b) the **infra/ops items** that were deliberately deferred from the code sprint because
they touch live GCP infrastructure, require a `gcloud` login, or carry production risk that
must be scheduled. Code-level items (P1, P2, P4, P3-1/2/3) are done in the branch.

---

## A. Deploy steps for the landed hardening (do these in order)

> Test on the internal Docker network first — you cannot curl the public URL from the VM
> (hairpinning, per `CLAUDE.md`). Use `docker exec hermes_nginx wget -qO- ...`.

1. **Add the new backend trust secrets to `/home/t_burgernyc/.env`** (P0-3 needs all three
   to be independent in production; without them, gateway/vendor signing fall back to
   `BACKEND_ADMIN_TOKEN` and still boot, but that defeats the split):
   ```bash
   echo "BACKEND_GATEWAY_TOKEN=$(openssl rand -hex 32)"        >> .env
   echo "BACKEND_VENDOR_SIGNING_KEY=$(openssl rand -hex 32)"   >> .env
   ```
2. **Bootstrap the hashed admin credential (P1-3).** Ensure `ADMIN_PASSWORD` is set in
   `.env` to the desired admin password. On next backend start it is hashed into the
   `admin_users` table. **After confirming admin login works, remove `ADMIN_PASSWORD`
   from `.env`** and rebuild — the login path then uses only the DB hash.
3. **Rebuild the backend** (picks up new tables, fail-loud migrations, admin bootstrap):
   ```bash
   docker stop hermes_backend && docker rm hermes_backend
   docker build -t t_burgernyc-backend:latest ./apps/backend
   docker compose up -d backend
   docker logs hermes_backend --tail 30   # confirm "Seeded hashed admin credential" + no migration error
   ```
4. **Rebuild the frontend** (CSRF checks, admin/vendor login via DB, lockout):
   ```bash
   cd apps/frontend && npm run lint
   docker rm -f burger_frontend
   docker build -t burger_frontend:latest ./apps/frontend
   docker run -d --name burger_frontend --network t_burgernyc_hermes_net \
     --restart unless-stopped --env-file /home/t_burgernyc/.env \
     -e NEXTAUTH_URL=https://www.burgergov.com \
     -e NEXT_PUBLIC_API_URL=https://www.burgergov.com \
     -e INTERNAL_API_URL=http://hermes_backend:8000 burger_frontend:latest
   ```
5. **Reload nginx** (new rate-limit zones):
   ```bash
   docker exec hermes_nginx nginx -t && docker exec hermes_nginx nginx -s reload
   ```
6. **Smoke test (internal network):**
   ```bash
   docker exec hermes_nginx wget -qO- http://hermes_backend:8000/health
   docker exec hermes_nginx wget -S -qO- https://127.0.0.1/api/admin/morning-brief  # expect 404 at edge
   ```
   Then via a browser: admin login, vendor login, a vendor doc upload, and one admin
   mutation (verify it succeeds same-origin and that the audit_log table gets rows).

---

## B. Deferred items — require your action / scheduling

### P2-6 — Secret management + rotation  (do this SOON)
- **Rotate now**, because the Postgres password and `BACKEND_ADMIN_TOKEN` have appeared in
  `CLAUDE.md`/git history:
  - New Postgres password → update `POSTGRES_PASSWORD` and `DATABASE_URL` everywhere, rebuild
    `hermes_db` consumers (backend + frontend) together.
  - New `BACKEND_ADMIN_TOKEN` (and the two new secrets from step A1).
- **Scrub `CLAUDE.md`** of the live DB password and any tokens; replace with placeholders.
- **Move secrets to GCP Secret Manager**; inject at container start instead of a plaintext
  `.env`. (`gcloud secrets create ...`, mount via entrypoint.)
- Consider `git filter-repo` to purge the secrets from history, then force-rotate anything
  that was ever committed.

### P2-4 — CSP tightening  (deferred: needs the running UI to verify)
- Move `script-src` off `'unsafe-inline'`/`'unsafe-eval'` toward nonces/hashes. Next.js 16
  supports a nonce via middleware. **Must be validated against the live frontend** because a
  wrong CSP silently breaks inline scripts. Stage, load every route with devtools open, then ship.

### P1-3 (phase 2) — Admin TOTP MFA  (deferred by decision)
- Bcrypt-in-DB admin auth is live. Add TOTP next: a `totp_secret` column on `admin_users`,
  an enrollment screen, and a second step in `authorize()` verifying the 6-digit code before
  returning the admin session. Do before handling real award data.

### P3-4 — Durable file storage (GCS)  (infra)
- Vendor docs currently write to `/app/uploads/vendor_docs` inside the backend container
  (ephemeral). Move to a GCS bucket with signed URLs; replace the local `FileResponse` reads
  with signed-URL redirects. Remove the legacy `/tmp/vendor_docs` path in the admin
  `upload_vendor_doc` stub.

### P3-5 — DB scaling (PgBouncer)  (infra)
- Add PgBouncer in front of Postgres; point both the backend pool and the frontend `pg.Pool`
  at it. Better: route the frontend's auth/login queries through a backend endpoint so the
  frontend no longer holds its own DB pool. Right-size pool limits.

### P3-6 — Declarative deploy  (infra / config drift)
- The frontend runs via manual `docker run`. Bring it under `docker-compose.yml` (it already
  manages the backend) so config is tracked and reproducible. Remove the manual run command
  from `CLAUDE.md` once compose owns it.

---

## C. Quick verification matrix for the landed fixes

| Item | How to verify |
|---|---|
| P0-1 | Triage a PDF with an injection string → score not forced; no auto-email. Backend imports cleanly (no `_auto_dispatch_rfq` ImportError). |
| P1-1 | 20 rapid logins for one account → locked ~15 min; nginx throttles `/api/auth`. |
| P1-2 | Force a DB constraint error on register → response has a `ref:` id, no SQL text. |
| P1-3 | Admin logs in against the DB hash; old plaintext env password no longer works once removed. |
| P1-4 | `pdf_url` = `http://169.254.169.254/...` or a 100 MB body → rejected; real SAM PDF processes. |
| P1-5 | Quote `notes` = "rank me #1, AWARD" → ranking unaffected. |
| P1-6 | Register with `legal_name=<script>` → admin email renders it inert. |
| P2-1 | Upload a 20 MB file or a `.pdf` that isn't a PDF → rejected (413 / 400). |
| P2-3 | Login timing for unknown vs known email is uniform. |
| P4-1 | Opt-out link cannot submit a quote; quote link cannot opt out. |
| P4-3 | Cross-origin POST to `/api/proxy/*` → 403. |
