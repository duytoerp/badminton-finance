---
name: caulong-run
description: How to run, build, restart, migrate, and troubleshoot the Badminton Finance app on the dev machine (Windows, .NET 10 SDK targeting net8.0, Node 18, SQL Server MSSQLSERVER). Load when asked to "run the app", "restart backend/frontend", "the DB is broken", "add a migration", or when something stops working unexpectedly.
---

# Run, build, migrate, troubleshoot

## Prerequisites (already installed in this environment)

| Tool | Version | Verify |
|---|---|---|
| .NET SDK | 10.0.300 (targets net8.0) | `dotnet --version` |
| Node.js | 18.12.1 | `node --version` |
| npm | 8.19.2 | `npm --version` |
| SQL Server | `MSSQLSERVER` instance, Windows Auth | `Get-Service MSSQLSERVER` |
| `dotnet-ef` | 8.0.0 (global tool) | `dotnet ef --version` |

Connection string in [appsettings.json](../../../backend/BadmintonFinance.Api/appsettings.json) — uses `Server=localhost;Trusted_Connection=True`. DB name: `BadmintonFinanceDb`.

## Start the app (two terminals)

**Backend** — listens on `http://localhost:5000`:

```powershell
Set-Location "c:\Project VL\backend\BadmintonFinance.Api"
$env:ASPNETCORE_URLS='http://localhost:5000'
dotnet run
```

On first run, EF Core `db.Database.Migrate()` runs at startup ([Program.cs](../../../backend/BadmintonFinance.Api/Program.cs)) and [DbSeeder.cs](../../../backend/BadmintonFinance.Infrastructure/Persistence/DbSeeder.cs) seeds `admin / Admin@123`, three roles, and the "Quỹ chung" fund.

Swagger UI: `http://localhost:5000/swagger`.

**Frontend** — Vite dev server on `http://localhost:5173`, proxies `/api` → 5000:

```powershell
Set-Location "c:\Project VL\frontend"
npm run dev
```

Both servers are typically launched in the background via the Bash tool with `run_in_background: true` so the chat doesn't block.

## Restart cleanly

When you've changed C# code or added a migration:

```powershell
# Stop the running API (TaskStop from Claude Code, or):
Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Rebuild + run
Set-Location "c:\Project VL\backend"
dotnet build BadmintonFinance.slnx
Set-Location "BadmintonFinance.Api"
$env:ASPNETCORE_URLS='http://localhost:5000'
dotnet run --no-build
```

Frontend HMR picks up `.ts/.tsx` edits live — no restart needed unless you change `vite.config.ts` or install packages.

## Build / typecheck

```powershell
# Backend: catches C# errors
Set-Location "c:\Project VL\backend"
dotnet build BadmintonFinance.slnx --nologo

# Frontend: types only (Vite dev doesn't strict-check)
Set-Location "c:\Project VL\frontend"
npx tsc --noEmit

# Frontend: production bundle (276 KB JS, 9 KB CSS gzipped to ~88 KB)
npm run build
```

Production build skips PWA generation unless `ENABLE_PWA=1` is set (vite-plugin-pwa ≥ 0.21 needs Node ≥ 20; the machine is Node 18).

## EF migrations

Add a migration (after editing entity / `OnModelCreating`):

```powershell
Set-Location "c:\Project VL\backend\BadmintonFinance.Api"
dotnet ef migrations add MyChange --project ..\BadmintonFinance.Infrastructure --startup-project .
```

Apply happens automatically at next `dotnet run` via `db.Database.Migrate()`. To apply without running the app:

```powershell
dotnet ef database update --project ..\BadmintonFinance.Infrastructure --startup-project .
```

Undo an unapplied migration:

```powershell
dotnet ef migrations remove --project ..\BadmintonFinance.Infrastructure --startup-project .
```

There's also a raw SQL script for greenfield install: [001_Initial.sql](../../../backend/BadmintonFinance.Infrastructure/Migrations/001_Initial.sql).

## Smoke test the API quickly

```powershell
$tk = (Invoke-RestMethod 'http://localhost:5000/api/auth/login' -Method Post -ContentType 'application/json' `
       -Body '{"userName":"admin","password":"Admin@123"}').data.accessToken
$h = @{ Authorization="Bearer $tk" }
Invoke-RestMethod 'http://localhost:5000/api/dashboard/stats' -Headers $h
```

Sample REST file: [api-samples.http](../../../docs/api-samples.http) — open in VS Code with REST Client extension.

## Troubleshooting

### "Invalid object name 'Role'" at startup

DB exists but has no tables. Cause: previously ran with `EnsureCreated`-only and migrations are missing.
Fix: ensure at least one migration exists (`dotnet ef migrations list`). If none, generate `InitialCreate` then run.

### Port 5000 already in use

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

(Don't kill arbitrary processes — only do this when you know it's a previous run of the API.)

### Vite "Dynamic require of workbox-build is not supported" / "tracingChannel is not a function"

You're running `npm run build` with PWA enabled on Node 18. Either:
- skip PWA in build: `npm run build` (default — `ENABLE_PWA` unset)
- or upgrade Node to ≥ 20 and `ENABLE_PWA=1 npm run build`

### `CS0234: namespace 'EntityFrameworkCore' does not exist` in Application project

The Application project must reference `Microsoft.EntityFrameworkCore` (for `DbContext`/`IQueryable` extensions). Check [BadmintonFinance.Application.csproj](../../../backend/BadmintonFinance.Application/BadmintonFinance.Application.csproj) — the package is already there. Run `dotnet restore` if it disappeared.

### "BCrypt does not exist" in UserService

Same project also needs `BCrypt.Net-Next` — see csproj.

### Solution file empty / `dotnet sln add` complains

.NET 10's `dotnet new sln` creates a `.slnx` (XML format) by default, not `.sln`. Use the `.slnx` filename consistently. Our solution is [BadmintonFinance.slnx](../../../backend/BadmintonFinance.slnx).

### Frontend login fails with 401 immediately after login

axios interceptor in [client.ts](../../../frontend/src/api/client.ts) wipes token on 401 and redirects to `/login`. Check the network tab — if your fresh JWT comes back invalid, almost always means the `Jwt:Key` in appsettings.json was changed since the token was issued. Log out and back in.

### Migration applied to wrong DB

You changed connection string but the DB you created earlier still has stale schema. Talk to the user **before** dropping any DB — the assistant cannot drop databases without explicit permission (it's blocked in this environment).

## "Run it for me" recipe

When the user says "chạy thử" / "run the app":

1. `dotnet build` the backend (catch errors early).
2. Kill stale processes on port 5000.
3. Start backend `run_in_background: true`.
4. Wait for `Now listening on: http://localhost:5000` in the log (use a poll loop or Monitor).
5. Smoke-test `/api/auth/login` with the seeded admin.
6. `npm install` if `node_modules` is missing.
7. Start Vite `run_in_background: true`.
8. Wait for `Local: http://localhost:5173`.
9. Hit `http://localhost:5173/` to confirm 200.
10. Hit `http://localhost:5173/api/dashboard/stats` (with bearer) to confirm proxy.
