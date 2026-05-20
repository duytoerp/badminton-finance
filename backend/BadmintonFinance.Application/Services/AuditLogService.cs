using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class AuditLogService : IAuditLogService
{
    private readonly DbContext _db;
    public AuditLogService(DbContext db) { _db = db; }

    public async Task<PagedResult<AuditLogDto>> ListAsync(AuditLogQuery q, CancellationToken ct = default)
    {
        var query = _db.Set<AuditLog>().AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.EntityName))
            query = query.Where(x => x.EntityName == q.EntityName);
        if (!string.IsNullOrWhiteSpace(q.Action))
            query = query.Where(x => x.Action == q.Action);
        if (q.From.HasValue) query = query.Where(x => x.CreatedAt >= q.From.Value);
        if (q.To.HasValue) query = query.Where(x => x.CreatedAt <= q.To.Value);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLower();
            query = query.Where(x =>
                (x.UserName != null && x.UserName.ToLower().Contains(s)) ||
                (x.Reason != null && x.Reason.ToLower().Contains(s)) ||
                x.EntityId.Contains(s));
        }

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(x => new AuditLogDto
            {
                Id = x.Id, EntityName = x.EntityName, EntityId = x.EntityId,
                Action = x.Action, OldValue = x.OldValue, NewValue = x.NewValue,
                Reason = x.Reason, UserName = x.UserName, IpAddress = x.IpAddress,
                CreatedAt = x.CreatedAt
            }).ToListAsync(ct);

        return new PagedResult<AuditLogDto> { Items = items, Total = total, Page = q.Page, PageSize = q.PageSize };
    }
}
