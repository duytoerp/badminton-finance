using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Domain.Entities;

public class BadmintonSessionParticipant : BaseEntity
{
    public Guid SessionId { get; set; }
    public BadmintonSession? Session { get; set; }
    public Guid PlayerId { get; set; }
    public BadmintonPlayer? Player { get; set; }

    public int SlotCount { get; set; } = 1;
    /// <summary>
    /// Pricing multiplier snapshot at add-time (1.0 = full slot fee).
    /// Computed from session's PricingTemplate and player's (Gender, SkillLevel).
    /// Frozen on the participant so later template edits don't retroactively change settled fees.
    /// </summary>
    public decimal Multiplier { get; set; } = 1.0m;
    /// <summary>Snapshot of FixedAmount-per-slot from template's rule at add-time (used when session mode = FixedAmount).</summary>
    public decimal FixedAmount { get; set; }
    public decimal AmountDue { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal Debt => AmountDue - AmountPaid;

    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public bool IsGuest { get; set; }
    public string? Note { get; set; }
}
