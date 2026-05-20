using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/sessions")]
public class SessionController : ControllerBase
{
    private readonly ISessionService _svc;
    public SessionController(ISessionService svc) { _svc = svc; }

    [HttpGet]
    public async Task<ApiResponse<PagedResult<SessionDto>>> List([FromQuery] PagedQuery q, CancellationToken ct)
        => ApiResponse<PagedResult<SessionDto>>.Ok(await _svc.ListAsync(q, ct));

    [HttpGet("filter")]
    public async Task<ApiResponse<PagedResult<SessionDto>>> Filter([FromQuery] SessionFilterQuery q, CancellationToken ct)
        => ApiResponse<PagedResult<SessionDto>>.Ok(await _svc.ListFilteredAsync(q, ct));

    [HttpPost("cancel")]
    public async Task<ApiResponse<SessionDto>> Cancel(CancelSessionDto dto, CancellationToken ct)
        => ApiResponse<SessionDto>.Ok(await _svc.CancelSessionAsync(dto, ct));

    [HttpGet("{id}")]
    public async Task<ApiResponse<SessionDetailDto>> Get(Guid id, CancellationToken ct)
        => ApiResponse<SessionDetailDto>.Ok(await _svc.GetDetailAsync(id, ct));

    [HttpPost]
    public async Task<ApiResponse<SessionDto>> Create(CreateSessionDto dto, CancellationToken ct)
        => ApiResponse<SessionDto>.Ok(await _svc.CreateAsync(dto, ct));

    [HttpPost("participants")]
    public async Task<ApiResponse<ParticipantDto>> AddParticipant(AddParticipantDto dto, CancellationToken ct)
        => await _svc.AddParticipantAsync(dto, ct);

    [HttpPost("participants/bulk")]
    public async Task<ApiResponse<AddParticipantsBulkResultDto>> AddParticipantsBulk(AddParticipantsBulkDto dto, CancellationToken ct)
        => await _svc.AddParticipantsBulkAsync(dto, ct);

    [HttpDelete("participants/{participantId}")]
    public async Task<ApiResponse<bool>> RemoveParticipant(Guid participantId, CancellationToken ct)
    {
        await _svc.RemoveParticipantAsync(participantId, ct);
        return ApiResponse<bool>.Ok(true);
    }

    [HttpPost("expenses")]
    public async Task<ApiResponse<TransactionDto>> AddExpense(CreateExpenseDto dto, CancellationToken ct)
        => ApiResponse<TransactionDto>.Ok(await _svc.AddExpenseAsync(dto, ct));

    [HttpPost("payments/quick")]
    public async Task<ApiResponse<TransactionDto>> QuickPayment(QuickPaymentDto dto, CancellationToken ct)
        => await _svc.QuickPaymentAsync(dto, ct);

    [HttpPost("{id}/close")]
    public async Task<ApiResponse<SessionDto>> Close(Guid id, CancellationToken ct)
        => ApiResponse<SessionDto>.Ok(await _svc.CloseSessionAsync(id, ct));

    [HttpPost("reopen")]
    public async Task<ApiResponse<SessionDto>> Reopen(ReopenSessionDto dto, CancellationToken ct)
        => ApiResponse<SessionDto>.Ok(await _svc.ReopenSessionAsync(dto, ct));

    [HttpPost("groups/preview")]
    public async Task<ApiResponse<PreviewAddGroupsResultDto>> PreviewGroups(PreviewAddGroupsDto dto, CancellationToken ct)
        => ApiResponse<PreviewAddGroupsResultDto>.Ok(await _svc.PreviewAddGroupsAsync(dto, ct));

    [HttpPost("groups/add")]
    public async Task<ApiResponse<AddGroupsToSessionResultDto>> AddGroups(AddGroupsToSessionDto dto, CancellationToken ct)
        => await _svc.AddGroupsAsync(dto, ct);

    [HttpGet("{id}/groups")]
    public async Task<ApiResponse<IEnumerable<SessionGroupHistoryDto>>> SessionGroups(Guid id, CancellationToken ct)
        => ApiResponse<IEnumerable<SessionGroupHistoryDto>>.Ok(await _svc.GetSessionGroupsAsync(id, ct));
}
