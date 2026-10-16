using CareerPlatform.Geo.Models;
using Dynastream.Fit;
using SysDateTime = System.DateTime;

namespace CareerPlatform.Geo.Services;

public interface IFitParserService
{
    ActivityTelemetry ParseFitStream(Stream fitStream, string fileName);
    List<RideSummary> GetPreloadedRides();
    ActivityTelemetry? GetRideById(string id);
    ActivityTelemetry GetSampleRoute();
}

public class FitParserService : IFitParserService
{
    private const double SemicircleToDegree = 180.0 / 2147483648.0;
    private const string DefaultDevice = "Garmin Forerunner 255 Music";

    // Cache preloaded rides in-memory
    private static readonly Dictionary<string, ActivityTelemetry> CachedRides = new(StringComparer.OrdinalIgnoreCase);
    private static readonly object CacheLock = new();
    private static bool IsInitialized = false;

    public ActivityTelemetry ParseFitStream(Stream fitStream, string fileName)
    {
        var rawPoints = new List<TelemetryPoint>();
        var annotations = new List<TelemetryAnnotation>();

        var rawName = Path.GetFileNameWithoutExtension(fileName).Replace('_', ' ').Trim();
        var activityName = FormatRideTitle(rawName);
        var recordedDevice = DefaultDevice;
        double totalDistanceMeters = 0;
        double totalElevationGain = 0;
        double? maxElevation = null;
        double? minElevation = null;
        SysDateTime? startTime = null;
        SysDateTime? endTime = null;

        try
        {
            var decode = new Decode();
            var broadcaster = new MesgBroadcaster();

            decode.MesgEvent += broadcaster.OnMesg;
            decode.MesgDefinitionEvent += broadcaster.OnMesgDefinition;

            broadcaster.RecordMesgEvent += (sender, e) =>
            {
                var record = new RecordMesg(e.mesg);
                var latSemicircles = record.GetPositionLat();
                var lonSemicircles = record.GetPositionLong();

                if (latSemicircles != null && lonSemicircles != null)
                {
                    var lat = latSemicircles.Value * SemicircleToDegree;
                    var lon = lonSemicircles.Value * SemicircleToDegree;

                    // Filter out invalid/zero coordinates
                    if (Math.Abs(lat) > 0.0001 && Math.Abs(lon) > 0.0001)
                    {
                        var alt = record.GetEnhancedAltitude() ?? record.GetAltitude() ?? 0.0f;
                        var ele = Math.Round((double)alt, 1);
                        var fitTime = record.GetTimestamp();
                        var timestamp = fitTime != null ? fitTime.GetDateTime() : SysDateTime.UtcNow;

                        startTime ??= timestamp;
                        endTime = timestamp;

                        if (minElevation == null || ele < minElevation) minElevation = ele;
                        if (maxElevation == null || ele > maxElevation) maxElevation = ele;

                        rawPoints.Add(new TelemetryPoint(
                            Lat: Math.Round(lat, 5),
                            Lon: Math.Round(lon, 5),
                            Elevation: ele,
                            Timestamp: timestamp
                        ));
                    }
                }
            };

            broadcaster.SessionMesgEvent += (sender, e) =>
            {
                var session = new SessionMesg(e.mesg);
                var distance = session.GetTotalDistance();
                if (distance != null)
                {
                    totalDistanceMeters = (double)distance.Value;
                }
                var ascent = session.GetTotalAscent();
                if (ascent != null)
                {
                    totalElevationGain = (double)ascent.Value;
                }
            };

            broadcaster.DeviceInfoMesgEvent += (sender, e) =>
            {
                var dev = new DeviceInfoMesg(e.mesg);
                var nameStr = dev.GetProductNameAsString();
                if (!string.IsNullOrWhiteSpace(nameStr))
                {
                    recordedDevice = nameStr;
                }
            };

            decode.Read(fitStream);
        }
        catch (Exception)
        {
            // If stream is corrupt or completed, proceed with parsed records
        }

        // Calculate summary metrics
        var distanceKm = totalDistanceMeters > 0 
            ? Math.Round(totalDistanceMeters / 1000.0, 1) 
            : (rawPoints.Count > 1 ? Math.Round(EstimateDistanceKm(rawPoints), 1) : 0);

        var elevationGainM = totalElevationGain > 0 
            ? Math.Round(totalElevationGain, 0)
            : (minElevation != null && maxElevation != null ? Math.Round(maxElevation.Value - minElevation.Value, 0) : 0);

        var durationMinutes = startTime != null && endTime != null && endTime > startTime 
            ? (int)(endTime.Value - startTime.Value).TotalMinutes 
            : Math.Max(1, rawPoints.Count / 60);

        // Downsample points if list is very large (> 1500) to keep Leaflet rendering at 60fps
        var points = rawPoints;
        if (rawPoints.Count > 1500)
        {
            int step = (int)Math.Ceiling(rawPoints.Count / 1200.0);
            var sampled = new List<TelemetryPoint>();
            for (int i = 0; i < rawPoints.Count; i += step)
            {
                sampled.Add(rawPoints[i]);
            }
            if (sampled.Count > 0 && sampled[^1] != rawPoints[^1])
            {
                sampled.Add(rawPoints[^1]);
            }
            points = sampled;
        }

        // Generate intelligent coordinate annotations for key benchmarks
        if (rawPoints.Count > 0)
        {
            var first = rawPoints[0];
            annotations.Add(new TelemetryAnnotation(
                Id: 1,
                Lat: first.Lat,
                Lon: first.Lon,
                Title: "Ride Departure",
                Text: $"Garmin Forerunner 255 Music GPS lock established. Starting elevation {first.Elevation}m.",
                Type: "start"
            ));

            if (rawPoints.Count > 4)
            {
                var mid = rawPoints[rawPoints.Count / 2];
                annotations.Add(new TelemetryAnnotation(
                    Id: 2,
                    Lat: mid.Lat,
                    Lon: mid.Lon,
                    Title: "Midpoint Split",
                    Text: $"Halfway benchmark. Elevation {mid.Elevation}m.",
                    Type: "checkpoint"
                ));
            }

            var peak = rawPoints.OrderByDescending(p => p.Elevation).FirstOrDefault();
            if (peak != null && rawPoints.Count > 10)
            {
                annotations.Add(new TelemetryAnnotation(
                    Id: 3,
                    Lat: peak.Lat,
                    Lon: peak.Lon,
                    Title: "Peak Elevation Segment",
                    Text: $"Maximum elevation reached at {peak.Elevation}m.",
                    Type: "highlight"
                ));
            }

            var last = rawPoints[^1];
            annotations.Add(new TelemetryAnnotation(
                Id: 4,
                Lat: last.Lat,
                Lon: last.Lon,
                Title: "Ride Finish Benchmark",
                Text: $"Completed {distanceKm}km in {durationMinutes}min. Recorded with Garmin Forerunner 255 Music.",
                Type: "finish"
            ));
        }

        return new ActivityTelemetry(
            ActivityName: activityName,
            RecordedDevice: recordedDevice,
            DistanceKm: distanceKm,
            ElevationGainM: elevationGainM,
            DurationMinutes: durationMinutes,
            Points: points,
            Annotations: annotations
        );
    }

    public List<RideSummary> GetPreloadedRides()
    {
        EnsurePreloadedRides();
        lock (CacheLock)
        {
            return CachedRides.Select(kv => new RideSummary(
                Id: kv.Key,
                Title: kv.Value.ActivityName,
                DistanceKm: kv.Value.DistanceKm,
                ElevationGainM: kv.Value.ElevationGainM,
                DurationMinutes: kv.Value.DurationMinutes,
                Date: kv.Value.Points.FirstOrDefault()?.Timestamp.ToString("MMM dd, yyyy") ?? "Favorite Ride"
            )).OrderByDescending(r => r.DistanceKm).ToList();
        }
    }

    public ActivityTelemetry? GetRideById(string id)
    {
        EnsurePreloadedRides();
        lock (CacheLock)
        {
            if (CachedRides.TryGetValue(id, out var ride))
            {
                return ride;
            }
        }
        return null;
    }

    public ActivityTelemetry GetSampleRoute()
    {
        EnsurePreloadedRides();
        lock (CacheLock)
        {
            var first = CachedRides.Values.FirstOrDefault();
            if (first != null) return first;
        }

        // Fallback synthetic route if no rides loaded
        var points = new List<TelemetryPoint>
        {
            new(30.2669, -97.7728, 142.0, SysDateTime.UtcNow.AddMinutes(-115)),
            new(30.2890, -97.7680, 165.5, SysDateTime.UtcNow.AddMinutes(-95)),
            new(30.3200, -97.7880, 248.0, SysDateTime.UtcNow.AddMinutes(-50)),
            new(30.3410, -97.7590, 210.5, SysDateTime.UtcNow)
        };

        var annotations = new List<TelemetryAnnotation>
        {
            new(1, 30.2669, -97.7728, "Ride Departure", "Garmin Forerunner 255 Music GPS lock established.", "start"),
            new(2, 30.2890, -97.7680, "Midpoint Split", "Halfway benchmark.", "checkpoint"),
            new(3, 30.3200, -97.7880, "Peak Segment", "Elevation peak.", "highlight"),
            new(4, 30.3410, -97.7590, "Ride Finish Benchmark", "Completed ride.", "finish")
        };

        return new ActivityTelemetry(
            ActivityName: "Austin Hill Country & Trail Endurance Ride",
            RecordedDevice: DefaultDevice,
            DistanceKm: 52.4,
            ElevationGainM: 385,
            DurationMinutes: 115,
            Points: points,
            Annotations: annotations
        );
    }

    private void EnsurePreloadedRides()
    {
        if (IsInitialized) return;

        lock (CacheLock)
        {
            if (IsInitialized) return;

            var ridesDir = FindRidesDirectory();
            if (!string.IsNullOrEmpty(ridesDir) && Directory.Exists(ridesDir))
            {
                var fitFiles = Directory.GetFiles(ridesDir, "*.fit");
                foreach (var file in fitFiles)
                {
                    try
                    {
                        var id = Path.GetFileNameWithoutExtension(file).ToLowerInvariant().Replace('_', '-');
                        using var stream = System.IO.File.OpenRead(file);
                        var parsed = ParseFitStream(stream, Path.GetFileName(file));
                        CachedRides[id] = parsed;
                    }
                    catch
                    {
                        // Ignore individual corrupted file
                    }
                }
            }

            IsInitialized = true;
        }
    }

    private static string FindRidesDirectory()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), "src", "Geo", "Data", "Rides"),
            Path.Combine(Directory.GetCurrentDirectory(), "Data", "Rides"),
            Path.Combine(AppContext.BaseDirectory, "Data", "Rides"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Data", "Rides"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "src", "Geo", "Data", "Rides")
        };

        return candidates.FirstOrDefault(Directory.Exists) ?? string.Empty;
    }

    private static string FormatRideTitle(string rawName)
    {
        return rawName switch
        {
            "Country Roads with friends" => "Country Roads with Friends",
            "Early Bird Sundaze" => "Early Bird Sundaze",
            "Salado Sunday with friends" => "Salado Sunday with Friends",
            "Sunday Sunrise with friends" => "Sunday Sunrise with Friends",
            "Wandering in pastures" => "Wandering in Pastures",
            _ => rawName
        };
    }

    private static double EstimateDistanceKm(List<TelemetryPoint> pts)
    {
        double total = 0;
        for (int i = 0; i < pts.Count - 1; i++)
        {
            total += Haversine(pts[i].Lat, pts[i].Lon, pts[i + 1].Lat, pts[i + 1].Lon);
        }
        return total;
    }

    private static double Haversine(double lat1, double lon1, double lat2, double lon2)
    {
        const double r = 6371; // Earth's radius in km
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return r * c;
    }
}
