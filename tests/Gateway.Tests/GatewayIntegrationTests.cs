using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace CareerPlatform.Gateway.Tests;

public class GatewayIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public GatewayIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsHealthyGatewayStatus_WithHardenedSecurityHeaders()
    {
        var response = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Gateway", payload.GetProperty("service").GetString());
        Assert.Equal("Healthy", payload.GetProperty("status").GetString());

        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("0", response.Headers.GetValues("X-XSS-Protection").Single());
        Assert.Equal("strict-origin-when-cross-origin", response.Headers.GetValues("Referrer-Policy").Single());
        Assert.Contains("camera=()", response.Headers.GetValues("Permissions-Policy").Single());
    }

    [Fact]
    public async Task CorsPolicy_AllowsConfiguredPortfolioOrigin_AndBlocksUntrustedOrigin()
    {
        using var allowedPreflight = new HttpRequestMessage(HttpMethod.Options, "/health");
        allowedPreflight.Headers.Add("Origin", "https://johnbendfeldt.com");
        allowedPreflight.Headers.Add("Access-Control-Request-Method", "GET");

        var allowedRes = await _client.SendAsync(allowedPreflight);
        Assert.True(allowedRes.Headers.TryGetValues("Access-Control-Allow-Origin", out var origins));
        Assert.Equal("https://johnbendfeldt.com", origins.Single());

        using var untrustedPreflight = new HttpRequestMessage(HttpMethod.Options, "/health");
        untrustedPreflight.Headers.Add("Origin", "https://evil.example.com");
        untrustedPreflight.Headers.Add("Access-Control-Request-Method", "GET");

        var blockedRes = await _client.SendAsync(untrustedPreflight);
        Assert.False(blockedRes.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
