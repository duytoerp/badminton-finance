---
name: caulong-business-rules
description: The non-negotiable domain rules of the Badminton Finance app — when sessions can be closed/reopened/cancelled, how PaymentStatus is computed, the fee formula, what must be audit-logged. Load before changing anything in SessionService, FundService, or related controllers; load to verify a proposed change doesn't violate these rules.
---

# Business rules — DO NOT silently weaken any of these

All enforcement lives in [SessionService.cs](../../../backend/BadmintonFinance.Application/Services/SessionService.cs) and [FundService.cs](../../../backend/BadmintonFinance.Application/Services/FundService.cs). If you change one of these, first state explicitly which rule you are changing and why.

## 1. Session status transitions

```
Draft ─────► Open ─────► Closed
   │           │           │
   └──── Cancelled ◄───────┘  ✗ Cannot cancel a Closed session — must Reopen first.
                              │
                  Closed ────► Open  (only via ReopenSession with reason ≥ 5 chars)
```

- **Cannot modify a `Closed` session.** All mutating ops (AddParticipant, RemoveParticipant, AddExpense, etc.) call `EnsureNotClosed(session)`. To edit, frontend must call `POST /api/sessions/reopen` with `reason`.
- `ReopenSession` increments `ReopenCount` and stores `ReopenReason`. Both are visible in audit log.
- `CancelSession` writes `[Cancelled] {reason}` into `Session.Note` and audit-logs the status change.

Error codes thrown:
- `SESSION_CLOSED` — generic edit-on-closed
- `ALREADY_CLOSED` — double-close
- `NOT_CLOSED` — reopen on non-Closed
- `CANNOT_CANCEL_CLOSED` — cancel on Closed
- `SESSION_CANCELLED` / `CANCELLED` — touched a cancelled session

## 2. CloseSession preconditions

In `SessionService.CloseSessionAsync`:

1. Session must have **at least one participant**, else `NO_PARTICIPANTS`.
2. Session must have **at least one Expense transaction with amount > 0**, else `NO_COURT_FEE`.
3. On success:
   - Recalculate fees (see formula below).
   - Update each participant's `PaymentStatus`.
   - For each unpaid participant: `player.CurrentDebt += unpaid`.
   - Set `TotalIncome / TotalExpense / Balance / Status / ClosedAt`.
   - Call `IFundService.AdjustAsync(fundId, session.Balance, "Chốt buổi …")` — this pushes balance to the fund and writes a `BadmintonFundTransaction`.
   - Call `IAuditLogger.LogAsync(nameof(BadmintonSession), id, "Close", …)`.

These steps run inside `SaveChangesAsync` so they're transactional. **Don't split them**; if you have to add a step, make sure failures roll back the whole close.

## 3. Adding a player with prior debt is allowed — but must warn

`AddParticipantAsync` returns `ApiResponse<ParticipantDto>` with a `warnings` list. If `player.CurrentDebt > 0`, push a Vietnamese warning. Frontend reads `result.warnings` and shows a yellow banner.

This is the only case where the success path also carries a warning — don't repurpose the warnings array for actual errors.

## 4. PaymentStatus computation

Lives in `ComputePaymentStatus(due, paid)` in [SessionService.cs](../../../backend/BadmintonFinance.Application/Services/SessionService.cs):

| Condition | Status |
|---|---|
| `paid <= 0` | `Unpaid` |
| `0 < paid < due` | `PartialPaid` |
| `paid == due` | `Paid` |
| `paid > due` | `OverPaid` (warning fires on quick payment) |

Never branch on `paid >= due` — `OverPaid` must be visible to users.

## 5. Fee formula

In `RecalculateFees(session)`. Runs **every time** participants or expenses change.

```
TotalExpense = Σ session.Transactions where TransactionType == Expense
TotalSlots   = Σ session.Participants.SlotCount
FeePerSlot   = TotalExpense / TotalSlots   (rounded to whole VND via Math.Round(_, 0))
                                            (= 0 if TotalSlots == 0)
AmountDue    = FeePerSlot * SlotCount   (per participant)
TotalIncome  = Σ session.Transactions where TransactionType == Income
Balance      = TotalIncome - TotalExpense
```

Don't switch rounding mode without buy-in — banker's rounding would surprise users.

## 6. Audit log is mandatory

Every Close / Reopen / Cancel / Payment / fund Adjust calls `IAuditLogger.LogAsync(entityName, entityId, action, oldValue, newValue, reason?)`. The reason field is **required** for Reopen and Cancel.

Existing actions in use:
| Entity | Actions |
|---|---|
| `BadmintonSession` | `Close`, `Reopen`, `Cancel` |
| `BadmintonTransaction` | `Payment` |
| `BadmintonFund` | `Adjust` |

When adding a new sensitive op, follow the same shape: `LogAsync(nameof(MyEntity), id.ToString(), "MyAction", old, new, reason?)`.

## 7. Player.CurrentDebt is a denormalized total

It is updated in two places:
- `CloseSessionAsync` — adds unpaid amount on close.
- `QuickPaymentAsync` — subtracts paid amount immediately (clamped at 0).

If you write any new code that should affect debt, update `CurrentDebt` at the right step or risk drift. The source-of-truth check is:

```
player.CurrentDebt  ?=  Σ over participations: max(0, AmountDue - AmountPaid)
                       where session.Status == Closed
```

(Mismatch can be detected; we don't currently have a reconciliation job.)

## 8. Soft delete via IsDeleted

`BadmintonPlayer`, `BadmintonCourt`, `BadmintonSession` have global `HasQueryFilter(x => !x.IsDeleted)`. **Don't bypass with `IgnoreQueryFilters()` casually** — it will leak deleted rows into reports and dashboards.

To "delete" → set `IsDeleted = true; UpdatedAt = UtcNow`.

## Quick check before merging a change

- [ ] Did I weaken any of the close/reopen rules? If yes — confirm with user.
- [ ] Did I add a sensitive op without `IAuditLogger.LogAsync`? Add it.
- [ ] Does my new code touch `Player.CurrentDebt`? Walk through the formula and check both write paths.
- [ ] If I added a new BusinessRuleException — is the code an UPPER_SNAKE stable string? (Frontend may switch on it.)
- [ ] Did my change to RecalculateFees stay deterministic and idempotent? It runs many times per request.
