import type { RouteData } from '../../types';

function escapeXml(value: string): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportRouteToGpx(route: RouteData): void {
  const safeName = escapeXml(route.activityName);
  const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CareerPlatform.Geo" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${safeName}</name>
    <desc>Garmin Forerunner 255 Music Telemetry Export - John Bendfeldt</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${safeName}</name>
    <trkseg>
${route.points
  .map(
    (p) => `      <trkpt lat="${p.lat}" lon="${p.lon}">
        <ele>${p.elevation}</ele>
        <time>${escapeXml(p.timestamp)}</time>
      </trkpt>`
  )
  .join('\n')}
    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedTitle = route.activityName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  a.download = `john-bendfeldt-${sanitizedTitle}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
