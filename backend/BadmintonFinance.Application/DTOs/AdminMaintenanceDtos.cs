namespace BadmintonFinance.Application.DTOs;

/// <summary>
/// Wipe transactional data (sessions, players, groups, court bookings, fund transactions, etc.).
/// Master data is preserved: users/roles, courts, pricing templates, expense templates, system config.
/// Caller must supply the exact <see cref="Confirmation"/> phrase to prevent accidents.
/// </summary>
public class WipeTransactionalDto
{
    /// <summary>Must equal <c>XOA TAT CA</c> (case-sensitive) for the action to proceed.</summary>
    public string Confirmation { get; set; } = string.Empty;

    /// <summary>Optional human reason — stored in the post-wipe audit log entry.</summary>
    public string? Reason { get; set; }
}

public class WipeTransactionalResultDto
{
    public DateTime ExecutedAt { get; set; }
    public Dictionary<string, int> Counts { get; set; } = new();
    public int TotalRowsDeleted { get; set; }
}
