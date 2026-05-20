using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.DTOs;

public class FundDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal CurrentBalance { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}

public class FundTransactionDto
{
    public Guid Id { get; set; }
    public Guid FundId { get; set; }
    public Guid? SessionId { get; set; }
    public FundTransactionType FundTransactionType { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; }
}

public class AdjustFundDto
{
    public Guid FundId { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
}
