using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/pricing-templates")]
public class PricingTemplateController : ControllerBase
{
    private readonly IPricingService _svc;
    public PricingTemplateController(IPricingService svc) { _svc = svc; }

    [HttpGet]
    public async Task<ApiResponse<IEnumerable<PricingTemplateDto>>> List(CancellationToken ct)
        => ApiResponse<IEnumerable<PricingTemplateDto>>.Ok(await _svc.ListAsync(ct));

    [HttpGet("default")]
    public async Task<ApiResponse<PricingTemplateDto?>> Default(CancellationToken ct)
        => ApiResponse<PricingTemplateDto?>.Ok(await _svc.GetDefaultAsync(ct));

    [HttpPost]
    public async Task<ApiResponse<PricingTemplateDto>> Create(UpsertPricingTemplateDto dto, CancellationToken ct)
        => ApiResponse<PricingTemplateDto>.Ok(await _svc.CreateAsync(dto, ct));

    [HttpPut("{id}")]
    public async Task<ApiResponse<PricingTemplateDto>> Update(Guid id, UpsertPricingTemplateDto dto, CancellationToken ct)
        => ApiResponse<PricingTemplateDto>.Ok(await _svc.UpdateAsync(id, dto, ct));

    [HttpDelete("{id}")]
    public async Task<ApiResponse<bool>> Delete(Guid id, CancellationToken ct)
    {
        await _svc.DeleteAsync(id, ct);
        return ApiResponse<bool>.Ok(true);
    }
}
