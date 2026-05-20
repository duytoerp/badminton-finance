using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonFinance.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) { _auth = auth; }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResultDto>>> Login(LoginDto dto, CancellationToken ct)
        => Ok(ApiResponse<AuthResultDto>.Ok(await _auth.LoginAsync(dto, ct)));

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResultDto>>> Register(RegisterDto dto, CancellationToken ct)
        => Ok(ApiResponse<AuthResultDto>.Ok(await _auth.RegisterAsync(dto, ct)));

    [HttpPost("refresh")]
    public async Task<ActionResult<ApiResponse<AuthResultDto>>> Refresh(RefreshTokenDto dto, CancellationToken ct)
        => Ok(ApiResponse<AuthResultDto>.Ok(await _auth.RefreshAsync(dto.RefreshToken, ct)));
}
