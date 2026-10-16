namespace CareerPlatform.Geo.Models;

public record TelemetryPoint(
    double Lat,
    double Lon,
    double Elevation,
    System.DateTime Timestamp
);

public record TelemetryAnnotation(
    int Id,
    double Lat,
    double Lon,
    string Title,
    string Text,
    string Type
);

public record ActivityTelemetry(
    string ActivityName,
    string RecordedDevice,
    double DistanceKm,
    double ElevationGainM,
    int DurationMinutes,
    List<TelemetryPoint> Points,
    List<TelemetryAnnotation> Annotations
);

public record RideSummary(
    string Id,
    string Title,
    double DistanceKm,
    double ElevationGainM,
    int DurationMinutes,
    string Date
);
