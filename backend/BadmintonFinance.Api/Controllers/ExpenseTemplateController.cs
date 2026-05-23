using BadmintonFinance.Api.Authorization;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/expense-templates")]
public class ExpenseTemplateController : ControllerBase
{
    private readonly IExpenseTemplateService _svc;
    public ExpenseTemplateController(IExpenseTemplateService svc) { _svc = svc; }

    [HttpGet]
    public async Task<ApiResponse<IEnumerable<ExpenseTemplateDto>>> List(CancellationToken ct)
        => ApiResponse<IEnumerable<ExpenseTemplateDto>>.Ok(await _svc.ListAsync(ct));

    [HttpGet("default")]
    public async Task<ApiResponse<ExpenseTemplateDto?>> Default(CancellationToken ct)
        => ApiResponse<ExpenseTemplateDto?>.Ok(await _svc.GetDefaultAsync(ct));

    [HttpGet("{id}")]
    public async Task<ApiResponse<ExpenseTemplateDto>> Get(Guid id, CancellationToken ct)
        => ApiResponse<ExpenseTemplateDto>.Ok(await _svc.GetAsync(id, ct));

    [HttpPost]
    [Authorize(Policy = Policies.ManageTemplates)]
    public async Task<ApiResponse<ExpenseTemplateDto>> Create(UpsertExpenseTemplateDto dto, CancellationToken ct)
        => ApiResponse<ExpenseTemplateDto>.Ok(await _svc.CreateAsync(dto, ct));

    [HttpPut("{id}")]
    [Authorize(Policy = Policies.ManageTemplates)]
    public async Task<ApiResponse<ExpenseTemplateDto>> Update(Guid id, UpsertExpenseTemplateDto dto, CancellationToken ct)
        => ApiResponse<ExpenseTemplateDto>.Ok(await _svc.UpdateAsync(id, dto, ct));

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.ManageTemplates)]
    public async Task<ApiResponse<bool>> Delete(Guid id, CancellationToken ct)
    {
        await _svc.DeleteAsync(id, ct);
        return ApiResponse<bool>.Ok(true);
    }

    /// <summary>
    /// Preview the resolved expense lines for a hypothetical booking shape. Useful for the booking form's right panel.
    /// </summary>
    [HttpGet("resolve")]
    public async Task<ApiResponse<ResolvedExpensesDto>> Resolve(
        [FromQuery] Guid? templateId, [FromQuery] Guid courtId,
        [FromQuery] TimeSpan start, [FromQuery] TimeSpan end, [FromQuery] int courtCount,
        CancellationToken ct)
        => ApiResponse<ResolvedExpensesDto>.Ok(
            await _svc.ResolveAsync(templateId, courtId, start, end, courtCount <= 0 ? 1 : courtCount, ct));
}
