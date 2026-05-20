using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Domain.Entities;

public class BadmintonPlayerGroup : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public PlayerGroupType GroupType { get; set; } = PlayerGroupType.Fixed;
    public bool IsActive { get; set; } = true;

    public ICollection<BadmintonPlayerGroupMember> Members { get; set; } = new List<BadmintonPlayerGroupMember>();
    public ICollection<BadmintonSessionGroup> SessionGroups { get; set; } = new List<BadmintonSessionGroup>();
}
