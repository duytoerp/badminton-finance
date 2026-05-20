namespace BadmintonFinance.Application.DTOs;

public class CourtDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public decimal DefaultHourlyRate { get; set; }
    public bool IsActive { get; set; }
}

public class CreateCourtDto
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public decimal DefaultHourlyRate { get; set; }
}
