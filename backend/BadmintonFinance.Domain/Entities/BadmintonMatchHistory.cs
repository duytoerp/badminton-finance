using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Domain.Entities;

/// <summary>
/// One played set/match within a <see cref="BadmintonSession"/>. Records who played on each side
/// and the optional score. Independent of the match planner — players log results as games finish.
/// </summary>
public class BadmintonMatchHistory : BaseEntity
{
    public Guid SessionId { get; set; }
    public BadmintonSession? Session { get; set; }

    /// <summary>Sequential number within the session, 1-based. Assigned at create time.</summary>
    public int MatchNumber { get; set; }

    /// <summary>CSV of player Guids on team 1 (typically 2 for doubles).</summary>
    public string Team1PlayerIds { get; set; } = string.Empty;
    /// <summary>CSV of player Guids on team 2.</summary>
    public string Team2PlayerIds { get; set; } = string.Empty;

    public int? Team1Score { get; set; }
    public int? Team2Score { get; set; }

    /// <summary>Legacy "played at" timestamp. For new records this is set when status flips to Finished.</summary>
    public DateTime PlayedAt { get; set; } = DateTime.UtcNow;

    public MatchStatus Status { get; set; } = MatchStatus.Finished;

    /// <summary>Set when match starts (either as InProgress or directly created Finished).</summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>Set when match transitions to Finished. Null while InProgress.</summary>
    public DateTime? FinishedAt { get; set; }

    /// <summary>Free-form label, e.g. "Ván 3 · sân 1" from the planner.</summary>
    public string? Label { get; set; }
    public string? Note { get; set; }
}
