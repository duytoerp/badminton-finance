using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

/// <summary>
/// Generates a doubles-match schedule for a session (4 players per court per round).
/// Goals: (1) everyone plays roughly the same number of games, (2) each match is
/// skill-balanced (Mixed mode) or grouped by similar level (Similar mode).
/// Stateless — does not persist the plan.
/// </summary>
public class MatchPlannerService : IMatchPlannerService
{
    private readonly DbContext _db;
    public MatchPlannerService(DbContext db) { _db = db; }

    public async Task<MatchPlanDto> GenerateAsync(GenerateMatchPlanDto dto, CancellationToken ct = default)
    {
        var session = await _db.Set<BadmintonSession>().AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == dto.SessionId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), dto.SessionId);

        if (session.Status == SessionStatus.Cancelled)
            throw new BusinessRuleException("CANCELLED", "Buổi đã bị hủy.");

        var allParticipants = await _db.Set<BadmintonSessionParticipant>().AsNoTracking()
            .Where(p => p.SessionId == dto.SessionId)
            .Include(p => p.Player)
            .ToListAsync(ct);

        var totalCount = allParticipants.Count;
        var checkedInCount = allParticipants.Count(p => p.CheckedInAt != null);

        // Restrict to checked-in if requested.
        var participants = allParticipants;
        var fellBack = false;
        if (dto.OnlyCheckedIn)
        {
            if (checkedInCount > 0)
                participants = allParticipants.Where(p => p.CheckedInAt != null).ToList();
            else
                fellBack = true;
        }

        if (dto.ParticipantIds.Count > 0)
        {
            var picked = dto.ParticipantIds.ToHashSet();
            participants = participants.Where(p => picked.Contains(p.Id)).ToList();
        }

        var rounds = Math.Clamp(dto.Rounds <= 0 ? 6 : dto.Rounds, 1, 30);
        var requestedCourts = dto.CourtCount > 0 ? dto.CourtCount : Math.Max(1, session.CourtCount);
        var skillMode = dto.SkillMode;

        var plan = new MatchPlanDto
        {
            SessionId = session.Id,
            Rounds = rounds,
            CourtCount = requestedCourts,
            SkillMode = skillMode,
            PlayerCount = participants.Count,
            TotalParticipants = totalCount,
            CheckedInCount = checkedInCount,
            OnlyCheckedIn = dto.OnlyCheckedIn
        };

        if (fellBack)
            plan.Notes.Add("Chưa có ai điểm danh — chia tạm dựa trên toàn bộ danh sách.");

        if (participants.Count < 4)
        {
            plan.Notes.Add($"Cần tối thiểu 4 người để chia set (hiện có {participants.Count}).");
            return plan;
        }

        // Cap courts so we don't try to seat more players than exist.
        var maxCourtsByPlayers = participants.Count / 4;
        var courts = Math.Min(requestedCourts, maxCourtsByPlayers);
        if (courts < requestedCourts)
            plan.Notes.Add($"Chỉ chia được {courts} sân/ván (mỗi sân cần 4 người).");
        plan.CourtCount = courts;

        var seatsPerRound = courts * 4;
        plan.SitOutPerRound = participants.Count - seatsPerRound;
        if (plan.SitOutPerRound > 0)
            plan.Notes.Add($"Mỗi ván có {plan.SitOutPerRound} người nghỉ, xoay vòng cho đều.");

        var rng = new Random(dto.Seed != 0 ? dto.Seed : Environment.TickCount);

        // We expose Player IDs in the response (frontend renders player names by id).
        var gamesPlayed = participants.ToDictionary(p => p.PlayerId, _ => 0);

        for (var r = 1; r <= rounds; r++)
        {
            // Pick the seatsPerRound players with the fewest games so far.
            // Tiebreak by a fresh random ordering each round so the same players don't
            // always rest first / play first.
            var selected = participants
                .OrderBy(p => gamesPlayed[p.PlayerId])
                .ThenBy(_ => rng.Next())
                .Take(seatsPerRound)
                .ToList();
            var restingIds = participants.Where(p => !selected.Contains(p)).Select(p => p.PlayerId).ToList();

            // ---- Distribute the selected players across courts so each court has a mix of skill levels.
            // Sort by skill desc (Advanced=2 → Beginner=0; null treated as Intermediate=1).
            var sortedBySkill = selected
                .OrderByDescending(p => SkillScore(p.Player?.SkillLevel))
                .ThenBy(_ => rng.Next())
                .ToList();

            // "Snake" distribution: walk sortedBySkill, dropping each player into a court round-robin
            // (then reversed every cycle) so the four players per court are spread across the skill range.
            var courtBuckets = new List<BadmintonSessionParticipant>[courts];
            for (int i = 0; i < courts; i++) courtBuckets[i] = new List<BadmintonSessionParticipant>();
            for (int i = 0; i < sortedBySkill.Count; i++)
            {
                var cycle = i / courts;
                var pos = i % courts;
                var idx = cycle % 2 == 0 ? pos : courts - 1 - pos;
                courtBuckets[idx].Add(sortedBySkill[i]);
            }

            var round = new MatchRoundDto { Index = r, Resting = restingIds };

            for (int c = 0; c < courts; c++)
            {
                // Each bucket holds exactly 4 players. Pair into 2 teams of 2.
                var four = courtBuckets[c]
                    .OrderByDescending(p => SkillScore(p.Player?.SkillLevel))
                    .ToList();

                List<BadmintonSessionParticipant> team1, team2;
                if (skillMode == MatchSkillMode.Similar)
                {
                    // strong pair vs weak pair (best level-matching)
                    team1 = new() { four[0], four[1] };
                    team2 = new() { four[2], four[3] };
                }
                else
                {
                    // Mixed: pair strongest+weakest vs middles → roughly equal team strength
                    team1 = new() { four[0], four[3] };
                    team2 = new() { four[1], four[2] };
                }

                round.Courts.Add(new MatchCourtDto
                {
                    CourtIndex = c + 1,
                    Team1 = team1.Select(p => p.PlayerId).ToList(),
                    Team2 = team2.Select(p => p.PlayerId).ToList(),
                    Team1Skill = team1.Sum(p => SkillScore(p.Player?.SkillLevel)),
                    Team2Skill = team2.Sum(p => SkillScore(p.Player?.SkillLevel))
                });

                foreach (var p in four) gamesPlayed[p.PlayerId]++;
            }

            plan.RoundsPlan.Add(round);
        }

        plan.Players = participants
            .OrderBy(p => p.Player?.FullName)
            .Select(p => new MatchPlanPlayerDto
            {
                PlayerId = p.PlayerId,
                FullName = p.Player?.FullName ?? "(?)",
                SkillLevel = p.Player?.SkillLevel,
                Gender = p.Player?.Gender,
                GamesPlayed = gamesPlayed[p.PlayerId]
            }).ToList();

        return plan;
    }

    private static int SkillScore(SkillLevel? s) => s switch
    {
        SkillLevel.Advanced => 2,
        SkillLevel.Intermediate => 1,
        SkillLevel.Beginner => 0,
        _ => 1
    };
}
