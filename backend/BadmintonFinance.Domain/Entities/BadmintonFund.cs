namespace BadmintonFinance.Domain.Entities;

public class BadmintonFund : BaseEntity
{
    public string Name { get; set; } = "Quỹ chung";
    public decimal CurrentBalance { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<BadmintonFundTransaction> Transactions { get; set; } = new List<BadmintonFundTransaction>();
}
