# Security Policy & Architecture

## Supported Versions

| Component | Version | Supported |
| :--- | :--- | :--- |
| Web Frontend (`web/`) | React 19.3 / Vite 8 / TypeScript 6 | Yes |
| .NET Microservices (`Api`, `Gateway`, `Geo`) | .NET 10.0 LTS (`10.0.15` servicing) | Yes |
| Database (`infra/supabase-schema.sql`) | PostgreSQL 15+ / Supabase RLS | Yes |

## Security Controls Summary

### 1. Edge & HTTP Security Headers
Configured across [`netlify.toml`](netlify.toml), [`web/netlify.toml`](web/netlify.toml), [`web/nginx.conf`](web/nginx.conf), and all .NET Minimal APIs:
- **Content-Security-Policy**: Disallows inline script execution (`script-src 'self' https://accounts.google.com`), plugins (`object-src 'none'`), base-tag hijacking (`base-uri 'self'`), framing (`frame-ancestors 'none'`), and external form targets (`form-action 'self'`), while enforcing `upgrade-insecure-requests`.
- **Transport & Isolation**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=()`.
- **Cache Hygiene**: HTML entrypoints and `/api/*` + `/geo/*` routes send `Cache-Control: no-cache, no-store, must-revalidate` while content-hashed `/assets/*` bundles use `public, max-age=31536000, immutable`.

### 2. Client-Side URL, XSS & Storage Hardening
- **Protocol Allowlisting**: Outbound social links, project URLs, learning resource links, and user avatars are validated via `isSafeHttpsUrl`, `isSafeImageUrl`, and `sanitizeExternalUrl` (`web/src/utils/security.ts`), blocking `javascript:`, `data:`, `vbscript:`, and protocol-relative (`//...`) payloads.
- **Storage Deserialization Guards**: Browser `localStorage` state is parsed exclusively through `safeParseStorageObject` and `safeParseStorageArray`, stripping `__proto__`, `constructor`, and `prototype` keys and validating expected object shapes.
- **Printable Resume Isolation**: `exportPrintableResume` escapes `&`, `<`, `>`, `"`, and `'`, clears `win.opener = null`, and attaches print handlers via DOM APIs without inline scripts.

### 3. Authentication, API & Database Hardening
- **OAuth Nonce Enforcement**: Google implicit `id_token` callbacks require a matching cryptographic nonce stored in `sessionStorage` before calling `supabase.auth.signInWithIdToken`.
- **Row-Level Security (RLS)**: `infra/supabase-schema.sql` revokes default `anon` write privileges, restricts `INSERT`/`UPDATE`/`DELETE` on `profiles`, `goals`, and `rides` to `authenticated` users where `auth.uid() = user_id`, enforces column length `CHECK` constraints, and pins `SET search_path = public` on `SECURITY DEFINER` triggers.
- **Serverless & Microservice Protections**:
  - `netlify/functions/extract-skills.ts` enforces an explicit CORS origin allowlist, sends `GEMINI_API_KEY` via `x-goog-api-key` request header (never URL query strings), bounds payload lengths (`<= 10,000` chars), sanitizes output arrays, and suppresses internal error reflection.
  - `CareerPlatform.Geo` validates Garmin `.FIT` binary headers (`bytes[8..11] == ".FIT"`), limits multipart sizes, caps decoded telemetry coordinates (`<= 200,000` points), and enforces a 400-meter residential geofence.
  - All .NET 10 containers run as non-root (`USER $APP_UID`) on port `8080`.

## Reporting a Vulnerability

Please report suspected security issues privately via [GitHub Security Advisories](https://github.com/JohnBendfeldt/career-architecture-platform/security/advisories/new) rather than opening a public issue. Include reproduction steps and affected endpoints or files.
