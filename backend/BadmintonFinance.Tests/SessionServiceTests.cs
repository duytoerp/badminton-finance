using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Domain.Enums;
using BadmintonFinance.Domain.Exceptions;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace BadmintonFinance.Tests;

/// <summary>
/// Tests cover business rules from caulong-business-rules skill.
/// Mobile-critical flows (quick payment, add participant, close session) come first.
/// </summary>
public class SessionServiceTests
{
    // =====================================================================
    // Mobile-critical: add participant (the at-court fast path)
    // =====================================================================

    [Fact]
    public async Task AddParticipant_succeeds_and_recalculates_fees()
    {
        using var f = new TestFixture();
        var session = await f.CreateSessionAsync();
        var p1 = await f.AddPlayerAsync("Alice");
        var p2 = await f.AddPlayerAsync("Bob");

        // Need an expense for FeePerSlot > 0
        await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = session.Id, Amount = 200_000, Description = "Tiền sân" });

        var r1 = await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = session.Id, PlayerId = p1.Id, SlotCount = 1 });
        var r2 = await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = session.Id, PlayerId = p2.Id, SlotCount = 1 });

        r1.Success.Should().BeTrue();
        r2.Success.Should().BeTrue();

        // FeePerSlot = 200_000 / 2 = 100_000; AmountDue per player = 100_000
        var detail = await f.Session.GetDetailAsync(session.Id);
        detail.FeePerSlot.Should().Be(100_000);
        detail.Participants.Should().HaveCount(2);
        detail.Participants.Should().OnlyContain(p => p.AmountDue == 100_000);
    }

    [Fact]
    public async Task AddParticipant_returns_warning_when_player_has_debt()
    {
        using var f = new TestFixture();
        var session = await f.CreateSessionAsync();
        var debtor = await f.AddPlayerAsync("Debtor", debt: 75_000);

        var r = await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = session.Id, PlayerId = debtor.Id, SlotCount = 1 });

        r.Success.Should().BeTrue();
        r.Warnings.Should().ContainSingle()
            .Which.Should().Contain("75.000").And.Contain("nợ");
    }

    [Fact]
    public async Task AddParticipant_fails_with_DUPLICATE_when_already_added()
    {
        using var f = new TestFixture();
        var session = await f.CreateSessionAsync();
        var p = await f.AddPlayerAsync("Alice");
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = session.Id, PlayerId = p.Id, SlotCount = 1 });

        var act = async () => await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = session.Id, PlayerId = p.Id, SlotCount = 1 });

        await act.Should().ThrowAsync<BusinessRuleException>()
            .Where(ex => ex.Code == "DUPLICATE_PARTICIPANT");
    }

    // =====================================================================
    // Mobile-critical: quick payment (1-2 tap flow)
    // =====================================================================

    [Fact]
    public async Task QuickPayment_marks_Paid_when_amount_equals_due()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();
        var p = await f.AddPlayerAsync("Alice");
        await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = s.Id, Amount = 100_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = s.Id, PlayerId = p.Id, SlotCount = 1 });

        var pay = await f.Session.QuickPaymentAsync(new QuickPaymentDto
        { SessionId = s.Id, PlayerId = p.Id, Amount = 100_000, PaymentMethod = PaymentMethod.Cash });

        pay.Success.Should().BeTrue();
        var detail = await f.Session.GetDetailAsync(s.Id);
        var part = detail.Participants.Single();
        part.PaymentStatus.Should().Be(PaymentStatus.Paid);
        part.AmountPaid.Should().Be(100_000);
        part.Debt.Should().Be(0);
    }

    [Fact]
    public async Task QuickPayment_marks_PartialPaid_when_under()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();
        var p = await f.AddPlayerAsync("Alice");
        await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = s.Id, Amount = 100_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = s.Id, PlayerId = p.Id, SlotCount = 1 });

        await f.Session.QuickPaymentAsync(new QuickPaymentDto
        { SessionId = s.Id, PlayerId = p.Id, Amount = 30_000 });

        var part = (await f.Session.GetDetailAsync(s.Id)).Participants.Single();
        part.PaymentStatus.Should().Be(PaymentStatus.PartialPaid);
        part.Debt.Should().Be(70_000);
    }

    [Fact]
    public async Task QuickPayment_warns_when_over_paid()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();
        var p = await f.AddPlayerAsync("Alice");
        await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = s.Id, Amount = 100_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = s.Id, PlayerId = p.Id, SlotCount = 1 });

        var pay = await f.Session.QuickPaymentAsync(new QuickPaymentDto
        { SessionId = s.Id, PlayerId = p.Id, Amount = 150_000 });

        pay.Warnings.Should().ContainSingle().Which.Should().Contain("dư");
        var part = (await f.Session.GetDetailAsync(s.Id)).Participants.Single();
        part.PaymentStatus.Should().Be(PaymentStatus.OverPaid);
    }

    [Fact]
    public async Task QuickPayment_writes_audit_log()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();
        var p = await f.AddPlayerAsync("Alice");
        await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = s.Id, Amount = 100_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = s.Id, PlayerId = p.Id, SlotCount = 1 });
        f.Audit.Entries.Clear();

        await f.Session.QuickPaymentAsync(new QuickPaymentDto
        { SessionId = s.Id, PlayerId = p.Id, Amount = 50_000 });

        f.Audit.Entries.Should().ContainSingle(e => e.Action == "Payment");
    }

    [Fact]
    public async Task QuickPayment_decrements_player_CurrentDebt()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();
        var p = await f.AddPlayerAsync("Debtor", debt: 50_000);
        await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = s.Id, Amount = 100_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = s.Id, PlayerId = p.Id, SlotCount = 1 });

        await f.Session.QuickPaymentAsync(new QuickPaymentDto
        { SessionId = s.Id, PlayerId = p.Id, Amount = 30_000 });

        var refreshed = await f.Db.Players.FindAsync(p.Id);
        refreshed!.CurrentDebt.Should().Be(20_000); // 50k - 30k
    }

    // =====================================================================
    // Close session — the most important guarded action
    // =====================================================================

    [Fact]
    public async Task CloseSession_fails_NO_PARTICIPANTS_when_empty()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();
        await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = s.Id, Amount = 100_000, Description = "Sân" });

        var act = async () => await f.Session.CloseSessionAsync(s.Id);
        await act.Should().ThrowAsync<BusinessRuleException>()
            .Where(ex => ex.Code == "NO_PARTICIPANTS");
    }

    [Fact]
    public async Task CloseSession_fails_NO_COURT_FEE_when_no_expense()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();
        var p = await f.AddPlayerAsync("Alice");
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = s.Id, PlayerId = p.Id, SlotCount = 1 });

        var act = async () => await f.Session.CloseSessionAsync(s.Id);
        await act.Should().ThrowAsync<BusinessRuleException>()
            .Where(ex => ex.Code == "NO_COURT_FEE");
    }

    [Fact]
    public async Task CloseSession_succeeds_pushes_balance_to_fund_and_audits()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();
        var alice = await f.AddPlayerAsync("Alice");
        var bob = await f.AddPlayerAsync("Bob");
        await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = s.Id, Amount = 200_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = s.Id, PlayerId = alice.Id, SlotCount = 1 });
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = s.Id, PlayerId = bob.Id, SlotCount = 1 });
        // Pay full from Alice, nothing from Bob
        await f.Session.QuickPaymentAsync(new QuickPaymentDto
        { SessionId = s.Id, PlayerId = alice.Id, Amount = 100_000 });

        var fundBefore = (await f.Fund.GetMainAsync()).CurrentBalance;
        var result = await f.Session.CloseSessionAsync(s.Id);

        result.Status.Should().Be(SessionStatus.Closed);
        result.TotalIncome.Should().Be(100_000);
        result.TotalExpense.Should().Be(200_000);
        result.Balance.Should().Be(-100_000);

        // Fund delta = Balance
        var fundAfter = (await f.Fund.GetMainAsync()).CurrentBalance;
        (fundAfter - fundBefore).Should().Be(-100_000);

        // Bob's unpaid amount adds to his player debt
        var bobRefreshed = await f.Db.Players.FindAsync(bob.Id);
        bobRefreshed!.CurrentDebt.Should().Be(100_000);

        // Audit log written for Close
        f.Audit.Entries.Should().Contain(e => e.Action == "Close");
    }

    [Fact]
    public async Task CloseSession_fails_ALREADY_CLOSED_on_double_close()
    {
        using var f = new TestFixture();
        var s = await ClosedSessionAsync(f);

        var act = async () => await f.Session.CloseSessionAsync(s.Id);
        await act.Should().ThrowAsync<BusinessRuleException>()
            .Where(ex => ex.Code == "ALREADY_CLOSED");
    }

    [Fact]
    public async Task AddExpense_fails_SESSION_CLOSED_after_close()
    {
        using var f = new TestFixture();
        var s = await ClosedSessionAsync(f);

        var act = async () => await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = s.Id, Amount = 50_000, Description = "Thêm" });

        await act.Should().ThrowAsync<BusinessRuleException>()
            .Where(ex => ex.Code == "SESSION_CLOSED");
    }

    // =====================================================================
    // Reopen + Cancel
    // =====================================================================

    [Fact]
    public async Task ReopenSession_increments_ReopenCount_and_audits()
    {
        using var f = new TestFixture();
        var s = await ClosedSessionAsync(f);
        f.Audit.Entries.Clear();

        await f.Session.ReopenSessionAsync(new ReopenSessionDto
        { SessionId = s.Id, Reason = "Sửa số tiền sân" });

        var refreshed = await f.Db.Sessions.FindAsync(s.Id);
        refreshed!.Status.Should().Be(SessionStatus.Open);
        refreshed.ReopenCount.Should().Be(1);
        refreshed.ReopenReason.Should().Be("Sửa số tiền sân");

        f.Audit.Entries.Should().ContainSingle(e => e.Action == "Reopen")
            .Which.Reason.Should().Be("Sửa số tiền sân");
    }

    [Fact]
    public async Task ReopenSession_fails_NOT_CLOSED_on_open_session()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();

        var act = async () => await f.Session.ReopenSessionAsync(new ReopenSessionDto
        { SessionId = s.Id, Reason = "Thử mở lại" });

        await act.Should().ThrowAsync<BusinessRuleException>()
            .Where(ex => ex.Code == "NOT_CLOSED");
    }

    [Fact]
    public async Task CancelSession_fails_CANNOT_CANCEL_CLOSED()
    {
        using var f = new TestFixture();
        var s = await ClosedSessionAsync(f);

        var act = async () => await f.Session.CancelSessionAsync(new CancelSessionDto
        { SessionId = s.Id, Reason = "Sai" });

        await act.Should().ThrowAsync<BusinessRuleException>()
            .Where(ex => ex.Code == "CANNOT_CANCEL_CLOSED");
    }

    [Fact]
    public async Task CancelSession_sets_status_and_audits()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();

        await f.Session.CancelSessionAsync(new CancelSessionDto
        { SessionId = s.Id, Reason = "Trời mưa" });

        var refreshed = await f.Db.Sessions.FindAsync(s.Id);
        refreshed!.Status.Should().Be(SessionStatus.Cancelled);
        refreshed.Note.Should().Contain("Trời mưa");
        f.Audit.Entries.Should().ContainSingle(e => e.Action == "Cancel");
    }

    // =====================================================================
    // Fee formula edge cases
    // =====================================================================

    [Fact]
    public async Task FeePerSlot_scales_with_slot_count()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();
        var a = await f.AddPlayerAsync("Alice");
        var b = await f.AddPlayerAsync("Bob");
        await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = s.Id, Amount = 300_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = s.Id, PlayerId = a.Id, SlotCount = 2 });
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = s.Id, PlayerId = b.Id, SlotCount = 1 });

        var detail = await f.Session.GetDetailAsync(s.Id);
        detail.TotalSlots.Should().Be(3);
        detail.FeePerSlot.Should().Be(100_000);
        detail.Participants.Single(p => p.PlayerId == a.Id).AmountDue.Should().Be(200_000);
        detail.Participants.Single(p => p.PlayerId == b.Id).AmountDue.Should().Be(100_000);
    }

    [Fact]
    public async Task FeePerSlot_zero_when_no_participants_yet()
    {
        using var f = new TestFixture();
        var s = await f.CreateSessionAsync();
        await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = s.Id, Amount = 200_000, Description = "Sân" });

        var detail = await f.Session.GetDetailAsync(s.Id);
        detail.FeePerSlot.Should().Be(0);
        detail.TotalSlots.Should().Be(0);
    }

    // =====================================================================
    // Helper
    // =====================================================================

    private static async Task<SessionDto> ClosedSessionAsync(TestFixture f)
    {
        var s = await f.CreateSessionAsync();
        var p = await f.AddPlayerAsync("Alice");
        await f.Session.AddExpenseAsync(new CreateExpenseDto
        { SessionId = s.Id, Amount = 100_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto
        { SessionId = s.Id, PlayerId = p.Id, SlotCount = 1 });
        return await f.Session.CloseSessionAsync(s.Id);
    }
}
