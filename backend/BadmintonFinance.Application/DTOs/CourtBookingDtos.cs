using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.DTOs;

public class CourtBookingDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public Guid CourtId { get; set; }
    public string? CourtName { get; set; }

    public BookingRecurrenceType RecurrenceType { get; set; }
    public string Pattern { get; set; } = string.Empty;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int CourtCount { get; set; }

    public Guid? PricingTemplateId { get; set; }
    public string? PricingTemplateName { get; set; }

    public Guid? ExpenseTemplateId { get; set; }
    public string? ExpenseTemplateName { get; set; }

    public string? Note { get; set; }
    public int GeneratedSessionCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCourtBookingDto
{
    public string Title { get; set; } = string.Empty;
    public Guid CourtId { get; set; }

    public BookingRecurrenceType RecurrenceType { get; set; }

    /// <summary>See <see cref="Domain.Entities.CourtBooking.Pattern"/>.</summary>
    public string Pattern { get; set; } = string.Empty;

    /// <summary>Required for MonthlyByWeekday / MonthlyByDayOfMonth. Ignored for SingleDates.</summary>
    public DateTime? FromDate { get; set; }
    /// <summary>Required for MonthlyByWeekday / MonthlyByDayOfMonth. Ignored for SingleDates.</summary>
    public DateTime? ToDate { get; set; }

    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int CourtCount { get; set; } = 1;

    public Guid? PricingTemplateId { get; set; }
    public Guid? ExpenseTemplateId { get; set; }
    public string? Note { get; set; }
}

public class CourtBookingPreviewDto
{
    public int Count { get; set; }
    public List<DateTime> Dates { get; set; } = new();
    public ResolvedExpensesDto? EstimatedExpense { get; set; }
    public decimal EstimatedTotalExpense { get; set; }
}
