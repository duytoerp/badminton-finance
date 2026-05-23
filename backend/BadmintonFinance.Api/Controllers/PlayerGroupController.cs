using BadmintonFinance.Api.Authorization;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/player-groups")]
public class PlayerGroupController : ControllerBase
{
    private readonly IPlayerGroupService _svc;
    public PlayerGroupController(IPlayerGroupService svc) { _svc = svc; }

    [HttpGet]
    public async Task<ApiResponse<PagedResult<PlayerGroupDto>>> List([FromQuery] PagedQuery q, CancellationToken ct)
        => ApiResponse<PagedResult<PlayerGroupDto>>.Ok(await _svc.ListAsync(q, ct));

    [HttpGet("{id}")]
    public async Task<ApiResponse<PlayerGroupDetailDto>> Get(Guid id, CancellationToken ct)
        => ApiResponse<PlayerGroupDetailDto>.Ok(await _svc.GetAsync(id, ct));

    [HttpPost]
    [Authorize(Policy = Policies.ManagePlayers)]
    public async Task<ApiResponse<PlayerGroupDto>> Create(UpsertPlayerGroupDto dto, CancellationToken ct)
        => ApiResponse<PlayerGroupDto>.Ok(await _svc.CreateAsync(dto, ct));

    [HttpPut("{id}")]
    [Authorize(Policy = Policies.ManagePlayers)]
    public async Task<ApiResponse<PlayerGroupDto>> Update(Guid id, UpsertPlayerGroupDto dto, CancellationToken ct)
        => ApiResponse<PlayerGroupDto>.Ok(await _svc.UpdateAsync(id, dto, ct));

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.ManagePlayers)]
    public async Task<ApiResponse<bool>> Delete(Guid id, CancellationToken ct)
    {
        await _svc.DeleteAsync(id, ct);
        return ApiResponse<bool>.Ok(true);
    }

    [HttpPost("members/add")]
    [Authorize(Policy = Policies.ManagePlayers)]
    public async Task<ApiResponse<PlayerGroupDetailDto>> AddMembers(GroupMembersDto dto, CancellationToken ct)
        => ApiResponse<PlayerGroupDetailDto>.Ok(await _svc.AddMembersAsync(dto, ct));

    [HttpPost("members/remove")]
    [Authorize(Policy = Policies.ManagePlayers)]
    public async Task<ApiResponse<PlayerGroupDetailDto>> RemoveMembers(GroupMembersDto dto, CancellationToken ct)
        => ApiResponse<PlayerGroupDetailDto>.Ok(await _svc.RemoveMembersAsync(dto, ct));

    [HttpGet("{id}/usage-history")]
    public async Task<ApiResponse<IEnumerable<SessionGroupHistoryDto>>> UsageHistory(Guid id, CancellationToken ct)
        => ApiResponse<IEnumerable<SessionGroupHistoryDto>>.Ok(await _svc.GetUsageHistoryAsync(id, ct));
}
