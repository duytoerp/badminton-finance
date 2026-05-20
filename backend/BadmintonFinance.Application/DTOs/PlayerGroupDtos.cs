using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Application.DTOs;

public class PlayerGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public PlayerGroupType GroupType { get; set; } = PlayerGroupType.Fixed;
    public bool IsActive { get; set; }
    public int MemberCount { get; set; }
}

public class PlayerGroupDetailDto : PlayerGroupDto
{
    public List<PlayerGroupMemberDto> Members { get; set; } = new();
}

public class PlayerGroupMemberDto
{
    public Guid PlayerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? NickName { get; set; }
    public string? PhoneNumber { get; set; }
    public Gender? Gender { get; set; }
    public SkillLevel? SkillLevel { get; set; }
    public bool IsActive { get; set; }
    public decimal CurrentDebt { get; set; }
}

public class UpsertPlayerGroupDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public PlayerGroupType GroupType { get; set; } = PlayerGroupType.Fixed;
    public bool IsActive { get; set; } = true;
    /// <summary>Initial member ids (only honored on Create — on Update use the members endpoints).</summary>
    public List<Guid> PlayerIds { get; set; } = new();
}

public class GroupMembersDto
{
    public Guid GroupId { get; set; }
    public List<Guid> PlayerIds { get; set; } = new();
}

public class PreviewAddGroupsDto
{
    public Guid SessionId { get; set; }
    public List<Guid> GroupIds { get; set; } = new();
    public bool IncludeInactive { get; set; }
}

public class PreviewAddGroupsResultDto
{
    public List<PreviewGroupDto> Groups { get; set; } = new();
    public int TotalMembers { get; set; }
    public int UniquePlayers { get; set; }
    public int NewToAdd { get; set; }
    public int AlreadyInSession { get; set; }
    public int InactiveSkipped { get; set; }
    public List<PreviewPlayerDto> PlayersToAdd { get; set; } = new();
    public List<PreviewPlayerDto> InactivePlayers { get; set; } = new();
    public List<PreviewPlayerDto> DebtPlayers { get; set; } = new();
    public List<PreviewPlayerDto> AlreadyPlayers { get; set; } = new();
}

public class PreviewGroupDto
{
    public Guid GroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int MemberCount { get; set; }
    public int AlreadyInSession { get; set; }
    public int NewToAdd { get; set; }
    public int InactiveSkipped { get; set; }
    public List<PreviewPlayerDto> Members { get; set; } = new();
}

public class PreviewPlayerDto
{
    public Guid PlayerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; }
    public decimal CurrentDebt { get; set; }
    public bool AlreadyInSession { get; set; }
    public List<Guid> GroupIds { get; set; } = new();
}

public class AddGroupsToSessionDto
{
    public Guid SessionId { get; set; }
    public List<Guid> GroupIds { get; set; } = new();
    /// <summary>If true, inactive players are added as well.</summary>
    public bool IncludeInactive { get; set; }
    /// <summary>Slot count assigned to every added player. Defaults to 1.</summary>
    public int SlotCount { get; set; } = 1;
    /// <summary>Optional explicit subset of player ids to add (intersected with group membership). Empty = add all eligible.</summary>
    public List<Guid> SelectedPlayerIds { get; set; } = new();
}

public class AddGroupsToSessionResultDto
{
    public int Added { get; set; }
    public int SkippedDuplicate { get; set; }
    public int SkippedInactive { get; set; }
    public List<Guid> AddedPlayerIds { get; set; } = new();
    public List<Guid> AppliedGroupIds { get; set; } = new();
    public int ParticipantCount { get; set; }
    public int TotalSlots { get; set; }
}

public class SessionGroupHistoryDto
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string? SessionTitle { get; set; }
    public DateTime SessionPlayDate { get; set; }
    public Guid PlayerGroupId { get; set; }
    public string GroupNameSnapshot { get; set; } = string.Empty;
    public int MembersTotal { get; set; }
    public int MembersAdded { get; set; }
    public int MembersSkippedDuplicate { get; set; }
    public int MembersSkippedInactive { get; set; }
    public DateTime AppliedAt { get; set; }
}
