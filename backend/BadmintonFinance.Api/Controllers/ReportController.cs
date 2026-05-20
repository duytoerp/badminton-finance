using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reports")]
public class ReportController : ControllerBase
{
    private readonly IReportService _svc;
    public ReportController(IReportService svc) { _svc = svc; }

    [HttpGet("finance")]
    public async Task<ApiResponse<FinanceReportDto>> Finance([FromQuery] DateTime from, [FromQuery] DateTime to, CancellationToken ct)
        => ApiResponse<FinanceReportDto>.Ok(await _svc.GetReportAsync(from, to, ct));

    [HttpGet("debts")]
    public async Task<ApiResponse<IEnumerable<DebtSummaryDto>>> Debts(CancellationToken ct)
        => ApiResponse<IEnumerable<DebtSummaryDto>>.Ok(await _svc.GetDebtsAsync(ct));
}
