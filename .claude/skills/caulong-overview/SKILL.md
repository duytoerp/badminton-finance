---
name: caulong-overview
description: Load this skill whenever working in c:\Project VL (the Badminton Finance app). Gives map of the codebase — clean-architecture .NET 8 backend + React/Vite frontend with dual mobile/desktop layout — and the high-level domain (sessions, participants, transactions, fund, audit log). Always relevant first; other caulong-* skills cover specific tasks.
---

# Badminton Finance — project overview

App quản lý thu chi cho **nhóm cầu lông vãng lai**. Mobile-first dùng tại sân, desktop responsive cho admin/thủ quỹ.

## Stack

| Layer | Tech |
|---|---|
| Backend | ASP.NET Core 8 Web API, EF Core 8, FluentValidation |
| DB | SQL Server (local `MSSQLSERVER` instance), connection in [appsettings.json](../../../backend/BadmintonFinance.Api/appsettings.json) |
| Auth | JWT (HMAC SHA256) + refresh token, BCrypt password hash |
| Frontend | React 18 + TypeScript + Vite 5, react-router 6, zustand, axios |
| PWA | vite-plugin-pwa (opt-in via `ENABLE_PWA=1`, requires Node ≥ 20) |

## Solution layout

```
backend/
  BadmintonFinance.Domain/         Entities, Enums, Exceptions — no dependencies
  BadmintonFinance.Application/    DTOs, Validators, Service interfaces & implementations
  BadmintonFinance.Infrastructure/ AppDbContext, Migrations, AuthService, AuditLogger
  BadmintonFinance.Api/            Controllers, Program.cs, ExceptionMiddleware

frontend/src/
  api/         axios client + endpoint functions (one per controller-ish)
  components/  layout/ (Shell, Sidebar, AppBar, BottomNav) + common/ (DataTable, Drawer, Modal, BottomSheet, ResponsiveSheet, BarChart, PlayerCard, StatusBadge)
  hooks/       useBreakpoint
  pages/       one file per route; admin/ subfolder for Users + AuditLog
  store/       auth.ts (zustand)
  styles/      global.css (mobile-first tokens) + desktop.css (sidebar, table, drawer)
```

## Domain glossary

- **Session** (`BadmintonSession`): one play day on a court. Status flow `Draft → Open → Closed`, or `Cancelled`.
- **Participant** (`BadmintonSessionParticipant`): player joined a session, with `SlotCount`, `AmountDue`, `AmountPaid`, `PaymentStatus`.
- **Transaction** (`BadmintonTransaction`): a single income/expense/adjustment line attached to a session and optionally a player.
- **Fund** (`BadmintonFund`): the group's money jar. Receives `session.Balance` on close. All movements logged in `BadmintonFundTransaction`.
- **AuditLog**: every sensitive op writes here — Close, Reopen, Cancel, Payment, Adjust. See [AuditLogger](../../../backend/BadmintonFinance.Infrastructure/Auth/AuthService.cs).

Formula:
```
FeePerSlot       = TotalExpense / TotalSlots   (slot = 1 turn; one player can take SlotCount slots)
AmountDue        = FeePerSlot * SlotCount
ParticipantDebt  = AmountDue - AmountPaid
SessionBalance   = TotalIncome - TotalExpense
FundBalance     += SessionBalance (on close)
```

## Default credentials (dev only)

`admin / Admin@123` — seeded by [DbSeeder.cs](../../../backend/BadmintonFinance.Infrastructure/Persistence/DbSeeder.cs).

## Where things live (cheat sheet)

| You want to… | Look at |
|---|---|
| Add a new entity | [caulong-add-feature](../caulong-add-feature/SKILL.md) |
| Understand close/reopen/payment rules | [caulong-business-rules](../caulong-business-rules/SKILL.md) |
| Run dev server / fix port issues | [caulong-run](../caulong-run/SKILL.md) |
| Make a page work on both mobile + desktop | [caulong-frontend-responsive](../caulong-frontend-responsive/SKILL.md) |
| Wrap a controller response / pick error code | [caulong-api-conventions](../caulong-api-conventions/SKILL.md) |

## Conventions to never break

1. All controller actions return `ApiResponse<T>` from [CommonDtos.cs](../../../backend/BadmintonFinance.Application/DTOs/CommonDtos.cs). Errors go through [ExceptionMiddleware](../../../backend/BadmintonFinance.Api/Middlewares/ExceptionMiddleware.cs) — never `return BadRequest(...)`.
2. Business-rule failures throw `BusinessRuleException(code, message)` with a **stable UPPER_SNAKE error code** the frontend can switch on.
3. Every Close / Reopen / Cancel / Payment / Adjust call `IAuditLogger.LogAsync(...)`.
4. Every UI page must render correctly at both **mobile (<768px)** and **desktop (≥1024px)** — see frontend-responsive skill.
5. Validators (FluentValidation) live in one file, [Validators.cs](../../../backend/BadmintonFinance.Application/Validators/Validators.cs) — add new ones there, not in scattered files.
