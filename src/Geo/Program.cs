using System.Threading.RateLimiting;
using CareerPlatform.Geo.Services;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;

if (args.Contains("--dump-all-rides"))
{
    var geoBaseDir = Directory.Exists(Path.Combine(Directory.GetCurrentDirectory(), "src", "Geo"))
        ? Path.Combine(Directory.GetCurrentDirectory(), "src", "Geo")
        : Directory.GetCurrentDirectory();
    var dumpConfig = new ConfigurationBuilder()
        .SetBasePath(geoBaseDir)
        .AddJsonFile("appsettings.json", optional: true)
        .AddJsonFile("appsettings.Local.json", optional: true)
        .AddEnvironmentVariables()
        .Build();
    var parser = new FitParserService(dumpConfig);
    var rides = parser.GetPreloadedRides();
    var outDir = Path.Combine(Directory.GetCurrentDirectory(), "web", "public", "rides");
    Directory.CreateDirectory(outDir);
    var jsonOptions = new System.Text.Json.JsonSerializerOptions 
    { 
        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
        WriteIndented = false 
    };

    foreach (var r in rides)
    {
        var ride = parser.GetRideById(r.Id);
        if (ride != null)
        {
            var cleanId = r.Id.TrimEnd('-');
            var filePath = Path.Combine(outDir, $"{cleanId}.json");
            System.IO.File.WriteAllText(filePath, System.Text.Json.JsonSerializer.Serialize(ride, jsonOptions));
            Console.WriteLine($"Dumped {cleanId} -> {filePath}");
        }
    }
    return;
}

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Register FitParserService
builder.Services.AddScoped<IFitParserService, FitParserService>();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[]
    {
        "https://johnbendfeldt.com",
        "https://www.johnbendfeldt.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5050",
        "http://localhost:3000"
    };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Rate Limiting on telemetry upload endpoints (partitioned per client IP)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("GeoUploadLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// Configure multipart upload limits (up to 50MB for raw high-frequency telemetry files)
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 52428800;
});

var app = builder.Build();

app.UseCors("AllowedOrigins");
app.UseRateLimiter();

// Health check endpoints
app.MapGet("/health", () => Results.Ok(new
{
    service = "Geo",
    status = "Healthy",
    timestamp = DateTime.UtcNow
}));

app.MapGet("/geo/health", () => Results.Ok(new
{
    service = "Geo",
    status = "Healthy",
    timestamp = DateTime.UtcNow
}));

// Preloaded favorite rides list endpoint
app.MapGet("/geo/rides", (IFitParserService fitParser) =>
{
    var rides = fitParser.GetPreloadedRides();
    return Results.Ok(rides);
});

// Preloaded specific ride by ID
app.MapGet("/geo/rides/{id}", (string id, IFitParserService fitParser) =>
{
    var ride = fitParser.GetRideById(id);
    return ride != null ? Results.Ok(ride) : Results.NotFound(new { error = "Ride not found" });
});

// Sample pre-seeded route endpoint
app.MapGet("/geo/sample-route", (IFitParserService fitParser) =>
{
    var telemetry = fitParser.GetSampleRoute();
    return Results.Ok(telemetry);
});

// Multipart FIT file upload endpoint
app.MapPost("/geo/activities", async (HttpRequest request, IFitParserService fitParser) =>
{
    if (!request.HasFormContentType)
    {
        return Results.BadRequest(new { error = "Request must be multipart/form-data" });
    }

    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();

    if (file == null || file.Length == 0)
    {
        return Results.BadRequest(new { error = "No .fit file uploaded" });
    }

    if (!file.FileName.EndsWith(".fit", StringComparison.OrdinalIgnoreCase) &&
        !file.ContentType.Contains("fit", StringComparison.OrdinalIgnoreCase) &&
        !file.ContentType.Contains("octet-stream", StringComparison.OrdinalIgnoreCase))
    {
        return Results.BadRequest(new { error = "Invalid file format. Please upload a Garmin binary .fit file." });
    }

    using var stream = file.OpenReadStream();
    var result = fitParser.ParseFitStream(stream, file.FileName);

    return Results.Ok(result);
}).RequireRateLimiting("GeoUploadLimit");

app.Run();

public partial class Program { }
