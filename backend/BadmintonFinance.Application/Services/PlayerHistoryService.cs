using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class PlayerHistoryService : IPlayerHistoryService
{
    private readonly DbContext _db;
    public PlayerHistoryService(DbContext db) { _db = db; }

    public async Task<PlayerHistoryDto> GetHistoryAsync(Guid playerId, CancellationToken ct = default)
    {
        var player = await _db.Set<BadmintonPlayer>().AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == playerId, ct)
            ?? throw new NotFoundException(nameof(BadmintonPlayer), playerId);

        var parts = await _db.Set<BadmintonSessionParticipant>().AsNoTracking()
            .Include(x => x.Session)
            .Where(x => x.PlayerId == playerId)
            .OrderByDescending(x => x.Session!.PlayDate)
            .Select(x => new ParticipantDto
            {
                Id = x.Id, SessionId = x.SessionId, PlayerId = x.PlayerId,
                PlayerName = player.FullName,
                SlotCount = x.SlotCount, AmountDue = x.AmountDue, AmountPaid = x.AmountPaid,
                Debt = x.AmountDue - x.AmountPaid, PaymentStatus = x.PaymentStatus,
                IsGuest = x.IsGuest, Note = x.Note
            }).ToListAsync(ct);

        return new PlayerHistoryDto
        {
            PlayerId = player.Id, PlayerName = player.FullName,
            TotalSessions = parts.Count,
            TotalDue = parts.Sum(p => p.AmountDue),
            TotalPaid = parts.Sum(p => p.AmountPaid),
            CurrentDebt = player.CurrentDebt,
            Sessions = parts
        };
    }
}
