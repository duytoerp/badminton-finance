using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.DTOs;

public class SessionDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public Guid CourtId { get; set; }
    public string? CourtName { get; set; }
    public DateTime PlayDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int CourtCount { get; set; }
    public Guid? PricingTemplateId { get; set; }
    public string? PricingTemplateName { get; set; }
    public PricingMode PricingMode { get; set; } = PricingMode.WeightedSlot;
    public SessionStatus Status { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal Balance { get; set; }
    public decimal FeePerSlot { get; set; }
    public int TotalSlots { get; set; }
    public int ParticipantCount { get; set; }
    public string? Note { get; set; }
}

public class SessionDetailDto : SessionDto
{
    public List<ParticipantDto> Participants { get; set; } = new();
    public List<TransactionDto> Transactions { get; set; } = new();
}

public class CreateSessionDto
{
    public string Title { get; set; } = string.Empty;
    public Guid CourtId { get; set; }
    public DateTime PlayDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int CourtCount { get; set; } = 1;
    public Guid? PricingTemplateId { get; set; }   // null → use default
    public string? Note { get; set; }
}

public class CloseSessionDto
{
    public Guid SessionId { get; set; }
}

public class ReopenSessionDto
{
    public Guid SessionId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class ParticipantDto
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public string? PlayerPhone { get; set; }
    public Gender? Gender { get; set; }
    public SkillLevel? SkillLevel { get; set; }
    public int SlotCount { get; set; }
    public decimal Multiplier { get; set; } = 1.0m;
    public decimal FixedAmount { get; set; }
    public decimal AmountDue { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal Debt { get; set; }
    public PaymentStatus PaymentStatus { get; set; }
    public bool IsGuest { get; set; }
    public string? Note { get; set; }

    /// <summary>Set when the player has physically arrived at the court. Null = not checked in.</summary>
    public DateTime? CheckedInAt { get; set; }

    public Guid? JoinedViaGroupId { get; set; }
    public string? JoinedViaGroupName { get; set; }
    public PlayerGroupType? JoinedViaGroupType { get; set; }
}

public class AddParticipantDto
{
    public Guid SessionId { get; set; }
    public Guid PlayerId { get; set; }
    public int SlotCount { get; set; } = 1;
    public string? Note { get; set; }
}

public class AddParticipantsBulkDto
{
    public Guid SessionId { get; set; }
    public List<Guid> PlayerIds { get; set; } = new();
    public int SlotCount { get; set; } = 1;
    /// <summary>If true, also add inactive players. Defaults to false (they get skipped).</summary>
    public bool IncludeInactive { get; set; }
}

public class AddParticipantsBulkResultDto
{
    public int Added { get; set; }
    public int SkippedDuplicate { get; set; }
    public int SkippedInactive { get; set; }
    public List<Guid> AddedPlayerIds { get; set; } = new();
    public int ParticipantCount { get; set; }
    public int TotalSlots { get; set; }
}

public class UpdateParticipantDto
{
    public Guid ParticipantId { get; set; }
    public int SlotCount { get; set; }
    public string? Note { get; set; }
}

public class TransactionDto
{
    public Guid Id { get; set; }
    public Guid? SessionId { get; set; }
    public Guid? PlayerId { get; set; }
    public string? PlayerName { get; set; }
    public TransactionType TransactionType { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; }
}

public class CreateExpenseDto
{
    public Guid SessionId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
}

/// <summary>Toggle a single participant's check-in state.</summary>
public class CheckInParticipantDto
{
    public Guid ParticipantId { get; set; }
    /// <summary>true = mark checked-in (now), false = clear check-in.</summary>
    public bool CheckedIn { get; set; } = true;
}

public class CheckInAllResultDto
{
    public int CheckedIn { get; set; }
    public int AlreadyCheckedIn { get; set; }
    public int TotalParticipants { get; set; }
}

public class QuickPaymentDto
{
    public Guid SessionId { get; set; }
    public Guid PlayerId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? Note { get; set; }
}
