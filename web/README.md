# Career Architecture Platform — Web Client (`web/`)

React 19.3 + TypeScript 6 + Vite 8 single-page application for **[johnbendfeldt.com](https://johnbendfeldt.com)**.

## Stack

- **UI Runtime**: React `^19.3.1`, TypeScript `~6.0.2`, Vite `^8.0.5`
- **Auth & Cloud Sync**: `@supabase/supabase-js` (`^2.119.0`) with GitHub, Google (OIDC nonce-verified), and Microsoft OAuth + Guest Recruiter read-only mode
- **Geospatial**: Leaflet `^1.9.4` + `fit-file-parser` with client-side GPX/FIT parsing and 400m residential geofence protection
- **Testing & Quality**: Vitest `^4.1.4`, Testing Library, ESLint `^9.39.4`

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start local Vite dev server (proxies /api and /geo to Gateway)
npm run lint       # Run ESLint across TypeScript/React sources
npm test           # Run Vitest unit & security test suites
npm run build      # Typecheck (tsc -b) and produce production bundle in dist/
npm audit          # Audit npm dependency tree for known CVEs
```

## Security Controls

- Shared URL and storage validators live in [`src/utils/security.ts`](src/utils/security.ts) (`isSafeHttpsUrl`, `isSafeImageUrl`, `sanitizeExternalUrl`, `stripUnsafeKeys`, `safeParseStorageObject`, `safeParseStorageArray`).
- Edge CSP, HSTS, COOP, Permissions-Policy, and cache-control headers are configured in [`netlify.toml`](netlify.toml) and [`nginx.conf`](nginx.conf).
