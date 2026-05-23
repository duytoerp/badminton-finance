using System.Globalization;
using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Application.Interfaces;
using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;
using BadmintonFinance.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Application.Services;

public class SessionService : ISessionService
{
    private readonly DbContext _db;
    private readonly IAuditLogger _audit;
    private readonly IFundService _fund;
    private readonly IPricingService _pricing;

    public SessionService(DbContext db, IAuditLogger audit, IFundService fund, IPricingService pricing)
    {
        _db = db; _audit = audit; _fund = fund; _pricing = pricing;
    }

    public async Task<PagedResult<SessionDto>> ListFilteredAsync(SessionFilterQuery q, CancellationToken ct = default)
    {
        var query = _db.Set<BadmintonSession>().AsNoTracking().Include(s => s.Court).AsQueryable();
        if (q.From.HasValue) query = query.Where(s => s.PlayDate >= q.From.Value.Date);
        if (q.To.HasValue) query = query.Where(s => s.PlayDate <= q.To.Value.Date);
        if (q.CourtId.HasValue) query = query.Where(s => s.CourtId == q.CourtId.Value);
        if (q.Status.HasValue) query = query.Where(s => s.Status == q.Status.Value);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLower();
            query = query.Where(x => x.Title.ToLower().Contains(s));
        }

        query = (q.SortBy, q.SortDir?.ToLower()) switch
        {
            ("totalIncome", "asc")  => query.OrderBy(x => x.TotalIncome),
            ("totalIncome", _)      => query.OrderByDescending(x => x.TotalIncome),
            ("totalExpense", "asc") => query.OrderBy(x => x.TotalExpense),
            ("totalExpense", _)     => query.OrderByDescending(x => x.TotalExpense),
            ("balance", "asc")      => query.OrderBy(x => x.Balance),
            ("balance", _)          => query.OrderByDescending(x => x.Balance),
            (_, "asc")              => query.OrderBy(x => x.PlayDate),
            _                       => query.OrderByDescending(x => x.PlayDate)
        };

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(x => new SessionDto
            {
                Id = x.Id, Title = x.Title, CourtId = x.CourtId, CourtName = x.Court!.Name,
                PlayDate = x.PlayDate, StartTime = x.StartTime, EndTime = x.EndTime,
                CourtCount = x.CourtCount, Status = x.Status, PricingMode = x.PricingMode,
                TotalIncome = x.TotalIncome, TotalExpense = x.TotalExpense,
                Balance = x.Balance, FeePerSlot = x.FeePerSlot, TotalSlots = x.TotalSlots,
                ParticipantCount = x.Participants.Count, Note = x.Note
            }).ToListAsync(ct);
        return new PagedResult<SessionDto> { Items = items, Total = total, Page = q.Page, PageSize = q.PageSize };
    }

    public async Task<SessionDto> CancelSessionAsync(CancelSessionDto dto, CancellationToken ct = default)
    {
        var s = await _db.Set<BadmintonSession>().FirstOrDefaultAsync(x => x.Id == dto.SessionId, ct)
                ?? throw new NotFoundException(nameof(BadmintonSession), dto.SessionId);
        if (s.Status == SessionStatus.Closed)
            throw new BusinessRuleException("CANNOT_CANCEL_CLOSED", "Buổi đã chốt không thể hủy. Hãy mở lại trước.");
        var old = s.Status;
        s.Status = SessionStatus.Cancelled;
        s.Note = string.IsNullOrEmpty(s.Note) ? $"[Cancelled] {dto.Reason}" : $"{s.Note}\n[Cancelled] {dto.Reason}";
        s.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(nameof(BadmintonSession), s.Id.ToString(), "Cancel",
            new { Status = old }, new { Status = s.Status }, dto.Reason, ct);
        return new SessionDto
        {
            Id = s.Id, Title = s.Title, CourtId = s.CourtId,
            PlayDate = s.PlayDate, Status = s.Status,
            TotalIncome = s.TotalIncome, TotalExpense = s.TotalExpense, Balance = s.Balance,
            FeePerSlot = s.FeePerSlot, TotalSlots = s.TotalSlots
        };
    }

    public async Task<PagedResult<SessionDto>> ListAsync(PagedQuery q, CancellationToken ct = default)
    {
        var query = _db.Set<BadmintonSession>().AsNoTracking().Include(s => s.Court).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim().ToLower();
            query = query.Where(x => x.Title.ToLower().Contains(s));
        }
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.PlayDate)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(x => new SessionDto
            {
                Id = x.Id, Title = x.Title, CourtId = x.CourtId, CourtName = x.Court!.Name,
                PlayDate = x.PlayDate, StartTime = x.StartTime, EndTime = x.EndTime,
                CourtCount = x.CourtCount, Status = x.Status, PricingMode = x.PricingMode,
                TotalIncome = x.TotalIncome, TotalExpense = x.TotalExpense,
                Balance = x.Balance, FeePerSlot = x.FeePerSlot, TotalSlots = x.TotalSlots,
                ParticipantCount = x.Participants.Count, Note = x.Note
            }).ToListAsync(ct);
        return new PagedResult<SessionDto> { Items = items, Total = total, Page = q.Page, PageSize = q.PageSize };
    }

    public async Task<SessionDetailDto> GetDetailAsync(Guid id, CancellationToken ct = default)
    {
        var s = await _db.Set<BadmintonSession>()
            .Include(x => x.Court)
            .Include(x => x.PricingTemplate)
            .Include(x => x.Participants).ThenInclude(p => p.Player)
            .Include(x => x.Transactions).ThenInclude(t => t.Player)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), id);

        return new SessionDetailDto
        {
            Id = s.Id, Title = s.Title, CourtId = s.CourtId, CourtName = s.Court?.Name,
            PlayDate = s.PlayDate, StartTime = s.StartTime, EndTime = s.EndTime,
            CourtCount = s.CourtCount, Status = s.Status,
            PricingTemplateId = s.PricingTemplateId, PricingTemplateName = s.PricingTemplate?.Name,
            PricingMode = s.PricingMode,
            TotalIncome = s.TotalIncome, TotalExpense = s.TotalExpense, Balance = s.Balance,
            FeePerSlot = s.FeePerSlot, TotalSlots = s.TotalSlots,
            ParticipantCount = s.Participants.Count, Note = s.Note,
            Participants = s.Participants.Select(p => new ParticipantDto
            {
                Id = p.Id, SessionId = p.SessionId, PlayerId = p.PlayerId,
                PlayerName = p.Player?.FullName ?? "",
                PlayerPhone = p.Player?.PhoneNumber,
                Gender = p.Player?.Gender, SkillLevel = p.Player?.SkillLevel,
                SlotCount = p.SlotCount, Multiplier = p.Multiplier, FixedAmount = p.FixedAmount,
                AmountDue = p.AmountDue, AmountPaid = p.AmountPaid,
                Debt = p.AmountDue - p.AmountPaid,
                PaymentStatus = p.PaymentStatus, IsGuest = p.IsGuest, Note = p.Note,
                CheckedInAt = p.CheckedInAt,
                JoinedViaGroupId = p.JoinedViaGroupId,
                JoinedViaGroupName = p.JoinedViaGroupName,
                JoinedViaGroupType = p.JoinedViaGroupType
            }).ToList(),
            Transactions = s.Transactions.Select(t => new TransactionDto
            {
                Id = t.Id, SessionId = t.SessionId, PlayerId = t.PlayerId,
                PlayerName = t.Player?.FullName,
                TransactionType = t.TransactionType, PaymentMethod = t.PaymentMethod,
                Amount = t.Amount, Description = t.Description, TransactionDate = t.TransactionDate
            }).ToList()
        };
    }

    public async Task<SessionDto> CreateAsync(CreateSessionDto dto, CancellationToken ct = default)
    {
        var court = await _db.Set<BadmintonCourt>().FindAsync(new object[] { dto.CourtId }, ct)
                    ?? throw new NotFoundException(nameof(BadmintonCourt), dto.CourtId);

        // Auto-assign default template if caller didn't specify one
        var templateId = dto.PricingTemplateId;
        if (templateId == null)
        {
            var def = await _pricing.GetDefaultAsync(ct);
            templateId = def?.Id;
        }
        var mode = await _pricing.GetModeAsync(templateId, ct);

        var s = new BadmintonSession
        {
            Title = dto.Title.Trim(),
            CourtId = dto.CourtId,
            PlayDate = dto.PlayDate.Date,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            CourtCount = dto.CourtCount,
            PricingTemplateId = templateId,
            PricingMode = mode,
            Status = SessionStatus.Draft,
            Note = dto.Note
        };
        _db.Add(s);
        await _db.SaveChangesAsync(ct);

        return new SessionDto
        {
            Id = s.Id, Title = s.Title, CourtId = s.CourtId, CourtName = court.Name,
            PlayDate = s.PlayDate, StartTime = s.StartTime, EndTime = s.EndTime,
            CourtCount = s.CourtCount,
            PricingTemplateId = s.PricingTemplateId, PricingMode = s.PricingMode,
            Status = s.Status
        };
    }

    public async Task<ApiResponse<ParticipantDto>> AddParticipantAsync(AddParticipantDto dto, CancellationToken ct = default)
    {
        var session = await _db.Set<BadmintonSession>()
            .Include(s => s.Participants)
            .Include(s => s.Transactions)
            .FirstOrDefaultAsync(s => s.Id == dto.SessionId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), dto.SessionId);

        EnsureNotClosed(session);

        var player = await _db.Set<BadmintonPlayer>().FindAsync(new object[] { dto.PlayerId }, ct)
                     ?? throw new NotFoundException(nameof(BadmintonPlayer), dto.PlayerId);

        if (session.Participants.Any(p => p.PlayerId == dto.PlayerId))
            throw new BusinessRuleException("DUPLICATE_PARTICIPANT", "Player already added to this session.");

        var resolved = await _pricing.ResolveAsync(
            session.PricingTemplateId, player.Gender, player.SkillLevel, ct);

        var p = new BadmintonSessionParticipant
        {
            SessionId = session.Id,
            PlayerId = player.Id,
            SlotCount = dto.SlotCount,
            Multiplier = resolved.Multiplier,
            FixedAmount = resolved.FixedAmount,
            IsGuest = player.PlayerType == PlayerType.Guest,
            Note = dto.Note,
            PaymentStatus = PaymentStatus.Unpaid
        };
        _db.Add(p);

        RecalculateFees(session);
        await _db.SaveChangesAsync(ct);

        var warnings = new List<string>();
        if (player.CurrentDebt > 0)
            warnings.Add($"Người chơi đang còn nợ {player.CurrentDebt.ToString("N0", new CultureInfo("vi-VN"))} đ ở các buổi trước.");

        var dtoOut = new ParticipantDto
        {
            Id = p.Id, SessionId = p.SessionId, PlayerId = p.PlayerId,
            PlayerName = player.FullName, PlayerPhone = player.PhoneNumber,
            SlotCount = p.SlotCount, AmountDue = p.AmountDue, AmountPaid = 0,
            Debt = p.AmountDue, PaymentStatus = p.PaymentStatus,
            IsGuest = p.IsGuest, Note = p.Note
        };
        return ApiResponse<ParticipantDto>.Ok(dtoOut, warnings: warnings);
    }

    public async Task<ApiResponse<AddParticipantsBulkResultDto>> AddParticipantsBulkAsync(AddParticipantsBulkDto dto, CancellationToken ct = default)
    {
        var session = await _db.Set<BadmintonSession>()
            .Include(s => s.Participants)
            .Include(s => s.Transactions)
            .FirstOrDefaultAsync(s => s.Id == dto.SessionId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), dto.SessionId);

        EnsureNotClosed(session);

        var ids = dto.PlayerIds.Distinct().ToList();
        var players = await _db.Set<BadmintonPlayer>()
            .Where(p => ids.Contains(p.Id))
            .ToListAsync(ct);

        var existing = session.Participants.Select(p => p.PlayerId).ToHashSet();
        var addedIds = new List<Guid>();
        var dupSkips = 0;
        var inactiveSkips = 0;
        var debtNotices = new List<string>();

        foreach (var pl in players)
        {
            if (existing.Contains(pl.Id)) { dupSkips++; continue; }
            if (!pl.IsActive && !dto.IncludeInactive) { inactiveSkips++; continue; }

            var resolved = await _pricing.ResolveAsync(session.PricingTemplateId, pl.Gender, pl.SkillLevel, ct);
            _db.Add(new BadmintonSessionParticipant
            {
                SessionId = session.Id,
                PlayerId = pl.Id,
                SlotCount = dto.SlotCount,
                Multiplier = resolved.Multiplier,
                FixedAmount = resolved.FixedAmount,
                IsGuest = pl.PlayerType == PlayerType.Guest,
                PaymentStatus = PaymentStatus.Unpaid
            });
            existing.Add(pl.Id);
            addedIds.Add(pl.Id);

            if (pl.CurrentDebt > 0)
                debtNotices.Add($"{pl.FullName}: nợ {pl.CurrentDebt.ToString("N0", new CultureInfo("vi-VN"))} đ");
        }

        RecalculateFees(session);
        session.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        var warnings = new List<string>();
        if (debtNotices.Count > 0)
            warnings.Add("Có người đang còn nợ: " + string.Join("; ", debtNotices));
        if (inactiveSkips > 0)
            warnings.Add($"Bỏ qua {inactiveSkips} người không hoạt động.");

        return ApiResponse<AddParticipantsBulkResultDto>.Ok(new AddParticipantsBulkResultDto
        {
            Added = addedIds.Count,
            SkippedDuplicate = dupSkips,
            SkippedInactive = inactiveSkips,
            AddedPlayerIds = addedIds,
            ParticipantCount = session.Participants.Count,
            TotalSlots = session.TotalSlots
        }, warnings: warnings);
    }

    public async Task RemoveParticipantAsync(Guid participantId, CancellationToken ct = default)
    {
        var p = await _db.Set<BadmintonSessionParticipant>().Include(x => x.Session)
                .FirstOrDefaultAsync(x => x.Id == participantId, ct)
                ?? throw new NotFoundException(nameof(BadmintonSessionParticipant), participantId);
        EnsureNotClosed(p.Session!);

        if (p.AmountPaid > 0)
            throw new BusinessRuleException("PARTICIPANT_HAS_PAYMENT", "Không thể xóa người chơi đã thanh toán.");

        _db.Remove(p);
        var session = await _db.Set<BadmintonSession>()
            .Include(s => s.Participants)
            .Include(s => s.Transactions)
            .FirstAsync(s => s.Id == p.SessionId, ct);
        // _db.Remove(p) marks it Deleted → ComputeTotalsFull's .Local.Where filters it out via state.
        RecalculateFees(session);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<TransactionDto> AddExpenseAsync(CreateExpenseDto dto, CancellationToken ct = default)
    {
        var session = await _db.Set<BadmintonSession>()
            .Include(s => s.Participants)
            .Include(s => s.Transactions)
            .FirstOrDefaultAsync(s => s.Id == dto.SessionId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), dto.SessionId);

        EnsureNotClosed(session);

        var tx = new BadmintonTransaction
        {
            SessionId = session.Id,
            TransactionType = TransactionType.Expense,
            Amount = dto.Amount,
            Description = dto.Description.Trim(),
            PaymentMethod = PaymentMethod.Cash
        };
        _db.Add(tx);

        RecalculateFees(session);
        await _db.SaveChangesAsync(ct);

        return new TransactionDto
        {
            Id = tx.Id, SessionId = tx.SessionId, TransactionType = tx.TransactionType,
            PaymentMethod = tx.PaymentMethod, Amount = tx.Amount,
            Description = tx.Description, TransactionDate = tx.TransactionDate
        };
    }

    public async Task<ApiResponse<TransactionDto>> QuickPaymentAsync(QuickPaymentDto dto, CancellationToken ct = default)
    {
        var session = await _db.Set<BadmintonSession>()
            .Include(s => s.Participants).ThenInclude(p => p.Player)
            .Include(s => s.Transactions)
            .FirstOrDefaultAsync(s => s.Id == dto.SessionId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), dto.SessionId);

        var participant = session.Participants.FirstOrDefault(p => p.PlayerId == dto.PlayerId)
            ?? throw new BusinessRuleException("NOT_PARTICIPANT", "Người chơi không thuộc buổi này.");

        var tx = new BadmintonTransaction
        {
            SessionId = session.Id,
            PlayerId = dto.PlayerId,
            TransactionType = TransactionType.Income,
            Amount = dto.Amount,
            PaymentMethod = dto.PaymentMethod,
            Description = $"Thu tiền {participant.Player?.FullName}" + (string.IsNullOrEmpty(dto.Note) ? "" : $" — {dto.Note}")
        };
        _db.Add(tx);

        participant.AmountPaid += dto.Amount;
        participant.PaymentStatus = ComputePaymentStatus(participant.AmountDue, participant.AmountPaid);

        // Update player aggregate debt
        if (participant.Player != null)
            participant.Player.CurrentDebt = Math.Max(0, participant.Player.CurrentDebt - dto.Amount);

        var totals = ComputeTotals(session.Id);
        session.TotalIncome = totals.income;
        session.TotalExpense = totals.expense;
        session.Balance = session.TotalIncome - session.TotalExpense;

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(nameof(BadmintonTransaction), tx.Id.ToString(), "Payment", null,
            new { dto.PlayerId, dto.Amount, participant.PaymentStatus }, ct: ct);

        var warnings = new List<string>();
        if (participant.PaymentStatus == PaymentStatus.OverPaid)
            warnings.Add("Thanh toán dư. Vui lòng kiểm tra lại.");

        return ApiResponse<TransactionDto>.Ok(new TransactionDto
        {
            Id = tx.Id, SessionId = tx.SessionId, PlayerId = tx.PlayerId,
            PlayerName = participant.Player?.FullName,
            TransactionType = tx.TransactionType, PaymentMethod = tx.PaymentMethod,
            Amount = tx.Amount, Description = tx.Description, TransactionDate = tx.TransactionDate
        }, warnings: warnings);
    }

    public async Task<SessionDto> CloseSessionAsync(Guid sessionId, CancellationToken ct = default)
    {
        var session = await _db.Set<BadmintonSession>()
            .Include(s => s.Participants).ThenInclude(p => p.Player)
            .Include(s => s.Transactions)
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), sessionId);

        if (session.Status == SessionStatus.Closed)
            throw new BusinessRuleException("ALREADY_CLOSED", "Buổi đã được chốt.");
        if (session.Status == SessionStatus.Cancelled)
            throw new BusinessRuleException("CANCELLED", "Buổi đã hủy.");

        var localParts = _db.Set<BadmintonSessionParticipant>().Local
            .Where(p => p.SessionId == session.Id).ToList();
        var localTxs = _db.Set<BadmintonTransaction>().Local
            .Where(t => t.SessionId == session.Id).ToList();
        if (!localParts.Any())
            throw new BusinessRuleException("NO_PARTICIPANTS", "Phải có ít nhất 1 người chơi.");
        if (!localTxs.Any(t => t.TransactionType == TransactionType.Expense && t.Amount > 0))
            throw new BusinessRuleException("NO_COURT_FEE", "Phải nhập chi phí (tiền sân) trước khi chốt.");

        RecalculateFees(session);

        // Update debts for each participant + player.CurrentDebt
        foreach (var p in localParts)
        {
            p.PaymentStatus = ComputePaymentStatus(p.AmountDue, p.AmountPaid);
            var unpaid = Math.Max(0, p.AmountDue - p.AmountPaid);
            if (p.Player != null && unpaid > 0)
                p.Player.CurrentDebt += unpaid;
        }

        var totals = ComputeTotals(session.Id);
        session.TotalIncome = totals.income;
        session.TotalExpense = totals.expense;
        session.Balance = session.TotalIncome - session.TotalExpense;
        session.Status = SessionStatus.Closed;
        session.ClosedAt = DateTime.UtcNow;

        // Update fund: net balance flows into main fund
        await _fund.AdjustAsync(new AdjustFundDto
        {
            FundId = (await _fund.GetMainAsync(ct)).Id,
            Amount = session.Balance,
            Reason = $"Chốt buổi {session.Title} ({session.PlayDate:dd/MM/yyyy})"
        }, ct);

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(nameof(BadmintonSession), session.Id.ToString(), "Close", null,
            new { session.TotalIncome, session.TotalExpense, session.Balance }, ct: ct);

        return new SessionDto
        {
            Id = session.Id, Title = session.Title, CourtId = session.CourtId,
            PlayDate = session.PlayDate, StartTime = session.StartTime, EndTime = session.EndTime,
            CourtCount = session.CourtCount, Status = session.Status,
            TotalIncome = session.TotalIncome, TotalExpense = session.TotalExpense,
            Balance = session.Balance, FeePerSlot = session.FeePerSlot, TotalSlots = session.TotalSlots,
            ParticipantCount = session.Participants.Count
        };
    }

    public async Task<SessionDto> ReopenSessionAsync(ReopenSessionDto dto, CancellationToken ct = default)
    {
        var session = await _db.Set<BadmintonSession>()
            .FirstOrDefaultAsync(s => s.Id == dto.SessionId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), dto.SessionId);
        if (session.Status != SessionStatus.Closed)
            throw new BusinessRuleException("NOT_CLOSED", "Chỉ có buổi đã chốt mới mở lại được.");

        var oldStatus = session.Status;
        session.Status = SessionStatus.Open;
        session.ReopenReason = dto.Reason;
        session.ReopenCount++;
        session.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(nameof(BadmintonSession), session.Id.ToString(), "Reopen",
            new { oldStatus }, new { session.Status }, dto.Reason, ct);
        return new SessionDto
        {
            Id = session.Id, Title = session.Title, CourtId = session.CourtId,
            PlayDate = session.PlayDate, StartTime = session.StartTime, EndTime = session.EndTime,
            CourtCount = session.CourtCount, Status = session.Status,
            TotalIncome = session.TotalIncome, TotalExpense = session.TotalExpense, Balance = session.Balance,
            FeePerSlot = session.FeePerSlot, TotalSlots = session.TotalSlots
        };
    }

    // ---------- Player groups ----------

    public async Task<PreviewAddGroupsResultDto> PreviewAddGroupsAsync(PreviewAddGroupsDto dto, CancellationToken ct = default)
    {
        var session = await _db.Set<BadmintonSession>().AsNoTracking()
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == dto.SessionId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), dto.SessionId);

        var groupIds = dto.GroupIds.Distinct().ToList();
        var groups = await _db.Set<BadmintonPlayerGroup>().AsNoTracking()
            .Where(g => groupIds.Contains(g.Id))
            .Include(g => g.Members).ThenInclude(m => m.Player)
            .ToListAsync(ct);

        var existingPlayerIds = session.Participants.Select(p => p.PlayerId).ToHashSet();
        var allMembers = groups
            .SelectMany(g => g.Members.Where(m => m.Player != null).Select(m => new { GroupId = g.Id, Player = m.Player! }))
            .ToList();

        // Build per-player aggregation: which groups, status, etc.
        var perPlayer = allMembers
            .GroupBy(x => x.Player.Id)
            .Select(grp =>
            {
                var p = grp.First().Player;
                return new PreviewPlayerDto
                {
                    PlayerId = p.Id,
                    FullName = p.FullName,
                    PhoneNumber = p.PhoneNumber,
                    IsActive = p.IsActive,
                    CurrentDebt = p.CurrentDebt,
                    AlreadyInSession = existingPlayerIds.Contains(p.Id),
                    GroupIds = grp.Select(x => x.GroupId).Distinct().ToList()
                };
            }).ToList();

        var alreadyPlayers = perPlayer.Where(p => p.AlreadyInSession).ToList();
        var inactivePlayers = perPlayer.Where(p => !p.AlreadyInSession && !p.IsActive).ToList();
        var addable = perPlayer.Where(p => !p.AlreadyInSession && (p.IsActive || dto.IncludeInactive)).ToList();
        var debtPlayers = addable.Where(p => p.CurrentDebt > 0).ToList();

        var groupSummaries = groups.Select(g =>
        {
            var members = g.Members.Where(m => m.Player != null).Select(m => m.Player!).ToList();
            return new PreviewGroupDto
            {
                GroupId = g.Id,
                Name = g.Name,
                Color = g.Color,
                MemberCount = members.Count,
                AlreadyInSession = members.Count(p => existingPlayerIds.Contains(p.Id)),
                NewToAdd = members.Count(p => !existingPlayerIds.Contains(p.Id) && (p.IsActive || dto.IncludeInactive)),
                InactiveSkipped = dto.IncludeInactive ? 0 : members.Count(p => !existingPlayerIds.Contains(p.Id) && !p.IsActive),
                Members = members.Select(p => new PreviewPlayerDto
                {
                    PlayerId = p.Id,
                    FullName = p.FullName,
                    PhoneNumber = p.PhoneNumber,
                    IsActive = p.IsActive,
                    CurrentDebt = p.CurrentDebt,
                    AlreadyInSession = existingPlayerIds.Contains(p.Id),
                    GroupIds = new List<Guid> { g.Id }
                }).OrderBy(x => x.FullName).ToList()
            };
        }).ToList();

        return new PreviewAddGroupsResultDto
        {
            Groups = groupSummaries,
            TotalMembers = allMembers.Count,
            UniquePlayers = perPlayer.Count,
            NewToAdd = addable.Count,
            AlreadyInSession = alreadyPlayers.Count,
            InactiveSkipped = dto.IncludeInactive ? 0 : inactivePlayers.Count,
            PlayersToAdd = addable.OrderBy(x => x.FullName).ToList(),
            InactivePlayers = inactivePlayers.OrderBy(x => x.FullName).ToList(),
            DebtPlayers = debtPlayers.OrderByDescending(x => x.CurrentDebt).ToList(),
            AlreadyPlayers = alreadyPlayers.OrderBy(x => x.FullName).ToList()
        };
    }

    public async Task<ApiResponse<AddGroupsToSessionResultDto>> AddGroupsAsync(AddGroupsToSessionDto dto, CancellationToken ct = default)
    {
        var session = await _db.Set<BadmintonSession>()
            .Include(s => s.Participants)
            .Include(s => s.Transactions)
            .FirstOrDefaultAsync(s => s.Id == dto.SessionId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), dto.SessionId);

        EnsureNotClosed(session);

        var groupIds = dto.GroupIds.Distinct().ToList();
        var groups = await _db.Set<BadmintonPlayerGroup>()
            .Where(g => groupIds.Contains(g.Id))
            .Include(g => g.Members).ThenInclude(m => m.Player)
            .ToListAsync(ct);
        if (groups.Count == 0)
            throw new BusinessRuleException("NO_GROUPS", "Không tìm thấy nhóm nào để thêm.");

        var existingPlayerIds = session.Participants.Select(p => p.PlayerId).ToHashSet();
        var selectedFilter = dto.SelectedPlayerIds?.ToHashSet() ?? new HashSet<Guid>();
        var useSelection = selectedFilter.Count > 0;

        // Per-group counters for audit history rows
        var perGroup = groups.ToDictionary(g => g.Id, g => new BadmintonSessionGroup
        {
            SessionId = session.Id,
            PlayerGroupId = g.Id,
            GroupNameSnapshot = g.Name,
            MembersTotal = g.Members.Count,
            AppliedBy = null,
            AppliedAt = DateTime.UtcNow
        });

        var addedPlayerIds = new HashSet<Guid>();
        var dedupedSkips = new HashSet<Guid>();
        var inactiveSkips = new HashSet<Guid>();
        var warnings = new List<string>();
        var debtNotices = new List<string>();

        foreach (var g in groups)
        {
            var sg = perGroup[g.Id];
            foreach (var m in g.Members)
            {
                if (m.Player == null) continue;
                var pl = m.Player;

                if (useSelection && !selectedFilter.Contains(pl.Id))
                    continue;

                if (existingPlayerIds.Contains(pl.Id) || addedPlayerIds.Contains(pl.Id))
                {
                    sg.MembersSkippedDuplicate++;
                    dedupedSkips.Add(pl.Id);
                    continue;
                }
                if (!pl.IsActive && !dto.IncludeInactive)
                {
                    sg.MembersSkippedInactive++;
                    inactiveSkips.Add(pl.Id);
                    continue;
                }

                var resolved = await _pricing.ResolveAsync(session.PricingTemplateId, pl.Gender, pl.SkillLevel, ct);
                var newPart = new BadmintonSessionParticipant
                {
                    SessionId = session.Id,
                    PlayerId = pl.Id,
                    SlotCount = dto.SlotCount,
                    Multiplier = resolved.Multiplier,
                    FixedAmount = resolved.FixedAmount,
                    IsGuest = pl.PlayerType == Domain.Enums.PlayerType.Guest,
                    PaymentStatus = PaymentStatus.Unpaid,
                    JoinedViaGroupId = g.Id,
                    JoinedViaGroupType = g.GroupType,
                    JoinedViaGroupName = g.Name
                };
                _db.Add(newPart);
                addedPlayerIds.Add(pl.Id);
                sg.MembersAdded++;

                if (pl.CurrentDebt > 0)
                    debtNotices.Add($"{pl.FullName}: nợ {pl.CurrentDebt.ToString("N0", new CultureInfo("vi-VN"))} đ");
            }
            _db.Add(sg);
        }

        // Recalc fees with the new participants in Local
        RecalculateFees(session);
        session.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(nameof(BadmintonSession), session.Id.ToString(), "AddGroups", null,
            new
            {
                groupIds,
                added = addedPlayerIds.Count,
                skippedDuplicate = dedupedSkips.Count,
                skippedInactive = inactiveSkips.Count,
                includeInactive = dto.IncludeInactive
            }, ct: ct);

        if (debtNotices.Count > 0)
            warnings.Add("Có người đang còn nợ: " + string.Join("; ", debtNotices));
        if (inactiveSkips.Count > 0 && !dto.IncludeInactive)
            warnings.Add($"Bỏ qua {inactiveSkips.Count} người không hoạt động (inactive).");

        var result = new AddGroupsToSessionResultDto
        {
            Added = addedPlayerIds.Count,
            SkippedDuplicate = dedupedSkips.Count,
            SkippedInactive = inactiveSkips.Count,
            AddedPlayerIds = addedPlayerIds.ToList(),
            AppliedGroupIds = groupIds,
            ParticipantCount = session.Participants.Count,
            TotalSlots = session.TotalSlots
        };
        return ApiResponse<AddGroupsToSessionResultDto>.Ok(result, warnings: warnings);
    }

    public async Task<IEnumerable<SessionGroupHistoryDto>> GetSessionGroupsAsync(Guid sessionId, CancellationToken ct = default)
    {
        return await _db.Set<BadmintonSessionGroup>().AsNoTracking()
            .Where(sg => sg.SessionId == sessionId)
            .Include(sg => sg.Session)
            .OrderByDescending(sg => sg.AppliedAt)
            .Select(sg => new SessionGroupHistoryDto
            {
                Id = sg.Id,
                SessionId = sg.SessionId,
                SessionTitle = sg.Session != null ? sg.Session.Title : null,
                SessionPlayDate = sg.Session != null ? sg.Session.PlayDate : sg.AppliedAt,
                PlayerGroupId = sg.PlayerGroupId,
                GroupNameSnapshot = sg.GroupNameSnapshot,
                MembersTotal = sg.MembersTotal,
                MembersAdded = sg.MembersAdded,
                MembersSkippedDuplicate = sg.MembersSkippedDuplicate,
                MembersSkippedInactive = sg.MembersSkippedInactive,
                AppliedAt = sg.AppliedAt
            }).ToListAsync(ct);
    }

    // ---------- Check-in ----------

    public async Task<ParticipantDto> SetCheckInAsync(CheckInParticipantDto dto, CancellationToken ct = default)
    {
        var p = await _db.Set<BadmintonSessionParticipant>()
            .Include(x => x.Session)
            .Include(x => x.Player)
            .FirstOrDefaultAsync(x => x.Id == dto.ParticipantId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSessionParticipant), dto.ParticipantId);

        EnsureNotClosed(p.Session!);

        p.CheckedInAt = dto.CheckedIn ? DateTime.UtcNow : null;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return new ParticipantDto
        {
            Id = p.Id, SessionId = p.SessionId, PlayerId = p.PlayerId,
            PlayerName = p.Player?.FullName ?? "",
            PlayerPhone = p.Player?.PhoneNumber,
            Gender = p.Player?.Gender, SkillLevel = p.Player?.SkillLevel,
            SlotCount = p.SlotCount, Multiplier = p.Multiplier, FixedAmount = p.FixedAmount,
            AmountDue = p.AmountDue, AmountPaid = p.AmountPaid,
            Debt = p.AmountDue - p.AmountPaid,
            PaymentStatus = p.PaymentStatus, IsGuest = p.IsGuest, Note = p.Note,
            CheckedInAt = p.CheckedInAt,
            JoinedViaGroupId = p.JoinedViaGroupId,
            JoinedViaGroupName = p.JoinedViaGroupName,
            JoinedViaGroupType = p.JoinedViaGroupType
        };
    }

    public async Task<CheckInAllResultDto> CheckInAllAsync(Guid sessionId, CancellationToken ct = default)
    {
        var session = await _db.Set<BadmintonSession>()
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct)
            ?? throw new NotFoundException(nameof(BadmintonSession), sessionId);

        EnsureNotClosed(session);

        var now = DateTime.UtcNow;
        var already = 0;
        var newly = 0;
        foreach (var p in session.Participants)
        {
            if (p.CheckedInAt.HasValue) already++;
            else { p.CheckedInAt = now; p.UpdatedAt = now; newly++; }
        }

        if (newly > 0) await _db.SaveChangesAsync(ct);

        return new CheckInAllResultDto
        {
            CheckedIn = newly,
            AlreadyCheckedIn = already,
            TotalParticipants = session.Participants.Count
        };
    }

    // ---------- Business logic helpers ----------

    private static void EnsureNotClosed(BadmintonSession session)
    {
        if (session.Status == SessionStatus.Closed)
            throw new BusinessRuleException("SESSION_CLOSED", "Buổi đã chốt. Vui lòng gọi ReopenSession với lý do trước khi sửa.");
        if (session.Status == SessionStatus.Cancelled)
            throw new BusinessRuleException("SESSION_CANCELLED", "Buổi đã hủy.");
    }

    private static PaymentStatus ComputePaymentStatus(decimal due, decimal paid)
    {
        if (paid <= 0) return PaymentStatus.Unpaid;
        if (paid < due) return PaymentStatus.PartialPaid;
        if (paid == due) return PaymentStatus.Paid;
        return PaymentStatus.OverPaid;
    }

    /// <summary>
    /// Mode-aware fee distribution. Reads tracked entities from DbContext.Local.
    ///
    ///   WeightedSlot: AmountDue = FeePerSlot × SlotCount × Multiplier,
    ///                 FeePerSlot = TotalExpense / Σ(SlotCount × Multiplier). Sum balances to TotalExpense.
    ///   FixedAmount:  AmountDue = FixedAmount × SlotCount. Sum may differ from TotalExpense; fund absorbs the gap.
    ///   EqualPerHead: AmountDue = round(TotalExpense / headcount) for every participant. Slot count is ignored.
    /// </summary>
    private void RecalculateFees(BadmintonSession session)
    {
        var parts = _db.Set<BadmintonSessionParticipant>().Local
            .Where(p => p.SessionId == session.Id).ToList();
        var txs = _db.Set<BadmintonTransaction>().Local
            .Where(t => t.SessionId == session.Id).ToList();

        var totalExpense = txs.Where(t => t.TransactionType == TransactionType.Expense).Sum(t => t.Amount);
        var totalIncome  = txs.Where(t => t.TransactionType == TransactionType.Income).Sum(t => t.Amount);

        session.TotalExpense = totalExpense;
        session.TotalIncome = totalIncome;
        session.TotalSlots = parts.Sum(p => p.SlotCount);
        session.Balance = totalIncome - totalExpense;

        switch (session.PricingMode)
        {
            case PricingMode.FixedAmount:
            {
                session.FeePerSlot = 0; // not derived from expense in this mode
                foreach (var p in parts)
                {
                    p.AmountDue = Math.Round(p.FixedAmount * p.SlotCount, 0);
                    p.PaymentStatus = ComputePaymentStatus(p.AmountDue, p.AmountPaid);
                }
                break;
            }
            case PricingMode.EqualPerHead:
            {
                var head = parts.Count;
                var per = head > 0 ? Math.Round(totalExpense / head, 0) : 0;
                session.FeePerSlot = per;
                foreach (var p in parts)
                {
                    p.AmountDue = per;
                    p.PaymentStatus = ComputePaymentStatus(p.AmountDue, p.AmountPaid);
                }
                break;
            }
            case PricingMode.WeightedSlot:
            default:
            {
                var weightedSlots = parts.Sum(p => p.SlotCount * p.Multiplier);
                session.FeePerSlot = weightedSlots > 0 ? Math.Round(totalExpense / weightedSlots, 0) : 0;
                foreach (var p in parts)
                {
                    p.AmountDue = Math.Round(session.FeePerSlot * p.SlotCount * p.Multiplier, 0);
                    p.PaymentStatus = ComputePaymentStatus(p.AmountDue, p.AmountPaid);
                }
                break;
            }
        }
    }

    private (decimal expense, decimal income) ComputeTotals(Guid sessionId)
    {
        var t = ComputeTotalsFull(sessionId);
        return (t.expense, t.income);
    }

    private (decimal expense, decimal income, int slots) ComputeTotalsFull(Guid sessionId)
    {
        var txs = _db.Set<BadmintonTransaction>().Local.Where(t => t.SessionId == sessionId).ToList();
        var parts = _db.Set<BadmintonSessionParticipant>().Local.Where(p => p.SessionId == sessionId).ToList();
        return (
            txs.Where(t => t.TransactionType == TransactionType.Expense).Sum(t => t.Amount),
            txs.Where(t => t.TransactionType == TransactionType.Income).Sum(t => t.Amount),
            parts.Sum(p => p.SlotCount)
        );
    }
}
