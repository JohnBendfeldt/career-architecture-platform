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
    public string LiveProjectUrl { get; set; } = "https://basiclanguage.school";
    public string SkillsJson { get; set; } = "[]";
    public int ExperienceYears { get; set; }
    public decimal AnnualGoalHours { get; set; } = 50.0m;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Goal
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "Technical"; // "Technical" or "Personal"
    public int Progress { get; set; } // 0 - 100
    public decimal? TargetHours { get; set; } // null = manual %, > 0 = auto-rollup from linked entries
    public string TargetDate { get; set; } = string.Empty;
    public string Status { get; set; } = "InProgress"; // "InProgress", "Completed", "Upcoming"
    public string TagsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

public class CareerDevelopmentEntry
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Hours { get; set; }
    public int? CategoryId { get; set; }
    public Category? CategoryNavigation { get; set; }
    public int? GoalId { get; set; }
    public Goal? GoalNavigation { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public record GuestAuthResponse(string Token, UserDto User);
public record UserDto(string Id, string Name, string Email, string Role, string AvatarUrl);
public record CreateGoalRequest(
    string Title,
    string Description,
    string Category,
    int Progress,
    string TargetDate,
    string Status,
    List<string> Tags,
    decimal? TargetHours = null
);

public record CreateCareerEntryRequest(
    string Title,
    string? Description,
    DateTime StartDate,
    DateTime EndDate,
    decimal Hours,
    int? CategoryId,
    int? GoalId,
    int? ClientUtcOffsetMinutes = null
);

public record UpdateAnnualGoalHoursRequest(decimal AnnualGoalHours);

public record CategoryDto(int Id, string Name, string Description, int DisplayOrder);

public record CareerEntryDto(
    int Id,
    string Title,
    string? Description,
    string StartDate,
    string EndDate,
    decimal Hours,
    int? CategoryId,
    string? Category,
    int? GoalId,
    string? GoalTitle,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record CareerEntriesListResponse(
    List<CareerEntryDto> Entries,
    decimal TotalHours,
    int TotalEntries,
    int Year
);

public record AnnualProgressDto(
    decimal AnnualGoalHours,
    decimal CompletedHours,
    decimal PercentComplete,
    int TotalEntries,
    int Year,
    bool IsOnTrack,
    decimal ExpectedProgressPercent,
    string QuarterLabel
);

public record ImportCareerEntryRowRequest(
    string Title,
    string? Description,
    DateTime StartDate,
    DateTime? EndDate,
    decimal Hours,
    string? Category = null,
    int? CategoryId = null,
    string? GoalTitle = null,
    int? GoalId = null
);

public record ImportCareerEntriesRequest(
    List<ImportCareerEntryRowRequest> Entries,
    int? ClientUtcOffsetMinutes = null
)
{
    public const int MaxRows = 50;
}

public record ImportCareerEntryRowResult(
    int RowNumber,
    string Title,
    decimal Hours,
    string StartDate,
    string EndDate,
    bool Success,
    int? EntryId = null,
    string? ErrorMessage = null,
    bool IsDuplicate = false
);

public record ImportCareerEntriesResponse(
    bool Success,
    string Message,
    int TotalRows,
    int SuccessCount,
    int ErrorCount,
    int DuplicateCount,
    List<ImportCareerEntryRowResult> Results
);
