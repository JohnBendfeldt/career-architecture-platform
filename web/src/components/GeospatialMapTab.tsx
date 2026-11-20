import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RouteData, RideSummary } from '../types';
import { ApiService } from '../services/api';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import {
  Download,
  Compass,
  Activity,
  Navigation,
  Mountain,
  Clock,
  Upload,
  CheckCircle2,
  ChevronDown,
  Check,
  SlidersHorizontal,
  LayoutGrid,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { exportRouteToGpx } from './geo/gpxExport';
import { createCustomIcon, createTelemetryCursorIcon, MapUpdater } from './geo/MapHelpers';
import { ElevationProfileChart } from './geo/ElevationProfileChart';
import {
  analyzeRouteTelemetry,
  formatDistance,
  formatElevation,
  formatSpeed,
  localizeTelemetryText,
  type DistanceUnit,
} from './geo/telemetryAnalytics';

interface GeospatialMapTabProps {
  workspaceMode?: 'portfolio' | 'personal';
  userName?: string;
  theme?: 'light' | 'dark';
  onNotify?: (message: string, tone?: 'success' | 'info' | 'error') => void;
}

type BasemapMode = 'auto' | 'street' | 'muted' | 'dark';

const UNIT_STORAGE_KEY = 'cap_telemetry_unit';

const PERSONAL_SAMPLE_RIDE: RideSummary = {
  id: 'sample-demo-route',
  title: 'Hill Country Loop (Sample)',
  distanceKm: 83.9,
  elevationGainM: 723,
  durationMinutes: 274,
  date: 'Starter Route',
};

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const GeospatialMapTab: React.FC<GeospatialMapTabProps> = ({
  workspaceMode = 'portfolio',
  userName = 'My',
  theme = 'light',
  onNotify,
}) => {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [rides, setRides] = useState<RideSummary[]>([]);
  const [customRoutesMap, setCustomRoutesMap] = useState<Record<string, RouteData>>({});
  const [selectedRideId, setSelectedRideId] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [switchingRide, setSwitchingRide] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [useDropdown, setUseDropdown] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Interactive telemetry controls (defaults to metric; remembers user preference)
  const [unit, setUnit] = useState<DistanceUnit>(() => {
    try {
      return localStorage.getItem(UNIT_STORAGE_KEY) === 'imperial' ? 'imperial' : 'metric';
    } catch {
      return 'metric';
    }
  });
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('auto');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<1 | 4 | 10>(4);
  const [showSplits, setShowSplits] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cursorIcon = useMemo(() => createTelemetryCursorIcon(), []);

  useEffect(() => {
    try {
      localStorage.setItem(UNIT_STORAGE_KEY, unit);
    } catch {
      // Ignore storage quota or private-mode restrictions
    }
  }, [unit]);

  // Close route dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Reset replay cursor whenever route changes
  useEffect(() => {
    setIsReplaying(false);
    setActivePointIndex(null);
  }, [route]);

  // Load available rides based on workspaceMode
  useEffect(() => {
    let mounted = true;
    if (workspaceMode === 'personal') {
      ApiService.getSampleRoute().then((sample) => {
        if (!mounted) return;
        const sampleRouteData: RouteData = {
          ...sample,
          activityName: 'Sample Route (Upload Your Own .FIT or .GPX Above)',
          recordedDevice: 'Sample GPS Telemetry Stream',
        };
        setRides([PERSONAL_SAMPLE_RIDE]);
        setSelectedRideId(PERSONAL_SAMPLE_RIDE.id);
        setRoute(sampleRouteData);
        setInitialLoading(false);
      });
      return () => {
        mounted = false;
      };
    }

    ApiService.getRides().then(async (ridesList) => {
      if (!mounted) return;
      setRides(ridesList);
      if (ridesList.length > 0) {
        const firstRide = ridesList[0];
        setSelectedRideId(firstRide.id);
        try {
          const firstRoute = await ApiService.getRideById(firstRide.id);
          if (mounted) {
            setRoute(firstRoute);
            setInitialLoading(false);
          }
        } catch {
          const sample = await ApiService.getSampleRoute();
          if (mounted) {
            setRoute(sample);
            setInitialLoading(false);
          }
        }
      } else {
        const sample = await ApiService.getSampleRoute();
        if (mounted) {
          setRoute(sample);
          setInitialLoading(false);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, [workspaceMode]);

  const telemetry = useMemo(
    () =>
      route
        ? analyzeRouteTelemetry(route.points, route.distanceKm, route.durationMinutes)
        : null,
    [route]
  );

  // Route Replay animation timer
  useEffect(() => {
    if (!isReplaying || !route || route.points.length < 2) return;
    const totalPts = route.points.length;
    const step = Math.max(1, Math.round((totalPts / 180) * (replaySpeed / 2)));
    const interval = window.setInterval(() => {
      setActivePointIndex((prev) => {
        const start = prev === null ? 0 : prev;
        const next = start + step;
        if (next >= totalPts - 1) {
          setIsReplaying(false);
          return totalPts - 1;
        }
        return next;
      });
    }, 60);
    return () => window.clearInterval(interval);
  }, [isReplaying, replaySpeed, route]);

  const handleSelectRide = async (ride: RideSummary) => {
    if (selectedRideId === ride.id && !switchingRide) return;
    setSelectedRideId(ride.id);
    setSwitchingRide(true);
    setUploadMessage(null);
    setUploadError(null);
    try {
      if (customRoutesMap[ride.id]) {
        setRoute(customRoutesMap[ride.id]);
      } else if (ride.id === PERSONAL_SAMPLE_RIDE.id) {
        const sample = await ApiService.getSampleRoute();
        setRoute({
          ...sample,
          activityName: 'Sample Route (Upload Your Own .FIT or .GPX Above)',
          recordedDevice: 'Sample GPS Telemetry Stream',
        });
      } else {
        const data = await ApiService.getRideById(ride.id);
        setRoute(data);
      }
    } catch (e) {
      console.error('Failed to load ride', e);
      const errMsg = 'Unable to load route telemetry. Please try another ride.';
      setUploadError(errMsg);
      onNotify?.(errMsg, 'error');
    } finally {
      setSwitchingRide(false);
    }
  };

  const reportError = (msg: string) => {
    setUploadError(msg);
    setUploadMessage(null);
    onNotify?.(msg, 'error');
  };

  const handleFileUpload = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.fit') && !lowerName.endsWith('.gpx')) {
      reportError('Please upload a valid Garmin binary .fit or .gpx file.');
      return;
    }

    if (lowerName.endsWith('.gpx') && file.size > 15 * 1024 * 1024) {
      reportError('GPX file exceeds the 15 MB maximum upload size.');
      return;
    }

    if (lowerName.endsWith('.fit') && file.size > 50 * 1024 * 1024) {
      reportError('Garmin FIT file exceeds the 50 MB maximum upload size.');
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    setUploadError(null);
    try {
      const parsedRoute = await ApiService.uploadFitFile(file);
      const customId = `custom-${Date.now()}`;
      const newSummary: RideSummary = {
        id: customId,
        title: parsedRoute.activityName || file.name,
        distanceKm: parsedRoute.distanceKm,
        elevationGainM: parsedRoute.elevationGainM,
        durationMinutes: parsedRoute.durationMinutes,
        date: 'Uploaded Just Now',
      };
      setCustomRoutesMap((prev) => ({ ...prev, [customId]: parsedRoute }));
      setRides((prev) => [newSummary, ...prev]);
      setRoute(parsedRoute);
      setSelectedRideId(customId);
      const msg = `Successfully parsed ${file.name} (${formatDistance(parsedRoute.distanceKm, unit)}, +${formatElevation(parsedRoute.elevationGainM, unit)})!`;
      setUploadMessage(msg);
      onNotify?.(msg, 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      reportError(`Error parsing telemetry file: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const polylinePositions = useMemo<[number, number][]>(
    () => (route ? route.points.map((p) => [p.lat, p.lon]) : []),
    [route]
  );

  const routeCenter = useMemo<[number, number]>(() => {
    if (!route || route.points.length === 0) return [30.5, -97.5];
    const mid = route.points[Math.floor(route.points.length / 2)];
    return [mid.lat, mid.lon];
  }, [route]);

  const annotationMarkers = useMemo(() => {
    if (!route) return null;
    return route.annotations.map((ann) => (
      <Marker
        key={ann.id}
        position={[ann.lat, ann.lon]}
        icon={createCustomIcon(ann.type)}
      >
        <Popup>
          <div style={{ padding: '4px' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--accent-crimson)',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              {ann.type === 'start' && 'Route Departure'}
              {ann.type === 'checkpoint' && 'Halfway Split'}
              {ann.type === 'highlight' && 'Peak Elevation Segment'}
              {ann.type === 'finish' && 'Ride Finish'}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {ann.title}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {localizeTelemetryText(ann.text, unit)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
              Lat: {ann.lat.toFixed(4)}, Lon: {ann.lon.toFixed(4)}
            </div>
          </div>
        </Popup>
      </Marker>
    ));
  }, [route, unit]);

  if (initialLoading || !route || !telemetry) {
    return (
      <div className="glass-panel" role="status" style={{ padding: '60px', textAlign: 'center' }}>
        <Activity size={32} color="var(--text-primary)" aria-hidden="true" className="animate-spin" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Parsing Garmin Forerunner 255 Music Binary Telemetry (.FIT)...</p>
      </div>
    );
  }

  const hours = Math.floor(route.durationMinutes / 60);
  const minutes = route.durationMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const activeRide = rides.find((r) => r.id === selectedRideId);
  const effectiveBasemapMode: Exclude<BasemapMode, 'auto'> =
    basemapMode === 'auto' ? (theme === 'dark' ? 'dark' : 'street') : basemapMode;

  const activeTelemetryPoint =
    activePointIndex !== null && telemetry.points[activePointIndex]
      ? telemetry.points[activePointIndex]
      : null;

  const replayProgressPercent =
    activePointIndex !== null && route.points.length > 1
      ? Math.round((activePointIndex / (route.points.length - 1)) * 100)
      : 0;

  const handleToggleReplay = () => {
    if (isReplaying) {
      setIsReplaying(false);
      return;
    }
    if (activePointIndex === null || activePointIndex >= route.points.length - 1) {
      setActivePointIndex(0);
    }
    setIsReplaying(true);
  };

  const handleResetReplay = () => {
    setIsReplaying(false);
    setActivePointIndex(null);
  };

  return (
    <div style={{ marginBottom: '36px' }}>
      {/* Screen-reader accessible file input for .FIT and .GPX uploads */}
      <label htmlFor="fit-gpx-upload-input" className="sr-only">
        Upload Garmin FIT or GPX telemetry file
      </label>
      <input
        id="fit-gpx-upload-input"
        type="file"
        ref={fileInputRef}
        accept=".fit,.gpx"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Header and Telemetry Actions */}
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Geospatial Telemetry • Garmin FIT &amp; GPX</div>
          <h2 className="section-title">
            {workspaceMode === 'personal'
              ? `${userName}'s GPS Telemetry Visualizer`
              : 'Garmin Telemetry Visualizer & Binary FIT Parser'}
          </h2>
          <p className="section-subtitle">
            {workspaceMode === 'personal'
              ? 'Click "Upload .FIT / .GPX" on the right to plot your own GPS activity files onto the interactive map, or replay the sample route below.'
              : <>Binary telemetry decoded directly from John&apos;s <strong>Garmin Forerunner 255 Music</strong> with synced elevation scrubbing, route replay, and GPX export.</>}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Metric / Imperial Switch */}
          <div className="segmented-control" role="group" aria-label="Telemetry measurement units">
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={unit === 'metric'}
              onClick={() => setUnit('metric')}
            >
              km / m
            </button>
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={unit === 'imperial'}
              onClick={() => setUnit('imperial')}
            >
              mi / ft
            </button>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary"
            id="btn-upload-fit"
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
          >
            <Upload size={15} aria-hidden="true" />
            <span>{uploading ? 'Parsing Telemetry...' : 'Upload .FIT / .GPX'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              exportRouteToGpx(route);
              onNotify?.(`Exported ${route.activityName} as .GPX`, 'success');
            }}
            className="btn-primary"
            id="btn-export-gpx"
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
          >
            <Download size={15} aria-hidden="true" />
            <span>Export .GPX</span>
          </button>
        </div>
      </div>

      {/* Favorite Rides Selector Bar */}
      <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: '20px', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {workspaceMode === 'personal'
                ? `${userName}'s Uploaded Routes & Starter Sample`
                : "John's Favorite Central Texas Rides"}
            </h3>
            <span className="badge badge-indigo">
              {workspaceMode === 'personal'
                ? `${rides.length} ${rides.length === 1 ? 'Sample Route' : 'Routes'}`
                : `${rides.length} Preloaded Rides`}
            </span>
            {switchingRide && (
              <span
                role="status"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.75rem',
                  color: 'var(--accent-crimson)',
                }}
              >
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                <span>Loading route...</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Select a route to replay GPS splits &amp; climb grades
            </span>
            <button
              type="button"
              onClick={() => setUseDropdown(!useDropdown)}
              className="btn-secondary"
              style={{ padding: '5px 12px', minHeight: '32px', fontSize: '0.78rem' }}
            >
              {useDropdown ? (
                <>
                  <LayoutGrid size={13} aria-hidden="true" />
                  <span>Grid View</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal size={13} aria-hidden="true" />
                  <span>Dropdown View</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 1. DROPDOWN SELECTOR MODE */}
        {useDropdown ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: isDropdownOpen ? '1.5px solid var(--accent-crimson)' : '1px solid var(--border-control)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {localizeTelemetryText(activeRide?.title || route.activityName, unit)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <span>{formatDistance(route.distanceKm, unit)}</span>
                  <span aria-hidden="true">•</span>
                  <span>+{formatElevation(route.elevationGainM, unit)} ascent</span>
                  <span aria-hidden="true">•</span>
                  <span>{durationText}</span>
                </div>
              </div>
              <ChevronDown
                size={18}
                aria-hidden="true"
                style={{
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  color: isDropdownOpen ? 'var(--accent-crimson)' : 'var(--text-muted)',
                }}
              />
            </button>

            {isDropdownOpen && (
              <div
                role="listbox"
                aria-label="Available GPS routes"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-control)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                }}
              >
                {rides.map((r) => {
                  const isSelected = selectedRideId === r.id;
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      key={r.id}
                      onClick={() => {
                        handleSelectRide(r);
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'var(--bg-inset)' : 'transparent',
                        border: isSelected ? '1px solid var(--accent-crimson)' : '1px solid transparent',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginBottom: '3px',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {localizeTelemetryText(r.title, unit)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>{formatDistance(r.distanceKm, unit)}</span>
                          <span aria-hidden="true">•</span>
                          <span>+{formatElevation(r.elevationGainM, unit)}</span>
                          <span aria-hidden="true">•</span>
                          <span>{r.durationMinutes} min</span>
                          <span aria-hidden="true">•</span>
                          <span>{r.date}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          aria-hidden="true"
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'var(--accent-crimson-solid)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* 2. RESPONSIVE GRID MODE */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
              gap: '10px',
            }}
          >
            {rides.map((r) => {
              const isSelected = selectedRideId === r.id;
              return (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  key={r.id}
                  onClick={() => handleSelectRide(r)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-inset)' : 'var(--bg-surface)',
                    border: isSelected ? '1.5px solid var(--accent-crimson)' : '1px solid var(--border-control)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: isSelected ? 700 : 600,
                      color: 'var(--text-primary)',
                      marginBottom: '6px',
                      lineHeight: 1.3,
                    }}
                  >
                    {localizeTelemetryText(r.title, unit)}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '5px',
                      fontSize: '0.75rem',
                      color: isSelected ? 'var(--accent-crimson)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{formatDistance(r.distanceKm, unit)}</span>
                    <span aria-hidden="true">•</span>
                    <span>+{formatElevation(r.elevationGainM, unit)}</span>
                    <span aria-hidden="true">•</span>
                    <span>{r.date}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Notification or Error Banner */}
      {uploadMessage && (
        <div
          className="callout-success"
          role="status"
          style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
          }}
        >
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {uploadError && (
        <div
          className="callout-danger"
          role="alert"
          style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
          }}
        >
          <AlertTriangle size={18} aria-hidden="true" style={{ color: 'var(--status-danger)', flexShrink: 0 }} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Telemetry HUD Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
          gap: '14px',
          marginBottom: '18px',
          transition: 'opacity 0.2s',
          opacity: switchingRide ? 0.65 : 1,
        }}
      >
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Navigation size={16} color="var(--accent-crimson)" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Active Distance</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatDistance(route.distanceKm, unit)}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Mountain size={16} color="var(--text-primary)" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Total Ascent</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            +{formatElevation(route.elevationGainM, unit)}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Clock size={16} color="var(--text-primary)" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Duration / Avg</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {durationText}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            Avg {formatSpeed(telemetry.avgSpeedKmh, unit)} • Peak {telemetry.maxGradePercent}%
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Compass size={16} color="var(--status-success)" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Recording Device</span>
          </div>
          <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {route.recordedDevice}
          </div>
        </div>
      </div>

      {/* Synchronized Route Replay & Basemap Control Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div className="telemetry-playback-row">
            <button
              type="button"
              onClick={handleToggleReplay}
              className="btn-primary telemetry-replay-btn"
              id="btn-replay-route"
              style={{ padding: '7px 14px', fontSize: '0.82rem' }}
            >
              {isReplaying ? (
                <>
                  <Pause size={14} aria-hidden="true" />
                  <span>Pause Replay</span>
                </>
              ) : (
                <>
                  <Play size={14} aria-hidden="true" />
                  <span>{activePointIndex !== null && activePointIndex < route.points.length - 1 ? 'Resume Replay' : 'Replay Route'}</span>
                </>
              )}
            </button>

            <div className="segmented-control telemetry-speed-control" role="group" aria-label="Replay playback speed">
              {([1, 4, 10] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  className="segmented-btn"
                  aria-pressed={replaySpeed === spd}
                  onClick={() => setReplaySpeed(spd)}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleResetReplay}
              disabled={activePointIndex === null}
              className="btn-secondary telemetry-reset-btn"
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              aria-label="Reset replay cursor"
              title="Clear telemetry cursor"
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span className="telemetry-reset-label">Reset</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              id="btn-quick-unit-toggle"
              onClick={() => setUnit((prev) => (prev === 'metric' ? 'imperial' : 'metric'))}
              className="btn-secondary"
              style={{
                padding: '6px 10px',
                minHeight: '34px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap',
              }}
              aria-label={`Switch units to ${unit === 'metric' ? 'imperial (miles and feet)' : 'metric (kilometers and meters)'}`}
              title={`Currently ${unit === 'metric' ? 'Metric (km / m)' : 'Imperial (mi / ft)'} — click to switch`}
            >
              {unit === 'metric' ? 'Metric · km ⇄ mi' : 'Imperial · mi ⇄ km'}
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap', maxWidth: '100%' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 }}>
                <Layers size={13} aria-hidden="true" />
                <span>Map</span>
              </span>
              <div className="segmented-control" role="group" aria-label="Map tile style">
                {[
                  { id: 'auto' as const, label: 'Auto' },
                  { id: 'street' as const, label: 'Street' },
                  { id: 'muted' as const, label: 'Muted' },
                  { id: 'dark' as const, label: 'Dark' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="segmented-btn"
                    aria-pressed={basemapMode === opt.id}
                    onClick={() => setBasemapMode(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scrubber Slider + Fixed-Height Tabular Telemetry Readout (Zero Replay Reflow) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gauge size={15} aria-hidden="true" style={{ color: 'var(--accent-crimson)', flexShrink: 0 }} />
            <label htmlFor="route-scrubber-slider" className="sr-only">
              Scrub GPS route telemetry timeline
            </label>
            <input
              id="route-scrubber-slider"
              type="range"
              min={0}
              max={Math.max(0, route.points.length - 1)}
              value={activePointIndex ?? 0}
              onChange={(e) => {
                setIsReplaying(false);
                setActivePointIndex(Number(e.target.value));
              }}
              className="telemetry-slider"
              style={{ width: '100%' }}
            />
          </div>

          <div className="telemetry-readout-grid" aria-live="polite">
            <div className="telemetry-readout-cell">
              <span className="telemetry-readout-label">
                <span>Distance</span>
                <span className="telemetry-readout-pct">{activeTelemetryPoint ? `${replayProgressPercent}%` : 'Ready'}</span>
              </span>
              <span className="telemetry-readout-value">
                {activeTelemetryPoint
                  ? formatDistance(activeTelemetryPoint.cumulativeKm, unit)
                  : formatDistance(0, unit)}
              </span>
            </div>

            <div className="telemetry-readout-cell">
              <span className="telemetry-readout-label">Elevation</span>
              <span className="telemetry-readout-value">
                {activeTelemetryPoint
                  ? formatElevation(activeTelemetryPoint.point.elevation, unit)
                  : formatElevation(route.points[0]?.elevation ?? 0, unit)}
              </span>
            </div>

            <div className="telemetry-readout-cell">
              <span className="telemetry-readout-label">Grade</span>
              <span
                className="telemetry-readout-value"
                style={{
                  color: !activeTelemetryPoint
                    ? 'var(--text-muted)'
                    : activeTelemetryPoint.gradeCategory === 'steep'
                      ? 'var(--accent-crimson)'
                      : activeTelemetryPoint.gradeCategory === 'descent'
                        ? 'var(--status-success)'
                        : 'var(--text-primary)',
                }}
              >
                {activeTelemetryPoint
                  ? `${activeTelemetryPoint.gradePercent > 0 ? '+' : ''}${activeTelemetryPoint.gradePercent.toFixed(1)}%`
                  : '0.0%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className="glass-panel" style={{ padding: '14px', position: 'relative' }}>
        <div
          className={`geo-map-frame geo-map-${effectiveBasemapMode}`}
          style={{
            height: 'clamp(320px, 55vh, 520px)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {switchingRide && (
            <div
              role="status"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                zIndex: 1000,
                background: 'var(--bg-card)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent-crimson)',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              <span>Panning route...</span>
            </div>
          )}

          <MapContainer
            center={routeCenter}
            zoom={11}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution={OSM_ATTRIBUTION}
              url={OSM_TILE_URL}
            />

            <MapUpdater points={route.points} />

            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: '#c40010',
                weight: 5,
                opacity: 0.92,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />

            {activeTelemetryPoint && (
              <Marker
                position={[activeTelemetryPoint.point.lat, activeTelemetryPoint.point.lon]}
                icon={cursorIcon}
                zIndexOffset={1000}
              />
            )}

            {annotationMarkers}
          </MapContainer>
        </div>

        {/* Non-Overlapping Editorial Legend Footer */}
        <div className="telemetry-legend-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span aria-hidden="true" style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
            <span>Departure</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span aria-hidden="true" style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
            <span>Halfway Split</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span aria-hidden="true" style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            <span>Peak Elevation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span aria-hidden="true" style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#06b6d4', flexShrink: 0 }} />
            <span>Finish</span>
          </div>
        </div>
      </div>

      {/* Synced Elevation Profile Chart */}
      <ElevationProfileChart
        points={route.points}
        distanceKm={route.distanceKm}
        unit={unit}
        enrichedPoints={telemetry.points}
        activePointIndex={activePointIndex}
        onActivePointIndexChange={(idx) => {
          setIsReplaying(false);
          setActivePointIndex(idx);
        }}
      />

      {/* Interactive Split Telemetry Table */}
      {telemetry.splits.length > 0 && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '0.94rem', margin: 0, color: 'var(--text-primary)' }}>
                Segment Split Breakdown ({telemetry.splits.length} Segments)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Computed directly from GPS coordinates &amp; barometric altitude samples
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSplits((prev) => !prev)}
              className="btn-secondary"
              aria-expanded={showSplits}
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              <span>{showSplits ? 'Hide Splits' : 'Inspect Segment Splits'}</span>
              <ChevronDown
                size={14}
                aria-hidden="true"
                style={{
                  transform: showSplits ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.18s ease',
                }}
              />
            </button>
          </div>

          {showSplits && (
            <div style={{ overflowX: 'auto', marginTop: '14px' }}>
              <table className="telemetry-splits-table">
                <thead>
                  <tr>
                    <th scope="col">Split</th>
                    <th scope="col">Range</th>
                    <th scope="col">Ascent</th>
                    <th scope="col">Descent</th>
                    <th scope="col">Avg Grade</th>
                    <th scope="col">Peak Elevation</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.splits.map((sp) => (
                    <tr key={sp.splitNumber}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        S{sp.splitNumber}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatDistance(sp.startKm, unit)} – {formatDistance(sp.endKm, unit)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', fontWeight: 600 }}>
                        +{formatElevation(sp.elevationGainM, unit)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-success)' }}>
                        -{formatElevation(sp.elevationLossM, unit)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {sp.avgGradePercent > 0 ? `+${sp.avgGradePercent}%` : `${sp.avgGradePercent}%`}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatElevation(sp.maxElevationM, unit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
