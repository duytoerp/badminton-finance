using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Domain.Entities;

public class BadmintonPlayer : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string? NickName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public PlayerType PlayerType { get; set; } = PlayerType.Guest;
    public Gender? Gender { get; set; }
    public SkillLevel? SkillLevel { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal CurrentDebt { get; set; }
    public string? Note { get; set; }

    public ICollection<BadmintonSessionParticipant> Participations { get; set; } = new List<BadmintonSessionParticipant>();
    public ICollection<BadmintonTransaction> Transactions { get; set; } = new List<BadmintonTransaction>();
}
