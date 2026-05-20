using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Domain.Entities;

public class PricingTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public PricingMode Mode { get; set; } = PricingMode.WeightedSlot;
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<PricingTemplateRule> Rules { get; set; } = new List<PricingTemplateRule>();
}

/// <summary>
/// A single rule maps a (Gender?, SkillLevel?) combo to a Multiplier.
/// Nulls = "any" — match wildcard.
/// Resolution picks the most specific matching rule for each player.
/// </summary>
public class PricingTemplateRule : BaseEntity
{
    public Guid PricingTemplateId { get; set; }
    public PricingTemplate? PricingTemplate { get; set; }

    public Gender? Gender { get; set; }
    public SkillLevel? SkillLevel { get; set; }
    /// <summary>Used when template Mode = WeightedSlot.</summary>
    public decimal Multiplier { get; set; } = 1.0m;
    /// <summary>Used when template Mode = FixedAmount (per slot). 0 = no charge.</summary>
    public decimal FixedAmount { get; set; }
}
