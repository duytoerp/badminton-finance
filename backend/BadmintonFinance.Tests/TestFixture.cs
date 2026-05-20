using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Application.Services;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;
using BadmintonFinance.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Tests;

/// <summary>
/// Shared in-memory database + service factory.
/// Each test creates a fresh fixture so DBs don't leak between tests.
/// </summary>
public class TestFixture : IDisposable
{
    public AppDbContext Db { get; }
    public StubAuditLogger Audit { get; }
    public IFundService Fund { get; }
    public IPricingService Pricing { get; }
    public ISessionService Session { get; }
    public IPlayerService Player { get; }

    public BadmintonCourt Court { get; private set; } = default!;
    public BadmintonFund MainFund { get; private set; } = default!;
    public PricingTemplate? DefaultTemplate { get; private set; }

    public TestFixture(bool withDefaultTemplate = false)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"BFTest_{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        Db = new AppDbContext(options);
        Db.Database.EnsureCreated();

        Audit = new StubAuditLogger();
        Fund = new FundService(Db, Audit);
        Pricing = new PricingService(Db);
        Session = new SessionService(Db, Audit, Fund, Pricing);
        Player = new PlayerService(Db);

        Seed(withDefaultTemplate);
    }

    private void Seed(bool withDefaultTemplate)
    {
        Court = new BadmintonCourt { Name = "Sân test", DefaultHourlyRate = 120_000 };
        Db.Courts.Add(Court);
        MainFund = new BadmintonFund { Name = "Quỹ chung", IsActive = true };
        Db.Funds.Add(MainFund);
        if (withDefaultTemplate)
        {
            DefaultTemplate = new PricingTemplate
            {
                Name = "Default", IsDefault = true, IsActive = true,
                Rules = new List<PricingTemplateRule>
                {
                    new() { Gender = Gender.Female, Multiplier = 0.7m },
                    new() { SkillLevel = SkillLevel.Beginner, Multiplier = 0.8m }
                }
            };
            Db.PricingTemplates.Add(DefaultTemplate);
        }
        Db.SaveChanges();
    }

    public async Task<BadmintonPlayer> AddPlayerAsync(
        string name, decimal debt = 0, PlayerType type = PlayerType.Guest,
        Gender? gender = null, SkillLevel? skill = null)
    {
        var p = new BadmintonPlayer
        {
            FullName = name, PlayerType = type, CurrentDebt = debt,
            Gender = gender, SkillLevel = skill
        };
        Db.Players.Add(p);
        await Db.SaveChangesAsync();
        return p;
    }

    public async Task<SessionDto> CreateSessionAsync(string title = "Buổi test", Guid? templateId = null)
    {
        return await Session.CreateAsync(new CreateSessionDto
        {
            Title = title,
            CourtId = Court.Id,
            PlayDate = DateTime.UtcNow.Date,
            StartTime = new TimeSpan(19, 0, 0),
            EndTime = new TimeSpan(21, 0, 0),
            CourtCount = 1,
            PricingTemplateId = templateId
        });
    }

    public void Dispose() => Db.Dispose();
}

public class StubAuditLogger : IAuditLogger
{
    public List<(string Entity, string EntityId, string Action, string? Reason)> Entries { get; } = new();

    public Task LogAsync(string entityName, string entityId, string action,
        object? oldValue, object? newValue, string? reason = null, CancellationToken ct = default)
    {
        Entries.Add((entityName, entityId, action, reason));
        return Task.CompletedTask;
    }
}
