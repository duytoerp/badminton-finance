using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.DTOs;

public class DashboardStatsDto
{
    public decimal FundBalance { get; set; }
    public decimal MonthIncome { get; set; }
    public decimal MonthExpense { get; set; }
    public decimal MonthNet { get; set; }
    public int MonthSessionCount { get; set; }
    public int TotalDebtors { get; set; }
    public decimal TotalDebt { get; set; }
    public List<MonthlySeriesPoint> IncomeExpenseSeries { get; set; } = new();
    public List<SessionDto> RecentSessions { get; set; } = new();
    public List<DebtSummaryDto> TopDebtors { get; set; } = new();
}

public class MonthlySeriesPoint
{
    public string Label { get; set; } = string.Empty;   // e.g. "05/2026"
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Income { get; set; }
    public decimal Expense { get; set; }
    public decimal Net { get; set; }
}

public class AuditLogDto
{
    public Guid Id { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Reason { get; set; }
    public string? UserName { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AuditLogQuery : PagedQuery
{
    public string? EntityName { get; set; }
    public string? Action { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}

public class UserDto
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class CreateUserDto
{
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class UpdateUserDto
{
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class SessionFilterQuery : PagedQuery
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public Guid? CourtId { get; set; }
    public SessionStatus? Status { get; set; }
    public string? SortBy { get; set; }   // playDate | totalIncome | totalExpense | balance
    public string? SortDir { get; set; }  // asc | desc
}

public class PlayerFilterQuery : PagedQuery
{
    public PlayerType? PlayerType { get; set; }
    public bool? IsActive { get; set; }
    public bool? HasDebt { get; set; }
}

public class CancelSessionDto
{
    public Guid SessionId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class PlayerHistoryDto
{
    public Guid PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int TotalSessions { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal TotalDue { get; set; }
    public decimal CurrentDebt { get; set; }
    public List<ParticipantDto> Sessions { get; set; } = new();
}
