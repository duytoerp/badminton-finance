using System.Text;
using BadmintonFinance.Api.Authorization;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IAuditLogService _audit;
    private readonly IUserService _users;
    private readonly IReportService _reports;
    private readonly IPlayerHistoryService _history;
    private readonly IAdminMaintenanceService _maintenance;

    public AdminController(IAuditLogService audit, IUserService users, IReportService reports,
        IPlayerHistoryService history, IAdminMaintenanceService maintenance)
    {
        _audit = audit; _users = users; _reports = reports; _history = history; _maintenance = maintenance;
    }

    // ---- Audit ----
    [HttpGet("audit-logs")]
    [Authorize(Policy = Policies.ViewAuditLog)]
    public async Task<ApiResponse<PagedResult<AuditLogDto>>> AuditLogs([FromQuery] AuditLogQuery q, CancellationToken ct)
        => ApiResponse<PagedResult<AuditLogDto>>.Ok(await _audit.ListAsync(q, ct));

    // ---- Users ----
    [HttpGet("users")]
    [Authorize(Policy = Policies.ManageUsers)]
    public async Task<ApiResponse<PagedResult<UserDto>>> Users([FromQuery] PagedQuery q, CancellationToken ct)
        => ApiResponse<PagedResult<UserDto>>.Ok(await _users.ListAsync(q, ct));

    [HttpPost("users")]
    [Authorize(Policy = Policies.ManageUsers)]
    public async Task<ApiResponse<UserDto>> CreateUser(CreateUserDto dto, CancellationToken ct)
        => ApiResponse<UserDto>.Ok(await _users.CreateAsync(dto, ct));

    [HttpPut("users/{id}")]
    [Authorize(Policy = Policies.ManageUsers)]
    public async Task<ApiResponse<UserDto>> UpdateUser(Guid id, UpdateUserDto dto, CancellationToken ct)
        => ApiResponse<UserDto>.Ok(await _users.UpdateAsync(id, dto, ct));

    [HttpDelete("users/{id}")]
    [Authorize(Policy = Policies.ManageUsers)]
    public async Task<ApiResponse<bool>> DeleteUser(Guid id, CancellationToken ct)
    {
        await _users.DeleteAsync(id, ct);
        return ApiResponse<bool>.Ok(true);
    }

    [HttpGet("roles")]
    [Authorize(Policy = Policies.ManageUsers)]
    public async Task<ApiResponse<IEnumerable<string>>> Roles(CancellationToken ct)
        => ApiResponse<IEnumerable<string>>.Ok(await _users.GetRolesAsync(ct));

    // ---- Permission matrix ----
    /// <summary>
    /// Returns the read-only RBAC matrix built from <c>PermissionCatalog</c>.
    /// Same catalog is used to register authorization policies in <c>Program.cs</c>,
    /// so this response is guaranteed to match runtime authorization.
    /// </summary>
    [HttpGet("permissions/matrix")]
    [Authorize(Policy = Policies.ManageUsers)]
    public ApiResponse<PermissionMatrixDto> PermissionMatrix()
    {
        var dto = new PermissionMatrixDto
        {
            Roles = PermissionCatalog.Roles.ToList(),
            Permissions = PermissionCatalog.Permissions.Select(p => new PermissionRowDto
            {
                Key = p.Key,
                Label = p.Label,
                Description = p.Description,
                AllowedRoles = p.AllowedRoles.ToList()
            }).ToList()
        };
        return ApiResponse<PermissionMatrixDto>.Ok(dto);
    }

    // ---- Player history ----
    [HttpGet("players/{id}/history")]
    public async Task<ApiResponse<PlayerHistoryDto>> PlayerHistory(Guid id, CancellationToken ct)
        => ApiResponse<PlayerHistoryDto>.Ok(await _history.GetHistoryAsync(id, ct));

    // ---- CSV export: debts ----
    [HttpGet("export/debts.csv")]
    [Authorize(Policy = Policies.ExportData)]
    public async Task<IActionResult> ExportDebts(CancellationToken ct)
    {
        var debts = await _reports.GetDebtsAsync(ct);
        var sb = new StringBuilder();
        sb.AppendLine("PlayerId,PlayerName,Phone,TotalDebt,UnpaidSessions");
        foreach (var d in debts)
            sb.AppendLine($"{d.PlayerId},{Csv(d.PlayerName)},{Csv(d.PhoneNumber)},{d.TotalDebt},{d.UnpaidSessionCount}");
        return File(new UTF8Encoding(true).GetBytes(sb.ToString()), "text/csv", $"debts_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    // ---- CSV export: finance report ----
    [HttpGet("export/finance.csv")]
    [Authorize(Policy = Policies.ExportData)]
    public async Task<IActionResult> ExportFinance([FromQuery] DateTime from, [FromQuery] DateTime to, CancellationToken ct)
    {
        var r = await _reports.GetReportAsync(from, to, ct);
        var sb = new StringBuilder();
        sb.AppendLine($"Period,{from:yyyy-MM-dd},{to:yyyy-MM-dd}");
        sb.AppendLine($"Total income,{r.TotalIncome}");
        sb.AppendLine($"Total expense,{r.TotalExpense}");
        sb.AppendLine($"Net balance,{r.NetBalance}");
        sb.AppendLine($"Fund balance,{r.FundBalance}");
        sb.AppendLine();
        sb.AppendLine("PlayDate,Title,Court,Status,Income,Expense,Balance,FeePerSlot,Slots");
        foreach (var s in r.Sessions)
            sb.AppendLine($"{s.PlayDate:yyyy-MM-dd},{Csv(s.Title)},{Csv(s.CourtName)},{s.Status},{s.TotalIncome},{s.TotalExpense},{s.Balance},{s.FeePerSlot},{s.TotalSlots}");
        return File(new UTF8Encoding(true).GetBytes(sb.ToString()), "text/csv", $"finance_{from:yyyyMMdd}_{to:yyyyMMdd}.csv");
    }

    // ---- Maintenance: wipe transactional data (Admin only) ----
    /// <summary>
    /// Wipes all transactional data. Master data (users, courts, pricing/expense templates) is preserved.
    /// Body must include <c>confirmation: "XOA TAT CA"</c>. Restricted to <c>Admin</c> role.
    /// </summary>
    [Authorize(Policy = Policies.Maintenance)]
    [HttpPost("maintenance/wipe-transactional")]
    public async Task<ApiResponse<WipeTransactionalResultDto>> WipeTransactional(WipeTransactionalDto dto, CancellationToken ct)
        => ApiResponse<WipeTransactionalResultDto>.Ok(await _maintenance.WipeTransactionalAsync(dto, ct));

    private static string Csv(string? s)
    {
        if (s == null) return "";
        if (s.Contains(',') || s.Contains('"') || s.Contains('\n'))
            return "\"" + s.Replace("\"", "\"\"") + "\"";
        return s;
    }
}
