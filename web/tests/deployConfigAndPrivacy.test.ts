import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const webRoot = path.resolve(import.meta.dirname, '..');

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function countDecimals(num: number): number {
  const str = String(num);
  const dot = str.indexOf('.');
  return dot === -1 ? 0 : str.length - dot - 1;
}

describe('Deployment Gates, Security Headers, RLS & Geospatial Privacy', () => {
  it('enforces CSP, HSTS, COOP, and anti-sniffing headers across Netlify and Nginx configs', () => {
    const candidateConfigs = [
      path.join(repoRoot, 'netlify.toml'),
      path.join(webRoot, 'netlify.toml'),
      path.join(webRoot, 'nginx.conf'),
    ].filter((p) => fs.existsSync(p));

    expect(candidateConfigs.length).toBeGreaterThanOrEqual(2);

    for (const filePath of candidateConfigs) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content, `${filePath} missing X-Frame-Options`).toContain('DENY');
      expect(content, `${filePath} missing nosniff`).toContain('nosniff');
      expect(content, `${filePath} must disable legacy XSS auditor`).toMatch(/X-XSS-Protection[^"\n]*"0"/);
      expect(content, `${filePath} missing COOP`).toContain('same-origin-allow-popups');
      expect(content, `${filePath} missing Referrer-Policy`).toContain('strict-origin-when-cross-origin');
      expect(content, `${filePath} missing Permissions-Policy`).toContain('camera=()');
      expect(content, `${filePath} missing default-src 'self'`).toContain("default-src 'self'");
      expect(content, `${filePath} missing script-src 'self'`).toContain("script-src 'self'");
      expect(content, `${filePath} must not allow unsafe-eval`).not.toContain("'unsafe-eval'");
      expect(content, `${filePath} missing object-src 'none'`).toContain("object-src 'none'");
      expect(content, `${filePath} missing frame-ancestors 'none'`).toContain("frame-ancestors 'none'");
    }

    const netlifyConfigs = [
      path.join(repoRoot, 'netlify.toml'),
      path.join(webRoot, 'netlify.toml'),
    ].filter((p) => fs.existsSync(p));

    for (const netlifyFile of netlifyConfigs) {
      const toml = fs.readFileSync(netlifyFile, 'utf-8');
      expect(toml).toContain('NODE_VERSION = "22"');
      expect(toml).toContain('max-age=31536000; includeSubDomains; preload');
    }
  });

  it('enforces lint and unit test gates before production builds succeed', () => {
    const webPkg = JSON.parse(fs.readFileSync(path.join(webRoot, 'package.json'), 'utf-8'));
    const rootPkgPath = path.join(repoRoot, 'package.json');
    const rootPkg = fs.existsSync(rootPkgPath)
      ? JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'))
      : { scripts: {} };

    const combinedBuildGate = `${webPkg.scripts.prebuild ?? ''} ${webPkg.scripts.build ?? ''} ${rootPkg.scripts.build ?? ''}`;
    expect(combinedBuildGate).toContain('lint');
    expect(combinedBuildGate).toContain('test');
  });

  it.skipIf(!fs.existsSync(path.join(repoRoot, 'infra', 'supabase-schema.sql')))(
    'enforces Supabase Row-Level Security (RLS) and least-privilege grants on all tables',
    () => {
      const sql = fs.readFileSync(path.join(repoRoot, 'infra', 'supabase-schema.sql'), 'utf-8');

      for (const table of ['profiles', 'goals', 'categories', 'career_entries', 'user_roles']) {
        expect(sql).toContain(`REVOKE ALL ON public.${table} FROM anon, authenticated;`);
        expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      }

      // Never allow permissive write policies
      expect(sql).not.toMatch(/FOR\s+(INSERT|UPDATE|DELETE)[\s\S]{0,160}?(USING|WITH\s+CHECK)\s*\(\s*true\s*\)/i);
      expect(sql).toContain('WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id)');
    }
  );

  it('validates all public and Geo service ride telemetry JSON assets and blocks raw .fit exposure', () => {
    const webRidesDir = path.join(webRoot, 'public', 'rides');
    const geoRidesDir = path.join(repoRoot, 'src', 'Geo', 'Data', 'Rides');
    const rideDirs = [
      webRidesDir,
      ...(fs.existsSync(path.join(repoRoot, 'src', 'Geo')) ? [geoRidesDir] : []),
    ];

    const rootGitignorePath = path.join(repoRoot, '.gitignore');
    if (fs.existsSync(rootGitignorePath)) {
      const gitignore = fs.readFileSync(rootGitignorePath, 'utf-8');
      expect(gitignore).toMatch(/^\*\.fit$/m);
    }

    const envLat = process.env.GEO_PRIVACY_LAT ? Number(process.env.GEO_PRIVACY_LAT) : null;
    const envLon = process.env.GEO_PRIVACY_LON ? Number(process.env.GEO_PRIVACY_LON) : null;
    const privacyRadiusM = process.env.GEO_PRIVACY_RADIUS_M
      ? Number(process.env.GEO_PRIVACY_RADIUS_M)
      : 400;

    for (const ridesDir of rideDirs) {
      expect(fs.existsSync(ridesDir), `Missing rides directory: ${ridesDir}`).toBe(true);

      const allFiles = fs.readdirSync(ridesDir);
      expect(allFiles.some((f) => f.toLowerCase().endsWith('.fit'))).toBe(false);

      const rideFiles = allFiles.filter((f) => f.endsWith('.json'));
      expect(rideFiles.length).toBeGreaterThanOrEqual(7);

      for (const file of rideFiles) {
        const data = JSON.parse(fs.readFileSync(path.join(ridesDir, file), 'utf-8'));
        expect(typeof data.activityName).toBe('string');
        expect(data.distanceKm).toBeGreaterThan(0);
        expect(Array.isArray(data.points)).toBe(true);
        expect(data.points.length).toBeGreaterThan(10);
        expect(data.points.length).toBeLessThanOrEqual(1500);

        for (const pt of data.points) {
          expect(pt.lat).toBeGreaterThanOrEqual(-90);
          expect(pt.lat).toBeLessThanOrEqual(90);
          expect(pt.lon).toBeGreaterThanOrEqual(-180);
          expect(pt.lon).toBeLessThanOrEqual(180);
          expect(countDecimals(pt.lat), `${file} lat precision > 5 decimals`).toBeLessThanOrEqual(5);
          expect(countDecimals(pt.lon), `${file} lon precision > 5 decimals`).toBeLessThanOrEqual(5);
          expect(Number.isFinite(pt.elevation)).toBe(true);

          if (envLat !== null && envLon !== null && Number.isFinite(envLat) && Number.isFinite(envLon)) {
            expect(haversineMeters(pt.lat, pt.lon, envLat, envLon)).toBeGreaterThanOrEqual(privacyRadiusM);
          }
        }

        for (const ann of data.annotations) {
          expect(countDecimals(ann.lat), `${file} annotation lat precision > 5 decimals`).toBeLessThanOrEqual(5);
          expect(countDecimals(ann.lon), `${file} annotation lon precision > 5 decimals`).toBeLessThanOrEqual(5);

          if (envLat !== null && envLon !== null && Number.isFinite(envLat) && Number.isFinite(envLon)) {
            expect(haversineMeters(ann.lat, ann.lon, envLat, envLon)).toBeGreaterThanOrEqual(privacyRadiusM);
          }
        }

        // Annotations must align with trimmed points, never untrimmed raw coordinates
        const startAnn = data.annotations.find((a: { type: string }) => a.type === 'start');
        const finishAnn = data.annotations.find((a: { type: string }) => a.type === 'finish');
        expect(startAnn).toBeDefined();
        expect(finishAnn).toBeDefined();
        expect(startAnn.lat).toBeCloseTo(data.points[0].lat, 5);
        expect(startAnn.lon).toBeCloseTo(data.points[0].lon, 5);
        expect(finishAnn.lat).toBeCloseTo(data.points[data.points.length - 1].lat, 5);
        expect(finishAnn.lon).toBeCloseTo(data.points[data.points.length - 1].lon, 5);
      }
    }
  });

  it('enforces absolute HTTPS PNG Open Graph & Twitter link-preview metadata and raster assets', () => {
    const indexHtml = fs.readFileSync(path.join(webRoot, 'index.html'), 'utf-8');

    expect(indexHtml).toContain('href="https://johnbendfeldt.com/"');
    expect(indexHtml).toContain('property="og:url" content="https://johnbendfeldt.com/"');
    expect(indexHtml).toContain('property="og:image" content="https://johnbendfeldt.com/og-image.png"');
    expect(indexHtml).toContain('property="og:image:type" content="image/png"');
    expect(indexHtml).toContain('name="twitter:image" content="https://johnbendfeldt.com/og-image.png"');
    expect(indexHtml).toContain('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"');
    expect(indexHtml).not.toContain('og-image.svg');
    expect(indexHtml).not.toContain('apple-touch-icon.svg');

    const ogPng = fs.readFileSync(path.join(webRoot, 'public', 'og-image.png'));
    expect(ogPng.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(ogPng.readUInt32BE(16)).toBe(1200);
    expect(ogPng.readUInt32BE(20)).toBe(630);

    const touchPng = fs.readFileSync(path.join(webRoot, 'public', 'apple-touch-icon.png'));
    expect(touchPng.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(touchPng.readUInt32BE(16)).toBe(180);
    expect(touchPng.readUInt32BE(20)).toBe(180);

    const rootOgPath = path.join(repoRoot, 'og-image.png');
    if (fs.existsSync(rootOgPath)) {
      expect(fs.readFileSync(rootOgPath).equals(ogPng)).toBe(true);
    }
  });

  it('enforces Senior Software Engineer SEO metadata, Schema.org Person JSON-LD graph, robots.txt, and sitemap.xml', () => {
    const indexHtml = fs.readFileSync(path.join(webRoot, 'index.html'), 'utf-8');

    expect(indexHtml).toContain('<meta name="author" content="John Bendfeldt" />');
    expect(indexHtml).toContain('<meta name="robots" content="index, follow');
    expect(indexHtml).toMatch(/<title>[^<]*John Bendfeldt[^<]*Senior Software Engineer[^<]*<\/title>/);
    expect(indexHtml).toMatch(/<meta name="description" content="[^"]*Senior Software Engineer[^"]*" \/>/);
    expect(indexHtml).toMatch(/<meta name="keywords" content="[^"]*Senior Software Engineer[^"]*Senior Software Developer[^"]*" \/>/);
    expect(indexHtml).toContain('rel="me" href="https://github.com/JohnBendfeldt"');
    expect(indexHtml).toContain('rel="me" href="https://www.linkedin.com/in/johnbendfeldt"');
    expect(indexHtml).toContain('<noscript>');

    const ldMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(ldMatch, 'Missing JSON-LD structured data block in web/index.html').not.toBeNull();
    const ldJson = JSON.parse(ldMatch![1]) as { '@graph': Array<Record<string, unknown>> };
    expect(Array.isArray(ldJson['@graph'])).toBe(true);

    const person = ldJson['@graph'].find((node) => node['@type'] === 'Person');
    expect(person).toBeDefined();
    expect(person?.name).toBe('John Bendfeldt');
    expect(person?.jobTitle).toBe('Senior Software Engineer');
    const sameAs = (person?.sameAs as string[]) ?? [];
    expect(sameAs).toContain('https://github.com/JohnBendfeldt');
    expect(sameAs).toContain('https://www.linkedin.com/in/johnbendfeldt');
    expect(sameAs).toContain('https://basiclanguage.school/');
    expect(sameAs).toContain('https://jbfit.studio/');

    const jbfitNode = ldJson['@graph'].find((node) => node.name === 'Just Believe Fitness');
    expect(jbfitNode).toBeDefined();
    expect(jbfitNode?.sameAs).toBe('https://github.com/JohnBendfeldt/just-believe-fitness');

    const robotsTxt = fs.readFileSync(path.join(webRoot, 'public', 'robots.txt'), 'utf-8');
    expect(robotsTxt).toContain('User-agent: *');
    expect(robotsTxt).toContain('Allow: /');
    expect(robotsTxt).toContain('Sitemap: https://johnbendfeldt.com/sitemap.xml');

    const sitemapXml = fs.readFileSync(path.join(webRoot, 'public', 'sitemap.xml'), 'utf-8');
    expect(sitemapXml).toContain('<loc>https://johnbendfeldt.com/</loc>');
  });

  it('preserves all security headers inside Nginx child location blocks and disables server_tokens', () => {
    const nginxConf = fs.readFileSync(path.join(webRoot, 'nginx.conf'), 'utf-8');
    expect(nginxConf).toContain('listen 8080;');
    expect(nginxConf).toContain('server_tokens off;');

    const assetsMatch = nginxConf.match(/location\s+\/assets\/\s*\{([\s\S]*?)\}/);
    const indexMatch = nginxConf.match(/location\s*=\s*\/index\.html\s*\{([\s\S]*?)\}/);
    expect(assetsMatch, 'Missing location /assets/ block in nginx.conf').not.toBeNull();
    expect(indexMatch, 'Missing location = /index.html block in nginx.conf').not.toBeNull();

    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Cross-Origin-Opener-Policy',
      'Referrer-Policy',
      'Permissions-Policy',
      'Content-Security-Policy',
    ];

    for (const header of requiredHeaders) {
      expect(assetsMatch![1], `/assets/ block dropped ${header}`).toContain(header);
      expect(indexMatch![1], `= /index.html block dropped ${header}`).toContain(header);
    }

    expect(assetsMatch![1]).toContain('immutable');
    expect(indexMatch![1]).toContain('no-store, no-cache, must-revalidate');
  });

  it('keeps root netlify.toml and web/netlify.toml API and Geo proxy redirects synchronized before SPA fallback', () => {
    const netlifyFiles = [
      path.join(repoRoot, 'netlify.toml'),
      path.join(webRoot, 'netlify.toml'),
    ].filter((p) => fs.existsSync(p));

    for (const filePath of netlifyFiles) {
      const toml = fs.readFileSync(filePath, 'utf-8');
      const extractIdx = toml.indexOf('from = "/api/skills/extract"');
      const apiProxyIdx = toml.indexOf('from = "/api/*"');
      const geoProxyIdx = toml.indexOf('from = "/geo/*"');
      const spaFallbackIdx = toml.indexOf('from = "/*"');

      expect(extractIdx, `${filePath} missing /api/skills/extract redirect`).toBeGreaterThan(-1);
      expect(apiProxyIdx, `${filePath} missing /api/* proxy redirect`).toBeGreaterThan(extractIdx);
      expect(geoProxyIdx, `${filePath} missing /geo/* proxy redirect`).toBeGreaterThan(extractIdx);
      expect(spaFallbackIdx, `${filePath} SPA fallback must come after /api/* and /geo/*`).toBeGreaterThan(
        Math.max(apiProxyIdx, geoProxyIdx)
      );
    }
  });

  it.skipIf(!fs.existsSync(path.join(repoRoot, '.github', 'workflows', 'ci.yml')))(
    'enforces Option-1 runtime audit in ci.yml, scheduled full audit in security-audit.yml, and SHA-pinned actions',
    () => {
      const ciYml = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf-8');
      const secAuditPath = path.join(repoRoot, '.github', 'workflows', 'security-audit.yml');
      const dependabotPath = path.join(repoRoot, '.github', 'dependabot.yml');

      expect(fs.existsSync(secAuditPath)).toBe(true);
      expect(fs.existsSync(dependabotPath)).toBe(true);

      // Every uses: in ci.yml and security-audit.yml must be pinned to a 40-char commit SHA
      for (const wfPath of [path.join(repoRoot, '.github', 'workflows', 'ci.yml'), secAuditPath]) {
        const wf = fs.readFileSync(wfPath, 'utf-8');
        const usesMatches = [...wf.matchAll(/uses:\s*([^\s#]+)/g)].map((m) => m[1]);
        expect(usesMatches.length).toBeGreaterThan(0);
        for (const actionRef of usesMatches) {
          expect(actionRef, `${wfPath} has unpinned action ${actionRef}`).toMatch(/@[0-9a-f]{40}$/);
        }
      }

      // ci.yml typechecks serverless functions and audits runtime dependencies (--omit=dev)
      expect(ciYml).toContain('./web/node_modules/.bin/tsc -p tsconfig.json --noEmit');
      expect(ciYml).toContain('npm --prefix web audit --omit=dev --audit-level=high');

      // security-audit.yml runs ONLY on schedule and workflow_dispatch with full audit
      const secYml = fs.readFileSync(secAuditPath, 'utf-8');
      expect(secYml).toContain('schedule:');
      expect(secYml).toContain('workflow_dispatch:');
      expect(secYml).not.toMatch(/^\s*push:/m);
      expect(secYml).not.toMatch(/^\s*pull_request:/m);
      expect(secYml).toContain('npm --prefix web audit --audit-level=high');
      expect(secYml).not.toContain('--omit=dev');
      expect(secYml).toContain('dotnet list CareerPlatform.sln package --vulnerable --include-transitive');

      const dependabotYml = fs.readFileSync(dependabotPath, 'utf-8');
      expect(dependabotYml).toContain('package-ecosystem: "npm"');
      expect(dependabotYml).toContain('directory: "/web"');
      expect(dependabotYml).toContain('package-ecosystem: "nuget"');
      expect(dependabotYml).toContain('minor-and-patch:');
      expect(dependabotYml).toContain('major:');

      const autoMergePath = path.join(repoRoot, '.github', 'workflows', 'auto-merge.yml');
      expect(fs.existsSync(autoMergePath)).toBe(true);
      const autoMergeYml = fs.readFileSync(autoMergePath, 'utf-8');
      expect(autoMergeYml).toContain('workflows: ["CI & Deploy Gate"]');
      expect(autoMergeYml).not.toContain('actions/checkout');
      expect(autoMergeYml).toContain('/minor-and-patch-');
      expect(autoMergeYml).toContain('--match-head-commit');
      expect(autoMergeYml).toContain('--delete-branch');
    }
  );
});
