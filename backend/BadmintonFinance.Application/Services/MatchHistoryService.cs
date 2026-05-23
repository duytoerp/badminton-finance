using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class MatchHistoryService : IMatchHistoryService
{
    private readonly DbContext _db;
    public MatchHistoryService(DbContext db) { _db = db; }

    public async Task<MatchHistoryDto> RecordAsync(RecordMatchDto dto, CancellationToken ct = default)
    {
        var session = await _db.Set<BadmintonSession>().AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == dto.SessionId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), dto.SessionId);

        if (session.Status == SessionStatus.Cancelled)
            throw new BusinessRuleException("CANCELLED", "Buổi đã hủy, không lưu kết quả được.");

        var t1 = (dto.Team1PlayerIds ?? new()).Where(g => g != Guid.Empty).Distinct().ToList();
        var t2 = (dto.Team2PlayerIds ?? new()).Where(g => g != Guid.Empty).Distinct().ToList();
        if (t1.Count == 0 || t2.Count == 0)
            throw new BusinessRuleException("EMPTY_TEAM", "Cả hai đội phải có ít nhất 1 người.");
        if (t1.Intersect(t2).Any())
            throw new BusinessRuleException("DUPLICATE_PLAYER", "Một người không thể chơi cho cả hai đội.");

        var nextNumber = 1 + await _db.Set<BadmintonMatchHistory>()
            .Where(m => m.SessionId == dto.SessionId)
            .Select(m => (int?)m.MatchNumber).MaxAsync(ct) ?? 1;

        var now = DateTime.UtcNow;
        var status = dto.StartOnly ? MatchStatus.InProgress : MatchStatus.Finished;
        var entity = new BadmintonMatchHistory
        {
            SessionId = dto.SessionId,
            MatchNumber = nextNumber,
            Team1PlayerIds = string.Join(',', t1),
            Team2PlayerIds = string.Join(',', t2),
            Team1Score = dto.Team1Score,
            Team2Score = dto.Team2Score,
            Label = dto.Label,
            Note = dto.Note,
            Status = status,
            StartedAt = now,
            FinishedAt = status == MatchStatus.Finished ? now : null,
            PlayedAt = now
        };
        _db.Add(entity);
        await _db.SaveChangesAsync(ct);

        return await ToDto(entity, ct);
    }

    public async Task<MatchHistoryDto> FinishAsync(Guid matchId, FinishMatchDto dto, CancellationToken ct = default)
    {
        var m = await _db.Set<BadmintonMatchHistory>()
            .FirstOrDefaultAsync(x => x.Id == matchId, ct)
            ?? throw new NotFoundException(nameof(BadmintonMatchHistory), matchId);

        if (m.Status == MatchStatus.Finished)
            throw new BusinessRuleException("ALREADY_FINISHED", "Trận này đã kết thúc.");

        var now = DateTime.UtcNow;
        m.Team1Score = dto.Team1Score;
        m.Team2Score = dto.Team2Score;
        if (!string.IsNullOrWhiteSpace(dto.Note)) m.Note = dto.Note;
        m.Status = MatchStatus.Finished;
        m.FinishedAt = now;
        m.PlayedAt = now;
        m.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);

        return await ToDto(m, ct);
    }

    public async Task<IEnumerable<MatchHistoryDto>> ListBySessionAsync(Guid sessionId, CancellationToken ct = default)
    {
        // InProgress matches first (so "trận đang diễn ra" surface at the top), then by sequence.
        var rows = await _db.Set<BadmintonMatchHistory>().AsNoTracking()
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.Status == MatchStatus.InProgress ? 0 : 1)
            .ThenBy(m => m.MatchNumber)
            .ToListAsync(ct);

        if (rows.Count == 0) return Array.Empty<MatchHistoryDto>();

        var allIds = rows
            .SelectMany(r => ParseIds(r.Team1PlayerIds).Concat(ParseIds(r.Team2PlayerIds)))
            .Distinct().ToList();

        var players = await _db.Set<BadmintonPlayer>()
            .IgnoreQueryFilters() // include soft-deleted so old history still renders names
            .Where(p => allIds.Contains(p.Id))
            .Select(p => new { p.Id, p.FullName, p.SkillLevel })
            .ToListAsync(ct);
        var byId = players.ToDictionary(p => p.Id);

        return rows.Select(r => MapWithPlayers(r, id =>
        {
            if (byId.TryGetValue(id, out var p))
                return new MatchHistoryPlayerDto { PlayerId = p.Id, FullName = p.FullName, SkillLevel = p.SkillLevel };
            return new MatchHistoryPlayerDto { PlayerId = id, FullName = "(?)" };
        })).ToList();
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var m = await _db.Set<BadmintonMatchHistory>().FindAsync(new object[] { id }, ct)
                ?? throw new NotFoundException(nameof(BadmintonMatchHistory), id);
        m.IsDeleted = true;
        m.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private async Task<MatchHistoryDto> ToDto(BadmintonMatchHistory m, CancellationToken ct)
    {
        var ids = ParseIds(m.Team1PlayerIds).Concat(ParseIds(m.Team2PlayerIds)).Distinct().ToList();
        var players = await _db.Set<BadmintonPlayer>().IgnoreQueryFilters()
            .Where(p => ids.Contains(p.Id))
            .Select(p => new { p.Id, p.FullName, p.SkillLevel })
            .ToListAsync(ct);
        var byId = players.ToDictionary(p => p.Id);
        return MapWithPlayers(m, id =>
        {
            if (byId.TryGetValue(id, out var p))
                return new MatchHistoryPlayerDto { PlayerId = p.Id, FullName = p.FullName, SkillLevel = p.SkillLevel };
            return new MatchHistoryPlayerDto { PlayerId = id, FullName = "(?)" };
        });
    }

    private static MatchHistoryDto MapWithPlayers(BadmintonMatchHistory m, Func<Guid, MatchHistoryPlayerDto> resolve)
    {
        var t1 = ParseIds(m.Team1PlayerIds).Select(resolve).ToList();
        var t2 = ParseIds(m.Team2PlayerIds).Select(resolve).ToList();
        int? winner = null;
        if (m.Team1Score.HasValue && m.Team2Score.HasValue && m.Team1Score != m.Team2Score)
            winner = m.Team1Score > m.Team2Score ? 1 : 2;
        return new MatchHistoryDto
        {
            Id = m.Id,
            SessionId = m.SessionId,
            MatchNumber = m.MatchNumber,
            Team1 = t1,
            Team2 = t2,
            Team1Score = m.Team1Score,
            Team2Score = m.Team2Score,
            WinnerTeam = winner,
            Status = m.Status,
            StartedAt = m.StartedAt,
            FinishedAt = m.FinishedAt,
            PlayedAt = m.PlayedAt,
            Label = m.Label,
            Note = m.Note
        };
    }

    private static IEnumerable<Guid> ParseIds(string csv) =>
        (csv ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => Guid.TryParse(s, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty);
}
