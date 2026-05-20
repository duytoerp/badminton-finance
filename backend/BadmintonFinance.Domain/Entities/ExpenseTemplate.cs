using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Domain.Entities;

/// <summary>
/// Reusable list of default expense lines applied to court bookings (and the sessions they generate).
/// Each item resolves to a single Expense transaction at session-create time.
/// </summary>
public class ExpenseTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<ExpenseTemplateItem> Items { get; set; } = new List<ExpenseTemplateItem>();
}

public class ExpenseTemplateItem : BaseEntity
{
    public Guid ExpenseTemplateId { get; set; }
    public ExpenseTemplate? ExpenseTemplate { get; set; }

    public string Name { get; set; } = string.Empty;
    public ExpenseCalculationType CalculationType { get; set; } = ExpenseCalculationType.FixedAmount;

    /// <summary>
    /// Semantic depends on CalculationType:
    ///   FixedAmount        → the amount itself
    ///   CourtHourlyRate    → ignored (uses Court.DefaultHourlyRate at apply time)
    ///   PerHour            → amount per hour
    ///   PerCourt           → amount per court
    ///   PerHourPerCourt    → amount per (hour × court)
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>Display order (ascending).</summary>
    public int SortOrder { get; set; }
}
