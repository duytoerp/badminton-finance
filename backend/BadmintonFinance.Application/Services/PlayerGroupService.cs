using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class PlayerGroupService : IPlayerGroupService
{
    private readonly DbContext _db;
    public PlayerGroupService(DbContext db) { _db = db; }

    public async Task<PagedResult<PlayerGroupDto>> ListAsync(PagedQuery q, CancellationToken ct = default)
    {
        var query = _db.Set<BadmintonPlayerGroup>().AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLower();
            query = query.Where(g => g.Name.ToLower().Contains(s));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(g => g.Name)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(g => new PlayerGroupDto
            {
                Id = g.Id, Name = g.Name, Description = g.Description,
                Color = g.Color, GroupType = g.GroupType, IsActive = g.IsActive,
                MemberCount = g.Members.Count
            }).ToListAsync(ct);
        return new PagedResult<PlayerGroupDto> { Items = items, Total = total, Page = q.Page, PageSize = q.PageSize };
    }

    public async Task<PlayerGroupDetailDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var g = await _db.Set<BadmintonPlayerGroup>().AsNoTracking()
            .Include(x => x.Members).ThenInclude(m => m.Player)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException(nameof(BadmintonPlayerGroup), id);
        return ToDetail(g);
    }

    public async Task<PlayerGroupDto> CreateAsync(UpsertPlayerGroupDto dto, CancellationToken ct = default)
    {
        var g = new BadmintonPlayerGroup
        {
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            Color = dto.Color?.Trim(),
            GroupType = dto.GroupType,
            IsActive = dto.IsActive
        };
        _db.Add(g);

        foreach (var pid in dto.PlayerIds.Distinct())
        {
            _db.Add(new BadmintonPlayerGroupMember { PlayerGroupId = g.Id, PlayerId = pid });
        }
        await _db.SaveChangesAsync(ct);

        return new PlayerGroupDto
        {
            Id = g.Id, Name = g.Name, Description = g.Description,
            Color = g.Color, GroupType = g.GroupType, IsActive = g.IsActive,
            MemberCount = dto.PlayerIds.Distinct().Count()
        };
    }

    public async Task<PlayerGroupDto> UpdateAsync(Guid id, UpsertPlayerGroupDto dto, CancellationToken ct = default)
    {
        var g = await _db.Set<BadmintonPlayerGroup>().FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new NotFoundException(nameof(BadmintonPlayerGroup), id);
        g.Name = dto.Name.Trim();
        g.Description = dto.Description?.Trim();
        g.Color = dto.Color?.Trim();
        g.GroupType = dto.GroupType;
        g.IsActive = dto.IsActive;
        g.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        var memberCount = await _db.Set<BadmintonPlayerGroupMember>().CountAsync(m => m.PlayerGroupId == id, ct);
        return new PlayerGroupDto
        {
            Id = g.Id, Name = g.Name, Description = g.Description,
            Color = g.Color, GroupType = g.GroupType, IsActive = g.IsActive, MemberCount = memberCount
        };
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var g = await _db.Set<BadmintonPlayerGroup>().FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new NotFoundException(nameof(BadmintonPlayerGroup), id);
        g.IsDeleted = true;
        g.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<PlayerGroupDetailDto> AddMembersAsync(GroupMembersDto dto, CancellationToken ct = default)
    {
        var g = await _db.Set<BadmintonPlayerGroup>().FirstOrDefaultAsync(x => x.Id == dto.GroupId, ct)
                ?? throw new NotFoundException(nameof(BadmintonPlayerGroup), dto.GroupId);

        var existing = await _db.Set<BadmintonPlayerGroupMember>()
            .Where(m => m.PlayerGroupId == dto.GroupId)
            .Select(m => m.PlayerId).ToListAsync(ct);
        var toAdd = dto.PlayerIds.Distinct().Except(existing).ToList();

        // Validate referenced players exist
        if (toAdd.Count > 0)
        {
            var existPlayers = await _db.Set<BadmintonPlayer>()
                .Where(p => toAdd.Contains(p.Id)).Select(p => p.Id).ToListAsync(ct);
            var missing = toAdd.Except(existPlayers).ToList();
            if (missing.Count > 0)
                throw new BusinessRuleException("PLAYER_NOT_FOUND",
                    $"Không tìm thấy {missing.Count} người chơi.");
        }

        foreach (var pid in toAdd)
            _db.Add(new BadmintonPlayerGroupMember { PlayerGroupId = dto.GroupId, PlayerId = pid });
        await _db.SaveChangesAsync(ct);

        return await GetAsync(dto.GroupId, ct);
    }

    public async Task<PlayerGroupDetailDto> RemoveMembersAsync(GroupMembersDto dto, CancellationToken ct = default)
    {
        var ids = dto.PlayerIds.Distinct().ToList();
        var members = await _db.Set<BadmintonPlayerGroupMember>()
            .Where(m => m.PlayerGroupId == dto.GroupId && ids.Contains(m.PlayerId))
            .ToListAsync(ct);
        _db.RemoveRange(members);
        await _db.SaveChangesAsync(ct);
        return await GetAsync(dto.GroupId, ct);
    }

    public async Task<IEnumerable<SessionGroupHistoryDto>> GetUsageHistoryAsync(Guid groupId, CancellationToken ct = default)
    {
        return await _db.Set<BadmintonSessionGroup>().AsNoTracking()
            .Where(sg => sg.PlayerGroupId == groupId)
            .Include(sg => sg.Session)
            .OrderByDescending(sg => sg.AppliedAt)
            .Select(sg => new SessionGroupHistoryDto
            {
                Id = sg.Id,
                SessionId = sg.SessionId,
                SessionTitle = sg.Session != null ? sg.Session.Title : null,
                SessionPlayDate = sg.Session != null ? sg.Session.PlayDate : sg.AppliedAt,
                PlayerGroupId = sg.PlayerGroupId,
                GroupNameSnapshot = sg.GroupNameSnapshot,
                MembersTotal = sg.MembersTotal,
                MembersAdded = sg.MembersAdded,
                MembersSkippedDuplicate = sg.MembersSkippedDuplicate,
                MembersSkippedInactive = sg.MembersSkippedInactive,
                AppliedAt = sg.AppliedAt
            })
            .ToListAsync(ct);
    }

    private static PlayerGroupDetailDto ToDetail(BadmintonPlayerGroup g) => new()
    {
        Id = g.Id, Name = g.Name, Description = g.Description,
        Color = g.Color, GroupType = g.GroupType, IsActive = g.IsActive,
        MemberCount = g.Members.Count,
        Members = g.Members
            .Where(m => m.Player != null)
            .Select(m => new PlayerGroupMemberDto
            {
                PlayerId = m.PlayerId,
                FullName = m.Player!.FullName,
                NickName = m.Player.NickName,
                PhoneNumber = m.Player.PhoneNumber,
                Gender = m.Player.Gender,
                SkillLevel = m.Player.SkillLevel,
                IsActive = m.Player.IsActive,
                CurrentDebt = m.Player.CurrentDebt
            }).OrderBy(x => x.FullName).ToList()
    };
}
