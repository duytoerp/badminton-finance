using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class ReportService : IReportService
{
    private readonly DbContext _db;
    private readonly IFundService _fund;
    public ReportService(DbContext db, IFundService fund) { _db = db; _fund = fund; }

    public async Task<FinanceReportDto> GetReportAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        var sessions = await _db.Set<BadmintonSession>().AsNoTracking()
            .Include(s => s.Court)
            .Where(s => s.PlayDate >= from && s.PlayDate <= to)
            .OrderByDescending(s => s.PlayDate)
            .ToListAsync(ct);

        var totalIncome = sessions.Sum(s => s.TotalIncome);
        var totalExpense = sessions.Sum(s => s.TotalExpense);
        var fund = await _fund.GetMainAsync(ct);

        var debts = await GetDebtsAsync(ct);

        return new FinanceReportDto
        {
            FromDate = from, ToDate = to,
            TotalIncome = totalIncome, TotalExpense = totalExpense,
            NetBalance = totalIncome - totalExpense,
            FundBalance = fund.CurrentBalance,
            SessionCount = sessions.Count,
            Sessions = sessions.Select(s => new SessionDto
            {
                Id = s.Id, Title = s.Title, CourtId = s.CourtId, CourtName = s.Court?.Name,
                PlayDate = s.PlayDate, Status = s.Status,
                TotalIncome = s.TotalIncome, TotalExpense = s.TotalExpense, Balance = s.Balance,
                FeePerSlot = s.FeePerSlot, TotalSlots = s.TotalSlots
            }).ToList(),
            TopDebtors = debts.Take(10).ToList()
        };
    }

    public async Task<IEnumerable<DebtSummaryDto>> GetDebtsAsync(CancellationToken ct = default)
    {
        return await _db.Set<BadmintonPlayer>().AsNoTracking()
            .Where(p => p.CurrentDebt > 0)
            .OrderByDescending(p => p.CurrentDebt)
            .Select(p => new DebtSummaryDto
            {
                PlayerId = p.Id,
                PlayerName = p.FullName,
                PhoneNumber = p.PhoneNumber,
                TotalDebt = p.CurrentDebt,
                UnpaidSessionCount = p.Participations.Count(x => x.PaymentStatus != PaymentStatus.Paid && x.PaymentStatus != PaymentStatus.OverPaid)
            }).ToListAsync(ct);
    }
}
