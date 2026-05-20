using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Domain.Entities;

public class BadmintonSession : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public Guid CourtId { get; set; }
    public BadmintonCourt? Court { get; set; }
    public DateTime PlayDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int CourtCount { get; set; } = 1;

    public Guid? PricingTemplateId { get; set; }
    public PricingTemplate? PricingTemplate { get; set; }
    /// <summary>Snapshot of template's Mode at session-create time. Independent of later template edits.</summary>
    public PricingMode PricingMode { get; set; } = PricingMode.WeightedSlot;

    public SessionStatus Status { get; set; } = SessionStatus.Draft;
    public DateTime? ClosedAt { get; set; }
    public Guid? ClosedBy { get; set; }
    public string? ReopenReason { get; set; }
    public int ReopenCount { get; set; }

    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal Balance { get; set; }
    public decimal FeePerSlot { get; set; }
    public int TotalSlots { get; set; }

    public string? Note { get; set; }

    public ICollection<BadmintonSessionParticipant> Participants { get; set; } = new List<BadmintonSessionParticipant>();
    public ICollection<BadmintonTransaction> Transactions { get; set; } = new List<BadmintonTransaction>();
}
