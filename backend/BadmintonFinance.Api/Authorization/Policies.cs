namespace BadmintonFinance.Api.Authorization;

/// <summary>
/// Authorization policy names. Use with <c>[Authorize(Policy = Policies.X)]</c>.
/// Registered in Program.cs against the role catalog in <see cref="AppRoles"/>.
/// </summary>
public static class Policies
{
    public const string ManageSessions  = "CanManageSessions";
    public const string ManagePlayers   = "CanManagePlayers";
    public const string ManageCourts    = "CanManageCourts";
    public const string ManageBookings  = "CanManageBookings";
    public const string ManageFund      = "CanManageFund";
    public const string ExportData      = "CanExportData";
    public const string ManageTemplates = "CanManageTemplates";
    public const string ManageUsers     = "CanManageUsers";
    public const string ViewAuditLog    = "CanViewAuditLog";
    public const string Maintenance     = "CanRunMaintenance";
}

/// <summary>
/// Seeded role names. Must match the values inserted by <c>DbSeeder</c>.
/// </summary>
public static class AppRoles
{
    public const string Admin     = "Admin";
    public const string Treasurer = "Treasurer";
    public const string User      = "User";
}
