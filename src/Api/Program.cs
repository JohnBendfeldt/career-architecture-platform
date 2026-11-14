using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using CareerPlatform.Api.Data;
using CareerPlatform.Api.Models;
using CareerPlatform.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Database configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=careerplatform.db";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

// Token service & AI / Learning services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<IAiSkillExtractor, AiSkillExtractor>();
builder.Services.AddHttpClient<ILearningResourceService, LearningResourceService>();

// JWT Authentication configuration
var configuredJwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(configuredJwtSecret) && !builder.Environment.IsDevelopment())
{
    throw new InvalidOperationException("Jwt:Secret must be configured in non-Development environments.");
}
var jwtSecret = string.IsNullOrWhiteSpace(configuredJwtSecret)
    ? "SuperSecretCareerArchitectureDemoJwtSigningKey2026!LongEnoughForSha256"
    : configuredJwtSecret;
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "CareerPlatform.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "CareerPlatform.Web";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = "role"
    };
});

// Authorization policies: Guest accounts are strictly read-only
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireWriteAccess", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(ctx =>
        {
            var isGuestRole = ctx.User.IsInRole("guest") || 
                              ctx.User.HasClaim("role", "guest") ||
                              ctx.User.HasClaim("guest_mode", "true");
            return !isGuestRole;
        });
    });
});

// CORS
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

// Rate Limiting on public endpoints (partitioned per client IP)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("PublicApiLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

var app = builder.Build();

// Ensure DB is created and seeded
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseForwardedHeaders();

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "0";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=(), payment=()";
    await next();
});

app.UseCors("AllowedOrigins");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Health Check
app.MapGet("/health", () => Results.Ok(new
{
    service = "Api",
    status = "Healthy",
    timestamp = DateTime.UtcNow
}));

// Guest Auth Endpoint: Instant 1-click recruiter demo bypass
app.MapPost("/api/auth/guest", (ITokenService tokenService) =>
{
    var token = tokenService.GenerateGuestToken();
    var user = new UserDto(
        Id: "guest-recruiter-demo-user",
        Name: "Guest Recruiter",
        Email: "guest@demo.local",
        Role: "guest",
        AvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    );

    return Results.Ok(new GuestAuthResponse(token, user));
}).RequireRateLimiting("PublicApiLimit");

// Current User Info
app.MapGet("/api/auth/me", (ClaimsPrincipal user) =>
{
    if (!user.Identity?.IsAuthenticated ?? true)
    {
        return Results.Unauthorized();
    }

    var id = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
    var name = user.FindFirstValue(ClaimTypes.Name) ?? "User";
    var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
    var role = user.FindFirst("role")?.Value ?? user.FindFirstValue(ClaimTypes.Role) ?? "guest";

    return Results.Ok(new UserDto(
        Id: id,
        Name: name,
        Email: email,
        Role: role,
        AvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    ));
}).RequireAuthorization();

// Profile Endpoints
app.MapGet("/api/profile", async (AppDbContext db) =>
{
    var profile = await db.Profiles.FirstOrDefaultAsync();
    if (profile == null)
    {
        return Results.NotFound(new { message = "Profile not found" });
    }

    var skills = JsonSerializer.Deserialize<List<string>>(profile.SkillsJson) ?? new List<string>();

    return Results.Ok(new
    {
        profile.Id,
        profile.Name,
        profile.Headline,
        profile.Bio,
        profile.Location,
        profile.Email,
        profile.AvatarUrl,
        profile.GithubUrl,
        profile.LinkedinUrl,
        profile.WebsiteUrl,
        profile.LiveProjectUrl,
        Skills = skills,
        profile.ExperienceYears,
        profile.UpdatedAt
    });
});

// Goals Endpoints
app.MapGet("/api/goals", async (AppDbContext db) =>
{
    var goals = await db.Goals.OrderBy(g => g.Id).ToListAsync();
    var response = goals.Select(g => new
    {
        g.Id,
        g.Title,
        g.Description,
        g.Category,
        g.Progress,
        g.TargetDate,
        g.Status,
        Tags = JsonSerializer.Deserialize<List<string>>(g.TagsJson) ?? new List<string>(),
        g.CreatedAt
    });

    return Results.Ok(response);
});

// Write Protected Endpoints (Guest returns 403 Forbidden)
static IResult? ValidateGoalRequest(CreateGoalRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 200)
    {
        return Results.BadRequest(new { error = "Title is required and must be 200 characters or fewer." });
    }

    if (request.Description?.Length > 2000)
    {
        return Results.BadRequest(new { error = "Description must be 2,000 characters or fewer." });
    }

    if (request.Category?.Length > 50)
    {
        return Results.BadRequest(new { error = "Category must be 50 characters or fewer." });
    }

    if (request.TargetDate?.Length > 60)
    {
        return Results.BadRequest(new { error = "TargetDate must be 60 characters or fewer." });
    }

    if (request.Status?.Length > 30)
    {
        return Results.BadRequest(new { error = "Status must be 30 characters or fewer." });
    }

    if (request.Tags is { Count: > 20 } || (request.Tags != null && request.Tags.Any(t => t == null || t.Length > 50)))
    {
        return Results.BadRequest(new { error = "Goals may include at most 20 tags of up to 50 characters each." });
    }

    return null;
}

app.MapPost("/api/goals", async (CreateGoalRequest request, AppDbContext db) =>
{
    if (ValidateGoalRequest(request) is { } validationError)
    {
        return validationError;
    }

    var goal = new Goal
    {
        Title = request.Title.Trim(),
        Description = request.Description ?? "",
        Category = request.Category,
        Progress = Math.Clamp(request.Progress, 0, 100),
        TargetDate = request.TargetDate,
        Status = request.Status,
        TagsJson = JsonSerializer.Serialize(request.Tags ?? new List<string>())
    };

    db.Goals.Add(goal);
    await db.SaveChangesAsync();

    return Results.Created($"/api/goals/{goal.Id}", goal);
}).RequireAuthorization("RequireWriteAccess");

app.MapPut("/api/goals/{id:int}", async (int id, CreateGoalRequest request, AppDbContext db) =>
{
    if (ValidateGoalRequest(request) is { } validationError)
    {
        return validationError;
    }

    var goal = await db.Goals.FindAsync(id);
    if (goal == null) return Results.NotFound();

    goal.Title = request.Title.Trim();
    goal.Description = request.Description ?? "";
    goal.Category = request.Category;
    goal.Progress = Math.Clamp(request.Progress, 0, 100);
    goal.TargetDate = request.TargetDate;
    goal.Status = request.Status;
    goal.TagsJson = JsonSerializer.Serialize(request.Tags ?? new List<string>());

    await db.SaveChangesAsync();
    return Results.Ok(goal);
}).RequireAuthorization("RequireWriteAccess");

app.MapDelete("/api/goals/{id:int}", async (int id, AppDbContext db) =>
{
    var goal = await db.Goals.FindAsync(id);
    if (goal == null) return Results.NotFound();

    db.Goals.Remove(goal);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization("RequireWriteAccess");

// AI Skill Extraction
app.MapPost("/api/skills/extract", async (ExtractSkillsRequest request, IAiSkillExtractor extractor) =>
{
    if (request?.Text?.Length > 10000)
    {
        return Results.BadRequest(new { error = "Input text exceeds maximum length of 10,000 characters." });
    }

    var skills = await extractor.ExtractSkillsAsync(request?.Text ?? "");
    return Results.Ok(new ExtractSkillsResponse(skills));
}).RequireRateLimiting("PublicApiLimit");

// Dynamic Learning Resources (YouTube Data API v3 + Curated Pathways)
app.MapGet("/api/resources", async (string? skill, ILearningResourceService resourceService) =>
{
    if (skill?.Length > 200)
    {
        return Results.BadRequest(new { error = "Skill query exceeds maximum length of 200 characters." });
    }

    var term = string.IsNullOrWhiteSpace(skill) ? "C# .NET 10 Minimal APIs" : skill;
    var resources = await resourceService.GetResourcesAsync(term);
    return Results.Ok(new LearningResourcesResponse(term, resources));
}).RequireRateLimiting("PublicApiLimit");

app.Run();

// Needed for WebApplicationFactory in integration tests
public partial class Program { }
