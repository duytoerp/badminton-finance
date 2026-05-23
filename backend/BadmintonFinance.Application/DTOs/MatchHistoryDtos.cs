using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.DTOs;

public class MatchHistoryDto
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public int MatchNumber { get; set; }
    public List<MatchHistoryPlayerDto> Team1 { get; set; } = new();
    public List<MatchHistoryPlayerDto> Team2 { get; set; } = new();
    public int? Team1Score { get; set; }
    public int? Team2Score { get; set; }
    /// <summary>1 = team1 won, 2 = team2 won, null = no score recorded or tie.</summary>
    public int? WinnerTeam { get; set; }
    public MatchStatus Status { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public DateTime PlayedAt { get; set; }
    public string? Label { get; set; }
    public string? Note { get; set; }
}

public class MatchHistoryPlayerDto
{
    public Guid PlayerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public SkillLevel? SkillLevel { get; set; }
}

public class RecordMatchDto
{
    public Guid SessionId { get; set; }
    public List<Guid> Team1PlayerIds { get; set; } = new();
    public List<Guid> Team2PlayerIds { get; set; } = new();
    public int? Team1Score { get; set; }
    public int? Team2Score { get; set; }
    public string? Label { get; set; }
    public string? Note { get; set; }
    /// <summary>
    /// When true, the match is created as InProgress (no FinishedAt). Scores are saved if provided
    /// but the match still shows up under "trận đang diễn ra" until the caller invokes /finish.
    /// </summary>
    public bool StartOnly { get; set; }
}

/// <summary>Body of PUT /sessions/matches/{id}/finish — transitions an InProgress match to Finished.</summary>
public class FinishMatchDto
{
    public int? Team1Score { get; set; }
    public int? Team2Score { get; set; }
    public string? Note { get; set; }
}
