namespace CareerPlatform.Api.Models;

public record ExtractSkillsRequest(string Text);

public record ExtractSkillsResponse(List<string> Skills);

public record LearningResource(
    string Title,
    string Provider,
    string Author,
    string Duration,
    string Url,
    string ThumbnailUrl,
    string Badge
);

public record LearningResourcesResponse(string Skill, List<LearningResource> Resources);
