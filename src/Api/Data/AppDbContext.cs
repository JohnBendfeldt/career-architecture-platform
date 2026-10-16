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
            Headline = "Senior Full-Stack Software Engineer",
            Bio = "Senior Full-Stack Engineer with 9+ years of expertise architecting, building, and maintaining high-performance SaaS applications and distributed systems. Specializes in scalable C#/.NET enterprise backends, modern React and TypeScript frontends, and automated CI/CD pipelines. Proven track record leading major codebase modernizations, designing robust REST/Minimal APIs, and shipping mission-critical e-commerce and financial workflows.",
            Location = "Hutto, TX",
            Email = "jfbendfeldt@gmail.com",
            AvatarUrl = "/john-bendfeldt.jpg",
            GithubUrl = "https://github.com/johnbendfeldt",
            LinkedinUrl = "https://linkedin.com/in/johnbendfeldt",
            WebsiteUrl = "https://johnbendfeldt.com",
            LiveProjectUrl = "https://basicrussian.org",
            SkillsJson = JsonSerializer.Serialize(new[]
            {
                "C#", ".NET (Core, 6, 10)", "React", "TypeScript", "JavaScript (ES6+)",
                "Azure DevOps", "Docker", "SQL Server", "CI/CD Pipelines", "Vite",
                "System Architecture", "REST & Minimal APIs", "TDD & Integration Testing", "YARP Reverse Proxy"
            }),
            ExperienceYears = 9,
            UpdatedAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
        });

        // Seed Technical & Engineering Goals (Reflecting Authentic Enterprise & Production Work)
        modelBuilder.Entity<Goal>().HasData(
            new Goal
            {
                Id = 1,
                Title = "Enterprise Codebase Modernization (.NET 10)",
                Description = "Spearheading codebase modernization initiatives to transition legacy enterprise systems to current .NET and modern web standards, optimizing accounting and membership workflows.",
                Category = "Technical",
                Progress = 90,
                TargetDate = "Present",
                Status = "InProgress",
                TagsJson = JsonSerializer.Serialize(new[] { ".NET 10", "C#", "Modernization", "Azure DevOps" }),
                CreatedAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new Goal
            {
                Id = 2,
                Title = "Training Hour Tracking Application (trainingtracker.advsol.com)",
                Description = "Architected and built an internal Training Hour Tracking application to streamline HR processes, engineered with .NET 10, vanilla JavaScript, HTML, and Vite.",
                Category = "Technical",
                Progress = 100,
                TargetDate = "Deployed",
                Status = "Completed",
                TagsJson = JsonSerializer.Serialize(new[] { "trainingtracker.advsol.com", ".NET 10", "Vite", "JavaScript", "HR Tech" }),
                CreatedAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new Goal
            {
                Id = 3,
                Title = "Russian Language Learning Platform (basicrussian.org)",
                Description = "Architected and shipped an active production language immersion platform featuring spaced repetition drills, phonetics, grammar mastery, and interactive learning architecture.",
                Category = "Personal",
                Progress = 85,
                TargetDate = "Live in Production",
                Status = "Completed",
                TagsJson = JsonSerializer.Serialize(new[] { "basicrussian.org", "Russian", "Language Learning", "React", "Full-Stack" }),
                CreatedAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new Goal
            {
                Id = 4,
                Title = "International Address & Province Data (country-province-data)",
                Description = "Published and maintained zero-dependency npm package powering international checkout flows with 1,300+ weekly downloads and 0 bugs over 8 years.",
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
