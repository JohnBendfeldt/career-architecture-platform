using System.Net.Http.Json;
using System.Text.Json.Nodes;
using CareerPlatform.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace CareerPlatform.Api.Services;

public interface ILearningResourceService
{
    Task<List<LearningResource>> GetResourcesAsync(string skill, CancellationToken ct = default);
}

public class LearningResourceService : ILearningResourceService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly IMemoryCache _cache;
    private readonly ILogger<LearningResourceService> _logger;

    public LearningResourceService(
        HttpClient httpClient,
        IConfiguration config,
        IMemoryCache cache,
        ILogger<LearningResourceService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _cache = cache;
        _logger = logger;
    }

    public async Task<List<LearningResource>> GetResourcesAsync(string skill, CancellationToken ct = default)
    {
        var normalized = string.IsNullOrWhiteSpace(skill) ? "C# .NET Minimal APIs" : skill.Trim();
        var cacheKey = $"learning_res_{normalized.ToLowerInvariant()}";

        if (_cache.TryGetValue(cacheKey, out List<LearningResource>? cached) && cached != null)
        {
            return cached;
        }

        var apiKey = _config["YouTube:ApiKey"] 
                     ?? Environment.GetEnvironmentVariable("YOUTUBE_API_KEY")
                     ?? _config["Google:YouTubeApiKey"];

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var liveResources = await FetchYouTubeApiResourcesAsync(normalized, apiKey, ct);
                if (liveResources.Count > 0)
                {
                    _cache.Set(cacheKey, liveResources, TimeSpan.FromHours(24));
                    return liveResources;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch live YouTube resources for {Skill}, falling back to curated feed.", normalized);
            }
        }

        var curated = GetCuratedResources(normalized);
        _cache.Set(cacheKey, curated, TimeSpan.FromHours(24));
        return curated;
    }

    private async Task<List<LearningResource>> FetchYouTubeApiResourcesAsync(string skill, string apiKey, CancellationToken ct)
    {
        var query = Uri.EscapeDataString($"{skill} tutorial architecture deep dive");
        var url = $"https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=3&q={query}&key={apiKey}";

        var response = await _httpClient.GetAsync(url, ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("YouTube API returned HTTP {StatusCode}", response.StatusCode);
            return new List<LearningResource>();
        }

        var json = await response.Content.ReadAsStringAsync(ct);
        var parsed = JsonNode.Parse(json);
        var items = parsed?["items"]?.AsArray();

        if (items == null || items.Count == 0)
        {
            return new List<LearningResource>();
        }

        var resources = new List<LearningResource>();
        foreach (var item in items)
        {
            var videoId = item?["id"]?["videoId"]?.GetValue<string>();
            var title = item?["snippet"]?["title"]?.GetValue<string>() ?? $"{skill} Architecture";
            var channelTitle = item?["snippet"]?["channelTitle"]?.GetValue<string>() ?? "Technical Channel";
            var thumb = item?["snippet"]?["thumbnails"]?["high"]?["url"]?.GetValue<string>() ?? "";

            if (!string.IsNullOrWhiteSpace(videoId))
            {
                resources.Add(new LearningResource(
                    Title: System.Net.WebUtility.HtmlDecode(title),
                    Provider: "YouTube",
                    Author: channelTitle,
                    Duration: "Video Deep Dive",
                    Url: $"https://www.youtube.com/watch?v={videoId}",
                    ThumbnailUrl: thumb,
                    Badge: "YouTube Data API v3"
                ));
            }
        }

        return resources;
    }

    private static List<LearningResource> GetCuratedResources(string skill)
    {
        var lower = skill.ToLowerInvariant();

        if (lower.Contains(".net") || lower.Contains("c#") || lower.Contains("minimal api"))
        {
            return new List<LearningResource>
            {
                new(
                    Title: "Deep Dive: ASP.NET Core Minimal APIs & Native AOT Compilation",
                    Provider: "YouTube",
                    Author: "Nick Chapsas",
                    Duration: "28 mins",
                    Url: "https://www.youtube.com/watch?v=F086rYx5yU8",
                    ThumbnailUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80",
                    Badge: "Top Architecture"
                ),
                new(
                    Title: "Enterprise Microservices with .NET Minimal APIs & EF Core",
                    Provider: "Udemy",
                    Author: "Milan Jovanović",
                    Duration: "14.5 hours",
                    Url: "https://www.udemy.com",
                    ThumbnailUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80",
                    Badge: "Best Seller"
                ),
                new(
                    Title: "Building Resilient High-Throughput APIs with Modern C#",
                    Provider: "YouTube",
                    Author: "dotnet",
                    Duration: "42 mins",
                    Url: "https://www.youtube.com/watch?v=4dJ6kLzQ_7o",
                    ThumbnailUrl: "https://images.unsplash.com/photo-1516116211227-bbc80e9275b6?w=400&q=80",
                    Badge: "Official Microsoft"
                )
            };
        }

        if (lower.Contains("yarp") || lower.Contains("proxy") || lower.Contains("gateway"))
        {
            return new List<LearningResource>
            {
                new(
                    Title: "YARP: Architecture, Performance Benchmarks & Zero-Downtime Routing",
                    Provider: "YouTube",
                    Author: "Gui Ferreira",
                    Duration: "22 mins",
                    Url: "https://www.youtube.com/watch?v=kY67vK9u8tY",
                    ThumbnailUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&q=80",
                    Badge: "Gateway Recommended"
                ),
                new(
                    Title: "Microservices Gateway Patterns with YARP in Azure App Services",
                    Provider: "Udemy",
                    Author: "Code With Muk",
                    Duration: "6.5 hours",
                    Url: "https://www.udemy.com",
                    ThumbnailUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80",
                    Badge: "Deep Dive"
                ),
                new(
                    Title: "Rate Limiting, Header Transforms & Distributed Auth with YARP",
                    Provider: "YouTube",
                    Author: "Raw Coding",
                    Duration: "18 mins",
                    Url: "https://www.youtube.com/watch?v=s0P1oGqK9jM",
                    ThumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80",
                    Badge: "Quick Start"
                )
            };
        }

        if (lower.Contains("garmin") || lower.Contains("fit") || lower.Contains("geo") || lower.Contains("leaflet") || lower.Contains("gps"))
        {
            return new List<LearningResource>
            {
                new(
                    Title: "Decoding Garmin FIT Binary Files into GPS Polylines & Elevation",
                    Provider: "YouTube",
                    Author: "Geospatial Engineering Labs",
                    Duration: "34 mins",
                    Url: "https://www.youtube.com/watch?v=jK329u8xP10",
                    ThumbnailUrl: "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=400&q=80",
                    Badge: "Telemetry Series"
                ),
                new(
                    Title: "Interactive Leaflet & MapLibre Vector Layers with React",
                    Provider: "Udemy",
                    Author: "GIS Fullstack Academy",
                    Duration: "8.0 hours",
                    Url: "https://www.udemy.com",
                    ThumbnailUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&q=80",
                    Badge: "GIS Specialist"
                ),
                new(
                    Title: "High-Frequency GPX / FIT Export Microservices in C#",
                    Provider: "YouTube",
                    Author: "Cloud Data Streams",
                    Duration: "25 mins",
                    Url: "https://www.youtube.com/watch?v=mY91x0L3jP8",
                    ThumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80",
                    Badge: "Open Source"
                )
            };
        }

        // Generic fallback for any other skill
        return new List<LearningResource>
        {
            new(
                Title: $"Modern {skill}: Architecture, Best Practices & Patterns",
                Provider: "YouTube",
                Author: "FreeCodeCamp",
                Duration: "45 mins",
                Url: "https://www.youtube.com",
                ThumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80",
                Badge: "Curated Series"
            ),
            new(
                Title: $"Mastering {skill} for Senior Cloud Engineers",
                Provider: "Udemy",
                Author: "Enterprise Engineering",
                Duration: "10 hours",
                Url: "https://www.udemy.com",
                ThumbnailUrl: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&q=80",
                Badge: "Comprehensive"
            ),
            new(
                Title: $"{skill} Production Deep Dive & Benchmarks",
                Provider: "YouTube",
                Author: "TechLead",
                Duration: "20 mins",
                Url: "https://www.youtube.com",
                ThumbnailUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
                Badge: "Recommended"
            )
        };
    }
}
