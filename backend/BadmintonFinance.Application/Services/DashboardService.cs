using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly DbContext _db;
    private readonly IFundService _fund;
    public DashboardService(DbContext db, IFundService fund) { _db = db; _fund = fund; }

    public async Task<DashboardStatsDto> GetStatsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddSeconds(-1);

        var fund = await _fund.GetMainAsync(ct);

        var monthSessions = await _db.Set<BadmintonSession>().AsNoTracking()
            .Where(s => s.PlayDate >= monthStart && s.PlayDate <= monthEnd)
            .ToListAsync(ct);

        var debtors = await _db.Set<BadmintonPlayer>().AsNoTracking()
            .Where(p => p.CurrentDebt > 0)
            .OrderByDescending(p => p.CurrentDebt)
            .Take(10)
            .Select(p => new DebtSummaryDto
            {
                PlayerId = p.Id, PlayerName = p.FullName, PhoneNumber = p.PhoneNumber,
                TotalDebt = p.CurrentDebt,
                UnpaidSessionCount = p.Participations.Count(x => x.PaymentStatus != PaymentStatus.Paid && x.PaymentStatus != PaymentStatus.OverPaid)
            }).ToListAsync(ct);

        var totalDebt = await _db.Set<BadmintonPlayer>().AsNoTracking()
            .Where(p => p.CurrentDebt > 0).SumAsync(p => (decimal?)p.CurrentDebt, ct) ?? 0;
        var debtorCount = await _db.Set<BadmintonPlayer>().AsNoTracking()
            .CountAsync(p => p.CurrentDebt > 0, ct);

        // 6-month series
        var seriesStart = new DateTime(now.Year, now.Month, 1).AddMonths(-5);
        var sessions6m = await _db.Set<BadmintonSession>().AsNoTracking()
            .Where(s => s.PlayDate >= seriesStart)
            .Select(s => new { s.PlayDate, s.TotalIncome, s.TotalExpense })
            .ToListAsync(ct);

        var series = new List<MonthlySeriesPoint>();
        for (var m = 0; m < 6; m++)
        {
            var dt = seriesStart.AddMonths(m);
            var income = sessions6m.Where(s => s.PlayDate.Year == dt.Year && s.PlayDate.Month == dt.Month).Sum(s => s.TotalIncome);
            var expense = sessions6m.Where(s => s.PlayDate.Year == dt.Year && s.PlayDate.Month == dt.Month).Sum(s => s.TotalExpense);
            series.Add(new MonthlySeriesPoint
            {
                Label = $"{dt:MM/yyyy}", Year = dt.Year, Month = dt.Month,
                Income = income, Expense = expense, Net = income - expense
            });
        }

        var recent = await _db.Set<BadmintonSession>().AsNoTracking()
            .Include(s => s.Court)
            .OrderByDescending(s => s.PlayDate).Take(5)
            .Select(s => new SessionDto
            {
                Id = s.Id, Title = s.Title, CourtId = s.CourtId, CourtName = s.Court!.Name,
                PlayDate = s.PlayDate, Status = s.Status,
                TotalIncome = s.TotalIncome, TotalExpense = s.TotalExpense, Balance = s.Balance,
                ParticipantCount = s.Participants.Count
            }).ToListAsync(ct);

        return new DashboardStatsDto
        {
            FundBalance = fund.CurrentBalance,
            MonthIncome = monthSessions.Sum(s => s.TotalIncome),
            MonthExpense = monthSessions.Sum(s => s.TotalExpense),
            MonthNet = monthSessions.Sum(s => s.Balance),
            MonthSessionCount = monthSessions.Count,
            TotalDebtors = debtorCount,
            TotalDebt = totalDebt,
            IncomeExpenseSeries = series,
            RecentSessions = recent,
            TopDebtors = debtors
        };
    }
}
