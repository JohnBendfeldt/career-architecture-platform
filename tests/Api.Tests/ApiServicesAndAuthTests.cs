using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CareerPlatform.Api.Models;
using CareerPlatform.Api.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace CareerPlatform.Api.Tests;

public class ApiServicesAndAuthTests : IClassFixture<IsolatedApiFactory>
{
    private const string DevJwtSecret = "SuperSecretCareerArchitectureDemoJwtSigningKey2026!LongEnoughForSha256";
    private readonly IsolatedApiFactory _factory;

    public ApiServicesAndAuthTests(IsolatedApiFactory factory)
    {
        _factory = factory;
    }

    private static string MintAdminJwt()
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(DevJwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "admin-test-id"),
            new Claim(ClaimTypes.Name, "John Admin"),
            new Claim(ClaimTypes.Email, "john@example.com"),
            new Claim("role", "admin")
        };

        var token = new JwtSecurityToken(
            issuer: "CareerPlatform.Api",
            audience: "CareerPlatform.Web",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [Fact]
    public void TokenService_ThrowsInProduction_WhenJwtSecretMissing()
    {
        var emptyConfig = new ConfigurationBuilder().AddInMemoryCollection().Build();
        var prodEnv = new FakeHostEnvironment { EnvironmentName = Environments.Production };
        var service = new TokenService(emptyConfig, prodEnv);

        Assert.Throws<InvalidOperationException>(() => service.GenerateGuestToken());
    }

    [Fact]
    public void TokenService_GeneratesSignedToken_WhenConfiguredInProduction()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "CustomProductionJwtSigningKeyWithAtLeast32Bytes!!",
                ["Jwt:Issuer"] = "CustomIssuer",
                ["Jwt:Audience"] = "CustomAudience",
                ["Jwt:ExpiryHours"] = "12"
            })
            .Build();
        var prodEnv = new FakeHostEnvironment { EnvironmentName = Environments.Production };
        var service = new TokenService(config, prodEnv);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(service.GenerateGuestToken());
        Assert.Equal("CustomIssuer", jwt.Issuer);
        Assert.Contains("CustomAudience", jwt.Audiences);
        Assert.Equal("guest", jwt.Claims.First(c => c.Type == "role").Value);
    }

    [Fact]
    public async Task AiSkillExtractor_UsesHeaderApiKey_FallsBackAcrossModels_AndFallsBackLocally()
    {
        var seenRequests = new List<HttpRequestMessage>();
        var handler = new StubHttpMessageHandler(req =>
        {
            seenRequests.Add(req);
            if (seenRequests.Count == 1)
            {
                return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
            }

            var payload = """
            {
              "candidates": [{
                "content": {
                  "parts": [{ "text": "{\"skills\": [\"  C# .NET 10  \", \"c# .net 10\", \"YARP Gateway\"]}" }]
                }
              }]
            }
            """;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };
        });

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Gemini:ApiKey"] = "unit-test-gemini-secret" })
            .Build();

        var extractor = new AiSkillExtractor(new HttpClient(handler), config, NullLogger<AiSkillExtractor>.Instance);
        var emptyResult = await extractor.ExtractSkillsAsync("   ");
        Assert.Empty(emptyResult);

        var skills = await extractor.ExtractSkillsAsync("Senior C# engineer");
        Assert.Equal(2, seenRequests.Count);
        Assert.All(seenRequests, req =>
        {
            Assert.DoesNotContain("unit-test-gemini-secret", req.RequestUri!.ToString());
            Assert.DoesNotContain("key=", req.RequestUri!.Query);
            Assert.Equal("unit-test-gemini-secret", req.Headers.GetValues("x-goog-api-key").Single());
        });
        Assert.Equal(2, skills.Count);
        Assert.Contains("C# .NET 10", skills);
        Assert.Contains("YARP Gateway", skills);

        // Upstream failure falls back deterministically to local taxonomy
        var failingHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.BadGateway));
        var fallbackExtractor = new AiSkillExtractor(new HttpClient(failingHandler), config, NullLogger<AiSkillExtractor>.Instance);
        var fallbackSkills = await fallbackExtractor.ExtractSkillsAsync("Experience with Kubernetes, Docker, and EF Core.");
        Assert.Contains("Kubernetes & Cloud Native", fallbackSkills);
        Assert.Contains("Docker & Containerization", fallbackSkills);
        Assert.Contains("Entity Framework Core & SQLite", fallbackSkills);
    }

    [Fact]
    public async Task LearningResourceService_CachesLiveYouTubeResults_AndFallsBackToCuratedCategories()
    {
        int callCount = 0;
        var handler = new StubHttpMessageHandler(_ =>
        {
            callCount++;
            var ytJson = """
            {
              "items": [{
                "id": { "videoId": "abc123xyz" },
                "snippet": {
                  "title": "C# &amp; .NET 10 Architecture",
                  "channelTitle": "DotNet Channel",
                  "thumbnails": { "high": { "url": "https://i.ytimg.com/vi/abc123xyz/hqdefault.jpg" } }
                }
              }]
            }
            """;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(ytJson, Encoding.UTF8, "application/json")
            };
        });

        var configWithKey = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["YouTube:ApiKey"] = "yt-test-key" })
            .Build();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var liveService = new LearningResourceService(
            new HttpClient(handler),
            configWithKey,
            cache,
            NullLogger<LearningResourceService>.Instance);

        var first = await liveService.GetResourcesAsync("C# .NET 10");
        var second = await liveService.GetResourcesAsync("c# .net 10"); // hits case-insensitive cache
        Assert.Single(first);
        Assert.Single(second);
        Assert.Equal(1, callCount);
        Assert.Equal("C# & .NET 10 Architecture", first[0].Title);
        Assert.Equal("https://www.youtube.com/watch?v=abc123xyz", first[0].Url);

        // Curated fallbacks without API key
        var emptyConfig = new ConfigurationBuilder().AddInMemoryCollection().Build();
        using var fallbackCache = new MemoryCache(new MemoryCacheOptions());
        var curatedService = new LearningResourceService(
            new HttpClient(new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError))),
            emptyConfig,
            fallbackCache,
            NullLogger<LearningResourceService>.Instance);

        var garminResources = await curatedService.GetResourcesAsync("Garmin FIT GPS");
        Assert.Equal(3, garminResources.Count);
        var genericResources = await curatedService.GetResourcesAsync("Elixir OTP");
        Assert.Equal(3, genericResources.Count);
        Assert.Contains(genericResources, r => r.Title.Contains("Elixir OTP"));
    }

    [Fact]
    public async Task WriteEndpoints_EnforceAuthentication_AdminCrud_AndInputValidation()
    {
        var anonClient = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonClient.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await anonClient.PostAsJsonAsync("/api/goals", new CreateGoalRequest("Title", "Desc", "Technical", 50, "2026", "InProgress", new List<string>()))).StatusCode
        );

        // Oversized skill query on /api/resources
        var longSkill = new string('S', 201);
        Assert.Equal(HttpStatusCode.BadRequest, (await anonClient.GetAsync($"/api/resources?skill={longSkill}")).StatusCode);

        // Authenticated admin CRUD + boundary validation
        var adminClient = _factory.CreateClient();
        adminClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", MintAdminJwt());

        var meRes = await adminClient.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, meRes.StatusCode);
        var meDto = await meRes.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("admin", meDto!.Role);

        // Invalid empty title -> 400
        var invalidGoal = new CreateGoalRequest("   ", "Desc", "Technical", 50, "2026", "InProgress", new List<string>());
        Assert.Equal(HttpStatusCode.BadRequest, (await adminClient.PostAsJsonAsync("/api/goals", invalidGoal)).StatusCode);

        // Too many tags (>20) -> 400
        var tooManyTags = new CreateGoalRequest(
            "Valid Title",
            "Desc",
            "Technical",
            50,
            "2026",
            "InProgress",
            Enumerable.Range(1, 21).Select(i => $"tag-{i}").ToList());
        Assert.Equal(HttpStatusCode.BadRequest, (await adminClient.PostAsJsonAsync("/api/goals", tooManyTags)).StatusCode);

        // Create valid goal -> 201 Created (progress clamped to 100)
        var createRes = await adminClient.PostAsJsonAsync(
            "/api/goals",
            new CreateGoalRequest("Ship CI Gate", "Automated deploy blocking", "Technical", 150, "Q2 2026", "Completed", new List<string> { "CI/CD" }));
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createdJson = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        int createdId = createdJson.GetProperty("id").GetInt32();
        Assert.Equal(100, createdJson.GetProperty("progress").GetInt32());

        // Update goal -> 200 OK
        var updateRes = await adminClient.PutAsJsonAsync(
            $"/api/goals/{createdId}",
            new CreateGoalRequest("Ship CI Gate v2", "Updated", "Technical", -10, "Q3 2026", "InProgress", new List<string> { "Testing" }));
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updatedJson = await updateRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Ship CI Gate v2", updatedJson.GetProperty("title").GetString());
        Assert.Equal(0, updatedJson.GetProperty("progress").GetInt32());

        // Delete goal -> 204 NoContent, second delete -> 404 NotFound
        Assert.Equal(HttpStatusCode.NoContent, (await adminClient.DeleteAsync($"/api/goals/{createdId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await adminClient.DeleteAsync($"/api/goals/{createdId}")).StatusCode);
    }

    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "CareerPlatform.Api.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        {
            _responder = responder;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_responder(request));
        }
    }
}
