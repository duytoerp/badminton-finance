using BadmintonFinance.Api.Authorization;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

public class CheckInParticipantBody
{
    public bool CheckedIn { get; set; } = true;
}

[ApiController]
[Authorize]
[Route("api/sessions")]
public class SessionController : ControllerBase
{
    private readonly ISessionService _svc;
    private readonly IMatchPlannerService _planner;
    private readonly IMatchHistoryService _history;
    private readonly IMatchPlanHistoryService _planHistory;
    public SessionController(ISessionService svc, IMatchPlannerService planner,
        IMatchHistoryService history, IMatchPlanHistoryService planHistory)
    { _svc = svc; _planner = planner; _history = history; _planHistory = planHistory; }

    [HttpGet]
    public async Task<ApiResponse<PagedResult<SessionDto>>> List([FromQuery] PagedQuery q, CancellationToken ct)
        => ApiResponse<PagedResult<SessionDto>>.Ok(await _svc.ListAsync(q, ct));

    [HttpGet("filter")]
    public async Task<ApiResponse<PagedResult<SessionDto>>> Filter([FromQuery] SessionFilterQuery q, CancellationToken ct)
        => ApiResponse<PagedResult<SessionDto>>.Ok(await _svc.ListFilteredAsync(q, ct));

    [HttpPost("cancel")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<SessionDto>> Cancel(CancelSessionDto dto, CancellationToken ct)
        => ApiResponse<SessionDto>.Ok(await _svc.CancelSessionAsync(dto, ct));

    [HttpGet("{id}")]
    public async Task<ApiResponse<SessionDetailDto>> Get(Guid id, CancellationToken ct)
        => ApiResponse<SessionDetailDto>.Ok(await _svc.GetDetailAsync(id, ct));

    [HttpPost]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<SessionDto>> Create(CreateSessionDto dto, CancellationToken ct)
        => ApiResponse<SessionDto>.Ok(await _svc.CreateAsync(dto, ct));

    [HttpPost("participants")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<ParticipantDto>> AddParticipant(AddParticipantDto dto, CancellationToken ct)
        => await _svc.AddParticipantAsync(dto, ct);

    [HttpPost("participants/bulk")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<AddParticipantsBulkResultDto>> AddParticipantsBulk(AddParticipantsBulkDto dto, CancellationToken ct)
        => await _svc.AddParticipantsBulkAsync(dto, ct);

    [HttpDelete("participants/{participantId}")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<bool>> RemoveParticipant(Guid participantId, CancellationToken ct)
    {
        await _svc.RemoveParticipantAsync(participantId, ct);
        return ApiResponse<bool>.Ok(true);
    }

    [HttpPost("expenses")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<TransactionDto>> AddExpense(CreateExpenseDto dto, CancellationToken ct)
        => ApiResponse<TransactionDto>.Ok(await _svc.AddExpenseAsync(dto, ct));

    [HttpPost("payments/quick")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<TransactionDto>> QuickPayment(QuickPaymentDto dto, CancellationToken ct)
        => await _svc.QuickPaymentAsync(dto, ct);

    [HttpPost("{id}/close")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<SessionDto>> Close(Guid id, CancellationToken ct)
        => ApiResponse<SessionDto>.Ok(await _svc.CloseSessionAsync(id, ct));

    [HttpPost("reopen")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<SessionDto>> Reopen(ReopenSessionDto dto, CancellationToken ct)
        => ApiResponse<SessionDto>.Ok(await _svc.ReopenSessionAsync(dto, ct));

    [HttpPost("groups/preview")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<PreviewAddGroupsResultDto>> PreviewGroups(PreviewAddGroupsDto dto, CancellationToken ct)
        => ApiResponse<PreviewAddGroupsResultDto>.Ok(await _svc.PreviewAddGroupsAsync(dto, ct));

    [HttpPost("groups/add")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<AddGroupsToSessionResultDto>> AddGroups(AddGroupsToSessionDto dto, CancellationToken ct)
        => await _svc.AddGroupsAsync(dto, ct);

    [HttpGet("{id}/groups")]
    public async Task<ApiResponse<IEnumerable<SessionGroupHistoryDto>>> SessionGroups(Guid id, CancellationToken ct)
        => ApiResponse<IEnumerable<SessionGroupHistoryDto>>.Ok(await _svc.GetSessionGroupsAsync(id, ct));

    [HttpPost("participants/{participantId}/check-in")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<ParticipantDto>> CheckIn(Guid participantId, [FromBody] CheckInParticipantBody body, CancellationToken ct)
        => ApiResponse<ParticipantDto>.Ok(await _svc.SetCheckInAsync(
            new CheckInParticipantDto { ParticipantId = participantId, CheckedIn = body?.CheckedIn ?? true }, ct));

    [HttpPost("{id}/check-in-all")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<CheckInAllResultDto>> CheckInAll(Guid id, CancellationToken ct)
        => ApiResponse<CheckInAllResultDto>.Ok(await _svc.CheckInAllAsync(id, ct));

    [HttpPost("{id}/match-plan")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<MatchPlanDto>> GenerateMatchPlan(Guid id, GenerateMatchPlanDto dto, CancellationToken ct)
    {
        dto.SessionId = id;
        return ApiResponse<MatchPlanDto>.Ok(await _planner.GenerateAsync(dto, ct));
    }

    [HttpGet("{id}/matches")]
    public async Task<ApiResponse<IEnumerable<MatchHistoryDto>>> ListMatches(Guid id, CancellationToken ct)
        => ApiResponse<IEnumerable<MatchHistoryDto>>.Ok(await _history.ListBySessionAsync(id, ct));

    [HttpPost("{id}/matches")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<MatchHistoryDto>> RecordMatch(Guid id, RecordMatchDto dto, CancellationToken ct)
    {
        dto.SessionId = id;
        return ApiResponse<MatchHistoryDto>.Ok(await _history.RecordAsync(dto, ct));
    }

    [HttpPut("matches/{matchId}/finish")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<MatchHistoryDto>> FinishMatch(Guid matchId, FinishMatchDto dto, CancellationToken ct)
        => ApiResponse<MatchHistoryDto>.Ok(await _history.FinishAsync(matchId, dto, ct));

    [HttpDelete("matches/{matchId}")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<bool>> DeleteMatch(Guid matchId, CancellationToken ct)
    {
        await _history.DeleteAsync(matchId, ct);
        return ApiResponse<bool>.Ok(true);
    }

    [HttpGet("{id}/match-plans")]
    public async Task<ApiResponse<IEnumerable<MatchPlanHistorySummaryDto>>> ListMatchPlans(Guid id, CancellationToken ct)
        => ApiResponse<IEnumerable<MatchPlanHistorySummaryDto>>.Ok(await _planHistory.ListBySessionAsync(id, ct));

    [HttpPost("{id}/match-plans")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<MatchPlanHistorySummaryDto>> SaveMatchPlan(Guid id, SaveMatchPlanDto dto, CancellationToken ct)
    {
        dto.SessionId = id;
        return ApiResponse<MatchPlanHistorySummaryDto>.Ok(await _planHistory.SaveAsync(dto, ct));
    }

    [HttpGet("match-plans/{planId}")]
    public async Task<ApiResponse<MatchPlanHistoryDto>> GetMatchPlan(Guid planId, CancellationToken ct)
        => ApiResponse<MatchPlanHistoryDto>.Ok(await _planHistory.GetAsync(planId, ct));

    [HttpDelete("match-plans/{planId}")]
    [Authorize(Policy = Policies.ManageSessions)]
    public async Task<ApiResponse<bool>> DeleteMatchPlan(Guid planId, CancellationToken ct)
    {
        await _planHistory.DeleteAsync(planId, ct);
        return ApiResponse<bool>.Ok(true);
    }
}
