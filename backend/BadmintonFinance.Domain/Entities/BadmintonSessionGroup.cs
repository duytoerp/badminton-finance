namespace BadmintonFinance.Domain.Entities;

/// <summary>
/// Records that a PlayerGroup was applied to a Session, with counts at the moment of application.
/// Used for audit / history (Lịch sử sử dụng nhóm).
/// </summary>
public class BadmintonSessionGroup : BaseEntity
{
    public Guid SessionId { get; set; }
    public BadmintonSession? Session { get; set; }

    public Guid PlayerGroupId { get; set; }
    public BadmintonPlayerGroup? PlayerGroup { get; set; }

    /// <summary>Snapshot of group name at apply time (groups can be renamed later).</summary>
    public string GroupNameSnapshot { get; set; } = string.Empty;

    public int MembersTotal { get; set; }
    public int MembersAdded { get; set; }
    public int MembersSkippedDuplicate { get; set; }
    public int MembersSkippedInactive { get; set; }

    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    public Guid? AppliedBy { get; set; }
}
