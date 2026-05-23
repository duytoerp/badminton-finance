using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Domain.Entities;

/// <summary>
/// A persisted snapshot of a <see cref="BadmintonMatchHistory"/>-style auto-generated plan.
/// The full plan payload (rounds, courts, teams) is stored as JSON for display, while top-level
/// fields make list views cheap. Saving is explicit — the planner endpoint itself is stateless.
/// </summary>
public class BadmintonMatchPlanHistory : BaseEntity
{
    public Guid SessionId { get; set; }
    public BadmintonSession? Session { get; set; }

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    public int Rounds { get; set; }
    public int CourtCount { get; set; }
    public MatchSkillMode SkillMode { get; set; }
    public bool OnlyCheckedIn { get; set; }
    public int PlayerCount { get; set; }
    public int CheckedInCount { get; set; }

    /// <summary>Full MatchPlanDto serialized as JSON. Read back to render the saved plan.</summary>
    public string PayloadJson { get; set; } = string.Empty;

    public string? Note { get; set; }
}
