using System.Net;
using System.Text.Json;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Exceptions;

namespace BadmintonFinance.Api.Middlewares;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _log;
    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> log) { _next = next; _log = log; }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await _next(ctx);

            // ASP.NET auth short-circuits to 401/403 without throwing, so the response
            // body is empty by default. Wrap it in our ApiResponse envelope so the
            // frontend's axios interceptor can read errorCode like every other failure.
            if (!ctx.Response.HasStarted)
            {
                if (ctx.Response.StatusCode == (int)HttpStatusCode.Unauthorized)
                    await Write(ctx, HttpStatusCode.Unauthorized, "UNAUTHORIZED",
                        "Phiên đăng nhập không hợp lệ.");
                else if (ctx.Response.StatusCode == (int)HttpStatusCode.Forbidden)
                    await Write(ctx, HttpStatusCode.Forbidden, "FORBIDDEN",
                        "Bạn không có quyền thực hiện hành động này.");
            }
        }
        catch (NotFoundException ex)
        {
            await Write(ctx, HttpStatusCode.NotFound, ex.Code, ex.Message);
        }
        catch (BusinessRuleException ex)
        {
            await Write(ctx, HttpStatusCode.UnprocessableEntity, ex.Code, ex.Message);
        }
        catch (FluentValidation.ValidationException ex)
        {
            await Write(ctx, HttpStatusCode.BadRequest, "VALIDATION_ERROR",
                string.Join("; ", ex.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}")));
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Unhandled exception");
            await Write(ctx, HttpStatusCode.InternalServerError, "INTERNAL_ERROR", "Đã xảy ra lỗi không xác định.");
        }
    }

    private static Task Write(HttpContext ctx, HttpStatusCode code, string err, string msg)
    {
        ctx.Response.StatusCode = (int)code;
        ctx.Response.ContentType = "application/json";
        return ctx.Response.WriteAsync(JsonSerializer.Serialize(ApiResponse<object>.Fail(err, msg),
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
    }
}

public class CurrentUser : ICurrentUser
{
    public CurrentUser(IHttpContextAccessor accessor)
    {
        var ctx = accessor.HttpContext;
        if (ctx?.User?.Identity?.IsAuthenticated == true)
        {
            var sub = ctx.User.FindFirst("sub")?.Value
                   ?? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(sub, out var g)) Id = g;
            UserName = ctx.User.Identity.Name;
            IpAddress = ctx.Connection.RemoteIpAddress?.ToString();
        }
    }
    public Guid? Id { get; }
    public string? UserName { get; }
    public string? IpAddress { get; }
}
