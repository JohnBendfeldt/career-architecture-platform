using CareerPlatform.Geo.Services;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

// Register FitParserService
builder.Services.AddScoped<IFitParserService, FitParserService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure multipart upload limits (up to 50MB for raw high-frequency telemetry files)
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 52428800;
});

var app = builder.Build();

app.UseCors("AllowAll");

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
});

app.Run();

public partial class Program { }
