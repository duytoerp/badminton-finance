using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.DTOs;

public class PlayerDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? NickName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public PlayerType PlayerType { get; set; }
    public Gender? Gender { get; set; }
    public SkillLevel? SkillLevel { get; set; }
    public bool IsActive { get; set; }
    public decimal CurrentDebt { get; set; }
    public string? Note { get; set; }
}

public class CreatePlayerDto
{
    public string FullName { get; set; } = string.Empty;
    public string? NickName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public PlayerType PlayerType { get; set; } = PlayerType.Guest;
    public Gender? Gender { get; set; }
    public SkillLevel? SkillLevel { get; set; }
    public string? Note { get; set; }
}

public class UpdatePlayerDto : CreatePlayerDto
{
    public bool IsActive { get; set; } = true;
}

public class QuickAddPlayerDto
{
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
}
