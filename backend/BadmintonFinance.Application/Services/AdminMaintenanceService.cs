using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class AdminMaintenanceService : IAdminMaintenanceService
{
    public const string ConfirmationPhrase = "XOA TAT CA";

    private readonly DbContext _db;
    private readonly IAuditLogger _audit;

    public AdminMaintenanceService(DbContext db, IAuditLogger audit)
    {
        _db = db; _audit = audit;
    }

    public async Task<WipeTransactionalResultDto> WipeTransactionalAsync(WipeTransactionalDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(dto.Confirmation) || dto.Confirmation != ConfirmationPhrase)
            throw new BusinessRuleException("INVALID_CONFIRMATION",
                $"Vui lòng gõ chính xác '{ConfirmationPhrase}' để xác nhận xóa.");

        var counts = new Dictionary<string, int>();
        // Order matters: child rows first, then parents.
        // All in-progress query filters are bypassed since we use raw SQL on real tables.

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        counts["BadmintonTransaction"]        = await _db.Database.ExecuteSqlRawAsync("DELETE FROM [BadmintonTransaction]", ct);
        counts["BadmintonFundTransaction"]    = await _db.Database.ExecuteSqlRawAsync("DELETE FROM [BadmintonFundTransaction]", ct);
        counts["BadmintonSessionParticipant"] = await _db.Database.ExecuteSqlRawAsync("DELETE FROM [BadmintonSessionParticipant]", ct);
        counts["BadmintonSessionGroup"]       = await _db.Database.ExecuteSqlRawAsync("DELETE FROM [BadmintonSessionGroup]", ct);
        counts["BadmintonSession"]            = await _db.Database.ExecuteSqlRawAsync("DELETE FROM [BadmintonSession]", ct);
        counts["CourtBooking"]                = await _db.Database.ExecuteSqlRawAsync("DELETE FROM [CourtBooking]", ct);
        counts["BadmintonPlayerGroupMember"]  = await _db.Database.ExecuteSqlRawAsync("DELETE FROM [BadmintonPlayerGroupMember]", ct);
        counts["BadmintonPlayerGroup"]        = await _db.Database.ExecuteSqlRawAsync("DELETE FROM [BadmintonPlayerGroup]", ct);
        counts["BadmintonPlayer"]             = await _db.Database.ExecuteSqlRawAsync("DELETE FROM [BadmintonPlayer]", ct);

        // Reset all fund balances to zero (we keep the fund 'container' rows so the app still has a target fund).
        counts["BadmintonFund (reset balance)"] = await _db.Database.ExecuteSqlRawAsync(
            "UPDATE [BadmintonFund] SET [CurrentBalance] = 0", ct);

        await tx.CommitAsync(ct);

        var total = counts.Values.Sum();
        await _audit.LogAsync("System", "ALL", "WipeTransactional", null,
            new { counts, total }, dto.Reason, ct);

        return new WipeTransactionalResultDto
        {
            ExecutedAt = DateTime.UtcNow,
            Counts = counts,
            TotalRowsDeleted = total
        };
    }
}
