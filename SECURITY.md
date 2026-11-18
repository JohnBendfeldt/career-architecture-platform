# Security Policy & Architecture

## Supported Versions

| Component | Version | Supported |
| :--- | :--- | :--- |
| Web Frontend (`web/`) | React 19.3 / Vite 8 / TypeScript 6 | Yes |
| .NET Microservices (`Api`, `Gateway`, `Geo`) | .NET 10.0 LTS (`10.0.15` servicing) | Yes |
| Database (`infra/supabase-schema.sql`) | PostgreSQL 15+ / Supabase RLS | Yes |

## Security Controls Summary

### 1. Supply Chain, CI Gates & Option-1 Audit Architecture
- **Immutable GitHub Actions Pinning**: All workflow steps in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and [`.github/workflows/security-audit.yml`](.github/workflows/security-audit.yml) pin actions (`actions/checkout`, `actions/setup-node`, `actions/setup-dotnet`) to full 40-character commit SHAs with minimal `contents: read` permissions.
- **Option-1 Split Dependency Auditing**:
  - **Blocking PR / Push Gate (`ci.yml` & `azure-pipelines.yml`)**: Runs `npm --prefix web audit --omit=dev --audit-level=high` and `dotnet list CareerPlatform.sln package --vulnerable --include-transitive`, blocking merges on any runtime vulnerability while also typechecking `netlify/functions/extract-skills.ts` via root `tsc -p tsconfig.json --noEmit` and running all solution test projects.
  - **Scheduled Full-Tree Audit (`security-audit.yml`)**: Runs weekly (`0 9 * * 1`) and via `workflow_dispatch` (never blocking PRs on unpatched dev-only transitive advisories) to audit the full `npm` dev/build tree (`npm --prefix web audit --audit-level=high`) and transitive NuGet graph.
- **Automated Grouped Updates ([`.github/dependabot.yml`](.github/dependabot.yml) & [`.github/workflows/auto-merge.yml`](.github/workflows/auto-merge.yml))**: Isolates `minor-and-patch` updates from breaking `major` bumps across `npm` (`/web`) and `nuget` (`/`) on a weekly Monday cadence with low PR limits, plus monthly `github-actions` updates. Verified `minor-and-patch` Dependabot PRs (never `major` bumps) are squash-merged with `--match-head-commit` and automatic branch deletion after `CI & Deploy Gate` succeeds without checking out untrusted PR code.

### 2. Edge, Container & HTTP Security Headers
Configured across [`netlify.toml`](netlify.toml), [`web/netlify.toml`](web/netlify.toml), [`web/nginx.conf`](web/nginx.conf), [`docker-compose.yml`](docker-compose.yml), and all .NET Minimal APIs:
- **Content-Security-Policy**: Disallows inline script execution (`script-src 'self'`, `worker-src 'self'`), plugins (`object-src 'none'`), base-tag hijacking (`base-uri 'self'`), framing (`frame-ancestors 'none'`), and external form targets (`form-action 'self'`), while enforcing `upgrade-insecure-requests` on web origins and `default-src 'none'; frame-ancestors 'none'` on JSON API microservices.
- **Transport, Nginx Inheritance & Isolation**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (`UseHsts()` in non-Development `.NET` services and explicit HSTS on serverless responses), `server_tokens off;`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`. Both `location /assets/` and `location = /index.html` in `web/nginx.conf` explicitly repeat all security headers so Nginx child-block `add_header` rules never drop security headers.
- **Container & Network Isolation**: All `.NET 10` containers and the `web/Dockerfile` Nginx container (`USER nginx` on port `8080` with `/tmp/nginx.pid`) run as non-root. `docker-compose.yml` keeps `api` and `geo` internal (`expose: ["8080"]`), binds `gateway` and `web` to `127.0.0.1`, runs in `Production` mode, and requires `JWT_SECRET` from the environment without hardcoded fallbacks. Both root `netlify.toml` and `web/netlify.toml` synchronize `/api/*` and `/geo/*` gateway proxy rules ahead of the SPA fallback.

### 3. Client-Side URL, Token Scoping, Spreadsheet & Telemetry Hardening
- **Protocol Allowlisting & Storage Guards**: Outbound links and avatars are validated via `isSafeHttpsUrl`, `isSafeImageUrl`, and `sanitizeExternalUrl` (`web/src/utils/security.ts`), while `localStorage` JSON is parsed through prototype-pollution-safe `safeParseStorageObject` and `safeParseStorageArray`.
- **Strict Bearer Token Audience Scoping**: `ApiService.isDotNetApiToken` verifies that a stored JWT carries `iss === "CareerPlatform.Api"` before attaching `Authorization: Bearer` headers to `.NET` API calls, ensuring Supabase OAuth access tokens are never forwarded to non-Supabase endpoints. Workspace erasure (`LegalModal`) clears `localStorage`, `sessionStorage` OAuth nonces, and signs out of Supabase.
- **Spreadsheet & CSV Import/Export Guards**:
  - `web/src/utils/xlsxCodec.ts` enforces a `2 MB` upload ceiling (`MAX_IMPORT_FILE_BYTES`), a `10 MB` streaming `DecompressionStream` ceiling (`MAX_UNZIPPED_BYTES`), a `128`-column ceiling (`MAX_XLSX_COL_INDEX`) blocking sparse `<c r="ZZZZZZ1">` column-allocation bombs, and a `5,000`-row ceiling (`MAX_XLSX_ROWS`).
  - `web/src/utils/advancementImportExport.ts` and `src/Api/Services/AdvancementSpreadsheetService.cs` neutralize OWASP CSV formula-injection prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`, `|`) on both raw leading characters and whitespace-trimmed cells.
- **Client & Server Geospatial Telemetry Guards**: `.GPX` uploads are capped at `15 MB`, filtered for finite WGS84 coordinates (`[-90, 90]`, `[-180, 180]`), and downsampled to `<= 1,500` points; `.FIT` uploads are capped at `50 MB`, verified for `.FIT` magic bytes, decoded through a bounded stream (`<= 200,000` raw points) with control-character stripping, and protected by a 400-meter residential privacy geofence.

### 4. Authentication, Serverless & Microservice Hardening
- **JWT & Role-Based Write Authorization**: `CareerPlatform.Api` enforces `>= 32`-byte HMAC-SHA256 signing keys, `SaveToken = false`, `ValidAlgorithms = [HmacSha256]`, clamped token lifetimes (`1..168` hours), and `.RequireAuthorization("RequireWriteAccess")` requiring both `!isGuestRole` and an explicit `admin` role claim across all mutating endpoints.
- **Row-Level Security (RLS) & JSONB Bounds**: `infra/supabase-schema.sql` revokes default `anon`/`authenticated` grants, bounds `profiles.skills` (`<= 100` items) and `goals.tags` (`<= 20` items, `<= 4096` bytes), and enforces cross-tenant `goal_id` ownership checks in `career_entries` `INSERT`/`UPDATE` `WITH CHECK` policies.
- **Serverless & Outbound API Key Isolation**:
  - `netlify/functions/extract-skills.ts` restricts `localhost` CORS to non-production contexts, rejects `Origin`-less `POST` requests in production unless `Referer` matches an allowed HTTPS origin, enforces per-IP sliding-window rate limiting (`15` req/60s, `429` + `Retry-After: 60`), decodes base64 bodies safely, isolates user input via Gemini `systemInstruction`, and enforces `8s` upstream fetch timeouts.
  - `LearningResourceService` and `AiSkillExtractor` pass Google API keys strictly via `X-Goog-Api-Key` / `x-goog-api-key` headers (never URL query strings), suppress `HttpClient` URL logging, bound `IMemoryCache` (`SizeLimit = 512`), and enforce `10s` `HttpClient` timeouts.
  - `Api`, `Gateway` (`120` req/min per-IP edge limiter), and `Geo` configure RFC1918 `KnownIPNetworks` on `ForwardedHeadersOptions` for accurate per-visitor rate limiting behind cloud proxies and restrict `localhost` CORS origins to `Development`.

## Reporting a Vulnerability

Please report suspected security issues privately via [GitHub Security Advisories](https://github.com/JohnBendfeldt/career-architecture-platform/security/advisories/new) rather than opening a public issue. Include reproduction steps and affected endpoints or files.
