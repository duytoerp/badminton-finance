using BadmintonFinance.Api.Authorization;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/players")]
public class PlayerController : ControllerBase
{
    private readonly IPlayerService _svc;
    public PlayerController(IPlayerService svc) { _svc = svc; }

    [HttpGet]
    public async Task<ApiResponse<PagedResult<PlayerDto>>> List([FromQuery] PagedQuery q, CancellationToken ct)
        => ApiResponse<PagedResult<PlayerDto>>.Ok(await _svc.ListAsync(q, ct));

    [HttpGet("{id}")]
    public async Task<ApiResponse<PlayerDto?>> Get(Guid id, CancellationToken ct)
        => ApiResponse<PlayerDto?>.Ok(await _svc.GetAsync(id, ct));

    [HttpPost]
    [Authorize(Policy = Policies.ManagePlayers)]
    public async Task<ApiResponse<PlayerDto>> Create(CreatePlayerDto dto, CancellationToken ct)
        => ApiResponse<PlayerDto>.Ok(await _svc.CreateAsync(dto, ct));

    [HttpPost("quick")]
    [Authorize(Policy = Policies.ManagePlayers)]
    public async Task<ApiResponse<PlayerDto>> QuickAdd(QuickAddPlayerDto dto, CancellationToken ct)
        => ApiResponse<PlayerDto>.Ok(await _svc.QuickAddAsync(dto, ct));

    [HttpPut("{id}")]
    [Authorize(Policy = Policies.ManagePlayers)]
    public async Task<ApiResponse<PlayerDto>> Update(Guid id, UpdatePlayerDto dto, CancellationToken ct)
        => ApiResponse<PlayerDto>.Ok(await _svc.UpdateAsync(id, dto, ct));

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.ManagePlayers)]
    public async Task<ApiResponse<bool>> Delete(Guid id, CancellationToken ct)
    {
        await _svc.DeleteAsync(id, ct);
        return ApiResponse<bool>.Ok(true);
    }
}
