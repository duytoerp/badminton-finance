using System.Globalization;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class CourtBookingService : ICourtBookingService
{
    private readonly DbContext _db;
    private readonly IPricingService _pricing;
    private readonly IExpenseTemplateService _expense;
    private readonly IAuditLogger _audit;

    public CourtBookingService(DbContext db, IPricingService pricing, IExpenseTemplateService expense, IAuditLogger audit)
    {
        _db = db; _pricing = pricing; _expense = expense; _audit = audit;
    }

    public async Task<IEnumerable<CourtBookingDto>> ListAsync(CancellationToken ct = default)
        => await _db.Set<CourtBooking>().AsNoTracking()
            .Include(b => b.Court)
            .Include(b => b.PricingTemplate)
            .Include(b => b.ExpenseTemplate)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => ToDto(b)).ToListAsync(ct);

    public async Task<CourtBookingDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var b = await _db.Set<CourtBooking>().AsNoTracking()
            .Include(x => x.Court).Include(x => x.PricingTemplate).Include(x => x.ExpenseTemplate)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException(nameof(CourtBooking), id);
        return ToDto(b);
    }

    public async Task<CourtBookingPreviewDto> PreviewAsync(CreateCourtBookingDto dto, CancellationToken ct = default)
    {
        var dates = ExpandDates(dto);
        var preview = new CourtBookingPreviewDto { Count = dates.Count, Dates = dates };

        if (dto.CourtId != Guid.Empty && dates.Count > 0)
        {
            var resolved = await _expense.ResolveAsync(
                dto.ExpenseTemplateId, dto.CourtId, dto.StartTime, dto.EndTime, dto.CourtCount, ct);
            preview.EstimatedExpense = resolved;
            preview.EstimatedTotalExpense = resolved.Total * dates.Count;
        }
        return preview;
    }

    public async Task<CourtBookingDto> CreateAsync(CreateCourtBookingDto dto, CancellationToken ct = default)
    {
        var court = await _db.Set<BadmintonCourt>().FindAsync(new object[] { dto.CourtId }, ct)
                    ?? throw new NotFoundException(nameof(BadmintonCourt), dto.CourtId);

        var dates = ExpandDates(dto);
        if (dates.Count == 0)
            throw new BusinessRuleException("BOOKING_EMPTY", "Không có ngày nào khớp với cấu hình lặp lại.");

        var templateId = dto.PricingTemplateId;
        if (templateId == null)
        {
            var def = await _pricing.GetDefaultAsync(ct);
            templateId = def?.Id;
        }
        var mode = await _pricing.GetModeAsync(templateId, ct);

        // Resolve expense template (caller's choice, else system default)
        var expense = await _expense.ResolveAsync(
            dto.ExpenseTemplateId, dto.CourtId, dto.StartTime, dto.EndTime, dto.CourtCount, ct);

        var fromDate = dates.Min().Date;
        var toDate = dates.Max().Date;

        var booking = new CourtBooking
        {
            Title = dto.Title.Trim(),
            CourtId = dto.CourtId,
            RecurrenceType = dto.RecurrenceType,
            Pattern = dto.Pattern.Trim(),
            FromDate = fromDate,
            ToDate = toDate,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            CourtCount = dto.CourtCount,
            PricingTemplateId = templateId,
            ExpenseTemplateId = expense.ExpenseTemplateId,
            Note = dto.Note,
            GeneratedSessionCount = dates.Count
        };
        _db.Add(booking);

        foreach (var d in dates)
        {
            var session = new BadmintonSession
            {
                Title = $"{booking.Title} – {d:dd/MM/yyyy}",
                CourtId = dto.CourtId,
                BookingId = booking.Id,
                PlayDate = d.Date,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                CourtCount = dto.CourtCount,
                PricingTemplateId = templateId,
                PricingMode = mode,
                Status = SessionStatus.Draft,
                Note = dto.Note
            };
            booking.Sessions.Add(session);
            _db.Add(session);

            // Auto-create expense transactions from template
            foreach (var line in expense.Lines.Where(l => l.Amount > 0))
            {
                _db.Add(new BadmintonTransaction
                {
                    SessionId = session.Id,
                    TransactionType = TransactionType.Expense,
                    PaymentMethod = PaymentMethod.Cash,
                    Amount = line.Amount,
                    Description = line.Name,
                    TransactionDate = DateTime.UtcNow
                });
            }
            // Cache the total so list views show the right number until first participant is added.
            session.TotalExpense = expense.Total;
            session.Balance = -expense.Total;
        }

        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(nameof(CourtBooking), booking.Id.ToString(), "Create",
            null, new
            {
                booking.RecurrenceType, booking.Pattern, booking.FromDate, booking.ToDate,
                booking.GeneratedSessionCount,
                ExpenseTemplate = expense.ExpenseTemplateName,
                EstimatedExpensePerSession = expense.Total,
                EstimatedTotal = expense.Total * dates.Count
            }, null, ct);

        booking.Court = court;
        if (expense.ExpenseTemplateId.HasValue)
        {
            booking.ExpenseTemplate = await _db.Set<ExpenseTemplate>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == expense.ExpenseTemplateId.Value, ct);
        }
        return ToDto(booking);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var b = await _db.Set<CourtBooking>().FindAsync(new object[] { id }, ct)
                ?? throw new NotFoundException(nameof(CourtBooking), id);
        b.IsDeleted = true;
        b.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(nameof(CourtBooking), b.Id.ToString(), "Delete", null, null, null, ct);
    }

    // ---- helpers ----

    /// <summary>
    /// Compute the concrete play dates for a booking. Pure function — no DB access. Used by both PreviewAsync and CreateAsync.
    /// </summary>
    public static List<DateTime> ExpandDates(CreateCourtBookingDto dto)
    {
        var pat = (dto.Pattern ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(pat)) return new();

        switch (dto.RecurrenceType)
        {
            case BookingRecurrenceType.SingleDates:
                return pat.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(s => DateTime.TryParseExact(s, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : (DateTime?)null)
                    .Where(d => d.HasValue).Select(d => d!.Value.Date)
                    .Distinct().OrderBy(d => d).ToList();

            case BookingRecurrenceType.MonthlyByWeekday:
            {
                if (!dto.FromDate.HasValue || !dto.ToDate.HasValue) return new();
                var weekdays = pat.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(s => int.TryParse(s, out var n) ? n : -1)
                    .Where(n => n >= 0 && n <= 6).Distinct().ToHashSet();
                if (weekdays.Count == 0) return new();
                var result = new List<DateTime>();
                for (var d = dto.FromDate.Value.Date; d <= dto.ToDate.Value.Date; d = d.AddDays(1))
                    if (weekdays.Contains((int)d.DayOfWeek)) result.Add(d);
                return result;
            }

            case BookingRecurrenceType.MonthlyByDayOfMonth:
            {
                if (!dto.FromDate.HasValue || !dto.ToDate.HasValue) return new();
                var days = pat.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(s => int.TryParse(s, out var n) ? n : -1)
                    .Where(n => n >= 1 && n <= 31).Distinct().OrderBy(n => n).ToList();
                if (days.Count == 0) return new();
                var result = new List<DateTime>();
                var from = dto.FromDate.Value.Date;
                var to = dto.ToDate.Value.Date;
                var monthCursor = new DateTime(from.Year, from.Month, 1);
                while (monthCursor <= to)
                {
                    var dim = DateTime.DaysInMonth(monthCursor.Year, monthCursor.Month);
                    foreach (var dom in days)
                    {
                        if (dom > dim) continue;
                        var d = new DateTime(monthCursor.Year, monthCursor.Month, dom);
                        if (d >= from && d <= to) result.Add(d);
                    }
                    monthCursor = monthCursor.AddMonths(1);
                }
                return result.OrderBy(d => d).ToList();
            }

            default: return new();
        }
    }

    private static CourtBookingDto ToDto(CourtBooking b) => new()
    {
        Id = b.Id,
        Title = b.Title,
        CourtId = b.CourtId,
        CourtName = b.Court?.Name,
        RecurrenceType = b.RecurrenceType,
        Pattern = b.Pattern,
        FromDate = b.FromDate,
        ToDate = b.ToDate,
        StartTime = b.StartTime,
        EndTime = b.EndTime,
        CourtCount = b.CourtCount,
        PricingTemplateId = b.PricingTemplateId,
        PricingTemplateName = b.PricingTemplate?.Name,
        ExpenseTemplateId = b.ExpenseTemplateId,
        ExpenseTemplateName = b.ExpenseTemplate?.Name,
        Note = b.Note,
        GeneratedSessionCount = b.GeneratedSessionCount,
        CreatedAt = b.CreatedAt
    };
}
