using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.DTOs;

/// <summary>Lightweight row for the list view (no payload).</summary>
public class MatchPlanHistorySummaryDto
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public DateTime GeneratedAt { get; set; }
    public int Rounds { get; set; }
    public int CourtCount { get; set; }
    public MatchSkillMode SkillMode { get; set; }
    public bool OnlyCheckedIn { get; set; }
    public int PlayerCount { get; set; }
    public int CheckedInCount { get; set; }
    public string? Note { get; set; }
}

/// <summary>Full record including the saved <see cref="MatchPlanDto"/> payload.</summary>
public class MatchPlanHistoryDto : MatchPlanHistorySummaryDto
{
    public MatchPlanDto? Plan { get; set; }
}

public class SaveMatchPlanDto
{
    public Guid SessionId { get; set; }
    public MatchPlanDto Plan { get; set; } = new();
    public string? Note { get; set; }
}
