using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.DTOs;

public class ExpenseTemplateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public List<ExpenseTemplateItemDto> Items { get; set; } = new();
}

public class ExpenseTemplateItemDto
{
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ExpenseCalculationType CalculationType { get; set; } = ExpenseCalculationType.FixedAmount;
    public decimal Amount { get; set; }
    public int SortOrder { get; set; }
}

public class UpsertExpenseTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public List<ExpenseTemplateItemDto> Items { get; set; } = new();
}

/// <summary>One resolved expense line — what the user will actually be charged.</summary>
public class ResolvedExpenseLineDto
{
    public string Name { get; set; } = string.Empty;
    public ExpenseCalculationType CalculationType { get; set; }
    public decimal Amount { get; set; }
    public string Formula { get; set; } = string.Empty;
}

public class ResolvedExpensesDto
{
    public Guid? ExpenseTemplateId { get; set; }
    public string? ExpenseTemplateName { get; set; }
    public decimal Hours { get; set; }
    public int CourtCount { get; set; }
    public decimal CourtHourlyRate { get; set; }
    public List<ResolvedExpenseLineDto> Lines { get; set; } = new();
    public decimal Total { get; set; }
}
