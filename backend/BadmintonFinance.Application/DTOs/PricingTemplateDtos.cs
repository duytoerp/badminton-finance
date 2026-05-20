using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.DTOs;

public class PricingTemplateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public PricingMode Mode { get; set; } = PricingMode.WeightedSlot;
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public List<PricingTemplateRuleDto> Rules { get; set; } = new();
}

public class PricingTemplateRuleDto
{
    public Guid Id { get; set; }
    public Gender? Gender { get; set; }
    public SkillLevel? SkillLevel { get; set; }
    public decimal Multiplier { get; set; }
    public decimal FixedAmount { get; set; }
}

public class UpsertPricingTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public PricingMode Mode { get; set; } = PricingMode.WeightedSlot;
    public bool IsDefault { get; set; }
    public List<UpsertPricingTemplateRuleDto> Rules { get; set; } = new();
}

public class UpsertPricingTemplateRuleDto
{
    public Gender? Gender { get; set; }
    public SkillLevel? SkillLevel { get; set; }
    public decimal Multiplier { get; set; } = 1.0m;
    public decimal FixedAmount { get; set; }
}

/// <summary>What PricingService resolves for a given (template, gender, skill).</summary>
public class ResolvedPricing
{
    public decimal Multiplier { get; set; } = 1.0m;
    public decimal FixedAmount { get; set; }
}
