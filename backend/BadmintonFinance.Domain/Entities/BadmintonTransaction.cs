using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Domain.Entities;

public class BadmintonTransaction : BaseEntity
{
    public Guid? SessionId { get; set; }
    public BadmintonSession? Session { get; set; }
    public Guid? PlayerId { get; set; }
    public BadmintonPlayer? Player { get; set; }

    public TransactionType TransactionType { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public string? ReferenceCode { get; set; }
}
