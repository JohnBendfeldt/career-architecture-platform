# Career Architecture Platform — Web Client (`web/`)

React 19.3 + TypeScript 6 + Vite 8 single-page application for **[johnbendfeldt.com](https://johnbendfeldt.com)**.

## Stack

- **UI Runtime**: React `^19.3.1`, TypeScript `~6.0.2`, Vite `^8.3.0`
- **Auth & Cloud Sync**: `@supabase/supabase-js` (`^2.119.0`) with GitHub, Google (OIDC nonce-verified), and Microsoft OAuth + Read-Only Portfolio Preview / Guest Recruiter mode
- **Advancement & Spreadsheet Engine**: Zero-dependency OpenXML `.xlsx` & `.csv` import/export codec (`src/utils/xlsxCodec.ts`, `src/utils/advancementImportExport.ts`) and AI curriculum-to-goal bridge (`src/utils/aiCurriculumBridge.ts`)
- **Geospatial**: Leaflet `^1.9.4` + `react-leaflet` `^5.0.0` with client-side GPX parsing/export and 400m residential geofence protection
- **Testing & Quality**: Vitest `^5.1.0`, `@testing-library/react` `^16.3.3`, Oxlint `^1.81.0`

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start local Vite dev server (proxies /api and /geo to Gateway)
npm run lint       # Run Oxlint across TypeScript/React sources
npm test           # Run Vitest unit, UI, serverless, and security/privacy test suites
npm run build      # Runs prebuild (lint + test) before tsc -b && vite build
npm run verify     # Full frontend verification gate (lint + test + tsc -b + vite build)
npm audit          # Audit npm dependency tree for known CVEs
```

## Security Controls

- Shared URL and storage validators live in [`src/utils/security.ts`](src/utils/security.ts) (`isSafeHttpsUrl`, `isSafeImageUrl`, `sanitizeExternalUrl`, `stripUnsafeKeys`, `safeParseStorageObject`, `safeParseStorageArray`).
- Spreadsheet and CSV hardening lives in [`src/utils/xlsxCodec.ts`](src/utils/xlsxCodec.ts) (`2 MB` file cap / `10 MB` streaming decompression abort limit) and [`src/utils/advancementImportExport.ts`](src/utils/advancementImportExport.ts) (OWASP CSV formula-injection neutralization).
- Edge CSP, HSTS, COOP, Permissions-Policy, and cache-control headers are configured in [`netlify.toml`](netlify.toml) and [`nginx.conf`](nginx.conf).
