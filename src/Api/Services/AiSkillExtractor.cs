using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace CareerPlatform.Api.Services;

public interface IAiSkillExtractor
{
    Task<List<string>> ExtractSkillsAsync(string text, CancellationToken ct = default);
}

public class AiSkillExtractor : IAiSkillExtractor
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<AiSkillExtractor> _logger;

    public AiSkillExtractor(HttpClient httpClient, IConfiguration config, ILogger<AiSkillExtractor> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public async Task<List<string>> ExtractSkillsAsync(string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return new List<string>();
        }

        var apiKey = _config["Gemini:ApiKey"] 
                     ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
                     ?? _config["AI:ApiKey"];

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var skillsFromGemini = await CallGeminiApiAsync(text, apiKey, ct);
                if (skillsFromGemini.Count > 0)
                {
                    return skillsFromGemini;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gemini API extraction failed, using deterministic fallback.");
            }
        }

        // Deterministic architectural extraction fallback
        return ExtractSkillsLocally(text);
    }

    private async Task<List<string>> CallGeminiApiAsync(string text, string apiKey, CancellationToken ct)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}";

        var prompt = "Extract all key technical skills, architectural concepts, languages, frameworks, and engineering tools from this text. Return a JSON object with a 'skills' string array.\nText:\n" + text;

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[] { new { text = prompt } }
                }
            },
            generationConfig = new
            {
                responseMimeType = "application/json",
                responseSchema = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        skills = new
                        {
                            type = "ARRAY",
                            items = new { type = "STRING" }
                        }
                    },
                    required = new[] { "skills" }
                }
            }
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync(url, content, ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gemini API returned status code {StatusCode}", response.StatusCode);
            return new List<string>();
        }

        var json = await response.Content.ReadAsStringAsync(ct);
        var parsed = JsonNode.Parse(json);
        var rawText = parsed?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.GetValue<string>();

        if (string.IsNullOrWhiteSpace(rawText))
        {
            return new List<string>();
        }

        var result = JsonNode.Parse(rawText);
        var skillsArray = result?["skills"]?.AsArray();

        if (skillsArray != null)
        {
            var list = skillsArray
                .Select(s => s?.GetValue<string>()?.Trim())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (list.Count > 0)
            {
                return list;
            }
        }

        return new List<string>();
    }

    private static List<string> ExtractSkillsLocally(string text)
    {
        var knownTaxonomy = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["C# .NET 10 Minimal APIs"] = new[] { ".net 10", "c#", ".net core", "minimal api", "minimal apis", "asp.net" },
            ["YARP Reverse Proxy"] = new[] { "yarp", "reverse proxy", "api gateway", "proxy" },
            ["React 19 & TypeScript"] = new[] { "react", "react 19", "typescript", "vite", "frontend" },
            ["Docker & Containerization"] = new[] { "docker", "container", "containers", "dockerfile", "docker-compose" },
            ["Kubernetes & Cloud Native"] = new[] { "kubernetes", "k8s", "helm", "aks", "cloud native" },
            ["Azure DevOps & CI/CD Pipelines"] = new[] { "azure devops", "ci/cd", "pipelines", "pipeline", "github actions" },
            ["Geospatial Garmin FIT Telemetry"] = new[] { "garmin", "fit file", ".fit", "geospatial", "gps", "gpx", "leaflet", "maplibre" },
            ["AI Agent & LLM Pipelines"] = new[] { "ai", "llm", "agent", "gemini", "antigravity", "openai", "embeddings" },
            ["Distributed Systems & Microservices"] = new[] { "distributed systems", "microservices", "event-driven", "consensus", "resilience" },
            ["Entity Framework Core & SQLite"] = new[] { "entity framework", "ef core", "sqlite", "sql", "postgres", "sql server" },
            ["Native AOT Compilation"] = new[] { "native aot", "aot compilation", "ahead-of-time", "performance" }
        };

        var extracted = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var (skill, aliases) in knownTaxonomy)
        {
            foreach (var alias in aliases)
            {
                if (Regex.IsMatch(text, $@"\b{Regex.Escape(alias)}\b", RegexOptions.IgnoreCase))
                {
                    extracted.Add(skill);
                    break;
                }
            }
        }

        if (extracted.Count == 0)
        {
            extracted.Add("C# .NET 10 Minimal APIs");
            extracted.Add("Distributed Systems");
            extracted.Add("Cloud Architecture");
        }

        return extracted.ToList();
    }
}
