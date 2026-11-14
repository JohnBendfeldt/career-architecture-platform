using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CareerPlatform.Geo.Models;
using CareerPlatform.Geo.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace CareerPlatform.Geo.Tests;

public class GeoIntegrationAndPrivacyTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public GeoIntegrationAndPrivacyTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    private static string FindSampleFitFile()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "Data", "Rides", "Sunday_Sunrise_with_friends.fit"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "src", "Geo", "Data", "Rides", "Sunday_Sunrise_with_friends.fit"),
            Path.Combine(Directory.GetCurrentDirectory(), "src", "Geo", "Data", "Rides", "Sunday_Sunrise_with_friends.fit")
        };

        return candidates.First(File.Exists);
    }

    private static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6_371_000.0;
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    [Fact]
    public async Task HealthAndRidesEndpoints_ReturnExpectedPayloads_AndSecurityHeaders()
    {
        var healthRes = await _client.GetAsync("/geo/health");
        Assert.Equal(HttpStatusCode.OK, healthRes.StatusCode);
        Assert.Equal("nosniff", healthRes.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", healthRes.Headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("0", healthRes.Headers.GetValues("X-XSS-Protection").Single());
        Assert.Equal("strict-origin-when-cross-origin", healthRes.Headers.GetValues("Referrer-Policy").Single());
        Assert.Contains("geolocation=()", healthRes.Headers.GetValues("Permissions-Policy").Single());

        var ridesRes = await _client.GetAsync("/geo/rides");
        Assert.Equal(HttpStatusCode.OK, ridesRes.StatusCode);
        var rides = await ridesRes.Content.ReadFromJsonAsync<List<RideSummary>>();
        Assert.NotNull(rides);
        Assert.Equal(7, rides.Count);

        var singleRes = await _client.GetAsync($"/geo/rides/{rides[0].Id}");
        Assert.Equal(HttpStatusCode.OK, singleRes.StatusCode);

        var missingRes = await _client.GetAsync("/geo/rides/non-existent-ride-id");
        Assert.Equal(HttpStatusCode.NotFound, missingRes.StatusCode);

        var sampleRes = await _client.GetAsync("/geo/sample-route");
        Assert.Equal(HttpStatusCode.OK, sampleRes.StatusCode);
    }

    [Fact]
    public void FitParserService_EnforcesResidentialPrivacyGeofenceTrimming()
    {
        var fitPath = FindSampleFitFile();

        // Parse once without geofence to obtain an actual coordinate along the route start
        var unconfiguredParser = new FitParserService(new ConfigurationBuilder().AddInMemoryCollection().Build());
        using var rawStream = File.OpenRead(fitPath);
        var untrimmed = unconfiguredParser.ParseFitStream(rawStream, Path.GetFileName(fitPath));
        Assert.NotEmpty(untrimmed.Points);

        var originLat = untrimmed.Points[0].Lat;
        var originLon = untrimmed.Points[0].Lon;
        const double radiusMeters = 550.0;

        var geofenceConfig = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Geo:PrivacyLat"] = originLat.ToString(CultureInfo.InvariantCulture),
                ["Geo:PrivacyLon"] = originLon.ToString(CultureInfo.InvariantCulture),
                ["Geo:PrivacyRadiusM"] = radiusMeters.ToString(CultureInfo.InvariantCulture)
            })
            .Build();

        var geofencedParser = new FitParserService(geofenceConfig);
        using var secondStream = File.OpenRead(fitPath);
        var trimmed = geofencedParser.ParseFitStream(secondStream, Path.GetFileName(fitPath));

        Assert.NotEmpty(trimmed.Points);
        Assert.All(trimmed.Points, pt =>
        {
            var dist = HaversineMeters(pt.Lat, pt.Lon, originLat, originLon);
            Assert.True(dist >= radiusMeters, $"Expected point >= {radiusMeters}m from geofence center, got {dist:F1}m");
        });
        Assert.All(trimmed.Annotations, ann =>
        {
            var dist = HaversineMeters(ann.Lat, ann.Lon, originLat, originLon);
            Assert.True(dist >= radiusMeters, $"Expected annotation >= {radiusMeters}m from geofence center, got {dist:F1}m");
        });
    }

    [Fact]
    public void FitParserService_HandlesCorruptedBinaryStreamGracefully()
    {
        var parser = new FitParserService(new ConfigurationBuilder().AddInMemoryCollection().Build());
        using var corruptStream = new MemoryStream(new byte[] { 14, 16, 0, 0, 0, 0, 0, 0, (byte)'.', (byte)'F', (byte)'I', (byte)'T', 0xFF, 0xFE, 0xFD });
        var telemetry = parser.ParseFitStream(corruptStream, "Corrupt_Test_Ride.fit");

        Assert.Equal("Corrupt Test Ride", telemetry.ActivityName);
        Assert.Empty(telemetry.Points);
    }

    [Fact]
    public async Task UploadActivitiesEndpoint_ValidatesMultipartExtensionMagicBytes_AndParsesRealFitFile()
    {
        // 1. Non-multipart JSON -> 400
        var jsonRes = await _client.PostAsJsonAsync("/geo/activities", new { file = "invalid" });
        Assert.Equal(HttpStatusCode.BadRequest, jsonRes.StatusCode);

        // 2. Wrong file extension (.gpx) -> 400
        using (var wrongExtForm = new MultipartFormDataContent())
        {
            var bytes = new ByteArrayContent(Encoding.UTF8.GetBytes("0123456789ABCDEF0123456789"));
            wrongExtForm.Add(bytes, "file", "route.gpx");
            var res = await _client.PostAsync("/geo/activities", wrongExtForm);
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        // 3. Spoofed .fit extension without .FIT binary header signature -> 400
        using (var spoofedForm = new MultipartFormDataContent())
        {
            var spoofBytes = new ByteArrayContent(Encoding.UTF8.GetBytes("NOT_A_GARMIN_FIT_BINARY_HEADER_PAYLOAD"));
            spoofedForm.Add(spoofBytes, "file", "spoofed.fit");
            var res = await _client.PostAsync("/geo/activities", spoofedForm);
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
            var err = await res.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Contains(".fit binary header signature", err.GetProperty("error").GetString());
        }

        // 4. Valid Garmin .fit binary upload -> 200 OK
        var fitBytes = await File.ReadAllBytesAsync(FindSampleFitFile());
        using var validForm = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(fitBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        validForm.Add(fileContent, "file", "Sunday_Sunrise_with_friends.fit");

        var okRes = await _client.PostAsync("/geo/activities", validForm);
        Assert.Equal(HttpStatusCode.OK, okRes.StatusCode);
        var parsed = await okRes.Content.ReadFromJsonAsync<ActivityTelemetry>();
        Assert.NotNull(parsed);
        Assert.Equal("Sunday Sunrise with Friends", parsed.ActivityName);
        Assert.NotEmpty(parsed.Points);
        Assert.True(parsed.Points.Count <= 1500);
    }
}
