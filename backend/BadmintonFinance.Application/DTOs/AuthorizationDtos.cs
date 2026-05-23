namespace BadmintonFinance.Application.DTOs;

/// <summary>
/// Read-only view of the RBAC permission matrix used by the admin
/// "Phân quyền" page. Built from <c>PermissionCatalog</c> on the server.
/// </summary>
public class PermissionMatrixDto
{
    /// <summary>All role names in display order (e.g. <c>["Admin","Treasurer","User"]</c>).</summary>
    public List<string> Roles { get; set; } = new();

    /// <summary>One row per policy / feature.</summary>
    public List<PermissionRowDto> Permissions { get; set; } = new();
}

public class PermissionRowDto
{
    /// <summary>Stable policy key, e.g. <c>"CanManageSessions"</c>.</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Short Vietnamese label, e.g. <c>"Quản lý buổi đánh"</c>.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Vietnamese description of what the permission allows.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Role names that satisfy this policy.</summary>
    public List<string> AllowedRoles { get; set; } = new();
}
