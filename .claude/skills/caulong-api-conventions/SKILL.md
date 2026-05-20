---
name: caulong-api-conventions
description: REST + error + validation conventions used by every controller in the Badminton Finance API — the ApiResponse<T> envelope, error code catalog, warnings array, exception-to-status mapping, FluentValidation wiring, paging/filter query shape. Load before adding a controller or endpoint, when picking a new error code, or before changing how errors flow.
---

# API conventions

## 1. The `ApiResponse<T>` envelope

Every successful or business-rule-failed response is wrapped:

```csharp
public class ApiResponse<T>
{
    public bool Success { get; set; } = true;
    public T? Data { get; set; }
    public string? Message { get; set; }
    public List<string> Warnings { get; set; } = new();
    public string? ErrorCode { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null, List<string>? warnings = null);
    public static ApiResponse<T> Fail(string code, string message);
}
```

Defined in [CommonDtos.cs](../../../backend/BadmintonFinance.Application/DTOs/CommonDtos.cs). Frontend type mirrors it in [client.ts](../../../frontend/src/api/client.ts).

**Controller actions return `ApiResponse<T>` directly, not `IActionResult`** — except for raw file responses (CSV export). Example:

```csharp
[HttpGet]
public async Task<ApiResponse<PagedResult<PlayerDto>>> List([FromQuery] PagedQuery q, CancellationToken ct)
    => ApiResponse<PagedResult<PlayerDto>>.Ok(await _svc.ListAsync(q, ct));
```

**Never** `return BadRequest(...)`, `return NotFound(...)`, etc. Throw a domain exception and let [ExceptionMiddleware](../../../backend/BadmintonFinance.Api/Middlewares/ExceptionMiddleware.cs) translate.

## 2. Exception → HTTP status mapping

| Exception (in service) | HTTP | Envelope errorCode | Used for |
|---|---|---|---|
| `NotFoundException(entity, id)` | 404 | `NOT_FOUND` | record doesn't exist |
| `BusinessRuleException(code, msg)` | 422 | `code` (your string) | rule violation, expected |
| `FluentValidation.ValidationException` | 400 | `VALIDATION_ERROR` | request shape invalid |
| anything else | 500 | `INTERNAL_ERROR` | unexpected — logged |

Middleware is in [ExceptionMiddleware.cs](../../../backend/BadmintonFinance.Api/Middlewares/ExceptionMiddleware.cs). Don't add a try/catch in controllers — let it bubble.

## 3. Error code catalog (currently in use)

Stable UPPER_SNAKE strings. The frontend may switch on these — **don't rename without grep**.

| Code | Where thrown | Meaning |
|---|---|---|
| `NOT_FOUND` | NotFoundException | Generic 404 |
| `VALIDATION_ERROR` | FluentValidation | Bad request shape |
| `INTERNAL_ERROR` | Catch-all | Unexpected exception |
| `SESSION_CLOSED` | EnsureNotClosed | Trying to edit a Closed session |
| `SESSION_CANCELLED`, `CANCELLED` | various | Trying to act on a Cancelled session |
| `ALREADY_CLOSED` | CloseSessionAsync | Double-close |
| `NOT_CLOSED` | ReopenSessionAsync | Reopen non-Closed |
| `CANNOT_CANCEL_CLOSED` | CancelSessionAsync | Cancel a Closed session — must Reopen first |
| `NO_PARTICIPANTS` | CloseSessionAsync | Close attempt with empty roster |
| `NO_COURT_FEE` | CloseSessionAsync | Close attempt with zero expenses |
| `DUPLICATE_PARTICIPANT` | AddParticipantAsync | Player already in session |
| `NOT_PARTICIPANT` | QuickPaymentAsync | Player not on session |
| `PARTICIPANT_HAS_PAYMENT` | RemoveParticipantAsync | Trying to remove someone who already paid |
| `INVALID_CREDENTIALS` | AuthService.LoginAsync | Wrong username / password |
| `USER_DISABLED` | AuthService.LoginAsync | User is inactive |
| `USER_EXISTS` | RegisterAsync / UserService.CreateAsync | Duplicate username/email |
| `INVALID_REFRESH` | RefreshAsync | Unknown refresh token |
| `REFRESH_EXPIRED` | RefreshAsync | Expired refresh token |

When adding a new business rule, pick the **most specific** code possible — frontend uses it for friendly Vietnamese messages.

## 4. Warnings vs errors

`warnings: string[]` in `ApiResponse<T>` is for **non-blocking success**. The op succeeded; the user should see a yellow banner.

Currently used:
- Adding a participant who has prior debt → `"Người chơi đang còn nợ {amount} đ ở các buổi trước."`
- QuickPayment when `paid > due` → `"Thanh toán dư. Vui lòng kiểm tra lại."`

Don't smuggle errors through warnings — if the op should not succeed, throw `BusinessRuleException`.

## 5. Validation

FluentValidation, auto-registered in [Program.cs](../../../backend/BadmintonFinance.Api/Program.cs) via `AddValidatorsFromAssemblyContaining<CreatePlayerValidator>()` + `AddFluentValidationAutoValidation()`. All validators in one file: [Validators.cs](../../../backend/BadmintonFinance.Application/Validators/Validators.cs). Add yours there with `class XValidator : AbstractValidator<XDto>`.

The validator runs **before** the controller action — failure becomes a 400 `VALIDATION_ERROR` through middleware. Validate at the boundary; services can assume DTOs are shape-valid.

## 6. Paging + filter shape

Standard pager DTO ([CommonDtos.cs](../../../backend/BadmintonFinance.Application/DTOs/CommonDtos.cs)):

```csharp
public class PagedQuery { public int Page = 1; public int PageSize = 20; public string? Search; }
public class PagedResult<T> { public IEnumerable<T> Items; public int Total; public int Page; public int PageSize; }
```

Extended filter DTOs inherit `PagedQuery` and add their own fields, e.g. [`SessionFilterQuery`](../../../backend/BadmintonFinance.Application/DTOs/AdminDtos.cs) adds `From / To / CourtId / Status / SortBy / SortDir`. Bind with `[FromQuery]` on the controller.

`SortBy / SortDir` are free-form strings — services use a `switch` over known column names with fallback to a sensible default. Don't pass user-supplied SQL.

## 7. Routing & method conventions

- Route segments are **kebab-case plural**: `/api/sessions`, `/api/audit-logs`, `/api/funds/main`.
- Use sub-paths for actions on a resource: `/api/sessions/{id}/close`, `/api/sessions/reopen`, `/api/sessions/cancel`. (We use both styles for legacy reasons; prefer `/{id}/{verb}` for new endpoints.)
- Standard verbs: `GET` list/detail, `POST` create/action, `PUT` full update, `DELETE` soft-delete.
- Every controller has `[Authorize]` at class level. Add `[AllowAnonymous]` per-action for auth endpoints — there are exactly 3 anonymous endpoints: login, register, refresh.
- Inject `CancellationToken ct` on every action and propagate it.

## 8. Auth & claims

JWT bearer with `sub` claim = user id (Guid). [CurrentUser.cs](../../../backend/BadmintonFinance.Api/Middlewares/ExceptionMiddleware.cs) reads it via `IHttpContextAccessor`. Use `ICurrentUser` (injected) when you need user id / username / IP — don't read claims directly in services.

For role gating, use `[Authorize(Roles = "Admin")]` — roles are issued during login from `UserRoles` join. Default seeded user `admin` has the `Admin` role.

## 9. CSV / file responses

For file downloads, controllers may return `IActionResult` (the one exception to the envelope rule). Pattern in [AdminController.cs](../../../backend/BadmintonFinance.Api/Controllers/AdminController.cs):

```csharp
return File(new UTF8Encoding(true).GetBytes(sb.ToString()), "text/csv", "name.csv");
```

`UTF8Encoding(true)` writes the BOM so Excel opens Vietnamese characters correctly.

## 10. Adding a new endpoint — minimal checklist

- [ ] Action returns `ApiResponse<T>` or `IActionResult` for files only.
- [ ] No try/catch — exceptions handled by middleware.
- [ ] Throw `NotFoundException` or `BusinessRuleException(code, msg)` for known failure modes.
- [ ] `CancellationToken ct` parameter passed through.
- [ ] Validator exists in `Validators.cs` if there's a request body.
- [ ] Sensitive op (close / cancel / payment / fund adjust / user role change) writes `IAuditLogger.LogAsync`.
- [ ] Route is kebab-case plural.
- [ ] Frontend `api/endpoints.ts` has a typed function for it.
