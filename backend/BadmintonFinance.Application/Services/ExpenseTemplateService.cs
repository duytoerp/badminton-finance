using System.Globalization;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class ExpenseTemplateService : IExpenseTemplateService
{
    private readonly DbContext _db;
    public ExpenseTemplateService(DbContext db) { _db = db; }

    public async Task<IEnumerable<ExpenseTemplateDto>> ListAsync(CancellationToken ct = default)
    {
        var rows = await _db.Set<ExpenseTemplate>().AsNoTracking()
            .Include(t => t.Items)
            .OrderByDescending(t => t.IsDefault).ThenBy(t => t.Name)
            .ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<ExpenseTemplateDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var t = await _db.Set<ExpenseTemplate>().AsNoTracking()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException(nameof(ExpenseTemplate), id);
        return ToDto(t);
    }

    public async Task<ExpenseTemplateDto?> GetDefaultAsync(CancellationToken ct = default)
    {
        var t = await _db.Set<ExpenseTemplate>().AsNoTracking()
            .Include(x => x.Items)
            .Where(x => x.IsActive && x.IsDefault)
            .FirstOrDefaultAsync(ct);
        return t == null ? null : ToDto(t);
    }

    public async Task<ExpenseTemplateDto> CreateAsync(UpsertExpenseTemplateDto dto, CancellationToken ct = default)
    {
        var t = new ExpenseTemplate
        {
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            IsDefault = dto.IsDefault,
            IsActive = dto.IsActive
        };
        var order = 0;
        foreach (var i in dto.Items)
        {
            t.Items.Add(new ExpenseTemplateItem
            {
                Name = i.Name.Trim(),
                CalculationType = i.CalculationType,
                Amount = i.Amount,
                SortOrder = i.SortOrder == 0 ? order++ : i.SortOrder
            });
        }
        _db.Add(t);
        if (t.IsDefault) await UnsetOtherDefaultsAsync(t.Id, ct);
        await _db.SaveChangesAsync(ct);
        return await GetAsync(t.Id, ct);
    }

    public async Task<ExpenseTemplateDto> UpdateAsync(Guid id, UpsertExpenseTemplateDto dto, CancellationToken ct = default)
    {
        var t = await _db.Set<ExpenseTemplate>()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException(nameof(ExpenseTemplate), id);

        t.Name = dto.Name.Trim();
        t.Description = dto.Description?.Trim();
        t.IsDefault = dto.IsDefault;
        t.IsActive = dto.IsActive;
        t.UpdatedAt = DateTime.UtcNow;

        // Replace items wholesale (template editor in UI is a flat list)
        _db.RemoveRange(t.Items);
        t.Items.Clear();
        var order = 0;
        foreach (var i in dto.Items)
        {
            t.Items.Add(new ExpenseTemplateItem
            {
                ExpenseTemplateId = t.Id,
                Name = i.Name.Trim(),
                CalculationType = i.CalculationType,
                Amount = i.Amount,
                SortOrder = i.SortOrder == 0 ? order++ : i.SortOrder
            });
        }
        if (t.IsDefault) await UnsetOtherDefaultsAsync(t.Id, ct);
        await _db.SaveChangesAsync(ct);
        return await GetAsync(t.Id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var t = await _db.Set<ExpenseTemplate>().FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new NotFoundException(nameof(ExpenseTemplate), id);
        t.IsDeleted = true;
        t.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ResolvedExpensesDto> ResolveAsync(Guid? templateId, Guid courtId,
        TimeSpan start, TimeSpan end, int courtCount, CancellationToken ct = default)
    {
        var court = await _db.Set<BadmintonCourt>().AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == courtId, ct)
            ?? throw new NotFoundException(nameof(BadmintonCourt), courtId);

        var hours = (decimal)(end - start).TotalHours;
        if (hours < 0) hours = 0;

        ExpenseTemplate? t = null;
        if (templateId.HasValue)
        {
            t = await _db.Set<ExpenseTemplate>().AsNoTracking()
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == templateId.Value, ct);
        }
        if (t == null)
        {
            t = await _db.Set<ExpenseTemplate>().AsNoTracking()
                .Include(x => x.Items)
                .Where(x => x.IsActive && x.IsDefault)
                .FirstOrDefaultAsync(ct);
        }

        var result = new ResolvedExpensesDto
        {
            ExpenseTemplateId = t?.Id,
            ExpenseTemplateName = t?.Name,
            Hours = Math.Round(hours, 2),
            CourtCount = courtCount,
            CourtHourlyRate = court.DefaultHourlyRate
        };

        if (t == null) return result;

        var ci = CultureInfo.GetCultureInfo("vi-VN");
        foreach (var i in t.Items.OrderBy(x => x.SortOrder).ThenBy(x => x.Name))
        {
            var (amount, formula) = ComputeLine(i, hours, courtCount, court.DefaultHourlyRate, ci);
            result.Lines.Add(new ResolvedExpenseLineDto
            {
                Name = i.Name,
                CalculationType = i.CalculationType,
                Amount = amount,
                Formula = formula
            });
        }
        result.Total = result.Lines.Sum(l => l.Amount);
        return result;
    }

    // ---- helpers ----

    public static (decimal amount, string formula) ComputeLine(ExpenseTemplateItem i,
        decimal hours, int courtCount, decimal courtRate, CultureInfo ci)
    {
        decimal raw;
        string formula;
        switch (i.CalculationType)
        {
            case ExpenseCalculationType.CourtHourlyRate:
                raw = hours * courtRate * courtCount;
                formula = $"{hours.ToString("0.##", ci)}h × {courtRate.ToString("N0", ci)}đ × {courtCount} sân";
                break;
            case ExpenseCalculationType.PerHour:
                raw = i.Amount * hours;
                formula = $"{i.Amount.ToString("N0", ci)}đ × {hours.ToString("0.##", ci)}h";
                break;
            case ExpenseCalculationType.PerCourt:
                raw = i.Amount * courtCount;
                formula = $"{i.Amount.ToString("N0", ci)}đ × {courtCount} sân";
                break;
            case ExpenseCalculationType.PerHourPerCourt:
                raw = i.Amount * hours * courtCount;
                formula = $"{i.Amount.ToString("N0", ci)}đ × {hours.ToString("0.##", ci)}h × {courtCount} sân";
                break;
            case ExpenseCalculationType.FixedAmount:
            default:
                raw = i.Amount;
                formula = $"{i.Amount.ToString("N0", ci)}đ (cố định)";
                break;
        }
        return (Math.Round(raw, 0), formula);
    }

    private async Task UnsetOtherDefaultsAsync(Guid keep, CancellationToken ct)
    {
        var others = await _db.Set<ExpenseTemplate>()
            .Where(x => x.IsDefault && x.Id != keep)
            .ToListAsync(ct);
        foreach (var o in others) { o.IsDefault = false; o.UpdatedAt = DateTime.UtcNow; }
    }

    private static ExpenseTemplateDto ToDto(ExpenseTemplate t) => new()
    {
        Id = t.Id, Name = t.Name, Description = t.Description,
        IsDefault = t.IsDefault, IsActive = t.IsActive,
        Items = t.Items.OrderBy(i => i.SortOrder).ThenBy(i => i.Name).Select(i => new ExpenseTemplateItemDto
        {
            Id = i.Id, Name = i.Name, CalculationType = i.CalculationType,
            Amount = i.Amount, SortOrder = i.SortOrder
        }).ToList()
    };
}
