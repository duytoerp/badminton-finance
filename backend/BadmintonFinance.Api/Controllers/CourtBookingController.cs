using BadmintonFinance.Api.Authorization;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/court-bookings")]
public class CourtBookingController : ControllerBase
{
    private readonly ICourtBookingService _svc;
    public CourtBookingController(ICourtBookingService svc) { _svc = svc; }

    [HttpGet]
    public async Task<ApiResponse<IEnumerable<CourtBookingDto>>> List(CancellationToken ct)
        => ApiResponse<IEnumerable<CourtBookingDto>>.Ok(await _svc.ListAsync(ct));

    [HttpGet("{id}")]
    public async Task<ApiResponse<CourtBookingDto>> Get(Guid id, CancellationToken ct)
        => ApiResponse<CourtBookingDto>.Ok(await _svc.GetAsync(id, ct));

    [HttpPost("preview")]
    [Authorize(Policy = Policies.ManageBookings)]
    public async Task<ApiResponse<CourtBookingPreviewDto>> Preview(CreateCourtBookingDto dto, CancellationToken ct)
        => ApiResponse<CourtBookingPreviewDto>.Ok(await _svc.PreviewAsync(dto, ct));

    [HttpPost]
    [Authorize(Policy = Policies.ManageBookings)]
    public async Task<ApiResponse<CourtBookingDto>> Create(CreateCourtBookingDto dto, CancellationToken ct)
        => ApiResponse<CourtBookingDto>.Ok(await _svc.CreateAsync(dto, ct));

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.ManageBookings)]
    public async Task<ApiResponse<bool>> Delete(Guid id, CancellationToken ct)
    {
        await _svc.DeleteAsync(id, ct);
        return ApiResponse<bool>.Ok(true);
    }
}
