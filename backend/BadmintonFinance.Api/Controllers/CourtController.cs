using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/courts")]
public class CourtController : ControllerBase
{
    private readonly ICourtService _svc;
    public CourtController(ICourtService svc) { _svc = svc; }

    [HttpGet]
    public async Task<ApiResponse<IEnumerable<CourtDto>>> List(CancellationToken ct)
        => ApiResponse<IEnumerable<CourtDto>>.Ok(await _svc.ListAsync(ct));

    [HttpPost]
    public async Task<ApiResponse<CourtDto>> Create(CreateCourtDto dto, CancellationToken ct)
        => ApiResponse<CourtDto>.Ok(await _svc.CreateAsync(dto, ct));

    [HttpPut("{id}")]
    public async Task<ApiResponse<CourtDto>> Update(Guid id, CreateCourtDto dto, CancellationToken ct)
        => ApiResponse<CourtDto>.Ok(await _svc.UpdateAsync(id, dto, ct));

    [HttpDelete("{id}")]
    public async Task<ApiResponse<bool>> Delete(Guid id, CancellationToken ct)
    {
        await _svc.DeleteAsync(id, ct);
        return ApiResponse<bool>.Ok(true);
    }
}
