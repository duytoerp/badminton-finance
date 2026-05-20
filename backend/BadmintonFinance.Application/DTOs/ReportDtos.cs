namespace BadmintonFinance.Application.DTOs;

public class FinanceReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal NetBalance { get; set; }
    public decimal FundBalance { get; set; }
    public int SessionCount { get; set; }
    public List<SessionDto> Sessions { get; set; } = new();
    public List<DebtSummaryDto> TopDebtors { get; set; } = new();
}

public class DebtSummaryDto
{
    public Guid PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public decimal TotalDebt { get; set; }
    public int UnpaidSessionCount { get; set; }
}
