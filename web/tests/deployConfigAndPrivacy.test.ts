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

      for (const table of ['profiles', 'goals', 'user_roles']) {
        expect(sql).toContain(`REVOKE ALL ON public.${table} FROM anon, authenticated;`);
        expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      }

      // Never allow permissive write policies
      expect(sql).not.toMatch(/FOR\s+(INSERT|UPDATE|DELETE)[\s\S]{0,160}?(USING|WITH\s+CHECK)\s*\(\s*true\s*\)/i);
      expect(sql).toContain('WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id)');
    }
  );

  it('validates all public ride telemetry JSON assets and blocks raw .fit exposure', () => {
    const publicDir = path.join(webRoot, 'public');
    const ridesDir = path.join(publicDir, 'rides');
    const rideFiles = fs.readdirSync(ridesDir).filter((f) => f.endsWith('.json'));
    expect(rideFiles.length).toBeGreaterThanOrEqual(7);

    // Ensure no raw binary .fit file is ever placed inside web/public
    const allPublicFiles = fs.readdirSync(ridesDir);
    expect(allPublicFiles.some((f) => f.toLowerCase().endsWith('.fit'))).toBe(false);

    const envLat = process.env.GEO_PRIVACY_LAT ? Number(process.env.GEO_PRIVACY_LAT) : null;
    const envLon = process.env.GEO_PRIVACY_LON ? Number(process.env.GEO_PRIVACY_LON) : null;
    const privacyRadiusM = process.env.GEO_PRIVACY_RADIUS_M
      ? Number(process.env.GEO_PRIVACY_RADIUS_M)
      : 400;

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
  });
});
