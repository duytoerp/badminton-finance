namespace BadmintonFinance.Domain.Entities;

public class BadmintonCourt : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public decimal DefaultHourlyRate { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Note { get; set; }

    public ICollection<BadmintonSession> Sessions { get; set; } = new List<BadmintonSession>();
}
