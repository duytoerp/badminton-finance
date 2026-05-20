namespace BadmintonFinance.Domain.Entities;

public class SystemConfiguration : BaseEntity
{
    public string ConfigKey { get; set; } = string.Empty;
    public string ConfigValue { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DataType { get; set; } = "string";
}
