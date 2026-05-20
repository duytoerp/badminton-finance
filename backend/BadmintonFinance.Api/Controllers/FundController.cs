using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/funds")]
public class FundController : ControllerBase
{
    private readonly IFundService _svc;
    public FundController(IFundService svc) { _svc = svc; }

    [HttpGet("main")]
    public async Task<ApiResponse<FundDto>> Main(CancellationToken ct)
        => ApiResponse<FundDto>.Ok(await _svc.GetMainAsync(ct));

    [HttpGet("{fundId}/transactions")]
    public async Task<ApiResponse<IEnumerable<FundTransactionDto>>> Transactions(Guid fundId, int take = 100, CancellationToken ct = default)
        => ApiResponse<IEnumerable<FundTransactionDto>>.Ok(await _svc.GetTransactionsAsync(fundId, take, ct));

    [HttpPost("adjust")]
    public async Task<ApiResponse<FundDto>> Adjust(AdjustFundDto dto, CancellationToken ct)
        => ApiResponse<FundDto>.Ok(await _svc.AdjustAsync(dto, ct));
}
