using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class CourtService : ICourtService
{
    private readonly DbContext _db;
    public CourtService(DbContext db) { _db = db; }

    public async Task<IEnumerable<CourtDto>> ListAsync(CancellationToken ct = default)
        => await _db.Set<BadmintonCourt>().AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CourtDto
            {
                Id = c.Id, Name = c.Name, Address = c.Address,
                ContactPerson = c.ContactPerson, ContactPhone = c.ContactPhone,
                DefaultHourlyRate = c.DefaultHourlyRate, IsActive = c.IsActive
            }).ToListAsync(ct);

    public async Task<CourtDto> CreateAsync(CreateCourtDto dto, CancellationToken ct = default)
    {
        var c = new BadmintonCourt
        {
            Name = dto.Name.Trim(), Address = dto.Address, ContactPerson = dto.ContactPerson,
            ContactPhone = dto.ContactPhone, DefaultHourlyRate = dto.DefaultHourlyRate
        };
        _db.Add(c);
        await _db.SaveChangesAsync(ct);
        return new CourtDto { Id = c.Id, Name = c.Name, Address = c.Address,
            ContactPerson = c.ContactPerson, ContactPhone = c.ContactPhone,
            DefaultHourlyRate = c.DefaultHourlyRate, IsActive = c.IsActive };
    }

    public async Task<CourtDto> UpdateAsync(Guid id, CreateCourtDto dto, CancellationToken ct = default)
    {
        var c = await _db.Set<BadmintonCourt>().FindAsync(new object[] { id }, ct)
                ?? throw new NotFoundException(nameof(BadmintonCourt), id);
        c.Name = dto.Name.Trim();
        c.Address = dto.Address;
        c.ContactPerson = dto.ContactPerson;
        c.ContactPhone = dto.ContactPhone;
        c.DefaultHourlyRate = dto.DefaultHourlyRate;
        c.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return new CourtDto { Id = c.Id, Name = c.Name, Address = c.Address,
            ContactPerson = c.ContactPerson, ContactPhone = c.ContactPhone,
            DefaultHourlyRate = c.DefaultHourlyRate, IsActive = c.IsActive };
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var c = await _db.Set<BadmintonCourt>().FindAsync(new object[] { id }, ct)
                ?? throw new NotFoundException(nameof(BadmintonCourt), id);
        c.IsDeleted = true;
        c.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }
}
