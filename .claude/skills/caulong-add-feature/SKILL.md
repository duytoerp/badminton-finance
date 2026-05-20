---
name: caulong-add-feature
description: End-to-end recipe to add a new entity / feature to the Badminton Finance app (backend + frontend). Use when asked to "add a Snack table", "manage equipment", "add late-fee tracking", or any other domain extension. Walks through the 11 files you'll touch and the order to touch them in.
---

# Adding a new feature end-to-end

Example throughout: adding **`Snack`** (đồ ăn vặt bán tại sân, ai mua phải trả).

## Order matters — go through these 11 steps top-to-bottom

### 1. Entity in Domain

Create `backend/BadmintonFinance.Domain/Entities/Snack.cs`. Inherit `BaseEntity` (gives Id/CreatedAt/UpdatedAt/IsDeleted).

```csharp
public class Snack : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;
}
```

### 2. Register in DbContext

Edit [AppDbContext.cs](../../../backend/BadmintonFinance.Infrastructure/Persistence/AppDbContext.cs):

```csharp
public DbSet<Snack> Snacks => Set<Snack>();

// inside OnModelCreating:
b.Entity<Snack>(e => {
    e.ToTable("Snack");
    e.Property(x => x.Name).HasMaxLength(150).IsRequired();
    e.Property(x => x.Price).HasColumnType("decimal(18,2)");
    e.HasQueryFilter(x => !x.IsDeleted);
});
```

### 3. Create EF migration

```powershell
cd "c:\Project VL\backend\BadmintonFinance.Api"
dotnet ef migrations add AddSnack --project ..\BadmintonFinance.Infrastructure --startup-project .
```

The next `dotnet run` will auto-apply via `db.Database.Migrate()` in [Program.cs](../../../backend/BadmintonFinance.Api/Program.cs).

### 4. DTOs

New file `backend/BadmintonFinance.Application/DTOs/SnackDtos.cs`:

```csharp
public class SnackDto { public Guid Id; public string Name; public decimal Price; public bool IsActive; }
public class CreateSnackDto { public string Name; public decimal Price; }
```

(Use real C# property syntax — auto-properties — this is shorthand.)

### 5. Validators

Append to existing [Validators.cs](../../../backend/BadmintonFinance.Application/Validators/Validators.cs):

```csharp
public class CreateSnackValidator : AbstractValidator<CreateSnackDto>
{
    public CreateSnackValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
    }
}
```

FluentValidation is auto-discovered (`AddValidatorsFromAssemblyContaining<CreatePlayerValidator>()` in Program.cs).

### 6. Service interface

Add to [Interfaces.cs](../../../backend/BadmintonFinance.Application/Interfaces/Interfaces.cs):

```csharp
public interface ISnackService
{
    Task<IEnumerable<SnackDto>> ListAsync(CancellationToken ct = default);
    Task<SnackDto> CreateAsync(CreateSnackDto dto, CancellationToken ct = default);
}
```

### 7. Service implementation

`backend/BadmintonFinance.Application/Services/SnackService.cs`. Inject `DbContext` (not `AppDbContext` — Application layer doesn't reference Infrastructure):

```csharp
public class SnackService : ISnackService
{
    private readonly DbContext _db;
    public SnackService(DbContext db) { _db = db; }
    // ... use _db.Set<Snack>() ...
}
```

If you need to **change session balance** or **fund**, inject `IFundService` + `IAuditLogger` and call them — never write to those tables directly.

### 8. Register in Program.cs

```csharp
builder.Services.AddScoped<ISnackService, SnackService>();
```

### 9. Controller

`backend/BadmintonFinance.Api/Controllers/SnackController.cs`. Mirror the pattern in [PlayerController.cs](../../../backend/BadmintonFinance.Api/Controllers/PlayerController.cs) — every action returns `ApiResponse<T>`, controller is thin:

```csharp
[ApiController][Authorize][Route("api/snacks")]
public class SnackController : ControllerBase
{
    private readonly ISnackService _svc;
    public SnackController(ISnackService svc) { _svc = svc; }

    [HttpGet] public async Task<ApiResponse<IEnumerable<SnackDto>>> List(CancellationToken ct)
        => ApiResponse<IEnumerable<SnackDto>>.Ok(await _svc.ListAsync(ct));

    [HttpPost] public async Task<ApiResponse<SnackDto>> Create(CreateSnackDto dto, CancellationToken ct)
        => ApiResponse<SnackDto>.Ok(await _svc.CreateAsync(dto, ct));
}
```

Never `return BadRequest(...)`. Throw `BusinessRuleException` / `NotFoundException` instead — see [caulong-api-conventions](../caulong-api-conventions/SKILL.md).

### 10. Frontend API client

Append to [frontend/src/api/endpoints.ts](../../../frontend/src/api/endpoints.ts):

```typescript
export interface Snack { id: string; name: string; price: number; isActive: boolean; }

export const listSnacks  = () => api.get<ApiResponse<Snack[]>>('/snacks').then(r => r.data);
export const createSnack = (body: Partial<Snack>) =>
  api.post<ApiResponse<Snack>>('/snacks', body).then(r => r.data);
```

### 11. React page + navigation

- Create `frontend/src/pages/Snacks.tsx`. Mirror [Courts.tsx](../../../frontend/src/pages/Courts.tsx) — it's the simplest dual-layout template: `useIsDesktop()` switches between `<DataTable>` and card list, with a shared `<ResponsiveSheet>` for the create form.
- Add route in [App.tsx](../../../frontend/src/App.tsx):
  ```tsx
  <Route path="/snacks" element={<RequireAuth><Snacks /></RequireAuth>} />
  ```
- Add link in [Sidebar.tsx](../../../frontend/src/components/layout/Sidebar.tsx) (desktop) and/or [BottomNav.tsx](../../../frontend/src/components/layout/BottomNav.tsx) (mobile).

## After all 11 steps

```powershell
cd "c:\Project VL\backend";  dotnet build BadmintonFinance.slnx     # backend
cd "c:\Project VL\frontend"; npx tsc --noEmit                       # frontend types
```

Then restart the dev servers (see [caulong-run](../caulong-run/SKILL.md)).

## Common mistakes

- **Forgetting the validator** — request goes through, broken data ends up in DB. Validators auto-fire from FluentValidation middleware.
- **Forgetting to register the service** in Program.cs — DI will throw at first request.
- **Referencing `AppDbContext` in Application layer** — Application only knows `DbContext`. Infrastructure project doesn't even get referenced by Application.
- **Returning raw entity** instead of DTO — entities expose navigation properties that serialize into cycles.
- **Skipping migration** — if EnsureCreated is no longer used, you must `dotnet ef migrations add` or your changes won't reach the DB.
- **Adding a desktop-only or mobile-only page** — every page must render at both breakpoints. See [caulong-frontend-responsive](../caulong-frontend-responsive/SKILL.md).
