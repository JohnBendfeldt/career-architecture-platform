using System.IdentityModel.Tokens.Jwt;
using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using CareerPlatform.Api.Models;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace CareerPlatform.Api.Tests;

public class ApiIntegrationTests : IClassFixture<IsolatedApiFactory>
{
    private readonly IsolatedApiFactory _factory;
    private readonly HttpClient _client;

    public ApiIntegrationTests(IsolatedApiFactory factory)
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
        Assert.Contains("Senior Software Engineer", profile.GetProperty("headline").GetString()!, StringComparison.Ordinal);
        Assert.Contains("johnbendfeldt", profile.GetProperty("githubUrl").GetString()!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("linkedin.com/in/johnbendfeldt", profile.GetProperty("linkedinUrl").GetString()!, StringComparison.OrdinalIgnoreCase);

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
                                   (g.GetProperty("title").GetString()!.Contains(".NET") ||
                                    g.GetProperty("description").GetString()!.Contains(".NET 10")));
        Assert.Contains(goals, g => g.GetProperty("category").GetString() == "Technical" &&
                                   g.GetProperty("title").GetString()!.Contains("Training Hour Tracking"));

        // Verify personal / independent goals
        Assert.Contains(goals, g => g.GetProperty("category").GetString() == "Personal" &&
                                   (g.GetProperty("title").GetString()!.Contains("Language") || g.GetProperty("title").GetString()!.Contains("Russian")));
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

    [Fact]
    public async Task ApiResponses_IncludeSecurityHardeningHeaders()
    {
        var response = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("0", response.Headers.GetValues("X-XSS-Protection").Single());
        Assert.Equal("strict-origin-when-cross-origin", response.Headers.GetValues("Referrer-Policy").Single());
        Assert.Contains("camera=()", response.Headers.GetValues("Permissions-Policy").Single());
    }

    [Fact]
    public async Task OversizedSkillInput_ReturnsBadRequest()
    {
        var oversized = new ExtractSkillsRequest(new string('A', 10001));
        var response = await _client.PostAsJsonAsync("/api/skills/extract", oversized);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private const string TestJwtSecret = "SuperSecretCareerArchitectureDemoJwtSigningKey2026!LongEnoughForSha256";

    private static string CreateNonGuestAdminToken()
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "integration-test-admin"),
            new Claim(ClaimTypes.Name, "Integration Admin"),
            new Claim(ClaimTypes.Email, "admin@test.local"),
            new Claim(ClaimTypes.Role, "admin"),
            new Claim("role", "admin"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: "CareerPlatform.Api",
            audience: "CareerPlatform.Web",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [Fact]
    public async Task AdvancementCategoriesAndProgress_ReturnPreSeededData()
    {
        var categoriesResponse = await _client.GetAsync("/api/advancement/categories");
        Assert.Equal(HttpStatusCode.OK, categoriesResponse.StatusCode);

        var categories = await categoriesResponse.Content.ReadFromJsonAsync<List<CategoryDto>>();
        Assert.NotNull(categories);
        Assert.Equal(9, categories.Count);
        Assert.Contains(categories, c => c.Name == "Development");
        Assert.Contains(categories, c => c.Name == "Cloud Computing");

        var progressResponse = await _client.GetAsync("/api/advancement/progress?year=2026");
        Assert.Equal(HttpStatusCode.OK, progressResponse.StatusCode);

        var progress = await progressResponse.Content.ReadFromJsonAsync<AnnualProgressDto>();
        Assert.NotNull(progress);
        Assert.Equal(55m, progress.AnnualGoalHours);
        Assert.Equal(50m, progress.CompletedHours);
        Assert.Equal(5, progress.TotalEntries);
        Assert.Equal(2026, progress.Year);
        Assert.False(string.IsNullOrWhiteSpace(progress.QuarterLabel));

        var entriesResponse = await _client.GetAsync("/api/advancement/entries?year=2026");
        Assert.Equal(HttpStatusCode.OK, entriesResponse.StatusCode);

        var entriesList = await entriesResponse.Content.ReadFromJsonAsync<CareerEntriesListResponse>();
        Assert.NotNull(entriesList);
        Assert.Equal(5, entriesList.TotalEntries);
        Assert.Equal(50m, entriesList.TotalHours);
    }

    [Fact]
    public async Task GuestToken_AdvancementWriteProtection_ReturnsForbidden()
    {
        var authResponse = await _client.PostAsync("/api/auth/guest", null);
        var authResult = await authResponse.Content.ReadFromJsonAsync<GuestAuthResponse>();
        Assert.NotNull(authResult);

        var clientWithGuest = _factory.CreateClient();
        clientWithGuest.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", authResult.Token);

        var validPastDate = DateTime.UtcNow.Date.AddDays(-2);
        var newEntry = new CreateCareerEntryRequest(
            Title: "Guest Blocked Entry",
            Description: "Should be rejected by RequireWriteAccess",
            StartDate: validPastDate,
            EndDate: validPastDate,
            Hours: 2m,
            CategoryId: 1,
            GoalId: 1,
            ClientUtcOffsetMinutes: 0
        );

        var postResponse = await clientWithGuest.PostAsJsonAsync("/api/advancement/entries", newEntry);
        Assert.Equal(HttpStatusCode.Forbidden, postResponse.StatusCode);

        var putResponse = await clientWithGuest.PutAsJsonAsync("/api/advancement/entries/1", newEntry);
        Assert.Equal(HttpStatusCode.Forbidden, putResponse.StatusCode);

        var deleteResponse = await clientWithGuest.DeleteAsync("/api/advancement/entries/1");
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);

        var goalHoursResponse = await clientWithGuest.PutAsJsonAsync(
            "/api/profile/goal-hours",
            new UpdateAnnualGoalHoursRequest(65m)
        );
        Assert.Equal(HttpStatusCode.Forbidden, goalHoursResponse.StatusCode);
    }

    [Fact]
    public async Task LoggingCareerEntryLinkedToGoal_AutomaticallyRollsUpGoalProgressAndCompletion()
    {
        using var isolatedFactory = new IsolatedApiFactory();
        var adminClient = isolatedFactory.CreateClient();
        adminClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateNonGuestAdminToken());

        // 1. Create a Goal with TargetHours = 10
        var createGoalReq = new CreateGoalRequest(
            Title: "Observability & OpenTelemetry Rollout",
            Description: "End-to-end tracing across API gateways.",
            Category: "Technical",
            Progress: 0,
            TargetDate: "Q4 2026",
            Status: "InProgress",
            Tags: new List<string> { "OpenTelemetry", "Testing" },
            TargetHours: 10m
        );

        var createGoalRes = await adminClient.PostAsJsonAsync("/api/goals", createGoalReq);
        Assert.Equal(HttpStatusCode.Created, createGoalRes.StatusCode);
        var createdGoal = await createGoalRes.Content.ReadFromJsonAsync<JsonElement>();
        var goalId = createdGoal.GetProperty("id").GetInt32();

        var entryDate = DateTime.UtcNow.Date.AddDays(-2);

        // 2. Log 4 hours -> expect 40% InProgress
        var entry1Res = await adminClient.PostAsJsonAsync(
            "/api/advancement/entries",
            new CreateCareerEntryRequest(
                Title: "Collector Configuration",
                Description: "Set up OTLP exporters",
                StartDate: entryDate,
                EndDate: entryDate,
                Hours: 4m,
                CategoryId: 1,
                GoalId: goalId,
                ClientUtcOffsetMinutes: 0
            )
        );
        Assert.Equal(HttpStatusCode.Created, entry1Res.StatusCode);

        var goalsAfterFirst = await adminClient.GetFromJsonAsync<List<JsonElement>>("/api/goals");
        Assert.NotNull(goalsAfterFirst);
        var goalAfterFirst = goalsAfterFirst.First(g => g.GetProperty("id").GetInt32() == goalId);
        Assert.Equal(40, goalAfterFirst.GetProperty("progress").GetInt32());
        Assert.Equal(4m, goalAfterFirst.GetProperty("loggedHours").GetDecimal());
        Assert.Equal(1, goalAfterFirst.GetProperty("entryCount").GetInt32());
        Assert.Equal("InProgress", goalAfterFirst.GetProperty("status").GetString());

        // 3. Log 6 more hours -> expect 100% Completed
        var entry2Res = await adminClient.PostAsJsonAsync(
            "/api/advancement/entries",
            new CreateCareerEntryRequest(
                Title: "Distributed Span Verification",
                Description: "Verified cross-service correlation",
                StartDate: entryDate,
                EndDate: entryDate,
                Hours: 6m,
                CategoryId: 2,
                GoalId: goalId,
                ClientUtcOffsetMinutes: 0
            )
        );
        Assert.Equal(HttpStatusCode.Created, entry2Res.StatusCode);

        var goalsAfterSecond = await adminClient.GetFromJsonAsync<List<JsonElement>>("/api/goals");
        Assert.NotNull(goalsAfterSecond);
        var goalAfterSecond = goalsAfterSecond.First(g => g.GetProperty("id").GetInt32() == goalId);
        Assert.Equal(100, goalAfterSecond.GetProperty("progress").GetInt32());
        Assert.Equal(10m, goalAfterSecond.GetProperty("loggedHours").GetDecimal());
        Assert.Equal(2, goalAfterSecond.GetProperty("entryCount").GetInt32());
        Assert.Equal("Completed", goalAfterSecond.GetProperty("status").GetString());

        // 4. Customize profile annualGoalHours
        var updateTargetRes = await adminClient.PutAsJsonAsync(
            "/api/profile/goal-hours",
            new UpdateAnnualGoalHoursRequest(60m)
        );
        Assert.Equal(HttpStatusCode.OK, updateTargetRes.StatusCode);

        var updatedProfile = await adminClient.GetFromJsonAsync<JsonElement>("/api/profile");
        Assert.Equal(60m, updatedProfile.GetProperty("annualGoalHours").GetDecimal());
    }

    [Fact]
    public async Task FutureEndDateOrInvertedDateRange_ReturnsBadRequest()
    {
        using var isolatedFactory = new IsolatedApiFactory();
        var adminClient = isolatedFactory.CreateClient();
        adminClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateNonGuestAdminToken());

        // Future EndDate
        var futureDate = DateTime.UtcNow.Date.AddDays(7);
        var futureReq = new CreateCareerEntryRequest(
            Title: "Future Entry",
            Description: null,
            StartDate: DateTime.UtcNow.Date.AddDays(-1),
            EndDate: futureDate,
            Hours: 2m,
            CategoryId: 1,
            GoalId: null,
            ClientUtcOffsetMinutes: 0
        );

        var futureRes = await adminClient.PostAsJsonAsync("/api/advancement/entries", futureReq);
        Assert.Equal(HttpStatusCode.BadRequest, futureRes.StatusCode);

        // Inverted StartDate > EndDate
        var invertedReq = new CreateCareerEntryRequest(
            Title: "Inverted Range Entry",
            Description: null,
            StartDate: DateTime.UtcNow.Date.AddDays(-1),
            EndDate: DateTime.UtcNow.Date.AddDays(-5),
            Hours: 2m,
            CategoryId: 1,
            GoalId: null,
            ClientUtcOffsetMinutes: 0
        );

        var invertedRes = await adminClient.PostAsJsonAsync("/api/advancement/entries", invertedReq);
        Assert.Equal(HttpStatusCode.BadRequest, invertedRes.StatusCode);
    }

    [Fact]
    public async Task GuestToken_ImportCareerEntries_ReturnsForbidden()
    {
        var pastDate = DateTime.UtcNow.Date.AddDays(-2);
        var importPayload = new ImportCareerEntriesRequest(
            Entries: new List<ImportCareerEntryRowRequest>
            {
                new("Blocked Bulk Row", "Guest write protection check", pastDate, pastDate, 2m, "Development")
            },
            ClientUtcOffsetMinutes: 0
        );

        var anonRes = await _client.PostAsJsonAsync("/api/advancement/entries/import", importPayload);
        Assert.Equal(HttpStatusCode.Unauthorized, anonRes.StatusCode);

        var authRes = await _client.PostAsync("/api/auth/guest", null);
        var authBody = await authRes.Content.ReadFromJsonAsync<GuestAuthResponse>();
        Assert.NotNull(authBody);

        var guestClient = _factory.CreateClient();
        guestClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", authBody.Token);

        var guestRes = await guestClient.PostAsJsonAsync("/api/advancement/entries/import", importPayload);
        Assert.Equal(HttpStatusCode.Forbidden, guestRes.StatusCode);
    }

    [Fact]
    public async Task ImportCareerEntries_ValidatesMaxRowsSkipsDuplicatesAndRollsUpLinkedGoal()
    {
        using var isolatedFactory = new IsolatedApiFactory();
        var adminClient = isolatedFactory.CreateClient();
        adminClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateNonGuestAdminToken());

        var pastDate = DateTime.UtcNow.Date.AddDays(-3);

        // Enforce 50-row upper limit
        var oversizedRows = Enumerable.Range(1, 51)
            .Select(i => new ImportCareerEntryRowRequest($"Overflow {i}", null, pastDate, pastDate, 1m, "Development"))
            .ToList();
        var oversizedRes = await adminClient.PostAsJsonAsync(
            "/api/advancement/entries/import",
            new ImportCareerEntriesRequest(oversizedRows, 0)
        );
        Assert.Equal(HttpStatusCode.BadRequest, oversizedRes.StatusCode);

        // Create target-hours goal (TargetHours = 10)
        var goalRes = await adminClient.PostAsJsonAsync(
            "/api/goals",
            new CreateGoalRequest(
                Title: "OpenXML Spreadsheet Engineering",
                Description: "Bulk import & export milestone",
                Category: "Technical",
                Progress: 0,
                TargetDate: "Q4 2026",
                Status: "InProgress",
                Tags: new List<string> { "OpenXML", "Import" },
                TargetHours: 10m
            )
        );
        Assert.Equal(HttpStatusCode.Created, goalRes.StatusCode);
        var createdGoal = await goalRes.Content.ReadFromJsonAsync<JsonElement>();
        var goalId = createdGoal.GetProperty("id").GetInt32();

        var importPayload = new ImportCareerEntriesRequest(
            Entries: new List<ImportCareerEntryRowRequest>
            {
                new("ZIP Central Directory Design", "Binary layout review", pastDate, pastDate, 4m, "Development", null, null, goalId),
                new("ZIP Central Directory Design", "Duplicate intra-batch row", pastDate, pastDate, 4m, "Development", null, null, goalId),
                new("OOXML Styles & Formula Safety", "Custom numFmt 164", pastDate.AddDays(1), pastDate.AddDays(1), 6m, "Security", null, "OpenXML Spreadsheet Engineering")
            },
            ClientUtcOffsetMinutes: 0
        );

        var importRes = await adminClient.PostAsJsonAsync("/api/advancement/entries/import", importPayload);
        Assert.Equal(HttpStatusCode.OK, importRes.StatusCode);

        var summary = await importRes.Content.ReadFromJsonAsync<ImportCareerEntriesResponse>();
        Assert.NotNull(summary);
        Assert.True(summary.Success);
        Assert.Equal(3, summary.TotalRows);
        Assert.Equal(2, summary.SuccessCount);
        Assert.Equal(1, summary.DuplicateCount);
        Assert.Equal(1, summary.ErrorCount);

        var goals = await adminClient.GetFromJsonAsync<List<JsonElement>>("/api/goals");
        Assert.NotNull(goals);
        var updatedGoal = goals.First(g => g.GetProperty("id").GetInt32() == goalId);
        Assert.Equal(10m, updatedGoal.GetProperty("loggedHours").GetDecimal());
        Assert.Equal(2, updatedGoal.GetProperty("entryCount").GetInt32());
        Assert.Equal(100, updatedGoal.GetProperty("progress").GetInt32());
        Assert.Equal("Completed", updatedGoal.GetProperty("status").GetString());
    }

    [Fact]
    public async Task ExportCareerEntries_ReturnsValidOpenXmlWorkbookAndCsv()
    {
        var xlsxRes = await _client.GetAsync("/api/advancement/export?year=2026");
        Assert.Equal(HttpStatusCode.OK, xlsxRes.StatusCode);
        Assert.Equal(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            xlsxRes.Content.Headers.ContentType?.MediaType
        );

        var xlsxBytes = await xlsxRes.Content.ReadAsByteArrayAsync();
        using var zipStream = new MemoryStream(xlsxBytes);
        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);

        Assert.NotNull(archive.GetEntry("[Content_Types].xml"));
        Assert.NotNull(archive.GetEntry("xl/workbook.xml"));
        Assert.NotNull(archive.GetEntry("xl/styles.xml"));
        var sheetEntry = archive.GetEntry("xl/worksheets/sheet1.xml");
        Assert.NotNull(sheetEntry);

        using var sheetReader = new StreamReader(sheetEntry.Open(), Encoding.UTF8);
        var sheetXml = await sheetReader.ReadToEndAsync();
        var doc = XDocument.Parse(sheetXml);
        var sheetText = string.Concat(doc.Descendants().Select(x => x.Value));

        Assert.Contains("Annual Goal: 55.0 hrs | Total Logged: 50.0 hrs", sheetText);
        Assert.Contains("Subscription Ledger & Checkout Accounting Architecture", sheetText);
        Assert.DoesNotContain("Docker & Container Orchestration Deep Dive", sheetText);

        var csvRes = await _client.GetAsync("/api/advancement/export?year=2026&format=csv");
        Assert.Equal(HttpStatusCode.OK, csvRes.StatusCode);
        Assert.Equal("text/csv", csvRes.Content.Headers.ContentType?.MediaType);

        var csvContent = await csvRes.Content.ReadAsStringAsync();
        Assert.Contains("Title,Category,Linked Goal,Start Date,End Date,Hours,Description", csvContent);
        Assert.Contains("Subscription Ledger & Checkout Accounting Architecture", csvContent);
        Assert.DoesNotContain("Docker & Container Orchestration Deep Dive", csvContent);
    }
}
