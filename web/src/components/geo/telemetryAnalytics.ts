import type { RoutePoint } from '../../types';

export type DistanceUnit = 'metric' | 'imperial';
export type GradeCategory = 'descent' | 'flat' | 'moderate' | 'steep';

export interface EnrichedTelemetryPoint {
  index: number;
  point: RoutePoint;
  cumulativeKm: number;
  gradePercent: number;
  gradeCategory: GradeCategory;
}

export interface RouteSplit {
  splitNumber: number;
  startKm: number;
  endKm: number;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  avgGradePercent: number;
  maxElevationM: number;
}

export interface RouteTelemetrySummary {
  points: EnrichedTelemetryPoint[];
  totalComputedKm: number;
  maxGradePercent: number;
  minGradePercent: number;
  minElevationM: number;
  maxElevationM: number;
  avgSpeedKmh: number;
  splits: RouteSplit[];
}

const KM_TO_MI = 0.621371;
const M_TO_FT = 3.28084;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function classifyGrade(gradePercent: number): GradeCategory {
  if (gradePercent >= 5.5) return 'steep';
  if (gradePercent >= 2.2) return 'moderate';
  if (gradePercent <= -2.5) return 'descent';
  return 'flat';
}

export function formatDistance(km: number, unit: DistanceUnit): string {
  if (unit === 'imperial') {
    return `${(km * KM_TO_MI).toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatElevation(meters: number, unit: DistanceUnit): string {
  if (unit === 'imperial') {
    return `${Math.round(meters * M_TO_FT).toLocaleString()} ft`;
  }
  return `${Math.round(meters).toLocaleString()} m`;
}

export function formatSpeed(kmh: number, unit: DistanceUnit): string {
  if (!Number.isFinite(kmh) || kmh <= 0) return '—';
  if (unit === 'imperial') {
    return `${(kmh * KM_TO_MI).toFixed(1)} mph`;
  }
  return `${kmh.toFixed(1)} km/h`;
}

export function localizeTelemetryText(text: string, unit: DistanceUnit): string {
  if (unit === 'metric' || !text) return text;
  return text
    .replace(/\b(\d+(?:\.\d+)?)\s*km\b/gi, (_match, raw: string) => {
      const val = Number(raw);
      if (!Number.isFinite(val)) return _match;
      const miles = val * KM_TO_MI;
      return raw.includes('.') ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
    })
    .replace(/\b(\d+(?:\.\d+)?)\s*m\b(?![a-z])/gi, (_match, raw: string) => {
      const val = Number(raw);
      if (!Number.isFinite(val)) return _match;
      return `${Math.round(val * M_TO_FT).toLocaleString()} ft`;
    });
}

export function analyzeRouteTelemetry(
  rawPoints: RoutePoint[],
  reportedDistanceKm: number,
  durationMinutes: number
): RouteTelemetrySummary {
  if (!rawPoints || rawPoints.length === 0) {
    return {
      points: [],
      totalComputedKm: 0,
      maxGradePercent: 0,
      minGradePercent: 0,
      minElevationM: 0,
      maxElevationM: 0,
      avgSpeedKmh: 0,
      splits: [],
    };
  }

  const cumulativeRaw: number[] = [0];
  for (let i = 1; i < rawPoints.length; i++) {
    const seg = haversineKm(
      rawPoints[i - 1].lat,
      rawPoints[i - 1].lon,
      rawPoints[i].lat,
      rawPoints[i].lon
    );
    cumulativeRaw.push(cumulativeRaw[i - 1] + seg);
  }

  const rawTotalKm = cumulativeRaw[cumulativeRaw.length - 1];
  const scaleFactor =
    rawTotalKm > 0.1 && reportedDistanceKm > 0 ? reportedDistanceKm / rawTotalKm : 1;

  const cumulativeKm = cumulativeRaw.map((d) => d * scaleFactor);
  const totalComputedKm =
    reportedDistanceKm > 0 ? reportedDistanceKm : Number(rawTotalKm.toFixed(2));

  // Smooth grade over a small window to dampen GPS elevation jitter
  const windowHalf = Math.max(1, Math.min(3, Math.floor(rawPoints.length / 40)));
  let maxGradePercent = 0;
  let minGradePercent = 0;
  let minElevationM = rawPoints[0].elevation;
  let maxElevationM = rawPoints[0].elevation;

  const enriched: EnrichedTelemetryPoint[] = rawPoints.map((pt, index) => {
    if (pt.elevation < minElevationM) minElevationM = pt.elevation;
    if (pt.elevation > maxElevationM) maxElevationM = pt.elevation;

    const prevIdx = Math.max(0, index - windowHalf);
    const nextIdx = Math.min(rawPoints.length - 1, index + windowHalf);
    const runMeters = (cumulativeKm[nextIdx] - cumulativeKm[prevIdx]) * 1000;
    const riseMeters = rawPoints[nextIdx].elevation - rawPoints[prevIdx].elevation;

    let grade = 0;
    if (runMeters >= 25) {
      grade = Math.max(-22, Math.min(22, (riseMeters / runMeters) * 100));
    }
    const roundedGrade = Math.round(grade * 10) / 10;
    if (roundedGrade > maxGradePercent) maxGradePercent = roundedGrade;
    if (roundedGrade < minGradePercent) minGradePercent = roundedGrade;

    return {
      index,
      point: pt,
      cumulativeKm: cumulativeKm[index],
      gradePercent: roundedGrade,
      gradeCategory: classifyGrade(roundedGrade),
    };
  });

  // Compute balanced splits (up to 6 readable segments)
  const targetSplits = Math.max(1, Math.min(6, Math.round(totalComputedKm / 12) || 4));
  const splitSpanKm = totalComputedKm > 0 ? totalComputedKm / targetSplits : 0;
  const splits: RouteSplit[] = [];

  if (enriched.length >= 2 && splitSpanKm > 0) {
    for (let s = 0; s < targetSplits; s++) {
      const startKm = s * splitSpanKm;
      const endKm = s === targetSplits - 1 ? totalComputedKm : (s + 1) * splitSpanKm;
      const segPoints = enriched.filter(
        (ep) =>
          ep.cumulativeKm >= startKm - 0.001 &&
          (s === targetSplits - 1 ? ep.cumulativeKm <= endKm + 0.01 : ep.cumulativeKm < endKm)
      );
      if (segPoints.length === 0) continue;

      let gain = 0;
      let loss = 0;
      let maxEle = segPoints[0].point.elevation;
      for (let i = 1; i < segPoints.length; i++) {
        const diff = segPoints[i].point.elevation - segPoints[i - 1].point.elevation;
        if (diff > 0) gain += diff;
        else loss += Math.abs(diff);
        if (segPoints[i].point.elevation > maxEle) maxEle = segPoints[i].point.elevation;
      }

      const netEle =
        segPoints[segPoints.length - 1].point.elevation - segPoints[0].point.elevation;
      const dist = Math.max(0.1, endKm - startKm);
      const avgGrade = Math.round((netEle / (dist * 1000)) * 1000) / 10;

      splits.push({
        splitNumber: s + 1,
        startKm: Math.round(startKm * 10) / 10,
        endKm: Math.round(endKm * 10) / 10,
        distanceKm: Math.round(dist * 10) / 10,
        elevationGainM: Math.round(gain),
        elevationLossM: Math.round(loss),
        avgGradePercent: avgGrade,
        maxElevationM: Math.round(maxEle),
      });
    }
  }

  const avgSpeedKmh =
    durationMinutes > 0 && totalComputedKm > 0
      ? Math.round((totalComputedKm / (durationMinutes / 60)) * 10) / 10
      : 0;

  return {
    points: enriched,
    totalComputedKm,
    maxGradePercent,
    minGradePercent,
    minElevationM,
    maxElevationM,
    avgSpeedKmh,
    splits,
  };
}
