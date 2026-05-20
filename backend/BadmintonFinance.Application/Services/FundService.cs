using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class FundService : IFundService
{
    private readonly DbContext _db;
    private readonly IAuditLogger _audit;
    public FundService(DbContext db, IAuditLogger audit) { _db = db; _audit = audit; }

    public async Task<FundDto> GetMainAsync(CancellationToken ct = default)
    {
        var f = await _db.Set<BadmintonFund>().FirstOrDefaultAsync(x => x.IsActive, ct);
        if (f == null)
        {
            f = new BadmintonFund { Name = "Quỹ chung", IsActive = true };
            _db.Add(f);
            await _db.SaveChangesAsync(ct);
        }
        return new FundDto { Id = f.Id, Name = f.Name, CurrentBalance = f.CurrentBalance, Description = f.Description, IsActive = f.IsActive };
    }

    public async Task<IEnumerable<FundTransactionDto>> GetTransactionsAsync(Guid fundId, int take = 100, CancellationToken ct = default)
        => await _db.Set<BadmintonFundTransaction>().AsNoTracking()
            .Where(x => x.FundId == fundId)
            .OrderByDescending(x => x.TransactionDate)
            .Take(take)
            .Select(x => new FundTransactionDto
            {
                Id = x.Id, FundId = x.FundId, SessionId = x.SessionId,
                FundTransactionType = x.FundTransactionType, Amount = x.Amount,
                BalanceBefore = x.BalanceBefore, BalanceAfter = x.BalanceAfter,
                Description = x.Description, TransactionDate = x.TransactionDate
            }).ToListAsync(ct);

    /// <summary>
    /// FundBalance = PreviousFundBalance + amount
    /// Used for both manual adjustments and session settlements.
    /// </summary>
    public async Task<FundDto> AdjustAsync(AdjustFundDto dto, CancellationToken ct = default)
    {
        var fund = await _db.Set<BadmintonFund>().FindAsync(new object[] { dto.FundId }, ct)
                   ?? throw new NotFoundException(nameof(BadmintonFund), dto.FundId);

        var before = fund.CurrentBalance;
        fund.CurrentBalance = before + dto.Amount;
        fund.UpdatedAt = DateTime.UtcNow;

        var ftx = new BadmintonFundTransaction
        {
            FundId = fund.Id,
            FundTransactionType = dto.Amount >= 0 ? FundTransactionType.Deposit : FundTransactionType.Withdraw,
            Amount = dto.Amount,
            BalanceBefore = before,
            BalanceAfter = fund.CurrentBalance,
            Description = dto.Reason
        };
        _db.Add(ftx);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(nameof(BadmintonFund), fund.Id.ToString(), "Adjust",
            new { Before = before }, new { After = fund.CurrentBalance }, dto.Reason, ct);

        return new FundDto { Id = fund.Id, Name = fund.Name, CurrentBalance = fund.CurrentBalance, Description = fund.Description, IsActive = fund.IsActive };
    }
}
