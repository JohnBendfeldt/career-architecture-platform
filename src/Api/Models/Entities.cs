namespace CareerPlatform.Api.Models;

public class Profile
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Headline { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string GithubUrl { get; set; } = string.Empty;
    public string LinkedinUrl { get; set; } = string.Empty;
    public string WebsiteUrl { get; set; } = "https://johnbendfeldt.com";
    public string LiveProjectUrl { get; set; } = "https://basicrussian.org";
    public string SkillsJson { get; set; } = "[]";
    public int ExperienceYears { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Goal
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "Technical"; // "Technical" or "Personal"
    public int Progress { get; set; } // 0 - 100
    public string TargetDate { get; set; } = string.Empty;
    public string Status { get; set; } = "InProgress"; // "InProgress", "Completed", "Upcoming"
    public string TagsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public record GuestAuthResponse(string Token, UserDto User);
public record UserDto(string Id, string Name, string Email, string Role, string AvatarUrl);
public record CreateGoalRequest(string Title, string Description, string Category, int Progress, string TargetDate, string Status, List<string> Tags);
