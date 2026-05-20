using BadmintonFinance.Application.DTOs;
using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.Interfaces;

public interface IPlayerService
{
    Task<PagedResult<PlayerDto>> ListAsync(PagedQuery query, CancellationToken ct = default);
    Task<PlayerDto?> GetAsync(Guid id, CancellationToken ct = default);
    Task<PlayerDto> CreateAsync(CreatePlayerDto dto, CancellationToken ct = default);
    Task<PlayerDto> QuickAddAsync(QuickAddPlayerDto dto, CancellationToken ct = default);
    Task<PlayerDto> UpdateAsync(Guid id, UpdatePlayerDto dto, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface ICourtService
{
    Task<IEnumerable<CourtDto>> ListAsync(CancellationToken ct = default);
    Task<CourtDto> CreateAsync(CreateCourtDto dto, CancellationToken ct = default);
    Task<CourtDto> UpdateAsync(Guid id, CreateCourtDto dto, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface ISessionService
{
    Task<PagedResult<SessionDto>> ListAsync(PagedQuery query, CancellationToken ct = default);
    Task<PagedResult<SessionDto>> ListFilteredAsync(SessionFilterQuery query, CancellationToken ct = default);
    Task<SessionDetailDto> GetDetailAsync(Guid id, CancellationToken ct = default);
    Task<SessionDto> CreateAsync(CreateSessionDto dto, CancellationToken ct = default);
    Task<ApiResponse<ParticipantDto>> AddParticipantAsync(AddParticipantDto dto, CancellationToken ct = default);
    Task RemoveParticipantAsync(Guid participantId, CancellationToken ct = default);
    Task<TransactionDto> AddExpenseAsync(CreateExpenseDto dto, CancellationToken ct = default);
    Task<ApiResponse<TransactionDto>> QuickPaymentAsync(QuickPaymentDto dto, CancellationToken ct = default);
    Task<SessionDto> CloseSessionAsync(Guid sessionId, CancellationToken ct = default);
    Task<SessionDto> ReopenSessionAsync(ReopenSessionDto dto, CancellationToken ct = default);
    Task<SessionDto> CancelSessionAsync(CancelSessionDto dto, CancellationToken ct = default);
}

public interface IDashboardService
{
    Task<DashboardStatsDto> GetStatsAsync(CancellationToken ct = default);
}

public interface IAuditLogService
{
    Task<PagedResult<AuditLogDto>> ListAsync(AuditLogQuery query, CancellationToken ct = default);
}

public interface IUserService
{
    Task<PagedResult<UserDto>> ListAsync(PagedQuery query, CancellationToken ct = default);
    Task<UserDto> CreateAsync(CreateUserDto dto, CancellationToken ct = default);
    Task<UserDto> UpdateAsync(Guid id, UpdateUserDto dto, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<string>> GetRolesAsync(CancellationToken ct = default);
}

public interface IPricingService
{
    /// <summary>Resolve the most specific matching rule into (Multiplier, FixedAmount). Returns (1.0, 0) when no template/rule.</summary>
    Task<ResolvedPricing> ResolveAsync(Guid? templateId, Gender? gender, SkillLevel? skill, CancellationToken ct = default);
    /// <summary>Get template's Mode (snapshotted into session). WeightedSlot if templateId null.</summary>
    Task<PricingMode> GetModeAsync(Guid? templateId, CancellationToken ct = default);
    Task<PricingTemplateDto?> GetDefaultAsync(CancellationToken ct = default);
    Task<IEnumerable<PricingTemplateDto>> ListAsync(CancellationToken ct = default);
    Task<PricingTemplateDto> CreateAsync(UpsertPricingTemplateDto dto, CancellationToken ct = default);
    Task<PricingTemplateDto> UpdateAsync(Guid id, UpsertPricingTemplateDto dto, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface ICourtBookingService
{
    Task<IEnumerable<CourtBookingDto>> ListAsync(CancellationToken ct = default);
    Task<CourtBookingDto> GetAsync(Guid id, CancellationToken ct = default);
    Task<CourtBookingPreviewDto> PreviewAsync(CreateCourtBookingDto dto, CancellationToken ct = default);
    Task<CourtBookingDto> CreateAsync(CreateCourtBookingDto dto, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IPlayerHistoryService
{
    Task<PlayerHistoryDto> GetHistoryAsync(Guid playerId, CancellationToken ct = default);
}

public interface IFundService
{
    Task<FundDto> GetMainAsync(CancellationToken ct = default);
    Task<IEnumerable<FundTransactionDto>> GetTransactionsAsync(Guid fundId, int take = 100, CancellationToken ct = default);
    Task<FundDto> AdjustAsync(AdjustFundDto dto, CancellationToken ct = default);
}

public interface IReportService
{
    Task<FinanceReportDto> GetReportAsync(DateTime from, DateTime to, CancellationToken ct = default);
    Task<IEnumerable<DebtSummaryDto>> GetDebtsAsync(CancellationToken ct = default);
}

public interface IAuthService
{
    Task<AuthResultDto> LoginAsync(LoginDto dto, CancellationToken ct = default);
    Task<AuthResultDto> RegisterAsync(RegisterDto dto, CancellationToken ct = default);
    Task<AuthResultDto> RefreshAsync(string refreshToken, CancellationToken ct = default);
}

public interface IAuditLogger
{
    Task LogAsync(string entityName, string entityId, string action, object? oldValue, object? newValue, string? reason = null, CancellationToken ct = default);
}

public interface ICurrentUser
{
    Guid? Id { get; }
    string? UserName { get; }
    string? IpAddress { get; }
}
