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
builder.Services.AddMemoryCache(options => options.SizeLimit = 512);
builder.Services.AddHttpClient<IAiSkillExtractor, AiSkillExtractor>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddHttpClient<ILearningResourceService, LearningResourceService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});

// JWT Authentication configuration
var configuredJwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(configuredJwtSecret) && !builder.Environment.IsDevelopment())
{
    throw new InvalidOperationException("Jwt:Secret must be configured in non-Development environments.");
}
var jwtSecret = string.IsNullOrWhiteSpace(configuredJwtSecret)
    ? "SuperSecretCareerArchitectureDemoJwtSigningKey2026!LongEnoughForSha256"
    : configuredJwtSecret;
if (Encoding.UTF8.GetByteCount(jwtSecret) < 32)
{
    throw new InvalidOperationException("Jwt:Secret must be at least 32 bytes (256 bits) for HMAC-SHA256.");
}
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
    options.SaveToken = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = "role"
    };
});

// Authorization policies: Write access requires an authenticated non-guest admin user
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
            var isAdminRole = ctx.User.IsInRole("admin") ||
                              ctx.User.HasClaim("role", "admin") ||
                              ctx.User.HasClaim(ClaimTypes.Role, "admin");
            return !isGuestRole && isAdminRole;
        });
    });
});

// CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? (builder.Environment.IsDevelopment()
        ? new[]
        {
            "https://johnbendfeldt.com",
            "https://www.johnbendfeldt.com",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5050",
            "http://localhost:3000"
        }
        : new[]
        {
            "https://johnbendfeldt.com",
            "https://www.johnbendfeldt.com"
        });

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
    options.KnownIPNetworks.Add(new System.Net.IPNetwork(System.Net.IPAddress.Parse("10.0.0.0"), 8));
    options.KnownIPNetworks.Add(new System.Net.IPNetwork(System.Net.IPAddress.Parse("172.16.0.0"), 12));
    options.KnownIPNetworks.Add(new System.Net.IPNetwork(System.Net.IPAddress.Parse("192.168.0.0"), 16));
});

var app = builder.Build();

// Ensure DB is created and seeded (recreate only in Development if local dev schema changed)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    if (app.Environment.IsDevelopment())
    {
        try
        {
            _ = db.Categories.Any();
            _ = db.CareerDevelopmentEntries.Any();
            _ = db.Goals.Select(g => g.TargetHours).FirstOrDefault();
            _ = db.Profiles.Select(p => p.AnnualGoalHours).FirstOrDefault();
        }
        catch (Microsoft.Data.Sqlite.SqliteException ex) when (ex.SqliteErrorCode == 1)
        {
            db.Database.EnsureDeleted();
            db.Database.EnsureCreated();
        }
    }
}

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "0";
    context.Response.Headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=(), payment=()";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
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
        profile.AnnualGoalHours,
        profile.UpdatedAt
    });
});

app.MapPut("/api/profile/goal-hours", async (UpdateAnnualGoalHoursRequest request, AppDbContext db) =>
{
    if (request.AnnualGoalHours < 1m || request.AnnualGoalHours > 999.99m)
    {
        return Results.BadRequest(new { error = "Annual goal hours must be between 1 and 999.99." });
    }

    var profile = await db.Profiles.FirstOrDefaultAsync();
    if (profile == null)
    {
        return Results.NotFound(new { message = "Profile not found" });
    }

    profile.AnnualGoalHours = Math.Round(request.AnnualGoalHours, 2);
    profile.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(new { annualGoalHours = profile.AnnualGoalHours });
}).RequireAuthorization("RequireWriteAccess");

// Goals Endpoints
app.MapGet("/api/goals", async (AppDbContext db) =>
{
    var goals = await db.Goals.AsNoTracking().OrderBy(g => g.Id).ToListAsync();
    var linkedEntries = await db.CareerDevelopmentEntries
        .AsNoTracking()
        .Where(e => e.GoalId != null)
        .Select(e => new { GoalId = e.GoalId!.Value, e.Hours })
        .ToListAsync();

    var hoursByGoal = linkedEntries
        .GroupBy(e => e.GoalId)
        .ToDictionary(g => g.Key, g => (Hours: g.Sum(x => x.Hours), Count: g.Count()));

    var response = goals.Select(g =>
    {
        hoursByGoal.TryGetValue(g.Id, out var stats);
        return new
        {
            g.Id,
            g.Title,
            g.Description,
            g.Category,
            g.Progress,
            g.TargetHours,
            LoggedHours = stats.Hours,
            EntryCount = stats.Count,
            g.TargetDate,
            g.Status,
            Tags = JsonSerializer.Deserialize<List<string>>(g.TagsJson) ?? new List<string>(),
            g.CreatedAt
        };
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

    if (string.IsNullOrWhiteSpace(request.Category) || request.Category.Length > 50 ||
        (request.Category != "Technical" && request.Category != "Personal"))
    {
        return Results.BadRequest(new { error = "Category must be either 'Technical' or 'Personal'." });
    }

    if (string.IsNullOrWhiteSpace(request.TargetDate) || request.TargetDate.Length > 60)
    {
        return Results.BadRequest(new { error = "TargetDate is required and must be 60 characters or fewer." });
    }

    if (string.IsNullOrWhiteSpace(request.Status) || request.Status.Length > 30 ||
        (request.Status != "InProgress" && request.Status != "Completed" && request.Status != "Upcoming"))
    {
        return Results.BadRequest(new { error = "Status must be 'InProgress', 'Completed', or 'Upcoming'." });
    }

    if (request.Tags is { Count: > 20 } || (request.Tags != null && request.Tags.Any(t => t == null || t.Length > 50)))
    {
        return Results.BadRequest(new { error = "Goals may include at most 20 tags of up to 50 characters each." });
    }

    if (request.TargetHours.HasValue && (request.TargetHours.Value < 0.5m || request.TargetHours.Value > 9999m))
    {
        return Results.BadRequest(new { error = "Target hours must be between 0.5 and 9,999." });
    }

    return null;
}

app.MapPost("/api/goals", async (CreateGoalRequest request, AppDbContext db) =>
{
    if (ValidateGoalRequest(request) is { } validationError)
    {
        return validationError;
    }

    decimal? normalizedTargetHours = request.TargetHours is > 0m
        ? Math.Round(request.TargetHours.Value, 2)
        : null;

    var goal = new Goal
    {
        Title = request.Title.Trim(),
        Description = request.Description ?? "",
        Category = request.Category,
        Progress = Math.Clamp(request.Progress, 0, 100),
        TargetHours = normalizedTargetHours,
        TargetDate = request.TargetDate,
        Status = request.Status,
        TagsJson = JsonSerializer.Serialize(request.Tags ?? new List<string>())
    };

    db.Goals.Add(goal);
    await db.SaveChangesAsync();

    return Results.Created($"/api/goals/{goal.Id}", new
    {
        goal.Id,
        goal.Title,
        goal.Description,
        goal.Category,
        goal.Progress,
        goal.TargetHours,
        LoggedHours = 0m,
        EntryCount = 0,
        goal.TargetDate,
        goal.Status,
        Tags = request.Tags ?? new List<string>(),
        goal.CreatedAt
    });
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
    goal.TargetHours = request.TargetHours is > 0m ? Math.Round(request.TargetHours.Value, 2) : null;
    goal.TargetDate = request.TargetDate;
    goal.Status = request.Status;
    goal.TagsJson = JsonSerializer.Serialize(request.Tags ?? new List<string>());

    await db.SaveChangesAsync();

    if (goal.TargetHours is > 0m)
    {
        var hasEntries = await db.CareerDevelopmentEntries.AnyAsync(e => e.GoalId == goal.Id);
        if (hasEntries)
        {
            await AdvancementCalculator.RecalculateGoalProgressAsync(db, goal.Id);
        }
    }

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

// Career Advancement Endpoints (Tandem with Goals)
static CareerEntryDto MapCareerEntryDto(CareerDevelopmentEntry e) => new(
    e.Id,
    e.Title,
    e.Description,
    e.StartDate.ToString("yyyy-MM-dd"),
    e.EndDate.ToString("yyyy-MM-dd"),
    e.Hours,
    e.CategoryId,
    e.CategoryNavigation?.Name,
    e.GoalId,
    e.GoalNavigation?.Title,
    e.CreatedAt,
    e.UpdatedAt
);

app.MapGet("/api/advancement/categories", async (AppDbContext db) =>
{
    var categories = await db.Categories
        .AsNoTracking()
        .Where(c => c.IsActive)
        .OrderBy(c => c.DisplayOrder)
        .Select(c => new CategoryDto(c.Id, c.Name, c.Description, c.DisplayOrder))
        .ToListAsync();

    return Results.Ok(categories);
});

app.MapGet("/api/advancement/progress", async (int? year, AppDbContext db) =>
{
    var targetYear = year ?? DateTime.UtcNow.Year;
    var annualGoalHours = (await db.Profiles.AsNoTracking().FirstOrDefaultAsync())?.AnnualGoalHours ?? 50m;

    var hoursList = await db.CareerDevelopmentEntries
        .AsNoTracking()
        .Where(e => e.StartDate.Year == targetYear)
        .Select(e => e.Hours)
        .ToListAsync();

    var completedHours = hoursList.Sum();
    var percentComplete = AdvancementCalculator.CalculatePercentComplete(completedHours, annualGoalHours);
    var now = DateTime.UtcNow;
    var (expectedProgress, quarterLabel) = AdvancementCalculator.GetQuarterlyCheckpoint(now, targetYear);
    var isOnTrack = AdvancementCalculator.IsOnTrack(percentComplete, now, targetYear);

    return Results.Ok(new AnnualProgressDto(
        annualGoalHours,
        completedHours,
        percentComplete,
        hoursList.Count,
        targetYear,
        isOnTrack,
        expectedProgress,
        quarterLabel
    ));
});

app.MapGet("/api/advancement/entries", async (int? year, int? categoryId, int? goalId, AppDbContext db) =>
{
    var query = db.CareerDevelopmentEntries
        .AsNoTracking()
        .Include(e => e.CategoryNavigation)
        .Include(e => e.GoalNavigation)
        .AsQueryable();

    if (year.HasValue)
    {
        query = query.Where(e => e.StartDate.Year == year.Value);
    }

    if (categoryId.HasValue)
    {
        query = query.Where(e => e.CategoryId == categoryId.Value);
    }

    if (goalId.HasValue)
    {
        query = query.Where(e => e.GoalId == goalId.Value);
    }

    var entries = await query
        .OrderByDescending(e => e.StartDate)
        .ThenByDescending(e => e.Id)
        .ToListAsync();

    var dtoList = entries.Select(MapCareerEntryDto).ToList();

    return Results.Ok(new CareerEntriesListResponse(
        dtoList,
        dtoList.Sum(x => x.Hours),
        dtoList.Count,
        year ?? DateTime.UtcNow.Year
    ));
});

app.MapPost("/api/advancement/entries", async (CreateCareerEntryRequest request, AppDbContext db) =>
{
    if (AdvancementCalculator.ValidateEntry(request) is { } validationError)
    {
        return Results.BadRequest(new { error = validationError });
    }

    if (request.CategoryId.HasValue)
    {
        var categoryExists = await db.Categories.AnyAsync(c => c.Id == request.CategoryId.Value && c.IsActive);
        if (!categoryExists)
        {
            return Results.BadRequest(new { error = "Selected category was not found." });
        }
    }

    if (request.GoalId.HasValue)
    {
        var goalExists = await db.Goals.AnyAsync(g => g.Id == request.GoalId.Value);
        if (!goalExists)
        {
            return Results.BadRequest(new { error = "Selected goal was not found." });
        }
    }

    var entry = new CareerDevelopmentEntry
    {
        Title = request.Title.Trim(),
        Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
        StartDate = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc),
        EndDate = DateTime.SpecifyKind(request.EndDate.Date, DateTimeKind.Utc),
        Hours = Math.Round(request.Hours, 2),
        CategoryId = request.CategoryId,
        GoalId = request.GoalId,
        CreatedAt = DateTime.UtcNow
    };

    db.CareerDevelopmentEntries.Add(entry);
    await db.SaveChangesAsync();

    if (entry.GoalId.HasValue)
    {
        await AdvancementCalculator.RecalculateGoalProgressAsync(db, entry.GoalId.Value);
    }

    var loaded = await db.CareerDevelopmentEntries
        .AsNoTracking()
        .Include(e => e.CategoryNavigation)
        .Include(e => e.GoalNavigation)
        .FirstAsync(e => e.Id == entry.Id);

    return Results.Created($"/api/advancement/entries/{entry.Id}", MapCareerEntryDto(loaded));
}).RequireAuthorization("RequireWriteAccess");

app.MapPut("/api/advancement/entries/{id:int}", async (int id, CreateCareerEntryRequest request, AppDbContext db) =>
{
    var entry = await db.CareerDevelopmentEntries.FindAsync(id);
    if (entry == null)
    {
        return Results.NotFound();
    }

    if (AdvancementCalculator.ValidateEntry(request) is { } validationError)
    {
        return Results.BadRequest(new { error = validationError });
    }

    if (request.CategoryId.HasValue)
    {
        var categoryExists = await db.Categories.AnyAsync(c => c.Id == request.CategoryId.Value && c.IsActive);
        if (!categoryExists)
        {
            return Results.BadRequest(new { error = "Selected category was not found." });
        }
    }

    if (request.GoalId.HasValue)
    {
        var goalExists = await db.Goals.AnyAsync(g => g.Id == request.GoalId.Value);
        if (!goalExists)
        {
            return Results.BadRequest(new { error = "Selected goal was not found." });
        }
    }

    var oldGoalId = entry.GoalId;

    entry.Title = request.Title.Trim();
    entry.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
    entry.StartDate = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc);
    entry.EndDate = DateTime.SpecifyKind(request.EndDate.Date, DateTimeKind.Utc);
    entry.Hours = Math.Round(request.Hours, 2);
    entry.CategoryId = request.CategoryId;
    entry.GoalId = request.GoalId;
    entry.UpdatedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();

    if (oldGoalId.HasValue && oldGoalId != entry.GoalId)
    {
        await AdvancementCalculator.RecalculateGoalProgressAsync(db, oldGoalId.Value);
    }

    if (entry.GoalId.HasValue)
    {
        await AdvancementCalculator.RecalculateGoalProgressAsync(db, entry.GoalId.Value);
    }

    var loaded = await db.CareerDevelopmentEntries
        .AsNoTracking()
        .Include(e => e.CategoryNavigation)
        .Include(e => e.GoalNavigation)
        .FirstAsync(e => e.Id == entry.Id);

    return Results.Ok(MapCareerEntryDto(loaded));
}).RequireAuthorization("RequireWriteAccess");

app.MapDelete("/api/advancement/entries/{id:int}", async (int id, AppDbContext db) =>
{
    var entry = await db.CareerDevelopmentEntries.FindAsync(id);
    if (entry == null)
    {
        return Results.NotFound();
    }

    var oldGoalId = entry.GoalId;
    db.CareerDevelopmentEntries.Remove(entry);
    await db.SaveChangesAsync();

    if (oldGoalId.HasValue)
    {
        await AdvancementCalculator.RecalculateGoalProgressAsync(db, oldGoalId.Value);
    }

    return Results.NoContent();
}).RequireAuthorization("RequireWriteAccess");

app.MapPost("/api/advancement/entries/import", async (ImportCareerEntriesRequest request, AppDbContext db) =>
{
    if (request?.Entries is null || request.Entries.Count == 0)
    {
        return Results.BadRequest(new ImportCareerEntriesResponse(
            Success: false,
            Message: "No entries provided for import.",
            TotalRows: 0,
            SuccessCount: 0,
            ErrorCount: 0,
            DuplicateCount: 0,
            Results: []
        ));
    }

    if (request.Entries.Count > ImportCareerEntriesRequest.MaxRows)
    {
        return Results.BadRequest(new ImportCareerEntriesResponse(
            Success: false,
            Message: $"You can import at most {ImportCareerEntriesRequest.MaxRows} entries at a time.",
            TotalRows: request.Entries.Count,
            SuccessCount: 0,
            ErrorCount: request.Entries.Count,
            DuplicateCount: 0,
            Results: []
        ));
    }

    var categories = await db.Categories.AsNoTracking().Where(c => c.IsActive).ToListAsync();
    var goals = await db.Goals.AsNoTracking().ToListAsync();
    var existingEntries = await db.CareerDevelopmentEntries
        .AsNoTracking()
        .Select(e => new { e.Title, e.StartDate, e.EndDate, e.Hours })
        .ToListAsync();

    var seenKeys = new HashSet<(string Title, DateTime StartDate, DateTime EndDate, decimal Hours)>(
        existingEntries.Select(e => (
            e.Title.Trim().ToLowerInvariant(),
            e.StartDate.Date,
            e.EndDate.Date,
            Math.Round(e.Hours, 2)
        ))
    );

    var affectedGoalIds = new HashSet<int>();
    var rowResults = new List<ImportCareerEntryRowResult>(request.Entries.Count);
    var successCount = 0;
    var errorCount = 0;
    var duplicateCount = 0;

    for (int i = 0; i < request.Entries.Count; i++)
    {
        var row = request.Entries[i];
        var rowNumber = i + 1;
        var title = (row.Title ?? string.Empty).Trim();
        var description = string.IsNullOrWhiteSpace(row.Description) ? null : row.Description.Trim();

        if (title.Length > 200)
        {
            description = string.IsNullOrWhiteSpace(description) ? title : $"{title}\n\n{description}";
            var truncated = title[..200];
            var lastSpace = truncated.LastIndexOf(' ');
            if (lastSpace > 120)
            {
                truncated = truncated[..lastSpace];
            }
            title = truncated.Trim();
        }

        var startDate = DateTime.SpecifyKind(row.StartDate.Date, DateTimeKind.Utc);
        var endDate = DateTime.SpecifyKind((row.EndDate ?? row.StartDate).Date, DateTimeKind.Utc);
        var startStr = startDate.ToString("yyyy-MM-dd");
        var endStr = endDate.ToString("yyyy-MM-dd");

        int? categoryId = null;
        if (row.CategoryId.HasValue && categories.Any(c => c.Id == row.CategoryId.Value))
        {
            categoryId = row.CategoryId.Value;
        }
        else if (!string.IsNullOrWhiteSpace(row.Category))
        {
            var catName = row.Category.Trim();
            if (!string.Equals(catName, "uncategorized", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(catName, "none", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(catName, "-", StringComparison.Ordinal))
            {
                categoryId = categories.FirstOrDefault(c =>
                    string.Equals(c.Name, catName, StringComparison.OrdinalIgnoreCase))?.Id;
            }
        }

        int? goalId = null;
        if (row.GoalId.HasValue && goals.Any(g => g.Id == row.GoalId.Value))
        {
            goalId = row.GoalId.Value;
        }
        else if (!string.IsNullOrWhiteSpace(row.GoalTitle))
        {
            var goalName = row.GoalTitle.Trim();
            if (!string.Equals(goalName, "none", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(goalName, "standalone", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(goalName, "-", StringComparison.Ordinal))
            {
                goalId = goals.FirstOrDefault(g =>
                    string.Equals(g.Title, goalName, StringComparison.OrdinalIgnoreCase))?.Id;
            }
        }

        var validationRequest = new CreateCareerEntryRequest(
            title,
            description,
            startDate,
            endDate,
            row.Hours,
            categoryId,
            goalId,
            request.ClientUtcOffsetMinutes
        );

        if (AdvancementCalculator.ValidateEntry(validationRequest) is { } validationError)
        {
            errorCount++;
            rowResults.Add(new ImportCareerEntryRowResult(
                rowNumber, title, row.Hours, startStr, endStr, false, null, validationError, false
            ));
            continue;
        }

        var roundedHours = Math.Round(row.Hours, 2);
        var dedupKey = (title.ToLowerInvariant(), startDate.Date, endDate.Date, roundedHours);
        if (!seenKeys.Add(dedupKey))
        {
            errorCount++;
            duplicateCount++;
            rowResults.Add(new ImportCareerEntryRowResult(
                rowNumber,
                title,
                roundedHours,
                startStr,
                endStr,
                false,
                null,
                "Duplicate entry - an entry with the same title, dates, and hours already exists.",
                true
            ));
            continue;
        }

        var entry = new CareerDevelopmentEntry
        {
            Title = title,
            Description = description,
            StartDate = startDate,
            EndDate = endDate,
            Hours = roundedHours,
            CategoryId = categoryId,
            GoalId = goalId,
            CreatedAt = DateTime.UtcNow
        };

        db.CareerDevelopmentEntries.Add(entry);
        await db.SaveChangesAsync();

        if (entry.GoalId.HasValue)
        {
            affectedGoalIds.Add(entry.GoalId.Value);
        }

        successCount++;
        rowResults.Add(new ImportCareerEntryRowResult(
            rowNumber, title, roundedHours, startStr, endStr, true, entry.Id, null, false
        ));
    }

    foreach (var affectedGoalId in affectedGoalIds)
    {
        await AdvancementCalculator.RecalculateGoalProgressAsync(db, affectedGoalId);
    }

    var overallSuccess = successCount > 0;
    var summaryMessage = overallSuccess
        ? $"Successfully imported {successCount} of {request.Entries.Count} entries."
        : duplicateCount > 0
            ? $"No new entries imported ({duplicateCount} duplicate skipped)."
            : "No entries were imported successfully.";

    return Results.Ok(new ImportCareerEntriesResponse(
        Success: overallSuccess,
        Message: summaryMessage,
        TotalRows: request.Entries.Count,
        SuccessCount: successCount,
        ErrorCount: errorCount,
        DuplicateCount: duplicateCount,
        Results: rowResults
    ));
}).RequireAuthorization("RequireWriteAccess");

app.MapGet("/api/advancement/export", async (int? year, string? format, AppDbContext db) =>
{
    var profile = await db.Profiles.AsNoTracking().FirstOrDefaultAsync();
    var professionalName = profile?.Name ?? "John F. Bendfeldt";
    var annualGoalHours = profile?.AnnualGoalHours ?? 55m;

    var query = db.CareerDevelopmentEntries
        .AsNoTracking()
        .Include(e => e.CategoryNavigation)
        .Include(e => e.GoalNavigation)
        .AsQueryable();

    if (year.HasValue)
    {
        query = query.Where(e => e.StartDate.Year == year.Value);
    }

    var entries = await query
        .OrderByDescending(e => e.StartDate)
        .ThenByDescending(e => e.Id)
        .ToListAsync();

    var dtos = entries.Select(MapCareerEntryDto).ToList();
    var yearSuffix = year.HasValue ? $"_{year.Value}" : "_AllYears";
    var dateStamp = DateTime.UtcNow.ToString("yyyyMMdd");

    if (string.Equals(format, "csv", StringComparison.OrdinalIgnoreCase))
    {
        var csvBytes = AdvancementSpreadsheetService.BuildCareerDevelopmentCsv(dtos);
        return Results.File(
            csvBytes,
            "text/csv; charset=utf-8",
            $"CareerDevelopment{yearSuffix}_{dateStamp}.csv"
        );
    }

    var workbookBytes = AdvancementSpreadsheetService.BuildCareerDevelopmentWorkbook(
        professionalName,
        annualGoalHours,
        year,
        dtos
    );

    return Results.File(
        workbookBytes,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        $"CareerDevelopment{yearSuffix}_{dateStamp}.xlsx"
    );
}).RequireRateLimiting("PublicApiLimit");

// AI Skill Extraction
app.MapPost("/api/skills/extract", async (ExtractSkillsRequest request, IAiSkillExtractor extractor, CancellationToken ct) =>
{
    if (request?.Text?.Length > 10000)
    {
        return Results.BadRequest(new { error = "Input text exceeds maximum length of 10,000 characters." });
    }

    var skills = await extractor.ExtractSkillsAsync(request?.Text ?? "", ct);
    return Results.Ok(new ExtractSkillsResponse(skills));
}).RequireRateLimiting("PublicApiLimit");

// Dynamic Learning Resources (YouTube Data API v3 + Curated Pathways)
app.MapGet("/api/resources", async (string? skill, ILearningResourceService resourceService, CancellationToken ct) =>
{
    if (skill?.Length > 200)
    {
        return Results.BadRequest(new { error = "Skill query exceeds maximum length of 200 characters." });
    }

    var term = string.IsNullOrWhiteSpace(skill) ? "C# .NET 10 Minimal APIs" : skill;
    var resources = await resourceService.GetResourcesAsync(term, ct);
    return Results.Ok(new LearningResourcesResponse(term, resources));
}).RequireRateLimiting("PublicApiLimit");

app.Run();

// Needed for WebApplicationFactory in integration tests
public partial class Program { }
