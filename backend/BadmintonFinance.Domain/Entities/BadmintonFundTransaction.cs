using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Domain.Entities;

public class BadmintonFundTransaction : BaseEntity
{
    public Guid FundId { get; set; }
    public BadmintonFund? Fund { get; set; }
    public Guid? SessionId { get; set; }
    public BadmintonSession? Session { get; set; }

    public FundTransactionType FundTransactionType { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
}
