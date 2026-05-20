using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class PlayerService : IPlayerService
{
    private readonly DbContext _db;
    public PlayerService(DbContext db) { _db = db; }

    public async Task<PagedResult<PlayerDto>> ListAsync(PagedQuery q, CancellationToken ct = default)
    {
        var query = _db.Set<BadmintonPlayer>().AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLower();
            query = query.Where(p => p.FullName.ToLower().Contains(s)
                                   || (p.NickName != null && p.NickName.ToLower().Contains(s))
                                   || (p.PhoneNumber != null && p.PhoneNumber.Contains(s)));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.FullName)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(p => new PlayerDto
            {
                Id = p.Id, FullName = p.FullName, NickName = p.NickName,
                PhoneNumber = p.PhoneNumber, Email = p.Email,
                PlayerType = p.PlayerType, IsActive = p.IsActive,
                CurrentDebt = p.CurrentDebt, Note = p.Note
            }).ToListAsync(ct);
        return new PagedResult<PlayerDto> { Items = items, Total = total, Page = q.Page, PageSize = q.PageSize };
    }

    public async Task<PlayerDto?> GetAsync(Guid id, CancellationToken ct = default)
    {
        var p = await _db.Set<BadmintonPlayer>().FindAsync(new object[] { id }, ct);
        if (p == null) return null;
        return Map(p);
    }

    public async Task<PlayerDto> CreateAsync(CreatePlayerDto dto, CancellationToken ct = default)
    {
        var p = new BadmintonPlayer
        {
            FullName = dto.FullName.Trim(),
            NickName = dto.NickName?.Trim(),
            PhoneNumber = dto.PhoneNumber?.Trim(),
            Email = dto.Email?.Trim(),
            PlayerType = dto.PlayerType,
            Gender = dto.Gender,
            SkillLevel = dto.SkillLevel,
            Note = dto.Note
        };
        _db.Add(p);
        await _db.SaveChangesAsync(ct);
        return Map(p);
    }

    public Task<PlayerDto> QuickAddAsync(QuickAddPlayerDto dto, CancellationToken ct = default)
        => CreateAsync(new CreatePlayerDto { FullName = dto.FullName, PhoneNumber = dto.PhoneNumber }, ct);

    public async Task<PlayerDto> UpdateAsync(Guid id, UpdatePlayerDto dto, CancellationToken ct = default)
    {
        var p = await _db.Set<BadmintonPlayer>().FindAsync(new object[] { id }, ct)
                ?? throw new NotFoundException(nameof(BadmintonPlayer), id);
        p.FullName = dto.FullName.Trim();
        p.NickName = dto.NickName?.Trim();
        p.PhoneNumber = dto.PhoneNumber?.Trim();
        p.Email = dto.Email?.Trim();
        p.PlayerType = dto.PlayerType;
        p.Gender = dto.Gender;
        p.SkillLevel = dto.SkillLevel;
        p.Note = dto.Note;
        p.IsActive = dto.IsActive;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Map(p);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var p = await _db.Set<BadmintonPlayer>().FindAsync(new object[] { id }, ct)
                ?? throw new NotFoundException(nameof(BadmintonPlayer), id);
        p.IsDeleted = true;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private static PlayerDto Map(BadmintonPlayer p) => new()
    {
        Id = p.Id, FullName = p.FullName, NickName = p.NickName,
        PhoneNumber = p.PhoneNumber, Email = p.Email,
        PlayerType = p.PlayerType, Gender = p.Gender, SkillLevel = p.SkillLevel,
        IsActive = p.IsActive,
        CurrentDebt = p.CurrentDebt, Note = p.Note
    };
}
