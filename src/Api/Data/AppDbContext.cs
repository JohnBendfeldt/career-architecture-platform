using Microsoft.EntityFrameworkCore;
using CareerPlatform.Api.Models;
using System.Text.Json;

namespace CareerPlatform.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<CareerDevelopmentEntry> CareerDevelopmentEntries => Set<CareerDevelopmentEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<CareerDevelopmentEntry>(entity =>
        {
            entity.HasOne(e => e.CategoryNavigation)
                  .WithMany()
                  .HasForeignKey(e => e.CategoryId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.GoalNavigation)
                  .WithMany()
                  .HasForeignKey(e => e.GoalId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Seed John F. Bendfeldt Profile
        modelBuilder.Entity<Profile>().HasData(new Profile
        {
            Id = 1,
            Name = "John F. Bendfeldt",
            Headline = "Senior Software Developer",
            Bio = "Software Engineer with a track record of building out features and maintaining large scale SaaS applications. Adept at working with diverse cross-functional teams to drive projects from architecture to deployment. Brings 9 years of expertise in full-stack web development, CI/CD pipelines, and modernizing legacy codebases into scalable .NET and React environments.",
            Location = "Austin, TX",
            Email = "jfbendfeldt@gmail.com",
            AvatarUrl = "/john-bendfeldt.jpg",
            GithubUrl = "https://github.com/JohnBendfeldt",
            LinkedinUrl = "https://linkedin.com/in/johnbendfeldt",
            WebsiteUrl = "https://johnbendfeldt.com",
            LiveProjectUrl = "https://basiclanguage.school",
            SkillsJson = JsonSerializer.Serialize(new[]
            {
                "C#", "JavaScript (Vanilla/ES6+)", "TypeScript", "HTML/CSS", "SQL", "PostgreSQL",
                ".NET (Core, 6, 10)", "React", "Node.js", "Vite",
                "Git", "Docker", "Azure DevOps", "SQL Server", "CI/CD pipelines", "GitHub Copilot",
                "Claude Code & Gemini CLI", "Agile/Scrum", "Test-Driven Development (TDD)", "Unit & Integration Testing"
            }),
            ExperienceYears = 9,
            AnnualGoalHours = 55.0m,
            UpdatedAt = new DateTime(2026, 11, 3, 0, 0, 0, DateTimeKind.Utc)
        });

        // Seed Technical & Engineering Goals (Reflecting Authentic Enterprise & Production Work)
        modelBuilder.Entity<Goal>().HasData(
            new Goal
            {
                Id = 1,
                Title = "Enterprise Accounting & Membership Platform (C# / .NET)",
                Description = "Engineering core web features for non-profit organizations to manage memberships, commerce, fundraising, and donations. Focused on C# and .NET development for checkout and subscription accounting, improving invoice handling efficiency, and optimizing client financial workflows.",
                Category = "Technical",
                Progress = 95,
                TargetHours = 20.0m,
                TargetDate = "Present",
                Status = "InProgress",
                TagsJson = JsonSerializer.Serialize(new[] { "C#", ".NET", "SaaS", "Accounting", "Financial Workflows", "Azure DevOps" }),
                CreatedAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new Goal
            {
                Id = 2,
                Title = "Training Hour Tracking Application (trainingtracker.advsol.com)",
                Description = "Architected and built an internal Training Hour Tracking application using .NET 10, Vite, and vanilla JavaScript, leveraging AI-assisted development workflows to accelerate delivery and automate manual HR tracking.",
                Category = "Technical",
                Progress = 100,
                TargetHours = null,
                TargetDate = "Deployed",
                Status = "Completed",
                TagsJson = JsonSerializer.Serialize(new[] { "trainingtracker.advsol.com", ".NET 10", "Vite", "JavaScript", "AI Workflows", "HR Tech" }),
                CreatedAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new Goal
            {
                Id = 3,
                Title = "Basic Language School (basiclanguage.school)",
                Description = "Built a high-performance PWA supporting 210 bidirectional language pairs across 15 languages, featuring 14,400+ neural audio assets, offline caching, interactive active-recall quizzes with custom virtual keyboards, and Supabase cloud sync.",
                Category = "Personal",
                Progress = 100,
                TargetHours = null,
                TargetDate = "Live in Production",
                Status = "Completed",
                TagsJson = JsonSerializer.Serialize(new[] { "basiclanguage.school", "PWA", "Language Learning", "Supabase", "Vitest", "Playwright" }),
                CreatedAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new Goal
            {
                Id = 4,
                Title = "International Address & Province Data (country-province-data)",
                Description = "Published and maintained zero-dependency npm package powering international checkout flows, downloaded hundreds of times a week and thousands of times a year with 0 bugs over 8 years.",
                Category = "Technical",
                Progress = 100,
                TargetHours = null,
                TargetDate = "Published (8 yrs active)",
                Status = "Completed",
                TagsJson = JsonSerializer.Serialize(new[] { "npm", "Open Source", "E-Commerce", "JavaScript" }),
                CreatedAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new Goal
            {
                Id = 5,
                Title = "Cloud Architecture & Microservices (.NET & YARP)",
                Description = "Architecting resilient microservice gateways with YARP, asynchronous message processing, and containerized cloud services in Azure to ensure sub-millisecond routing and high availability.",
                Category = "Technical",
                Progress = 95,
                TargetHours = 20.0m,
                TargetDate = "Active",
                Status = "InProgress",
                TagsJson = JsonSerializer.Serialize(new[] { "YARP", "Microservices", ".NET 10", "Cloud Architecture", "Azure" }),
                CreatedAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new Goal
            {
                Id = 6,
                Title = "Geospatial Binary Data Pipelines (Garmin FIT)",
                Description = "Parsing Garmin FIT binary telemetry into streamable GPS coordinate arrays, elevation profiles, and responsive Leaflet map visualizations.",
                Category = "Personal",
                Progress = 75,
                TargetHours = 16.0m,
                TargetDate = "Active",
                Status = "InProgress",
                TagsJson = JsonSerializer.Serialize(new[] { "Garmin FIT", "Geospatial", "Leaflet", "C#", "Cycling" }),
                CreatedAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        // Seed 9 Career Advancement Categories
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Development", Description = "Software development and programming skills", IsActive = true, DisplayOrder = 1 },
            new Category { Id = 2, Name = "Quality Assurance", Description = "Testing, quality control, and assurance practices", IsActive = true, DisplayOrder = 2 },
            new Category { Id = 3, Name = "Leadership", Description = "Professional growth and leadership skills", IsActive = true, DisplayOrder = 3 },
            new Category { Id = 4, Name = "Cloud Computing", Description = "Cloud platforms and services", IsActive = true, DisplayOrder = 4 },
            new Category { Id = 5, Name = "Data Science", Description = "Data analysis, machine learning, and AI", IsActive = true, DisplayOrder = 5 },
            new Category { Id = 6, Name = "Security", Description = "Cybersecurity and information security", IsActive = true, DisplayOrder = 6 },
            new Category { Id = 7, Name = "Project Management", Description = "Project planning and execution methodologies", IsActive = true, DisplayOrder = 7 },
            new Category { Id = 8, Name = "Communication", Description = "Interpersonal and presentation skills", IsActive = true, DisplayOrder = 8 },
            new Category { Id = 9, Name = "Design", Description = "UI/UX and graphic design skills", IsActive = true, DisplayOrder = 9 }
        );

        // Seed Career Development Entries whose 2026 hours roll up identically into Goals 1, 5, and 6
        modelBuilder.Entity<CareerDevelopmentEntry>().HasData(
            new CareerDevelopmentEntry
            {
                Id = 1,
                Title = "Subscription Ledger & Checkout Accounting Architecture",
                Description = "Deep-dive on idempotent invoice pipelines, double-entry journal reconciliation, and EF Core query optimization.",
                StartDate = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2026, 2, 12, 0, 0, 0, DateTimeKind.Utc),
                Hours = 11.0m,
                CategoryId = 1,
                GoalId = 1,
                CreatedAt = new DateTime(2026, 2, 12, 18, 0, 0, DateTimeKind.Utc)
            },
            new CareerDevelopmentEntry
            {
                Id = 2,
                Title = ".NET 10 Financial Workflow Optimization & Unit Testing",
                Description = "Refactored legacy billing handlers with deterministic xUnit regression suites and covering SQL indexes.",
                StartDate = new DateTime(2026, 4, 18, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2026, 4, 19, 0, 0, 0, DateTimeKind.Utc),
                Hours = 8.0m,
                CategoryId = 1,
                GoalId = 1,
                CreatedAt = new DateTime(2026, 4, 19, 18, 0, 0, DateTimeKind.Utc)
            },
            new CareerDevelopmentEntry
            {
                Id = 3,
                Title = "YARP Reverse Proxy & Distributed Gateway Patterns",
                Description = "Implemented cluster routing, health checks, and sub-millisecond gateway proxying in .NET 10.",
                StartDate = new DateTime(2026, 6, 5, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2026, 6, 7, 0, 0, 0, DateTimeKind.Utc),
                Hours = 12.5m,
                CategoryId = 4,
                GoalId = 5,
                CreatedAt = new DateTime(2026, 6, 7, 18, 0, 0, DateTimeKind.Utc)
            },
            new CareerDevelopmentEntry
            {
                Id = 4,
                Title = "Containerized Azure Microservices & JWT Hardening",
                Description = "Multi-stage Dockerfiles, strict CORS/rate-limiting policies, and claim-based read-only demo enforcement.",
                StartDate = new DateTime(2026, 8, 22, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2026, 8, 23, 0, 0, 0, DateTimeKind.Utc),
                Hours = 6.5m,
                CategoryId = 6,
                GoalId = 5,
                CreatedAt = new DateTime(2026, 8, 23, 18, 0, 0, DateTimeKind.Utc)
            },
            new CareerDevelopmentEntry
            {
                Id = 5,
                Title = "Garmin FIT Binary Decoding & Geospatial Telemetry Pipelines",
                Description = "Decoded 32-bit semicircle coordinates, elevation splits, and interactive Leaflet vector layers.",
                StartDate = new DateTime(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2026, 10, 14, 0, 0, 0, DateTimeKind.Utc),
                Hours = 12.0m,
                CategoryId = 5,
                GoalId = 6,
                CreatedAt = new DateTime(2026, 10, 14, 18, 0, 0, DateTimeKind.Utc)
            },
            new CareerDevelopmentEntry
            {
                Id = 6,
                Title = "Docker & Container Orchestration Deep Dive",
                Description = "Multi-stage container builds, Docker Compose networking, and healthchecks for .NET 10 services.",
                StartDate = new DateTime(2025, 9, 18, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2025, 9, 19, 0, 0, 0, DateTimeKind.Utc),
                Hours = 12.0m,
                CategoryId = 4,
                GoalId = null,
                CreatedAt = new DateTime(2025, 9, 19, 18, 0, 0, DateTimeKind.Utc)
            },
            new CareerDevelopmentEntry
            {
                Id = 7,
                Title = "Automated E2E Testing with Playwright & Vitest",
                Description = "Deterministic browser verification, network mocking, and CI pipeline integration.",
                StartDate = new DateTime(2025, 11, 14, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2025, 11, 14, 0, 0, 0, DateTimeKind.Utc),
                Hours = 8.0m,
                CategoryId = 2,
                GoalId = null,
                CreatedAt = new DateTime(2025, 11, 14, 18, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
