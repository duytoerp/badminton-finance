using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Domain.Entities;

/// <summary>
/// A recurring (or one-off) court reservation. On create, the service materialises a set of
/// <see cref="BadmintonSession"/> rows from <see cref="RecurrenceType"/> + <see cref="Pattern"/>.
/// </summary>
public class CourtBooking : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public Guid CourtId { get; set; }
    public BadmintonCourt? Court { get; set; }

    public BookingRecurrenceType RecurrenceType { get; set; }

    /// <summary>
    /// SingleDates: CSV of yyyy-MM-dd.
    /// MonthlyByWeekday: CSV of DayOfWeek ints (0=Sun..6=Sat).
    /// MonthlyByDayOfMonth: CSV of day-of-month ints 1..31.
    /// </summary>
    public string Pattern { get; set; } = string.Empty;

    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int CourtCount { get; set; } = 1;

    public Guid? PricingTemplateId { get; set; }
    public PricingTemplate? PricingTemplate { get; set; }

    public Guid? ExpenseTemplateId { get; set; }
    public ExpenseTemplate? ExpenseTemplate { get; set; }

    public string? Note { get; set; }

    /// <summary>Number of <see cref="BadmintonSession"/> rows generated at create time.</summary>
    public int GeneratedSessionCount { get; set; }

    public ICollection<BadmintonSession> Sessions { get; set; } = new List<BadmintonSession>();
}
