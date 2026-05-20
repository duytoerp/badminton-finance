using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _svc;
    public DashboardController(IDashboardService svc) { _svc = svc; }

    [HttpGet("stats")]
    public async Task<ApiResponse<DashboardStatsDto>> Stats(CancellationToken ct)
        => ApiResponse<DashboardStatsDto>.Ok(await _svc.GetStatsAsync(ct));
}
