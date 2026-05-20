using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class UserService : IUserService
{
    private readonly DbContext _db;
    public UserService(DbContext db) { _db = db; }

    public async Task<PagedResult<UserDto>> ListAsync(PagedQuery q, CancellationToken ct = default)
    {
        var query = _db.Set<User>().AsNoTracking().Include("UserRoles.Role").AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLower();
            query = query.Where(u =>
                u.UserName.ToLower().Contains(s) ||
                u.Email.ToLower().Contains(s) ||
                u.FullName.ToLower().Contains(s));
        }
        var total = await query.CountAsync(ct);
        var users = await query.OrderBy(u => u.UserName)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize).ToListAsync(ct);

        var items = users.Select(u => new UserDto
        {
            Id = u.Id, UserName = u.UserName, Email = u.Email, FullName = u.FullName,
            PhoneNumber = u.PhoneNumber, IsActive = u.IsActive, LastLoginAt = u.LastLoginAt,
            Roles = u.UserRoles.Select(ur => ur.Role!.Name).ToList()
        }).ToList();
        return new PagedResult<UserDto> { Items = items, Total = total, Page = q.Page, PageSize = q.PageSize };
    }

    public async Task<UserDto> CreateAsync(CreateUserDto dto, CancellationToken ct = default)
    {
        if (await _db.Set<User>().AnyAsync(u => u.UserName == dto.UserName || u.Email == dto.Email, ct))
            throw new BusinessRuleException("USER_EXISTS", "Tài khoản hoặc email đã tồn tại.");
        var user = new User
        {
            UserName = dto.UserName.Trim(), Email = dto.Email.Trim(),
            FullName = dto.FullName.Trim(), PhoneNumber = dto.PhoneNumber,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        };
        _db.Add(user);
        foreach (var r in dto.Roles.Distinct())
        {
            var role = await _db.Set<Role>().FirstOrDefaultAsync(x => x.Name == r, ct);
            if (role == null) { role = new Role { Name = r }; _db.Add(role); }
            _db.Add(new UserRole { User = user, Role = role });
        }
        await _db.SaveChangesAsync(ct);
        return new UserDto
        {
            Id = user.Id, UserName = user.UserName, Email = user.Email, FullName = user.FullName,
            PhoneNumber = user.PhoneNumber, IsActive = user.IsActive, Roles = dto.Roles
        };
    }

    public async Task<UserDto> UpdateAsync(Guid id, UpdateUserDto dto, CancellationToken ct = default)
    {
        var user = await _db.Set<User>().Include("UserRoles.Role")
            .FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new NotFoundException(nameof(User), id);
        user.FullName = dto.FullName.Trim();
        user.PhoneNumber = dto.PhoneNumber;
        user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        // Replace roles
        var existing = user.UserRoles.ToList();
        foreach (var ur in existing) _db.Remove(ur);
        foreach (var r in dto.Roles.Distinct())
        {
            var role = await _db.Set<Role>().FirstOrDefaultAsync(x => x.Name == r, ct);
            if (role == null) { role = new Role { Name = r }; _db.Add(role); }
            _db.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        }
        await _db.SaveChangesAsync(ct);
        return new UserDto
        {
            Id = user.Id, UserName = user.UserName, Email = user.Email, FullName = user.FullName,
            PhoneNumber = user.PhoneNumber, IsActive = user.IsActive, LastLoginAt = user.LastLoginAt,
            Roles = dto.Roles
        };
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var u = await _db.Set<User>().FindAsync(new object[] { id }, ct)
                ?? throw new NotFoundException(nameof(User), id);
        u.IsDeleted = true; u.IsActive = false; u.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IEnumerable<string>> GetRolesAsync(CancellationToken ct = default)
        => await _db.Set<Role>().AsNoTracking().OrderBy(r => r.Name).Select(r => r.Name).ToListAsync(ct);
}
