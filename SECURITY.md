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
- **Content-Security-Policy**: Disallows inline script execution (`script-src 'self'`, `worker-src 'self'`), plugins (`object-src 'none'`), base-tag hijacking (`base-uri 'self'`), framing (`frame-ancestors 'none'`), and external form targets (`form-action 'self'`), while enforcing `upgrade-insecure-requests`.
- **Transport & Isolation**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=()`.
- **Cache Hygiene**: HTML entrypoints, `site.webmanifest`, and API/serverless responses send `Cache-Control: no-store, no-cache, must-revalidate` (`no-store` on functions), while content-hashed `/assets/*` bundles use `public, max-age=31536000, immutable`.

### 2. Client-Side URL, XSS, Storage & Spreadsheet Hardening
- **Protocol Allowlisting**: Outbound social links, project URLs, learning resource links, and user avatars are validated via `isSafeHttpsUrl`, `isSafeImageUrl`, and `sanitizeExternalUrl` (`web/src/utils/security.ts`), blocking `javascript:`, `data:`, `vbscript:`, and protocol-relative (`//...`) payloads.
- **Storage Deserialization Guards**: Browser `localStorage` state is parsed exclusively through `safeParseStorageObject` and `safeParseStorageArray`, stripping `__proto__`, `constructor`, and `prototype` keys and validating expected object shapes.
- **Spreadsheet & CSV Import/Export Guards**:
  - `web/src/utils/xlsxCodec.ts` enforces a `2 MB` upload ceiling (`MAX_IMPORT_FILE_BYTES`) and a `10 MB` per-entry and cumulative `DecompressionStream` limit (`MAX_UNZIPPED_BYTES`) that aborts zip-bomb streams in flight, parses worksheet XML via browser `DOMParser` (`application/xml`) without external entity resolution, and XML-escapes control characters and `inlineStr` cells on export.
  - `web/src/utils/advancementImportExport.ts` and `src/Api/Services/AdvancementSpreadsheetService.cs` neutralize OWASP CSV formula-injection prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`, including leading-whitespace bypasses).
- **Printable Resume Isolation**: `exportPrintableResume` escapes `&`, `<`, `>`, `"`, and `'`, clears `win.opener = null`, and renders print controls without inline script handlers.

### 3. Authentication, API & Database Hardening
- **OAuth Nonce Enforcement**: Google implicit `id_token` callbacks require a matching cryptographic SHA-256 nonce stored in `sessionStorage` before calling `supabase.auth.signInWithIdToken`.
- **Row-Level Security (RLS)**: `infra/supabase-schema.sql` revokes default `anon` and `authenticated` privileges across all tables (`profiles`, `goals`, `categories`, `career_entries`, and `user_roles`), enforces column length and value `CHECK` constraints, isolates personal OAuth workspaces on `goals` and `career_entries` via `SELECT` policies (`user_id IS NULL OR auth.uid() = user_id`), restricts `INSERT`/`UPDATE`/`DELETE` strictly to `authenticated` users where `auth.uid() = user_id` (keeping seeded `user_id IS NULL` portfolio rows immutable to anonymous and external callers), and pins `SET search_path = public` on `SECURITY DEFINER` triggers.
- **API Write Authorization**: `CareerPlatform.Api` enforces `.RequireAuthorization("RequireWriteAccess")` across all mutating endpoints (`PUT /api/profile/goal-hours`, `POST/PUT/DELETE /api/goals`, `POST/PUT/DELETE /api/advancement/entries`, and `POST /api/advancement/entries/import`), blocking read-only guest JWTs (`403 Forbidden`) and unauthenticated callers (`401 Unauthorized`).
- **Serverless & Microservice Protections**:
  - `netlify/functions/extract-skills.ts` enforces an explicit CORS origin allowlist scoped strictly to custom domains, localhost, and the deployment's own `SITE_NAME` / `DEPLOY_PRIME_URL` (no wildcard `*.netlify.app`), sends `GEMINI_API_KEY` via `x-goog-api-key` request header (never URL query strings), bounds payload lengths (`<= 10,000` chars), sanitizes output arrays, and suppresses internal error reflection.
  - `CareerPlatform.Geo` validates Garmin `.FIT` binary headers (`bytes[8..11] == ".FIT"`), limits multipart sizes, caps decoded telemetry coordinates (`<= 200,000` points), and enforces a 400-meter residential geofence; both `web/public/rides/` and `src/Geo/Data/Rides/` store only 400m-geofenced `.json` route assets while raw `.fit` files are gitignored and blocked by CI deploy-gate tests.
  - All .NET 10 containers run as non-root (`USER $APP_UID`) on port `8080`.

## Reporting a Vulnerability

Please report suspected security issues privately via [GitHub Security Advisories](https://github.com/JohnBendfeldt/career-architecture-platform/security/advisories/new) rather than opening a public issue. Include reproduction steps and affected endpoints or files.
