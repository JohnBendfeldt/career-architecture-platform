using Microsoft.EntityFrameworkCore;
using CareerPlatform.Api.Models;
using System.Text.Json;

namespace CareerPlatform.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Goal> Goals => Set<Goal>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

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
                TargetDate = "Active",
                Status = "InProgress",
                TagsJson = JsonSerializer.Serialize(new[] { "Garmin FIT", "Geospatial", "Leaflet", "C#", "Cycling" }),
                CreatedAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
