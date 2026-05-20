using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class PricingService : IPricingService
{
    private readonly DbContext _db;
    public PricingService(DbContext db) { _db = db; }

    /// <summary>
    /// Resolve the most specific matching rule into (Multiplier, FixedAmount).
    /// Specificity: (Gender match, Skill match) > (Gender match, *) > (*, Skill match) > (*, *) > defaults.
    /// </summary>
    public async Task<ResolvedPricing> ResolveAsync(Guid? templateId, Gender? gender, SkillLevel? skill, CancellationToken ct = default)
    {
        if (templateId == null) return new ResolvedPricing { Multiplier = 1.0m, FixedAmount = 0 };
        var rules = await _db.Set<PricingTemplateRule>().AsNoTracking()
            .Where(r => r.PricingTemplateId == templateId.Value)
            .ToListAsync(ct);

        var match = rules
            .Where(r => (r.Gender == null || r.Gender == gender)
                     && (r.SkillLevel == null || r.SkillLevel == skill))
            .OrderByDescending(r => (r.Gender == gender ? 1 : 0) + (r.SkillLevel == skill ? 1 : 0))
            .FirstOrDefault();

        if (match == null) return new ResolvedPricing { Multiplier = 1.0m, FixedAmount = 0 };
        var m = match.Multiplier <= 0 ? 1.0m : match.Multiplier;  // never zero by accident
        return new ResolvedPricing { Multiplier = m, FixedAmount = Math.Max(0, match.FixedAmount) };
    }

    public async Task<PricingMode> GetModeAsync(Guid? templateId, CancellationToken ct = default)
    {
        if (templateId == null) return PricingMode.WeightedSlot;
        return await _db.Set<PricingTemplate>().AsNoTracking()
            .Where(t => t.Id == templateId.Value)
            .Select(t => t.Mode).FirstOrDefaultAsync(ct);
    }

    public async Task<PricingTemplateDto?> GetDefaultAsync(CancellationToken ct = default)
    {
        var t = await _db.Set<PricingTemplate>().AsNoTracking()
            .Include(x => x.Rules)
            .FirstOrDefaultAsync(x => x.IsDefault && x.IsActive, ct);
        return t == null ? null : Map(t);
    }

    public async Task<IEnumerable<PricingTemplateDto>> ListAsync(CancellationToken ct = default)
        => (await _db.Set<PricingTemplate>().AsNoTracking()
            .Include(x => x.Rules)
            .OrderByDescending(x => x.IsDefault).ThenBy(x => x.Name)
            .ToListAsync(ct))
            .Select(Map);

    public async Task<PricingTemplateDto> CreateAsync(UpsertPricingTemplateDto dto, CancellationToken ct = default)
    {
        var tpl = new PricingTemplate
        {
            Name = dto.Name.Trim(),
            Description = dto.Description,
            Mode = dto.Mode,
            IsDefault = dto.IsDefault,
            IsActive = true,
            Rules = dto.Rules.Select(r => new PricingTemplateRule
            {
                Gender = r.Gender, SkillLevel = r.SkillLevel,
                Multiplier = r.Multiplier, FixedAmount = r.FixedAmount
            }).ToList()
        };
        if (dto.IsDefault) await ClearOtherDefaultsAsync(ct, null);
        _db.Add(tpl);
        await _db.SaveChangesAsync(ct);
        return Map(tpl);
    }

    public async Task<PricingTemplateDto> UpdateAsync(Guid id, UpsertPricingTemplateDto dto, CancellationToken ct = default)
    {
        var tpl = await _db.Set<PricingTemplate>()
            .Include(x => x.Rules)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException(nameof(PricingTemplate), id);

        tpl.Name = dto.Name.Trim();
        tpl.Description = dto.Description;
        tpl.Mode = dto.Mode;
        tpl.IsDefault = dto.IsDefault;
        tpl.UpdatedAt = DateTime.UtcNow;
        if (dto.IsDefault) await ClearOtherDefaultsAsync(ct, tpl.Id);

        // Replace rules wholesale
        _db.RemoveRange(tpl.Rules);
        foreach (var r in dto.Rules)
            _db.Add(new PricingTemplateRule
            {
                PricingTemplateId = tpl.Id,
                Gender = r.Gender, SkillLevel = r.SkillLevel,
                Multiplier = r.Multiplier, FixedAmount = r.FixedAmount
            });

        await _db.SaveChangesAsync(ct);
        // re-load rules so Map returns the new ones
        await _db.Entry(tpl).Collection(t => t.Rules).LoadAsync(ct);
        return Map(tpl);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var tpl = await _db.Set<PricingTemplate>().FindAsync(new object[] { id }, ct)
                  ?? throw new NotFoundException(nameof(PricingTemplate), id);
        if (tpl.IsDefault)
            throw new BusinessRuleException("CANNOT_DELETE_DEFAULT", "Không thể xóa template mặc định. Đặt template khác làm mặc định trước.");
        tpl.IsDeleted = true;
        tpl.IsActive = false;
        tpl.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private async Task ClearOtherDefaultsAsync(CancellationToken ct, Guid? exceptId)
    {
        var others = await _db.Set<PricingTemplate>()
            .Where(t => t.IsDefault && (exceptId == null || t.Id != exceptId.Value))
            .ToListAsync(ct);
        foreach (var t in others) t.IsDefault = false;
    }

    private static PricingTemplateDto Map(PricingTemplate t) => new()
    {
        Id = t.Id, Name = t.Name, Description = t.Description,
        Mode = t.Mode, IsDefault = t.IsDefault, IsActive = t.IsActive,
        Rules = t.Rules.Select(r => new PricingTemplateRuleDto
        {
            Id = r.Id, Gender = r.Gender, SkillLevel = r.SkillLevel,
            Multiplier = r.Multiplier, FixedAmount = r.FixedAmount
        }).ToList()
    };
}
