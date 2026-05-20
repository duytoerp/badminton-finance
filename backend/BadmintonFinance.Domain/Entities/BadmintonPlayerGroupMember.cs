namespace BadmintonFinance.Domain.Entities;

public class BadmintonPlayerGroupMember : BaseEntity
{
    public Guid PlayerGroupId { get; set; }
    public BadmintonPlayerGroup? PlayerGroup { get; set; }

    public Guid PlayerId { get; set; }
    public BadmintonPlayer? Player { get; set; }
}
