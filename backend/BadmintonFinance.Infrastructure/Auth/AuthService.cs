using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Exceptions;
using BadmintonFinance.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BadmintonFinance.Infrastructure.Auth;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;
    public AuthService(AppDbContext db, IConfiguration cfg) { _db = db; _cfg = cfg; }

    public async Task<AuthResultDto> LoginAsync(LoginDto dto, CancellationToken ct = default)
    {
        var user = await _db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.UserName == dto.UserName || u.Email == dto.UserName, ct)
            ?? throw new BusinessRuleException("INVALID_CREDENTIALS", "Tài khoản hoặc mật khẩu không đúng.");

        if (!user.IsActive)
            throw new BusinessRuleException("USER_DISABLED", "Tài khoản đã bị khóa.");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new BusinessRuleException("INVALID_CREDENTIALS", "Tài khoản hoặc mật khẩu không đúng.");

        user.LastLoginAt = DateTime.UtcNow;
        return await IssueTokenAsync(user, ct);
    }

    public async Task<AuthResultDto> RegisterAsync(RegisterDto dto, CancellationToken ct = default)
    {
        if (await _db.Users.AnyAsync(u => u.UserName == dto.UserName || u.Email == dto.Email, ct))
            throw new BusinessRuleException("USER_EXISTS", "Tài khoản hoặc email đã tồn tại.");

        var user = new User
        {
            UserName = dto.UserName.Trim(),
            Email = dto.Email.Trim(),
            FullName = dto.FullName.Trim(),
            PhoneNumber = dto.PhoneNumber,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        };
        _db.Users.Add(user);

        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == "User", ct);
        if (role == null)
        {
            role = new Role { Name = "User" };
            _db.Roles.Add(role);
        }
        _db.UserRoles.Add(new UserRole { User = user, Role = role });

        await _db.SaveChangesAsync(ct);
        return await IssueTokenAsync(user, ct);
    }

    public async Task<AuthResultDto> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        var user = await _db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken, ct)
            ?? throw new BusinessRuleException("INVALID_REFRESH", "Refresh token không hợp lệ.");

        if (user.RefreshTokenExpiry < DateTime.UtcNow)
            throw new BusinessRuleException("REFRESH_EXPIRED", "Refresh token hết hạn.");

        return await IssueTokenAsync(user, ct);
    }

    private async Task<AuthResultDto> IssueTokenAsync(User user, CancellationToken ct)
    {
        var jwtKey = _cfg["Jwt:Key"] ?? "DEV_SECRET_KEY_PLEASE_CHANGE_ME_TO_A_LONG_RANDOM_STRING_AT_LEAST_32_CHARS";
        var issuer = _cfg["Jwt:Issuer"] ?? "BadmintonFinance";
        var audience = _cfg["Jwt:Audience"] ?? "BadmintonFinance";
        var expiryMinutes = int.Parse(_cfg["Jwt:ExpiryMinutes"] ?? "120");

        var roles = user.UserRoles.Select(ur => ur.Role!.Name).ToList();
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.UserName),
            new(ClaimTypes.Name, user.FullName),
            new(JwtRegisteredClaimNames.Email, user.Email)
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            SecurityAlgorithms.HmacSha256);

        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);
        var token = new JwtSecurityToken(issuer, audience, claims, expires: expiresAt, signingCredentials: creds);
        var jwt = new JwtSecurityTokenHandler().WriteToken(token);

        var refresh = Convert.ToBase64String(Guid.NewGuid().ToByteArray()) + Guid.NewGuid().ToString("N");
        user.RefreshToken = refresh;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(14);
        await _db.SaveChangesAsync(ct);

        return new AuthResultDto
        {
            AccessToken = jwt, RefreshToken = refresh, ExpiresAt = expiresAt,
            UserName = user.UserName, FullName = user.FullName, Roles = roles
        };
    }
}

public class AuditLogger : IAuditLogger
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;
    public AuditLogger(AppDbContext db, ICurrentUser currentUser) { _db = db; _currentUser = currentUser; }

    public async Task LogAsync(string entityName, string entityId, string action, object? oldValue, object? newValue, string? reason = null, CancellationToken ct = default)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            EntityName = entityName, EntityId = entityId, Action = action,
            OldValue = oldValue == null ? null : System.Text.Json.JsonSerializer.Serialize(oldValue),
            NewValue = newValue == null ? null : System.Text.Json.JsonSerializer.Serialize(newValue),
            Reason = reason,
            UserId = _currentUser.Id, UserName = _currentUser.UserName, IpAddress = _currentUser.IpAddress
        });
        await _db.SaveChangesAsync(ct);
    }
}
