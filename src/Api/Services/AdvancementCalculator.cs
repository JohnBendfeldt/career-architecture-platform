using CareerPlatform.Api.Data;
using CareerPlatform.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerPlatform.Api.Services;

/// <summary>
/// Pure career advancement calculation, validation, and goal rollup helper.
/// Mirrors ProgressCalculationHelper and CareerDevelopmentValidationHelper.
/// </summary>
public static class AdvancementCalculator
{
    public static decimal CalculatePercentComplete(decimal completedHours, decimal goalHours)
    {
        if (goalHours <= 0m)
        {
            return 0m;
        }

        return Math.Round((completedHours / goalHours) * 100m, 2);
    }

    public static (decimal ExpectedPercent, string QuarterLabel) GetQuarterlyCheckpoint(DateTime currentDateUtc, int year)
    {
        if (year < currentDateUtc.Year)
        {
            return (100m, $"FY {year} • Completed Year");
        }

        if (year > currentDateUtc.Year)
        {
            return (0m, $"FY {year} • Upcoming");
        }

        var q1End = new DateTime(year, 3, 31, 23, 59, 59, DateTimeKind.Utc);
        var q2End = new DateTime(year, 6, 30, 23, 59, 59, DateTimeKind.Utc);
        var q3End = new DateTime(year, 9, 30, 23, 59, 59, DateTimeKind.Utc);

        if (currentDateUtc <= q1End)
        {
            return (0m, "Q1 • Building Momentum");
        }

        if (currentDateUtc <= q2End)
        {
            return (25m, "Q2 • 25% Checkpoint");
        }

        if (currentDateUtc <= q3End)
        {
            return (50m, "Q3 • 50% Checkpoint");
        }

        return (75m, "Q4 • 75% Checkpoint");
    }

    public static bool IsOnTrack(decimal percentComplete, DateTime currentDateUtc, int year)
    {
        var (expectedPercent, _) = GetQuarterlyCheckpoint(currentDateUtc, year);
        return percentComplete >= expectedPercent;
    }

    public static string? ValidateEntry(CreateCareerEntryRequest req, DateTime? utcNow = null)
    {
        var trimmedTitle = (req.Title ?? string.Empty).Trim();
        if (trimmedTitle.Length < 2 || trimmedTitle.Length > 200)
        {
            return "Title must be between 2 and 200 characters.";
        }

        if (req.Description?.Length > 2000)
        {
            return "Description must be 2,000 characters or fewer.";
        }

        if (req.Hours < 0.01m || req.Hours > 999.99m)
        {
            return "Hours must be between 0.01 and 999.99.";
        }

        if (req.StartDate.Date > req.EndDate.Date)
        {
            return "Start date cannot be after end date.";
        }

        var now = utcNow ?? DateTime.UtcNow;
        var validOffset = req.ClientUtcOffsetMinutes is >= -720 and <= 840
            ? req.ClientUtcOffsetMinutes.Value
            : 0;
        var clientToday = now.AddMinutes(validOffset).Date;

        if (req.EndDate.Date > clientToday)
        {
            return "End date cannot be in the future.";
        }

        return null;
    }

    public static async Task RecalculateGoalProgressAsync(AppDbContext db, int goalId)
    {
        var goal = await db.Goals.FindAsync(goalId);
        if (goal is null || !goal.TargetHours.HasValue || goal.TargetHours.Value <= 0m)
        {
            return;
        }

        // Materialize decimal Hours before summing because EF Core SQLite cannot translate decimal SUM in SQL.
        var hoursList = await db.CareerDevelopmentEntries
            .AsNoTracking()
            .Where(e => e.GoalId == goalId)
            .Select(e => e.Hours)
            .ToListAsync();

        var totalHours = hoursList.Sum();
        var pct = (int)Math.Clamp(Math.Round((totalHours / goal.TargetHours.Value) * 100m), 0m, 100m);

        goal.Progress = pct;
        goal.Status = pct >= 100
            ? "Completed"
            : (pct == 0 && goal.Status == "Upcoming" ? "Upcoming" : "InProgress");

        await db.SaveChangesAsync();
    }
}
