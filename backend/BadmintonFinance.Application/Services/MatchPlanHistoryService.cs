using System.Text.Json;
using System.Text.Json.Serialization;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class MatchPlanHistoryService : IMatchPlanHistoryService
{
    private readonly DbContext _db;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        Converters = { new JsonStringEnumConverter() },
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public MatchPlanHistoryService(DbContext db) { _db = db; }

    public async Task<MatchPlanHistorySummaryDto> SaveAsync(SaveMatchPlanDto dto, CancellationToken ct = default)
    {
        var sessionExists = await _db.Set<BadmintonSession>().AnyAsync(s => s.Id == dto.SessionId, ct);
        if (!sessionExists) throw new NotFoundException(nameof(BadmintonSession), dto.SessionId);

        if (dto.Plan?.RoundsPlan == null || dto.Plan.RoundsPlan.Count == 0)
            throw new BusinessRuleException("EMPTY_PLAN", "Phương án rỗng, không thể lưu.");

        var entity = new BadmintonMatchPlanHistory
        {
            SessionId = dto.SessionId,
            GeneratedAt = DateTime.UtcNow,
            Rounds = dto.Plan.Rounds,
            CourtCount = dto.Plan.CourtCount,
            SkillMode = dto.Plan.SkillMode,
            OnlyCheckedIn = dto.Plan.OnlyCheckedIn,
            PlayerCount = dto.Plan.PlayerCount,
            CheckedInCount = dto.Plan.CheckedInCount,
            PayloadJson = JsonSerializer.Serialize(dto.Plan, JsonOpts),
            Note = dto.Note
        };
        _db.Add(entity);
        await _db.SaveChangesAsync(ct);

        return ToSummary(entity);
    }

    public async Task<IEnumerable<MatchPlanHistorySummaryDto>> ListBySessionAsync(Guid sessionId, CancellationToken ct = default)
        => await _db.Set<BadmintonMatchPlanHistory>().AsNoTracking()
            .Where(x => x.SessionId == sessionId)
            .OrderByDescending(x => x.GeneratedAt)
            .Select(x => new MatchPlanHistorySummaryDto
            {
                Id = x.Id,
                SessionId = x.SessionId,
                GeneratedAt = x.GeneratedAt,
                Rounds = x.Rounds,
                CourtCount = x.CourtCount,
                SkillMode = x.SkillMode,
                OnlyCheckedIn = x.OnlyCheckedIn,
                PlayerCount = x.PlayerCount,
                CheckedInCount = x.CheckedInCount,
                Note = x.Note
            }).ToListAsync(ct);

    public async Task<MatchPlanHistoryDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var x = await _db.Set<BadmintonMatchPlanHistory>().AsNoTracking()
            .FirstOrDefaultAsync(h => h.Id == id, ct)
            ?? throw new NotFoundException(nameof(BadmintonMatchPlanHistory), id);

        MatchPlanDto? plan = null;
        try { plan = JsonSerializer.Deserialize<MatchPlanDto>(x.PayloadJson, JsonOpts); }
        catch { /* fallthrough: payload corrupted, return summary only */ }

        return new MatchPlanHistoryDto
        {
            Id = x.Id,
            SessionId = x.SessionId,
            GeneratedAt = x.GeneratedAt,
            Rounds = x.Rounds,
            CourtCount = x.CourtCount,
            SkillMode = x.SkillMode,
            OnlyCheckedIn = x.OnlyCheckedIn,
            PlayerCount = x.PlayerCount,
            CheckedInCount = x.CheckedInCount,
            Note = x.Note,
            Plan = plan
        };
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var x = await _db.Set<BadmintonMatchPlanHistory>().FindAsync(new object[] { id }, ct)
            ?? throw new NotFoundException(nameof(BadmintonMatchPlanHistory), id);
        x.IsDeleted = true;
        x.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private static MatchPlanHistorySummaryDto ToSummary(BadmintonMatchPlanHistory x) => new()
    {
        Id = x.Id,
        SessionId = x.SessionId,
        GeneratedAt = x.GeneratedAt,
        Rounds = x.Rounds,
        CourtCount = x.CourtCount,
        SkillMode = x.SkillMode,
        OnlyCheckedIn = x.OnlyCheckedIn,
        PlayerCount = x.PlayerCount,
        CheckedInCount = x.CheckedInCount,
        Note = x.Note
    };
}
