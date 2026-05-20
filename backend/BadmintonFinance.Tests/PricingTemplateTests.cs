using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Domain.Enums;
using FluentAssertions;
using Xunit;

namespace BadmintonFinance.Tests;

public class PricingTemplateTests
{
    [Fact]
    public async Task ResolveMultiplier_returns_1_when_no_template()
    {
        using var f = new TestFixture();
        var m = (await f.Pricing.ResolveAsync(null, Gender.Female, SkillLevel.Beginner)).Multiplier;
        m.Should().Be(1.0m);
    }

    [Fact]
    public async Task ResolveMultiplier_uses_gender_rule()
    {
        using var f = new TestFixture(withDefaultTemplate: true);
        var m = (await f.Pricing.ResolveAsync(f.DefaultTemplate!.Id, Gender.Female, SkillLevel.Advanced)).Multiplier;
        m.Should().Be(0.7m);
    }

    [Fact]
    public async Task ResolveMultiplier_uses_skill_rule_when_no_gender_match()
    {
        using var f = new TestFixture(withDefaultTemplate: true);
        var m = (await f.Pricing.ResolveAsync(f.DefaultTemplate!.Id, Gender.Male, SkillLevel.Beginner)).Multiplier;
        m.Should().Be(0.8m);
    }

    [Fact]
    public async Task ResolveMultiplier_falls_back_to_1_when_no_rule_matches()
    {
        using var f = new TestFixture(withDefaultTemplate: true);
        var m = (await f.Pricing.ResolveAsync(f.DefaultTemplate!.Id, Gender.Male, SkillLevel.Advanced)).Multiplier;
        m.Should().Be(1.0m);
    }

    [Fact]
    public async Task ResolveMultiplier_picks_most_specific_when_both_match()
    {
        using var f = new TestFixture();
        // Build a custom template with a both-criteria rule that should win over single-criterion rules.
        var t = await f.Pricing.CreateAsync(new UpsertPricingTemplateDto
        {
            Name = "Custom", IsDefault = false,
            Rules = new()
            {
                new() { Gender = Gender.Female, SkillLevel = null, Multiplier = 0.7m },
                new() { Gender = null, SkillLevel = SkillLevel.Beginner, Multiplier = 0.8m },
                new() { Gender = Gender.Female, SkillLevel = SkillLevel.Beginner, Multiplier = 0.5m }
            }
        });

        var m = (await f.Pricing.ResolveAsync(t.Id, Gender.Female, SkillLevel.Beginner)).Multiplier;
        m.Should().Be(0.5m);
    }

    [Fact]
    public async Task ResolveMultiplier_never_returns_zero_even_if_rule_says_so()
    {
        using var f = new TestFixture();
        var t = await f.Pricing.CreateAsync(new UpsertPricingTemplateDto
        {
            Name = "Custom", IsDefault = false,
            Rules = new() { new() { Gender = Gender.Male, Multiplier = 0m } }
        });
        var m = (await f.Pricing.ResolveAsync(t.Id, Gender.Male, null)).Multiplier;
        m.Should().Be(1.0m); // guardrail
    }

    [Fact]
    public async Task CreateSession_auto_assigns_default_template()
    {
        using var f = new TestFixture(withDefaultTemplate: true);
        var s = await f.CreateSessionAsync();
        s.PricingTemplateId.Should().Be(f.DefaultTemplate!.Id);
    }

    [Fact]
    public async Task AddParticipant_snapshots_multiplier_from_template()
    {
        using var f = new TestFixture(withDefaultTemplate: true);
        var s = await f.CreateSessionAsync();
        var alice = await f.AddPlayerAsync("Alice", gender: Gender.Female, skill: SkillLevel.Advanced);
        await f.Session.AddExpenseAsync(new CreateExpenseDto { SessionId = s.Id, Amount = 100_000, Description = "Sân" });

        await f.Session.AddParticipantAsync(new AddParticipantDto { SessionId = s.Id, PlayerId = alice.Id, SlotCount = 1 });

        var detail = await f.Session.GetDetailAsync(s.Id);
        detail.Participants.Single().Multiplier.Should().Be(0.7m);
    }

    [Fact]
    public async Task WeightedFee_charges_female_70percent_male_100percent()
    {
        using var f = new TestFixture(withDefaultTemplate: true);
        var s = await f.CreateSessionAsync();
        var alice = await f.AddPlayerAsync("Alice", gender: Gender.Female);
        var bob = await f.AddPlayerAsync("Bob", gender: Gender.Male);
        await f.Session.AddExpenseAsync(new CreateExpenseDto { SessionId = s.Id, Amount = 170_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto { SessionId = s.Id, PlayerId = alice.Id, SlotCount = 1 });
        await f.Session.AddParticipantAsync(new AddParticipantDto { SessionId = s.Id, PlayerId = bob.Id, SlotCount = 1 });

        // WeightedSlots = 0.7 + 1.0 = 1.7 → FeePerSlot = 170_000 / 1.7 = 100_000
        // Alice AmountDue = 100_000 * 1 * 0.7 = 70_000
        // Bob   AmountDue = 100_000 * 1 * 1.0 = 100_000
        // Sum = 170_000 = total expense → balanced
        var detail = await f.Session.GetDetailAsync(s.Id);
        detail.FeePerSlot.Should().Be(100_000);
        detail.Participants.Single(p => p.PlayerId == alice.Id).AmountDue.Should().Be(70_000);
        detail.Participants.Single(p => p.PlayerId == bob.Id).AmountDue.Should().Be(100_000);
        detail.Participants.Sum(p => p.AmountDue).Should().Be(170_000);
    }

    [Fact]
    public async Task TemplateEdit_after_AddParticipant_does_not_change_snapshot()
    {
        using var f = new TestFixture(withDefaultTemplate: true);
        var s = await f.CreateSessionAsync();
        var alice = await f.AddPlayerAsync("Alice", gender: Gender.Female);
        await f.Session.AddExpenseAsync(new CreateExpenseDto { SessionId = s.Id, Amount = 100_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto { SessionId = s.Id, PlayerId = alice.Id, SlotCount = 1 });

        // Edit template: bump female to 0.5
        await f.Pricing.UpdateAsync(f.DefaultTemplate!.Id, new UpsertPricingTemplateDto
        {
            Name = f.DefaultTemplate.Name, IsDefault = true,
            Rules = new() { new() { Gender = Gender.Female, Multiplier = 0.5m } }
        });

        // Existing participant retains its 0.7 snapshot
        var detail = await f.Session.GetDetailAsync(s.Id);
        detail.Participants.Single().Multiplier.Should().Be(0.7m);
    }

    // ====================================================================
    // FixedAmount mode tests
    // ====================================================================

    [Fact]
    public async Task FixedAmount_mode_charges_per_slot_per_rule_amount()
    {
        using var f = new TestFixture();
        var tpl = await f.Pricing.CreateAsync(new UpsertPricingTemplateDto
        {
            Name = "Fixed", IsDefault = true, Mode = PricingMode.FixedAmount,
            Rules = new()
            {
                new() { Gender = Gender.Male, FixedAmount = 100_000m },
                new() { Gender = Gender.Female, FixedAmount = 70_000m }
            }
        });
        var s = await f.CreateSessionAsync(templateId: tpl.Id);
        var alice = await f.AddPlayerAsync("Alice", gender: Gender.Female);
        var bob = await f.AddPlayerAsync("Bob", gender: Gender.Male);
        // Expense doesn't drive fee in this mode but is still recorded
        await f.Session.AddExpenseAsync(new CreateExpenseDto { SessionId = s.Id, Amount = 200_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto { SessionId = s.Id, PlayerId = alice.Id, SlotCount = 1 });
        await f.Session.AddParticipantAsync(new AddParticipantDto { SessionId = s.Id, PlayerId = bob.Id, SlotCount = 2 });

        var detail = await f.Session.GetDetailAsync(s.Id);
        detail.PricingMode.Should().Be(PricingMode.FixedAmount);
        detail.Participants.Single(p => p.PlayerId == alice.Id).AmountDue.Should().Be(70_000);   // 70k × 1 slot
        detail.Participants.Single(p => p.PlayerId == bob.Id).AmountDue.Should().Be(200_000);   // 100k × 2 slots
        // Sum collected (270k) > expense (200k); the fund absorbs the +70k surplus on close.
        detail.Participants.Sum(p => p.AmountDue).Should().Be(270_000);
    }

    [Fact]
    public async Task FixedAmount_mode_falls_back_to_zero_when_no_matching_rule()
    {
        using var f = new TestFixture();
        var tpl = await f.Pricing.CreateAsync(new UpsertPricingTemplateDto
        {
            Name = "Fixed (male only)", Mode = PricingMode.FixedAmount,
            Rules = new() { new() { Gender = Gender.Male, FixedAmount = 100_000m } }
        });
        var s = await f.CreateSessionAsync(templateId: tpl.Id);
        var alice = await f.AddPlayerAsync("Alice", gender: Gender.Female);
        await f.Session.AddExpenseAsync(new CreateExpenseDto { SessionId = s.Id, Amount = 100_000, Description = "Sân" });
        await f.Session.AddParticipantAsync(new AddParticipantDto { SessionId = s.Id, PlayerId = alice.Id, SlotCount = 1 });

        var detail = await f.Session.GetDetailAsync(s.Id);
        detail.Participants.Single().FixedAmount.Should().Be(0);
        detail.Participants.Single().AmountDue.Should().Be(0);
    }

    // ====================================================================
    // EqualPerHead mode tests
    // ====================================================================

    [Fact]
    public async Task EqualPerHead_mode_splits_total_evenly_regardless_of_slot_or_gender()
    {
        using var f = new TestFixture();
        var tpl = await f.Pricing.CreateAsync(new UpsertPricingTemplateDto
        {
            Name = "Equal", IsDefault = true, Mode = PricingMode.EqualPerHead,
            Rules = new()  // rules are ignored in this mode but harmless
        });
        var s = await f.CreateSessionAsync(templateId: tpl.Id);
        var p1 = await f.AddPlayerAsync("A", gender: Gender.Female);
        var p2 = await f.AddPlayerAsync("B", gender: Gender.Male);
        var p3 = await f.AddPlayerAsync("C", skill: SkillLevel.Beginner);
        await f.Session.AddExpenseAsync(new CreateExpenseDto { SessionId = s.Id, Amount = 300_000, Description = "Sân" });
        // Different slot counts to prove they're ignored
        await f.Session.AddParticipantAsync(new AddParticipantDto { SessionId = s.Id, PlayerId = p1.Id, SlotCount = 1 });
        await f.Session.AddParticipantAsync(new AddParticipantDto { SessionId = s.Id, PlayerId = p2.Id, SlotCount = 5 });
        await f.Session.AddParticipantAsync(new AddParticipantDto { SessionId = s.Id, PlayerId = p3.Id, SlotCount = 2 });

        var detail = await f.Session.GetDetailAsync(s.Id);
        detail.PricingMode.Should().Be(PricingMode.EqualPerHead);
        detail.FeePerSlot.Should().Be(100_000); // = 300k / 3 head
        detail.Participants.Should().OnlyContain(p => p.AmountDue == 100_000);
    }

    [Fact]
    public async Task EqualPerHead_zero_expense_yields_zero_due()
    {
        using var f = new TestFixture();
        var tpl = await f.Pricing.CreateAsync(new UpsertPricingTemplateDto
        {
            Name = "Equal", Mode = PricingMode.EqualPerHead
        });
        var s = await f.CreateSessionAsync(templateId: tpl.Id);
        var alice = await f.AddPlayerAsync("Alice");
        await f.Session.AddExpenseAsync(new CreateExpenseDto { SessionId = s.Id, Amount = 0.01m, Description = "x" });
        await f.Session.AddParticipantAsync(new AddParticipantDto { SessionId = s.Id, PlayerId = alice.Id, SlotCount = 1 });

        var detail = await f.Session.GetDetailAsync(s.Id);
        // 0.01 / 1 rounded to whole VND = 0
        detail.Participants.Single().AmountDue.Should().Be(0);
    }

    [Fact]
    public async Task CreateSession_snapshots_template_Mode()
    {
        using var f = new TestFixture();
        var tpl = await f.Pricing.CreateAsync(new UpsertPricingTemplateDto
        {
            Name = "Eq", IsDefault = true, Mode = PricingMode.EqualPerHead
        });
        var s = await f.CreateSessionAsync(templateId: tpl.Id);
        s.PricingMode.Should().Be(PricingMode.EqualPerHead);

        // Edit template to a different mode — existing session keeps its snapshot
        await f.Pricing.UpdateAsync(tpl.Id, new UpsertPricingTemplateDto
        { Name = tpl.Name, Mode = PricingMode.WeightedSlot });

        var detail = await f.Session.GetDetailAsync(s.Id);
        detail.PricingMode.Should().Be(PricingMode.EqualPerHead);
    }
}
