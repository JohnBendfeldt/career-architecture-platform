using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CareerPlatform.Api.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace CareerPlatform.Api.Tests;

public class ApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public ApiIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsHealthyStatus()
    {
        var response = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Healthy", body.GetProperty("status").GetString());
        Assert.Equal("Api", body.GetProperty("service").GetString());
    }

    [Fact]
    public async Task GuestAuth_ReturnsValidJwt_WithGuestRoleClaim()
    {
        var response = await _client.PostAsync("/api/auth/guest", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<GuestAuthResponse>();
        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));
        Assert.Equal("guest", result.User.Role);
        Assert.Equal("guest@demo.local", result.User.Email);

        // Verify claims inside the JWT token
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(result.Token);

        var roleClaim = jwt.Claims.FirstOrDefault(c => c.Type == "role");
        Assert.NotNull(roleClaim);
        Assert.Equal("guest", roleClaim.Value);

        var guestModeClaim = jwt.Claims.FirstOrDefault(c => c.Type == "guest_mode");
        Assert.NotNull(guestModeClaim);
        Assert.Equal("true", guestModeClaim.Value);
    }

    [Fact]
    public async Task PreSeededProfile_ReturnsJohnBendfeldtData_WithOutboundLinks()
    {
        var response = await _client.GetAsync("/api/profile");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var profile = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("John F. Bendfeldt", profile.GetProperty("name").GetString());
        Assert.Contains("github.com/johnbendfeldt", profile.GetProperty("githubUrl").GetString());
        Assert.Contains("linkedin.com/in/johnbendfeldt", profile.GetProperty("linkedinUrl").GetString());

        var skills = profile.GetProperty("skills").EnumerateArray().Select(s => s.GetString()).ToList();
        Assert.Contains(".NET", skills.First(s => s != null && s.Contains(".NET")));
    }

    [Fact]
    public async Task PreSeededGoals_BypassesEmptyState_ContainsTechAndPersonalGoals()
    {
        var response = await _client.GetAsync("/api/goals");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var goals = await response.Content.ReadFromJsonAsync<List<JsonElement>>();
        Assert.NotNull(goals);
        Assert.NotEmpty(goals);

        // Verify technical goals
        Assert.Contains(goals, g => g.GetProperty("category").GetString() == "Technical" &&
                                   g.GetProperty("title").GetString()!.Contains(".NET 10"));
        Assert.Contains(goals, g => g.GetProperty("category").GetString() == "Technical" &&
                                   g.GetProperty("title").GetString()!.Contains("Training Hour Tracking"));

        // Verify personal / independent goals
        Assert.Contains(goals, g => g.GetProperty("category").GetString() == "Personal" &&
                                   g.GetProperty("title").GetString()!.Contains("Russian"));
        Assert.Contains(goals, g => g.GetProperty("category").GetString() == "Personal" &&
                                   g.GetProperty("title").GetString()!.Contains("Geospatial"));
    }

    [Fact]
    public async Task GuestToken_WriteProtection_ReturnsForbidden()
    {
        // 1. Obtain Guest Token
        var authResponse = await _client.PostAsync("/api/auth/guest", null);
        var authResult = await authResponse.Content.ReadFromJsonAsync<GuestAuthResponse>();
        Assert.NotNull(authResult);

        // 2. Attach Bearer Token to Request
        var clientWithGuest = _factory.CreateClient();
        clientWithGuest.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", authResult.Token);

        // 3. Attempt POST to create a goal
        var newGoal = new CreateGoalRequest(
            Title: "Unauthorized Goal",
            Description: "Should be blocked by guest policy",
            Category: "Technical",
            Progress: 10,
            TargetDate: "2027",
            Status: "Upcoming",
            Tags: new List<string> { "Test" }
        );

        var postResponse = await clientWithGuest.PostAsJsonAsync("/api/goals", newGoal);
        Assert.Equal(HttpStatusCode.Forbidden, postResponse.StatusCode);

        // 4. Attempt DELETE
        var deleteResponse = await clientWithGuest.DeleteAsync("/api/goals/1");
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task ExtractSkills_ReturnsStructuredJsonArray()
    {
        var request = new ExtractSkillsRequest(
            "Seeking a Senior Full-Stack Software Engineer experienced in C# .NET 10 Minimal APIs, YARP Reverse Proxy, Docker, and React 19."
        );

        var response = await _client.PostAsJsonAsync("/api/skills/extract", request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<ExtractSkillsResponse>();
        Assert.NotNull(result);
        Assert.NotEmpty(result.Skills);
        Assert.Contains(result.Skills, s => s.Contains(".NET 10", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(result.Skills, s => s.Contains("YARP", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(result.Skills, s => s.Contains("Docker", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task GetResources_ReturnsTop3LearningResources()
    {
        var response = await _client.GetAsync("/api/resources?skill=YARP%20Reverse%20Proxy");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<LearningResourcesResponse>();
        Assert.NotNull(result);
        Assert.Equal("YARP Reverse Proxy", result.Skill);
        Assert.NotEmpty(result.Resources);
        Assert.True(result.Resources.Count <= 3);

        foreach (var resource in result.Resources)
        {
            Assert.False(string.IsNullOrWhiteSpace(resource.Title));
            Assert.False(string.IsNullOrWhiteSpace(resource.Url));
            Assert.False(string.IsNullOrWhiteSpace(resource.Provider));
        }
    }
}
