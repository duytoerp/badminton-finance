using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.DTOs;

/// <summary>
/// Request body for auto-generating a doubles match schedule for a session
/// (4 players per match, balanced by skill, even play time per player).
/// </summary>
public class GenerateMatchPlanDto
{
    public Guid SessionId { get; set; }

    /// <summary>Number of rounds to schedule. Each round runs CourtCount matches simultaneously.</summary>
    public int Rounds { get; set; } = 6;

    /// <summary>Courts available in parallel. Defaults to session's CourtCount if &lt;= 0.</summary>
    public int CourtCount { get; set; }

    /// <summary>
    /// How to balance skill within a single match (the 4 players already chosen for that court).
    /// Mixed = pair strongest+weakest vs the two middles ("snake" pairing — fair scores).
    /// Similar = group same-level players together so everyone plays at their own level.
    /// </summary>
    public MatchSkillMode SkillMode { get; set; } = MatchSkillMode.Mixed;

    /// <summary>Optional subset of participant IDs to include. Empty = all participants.</summary>
    public List<Guid> ParticipantIds { get; set; } = new();

    /// <summary>
    /// When true (default), only participants whose CheckedInAt has been set are eligible.
    /// If nobody is checked in, the planner falls back to all participants and adds a note.
    /// </summary>
    public bool OnlyCheckedIn { get; set; } = true;

    /// <summary>Random seed for reproducible shuffles. 0 = use time-based.</summary>
    public int Seed { get; set; }
}

public class MatchPlanDto
{
    public Guid SessionId { get; set; }
    public int Rounds { get; set; }
    public int CourtCount { get; set; }
    public MatchSkillMode SkillMode { get; set; }
    public int PlayerCount { get; set; }
    /// <summary>Total participants currently in the session (whether checked in or not).</summary>
    public int TotalParticipants { get; set; }
    /// <summary>Participants whose CheckedInAt is set (used when OnlyCheckedIn is true).</summary>
    public int CheckedInCount { get; set; }
    /// <summary>Echoes the request: did the planner restrict to checked-in only?</summary>
    public bool OnlyCheckedIn { get; set; }
    /// <summary>Number of players sitting out each round (0 if everyone plays every round).</summary>
    public int SitOutPerRound { get; set; }
    public List<MatchPlanPlayerDto> Players { get; set; } = new();
    public List<MatchRoundDto> RoundsPlan { get; set; } = new();
    /// <summary>Warning messages (e.g. "Cần tối thiểu 4 người", or "Số người không chia hết cho 4").</summary>
    public List<string> Notes { get; set; } = new();
}

public class MatchPlanPlayerDto
{
    public Guid PlayerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public SkillLevel? SkillLevel { get; set; }
    public Gender? Gender { get; set; }
    /// <summary>Number of matches this player is scheduled into across all rounds.</summary>
    public int GamesPlayed { get; set; }
}

public class MatchRoundDto
{
    public int Index { get; set; }
    public List<MatchCourtDto> Courts { get; set; } = new();
    /// <summary>Players sitting out this round (rests).</summary>
    public List<Guid> Resting { get; set; } = new();
}

public class MatchCourtDto
{
    /// <summary>1-based court index inside this round.</summary>
    public int CourtIndex { get; set; }
    public List<Guid> Team1 { get; set; } = new();
    public List<Guid> Team2 { get; set; } = new();
    /// <summary>Sum of skill levels (Beginner=0, Intermediate=1, Advanced=2) per team — used to gauge balance.</summary>
    public int Team1Skill { get; set; }
    public int Team2Skill { get; set; }
}
