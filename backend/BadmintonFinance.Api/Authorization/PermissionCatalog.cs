namespace BadmintonFinance.Api.Authorization;

/// <summary>
/// A single permission entry — the source of truth for both
/// <c>AddPolicy</c> registration in <c>Program.cs</c> and the permission matrix
/// returned by <c>GET /api/admin/permissions/matrix</c>.
/// </summary>
public class PermissionEntry
{
    /// <summary>The policy key (e.g. <c>"CanManageSessions"</c>). Matches <see cref="Policies"/> constants.</summary>
    public string Key { get; init; } = string.Empty;

    /// <summary>Short Vietnamese label shown in the UI.</summary>
    public string Label { get; init; } = string.Empty;

    /// <summary>Vietnamese description explaining what the permission allows.</summary>
    public string Description { get; init; } = string.Empty;

    /// <summary>Roles that satisfy this policy. Matches values in <see cref="AppRoles"/>.</summary>
    public string[] AllowedRoles { get; init; } = System.Array.Empty<string>();
}

/// <summary>
/// Central catalog of every policy in the app. Iterated in <c>Program.cs</c>
/// to register authorization policies, and projected to a DTO by
/// <c>AdminController.PermissionMatrix</c>. Keep these two uses in sync by
/// editing this list — never hard-code policy roles elsewhere.
/// </summary>
public static class PermissionCatalog
{
    public static readonly IReadOnlyList<PermissionEntry> Permissions = new[]
    {
        new PermissionEntry
        {
            Key = Policies.ManageSessions,
            Label = "Quản lý buổi đánh",
            Description = "Tạo, sửa, mở/chốt/mở lại/hủy buổi đánh; thêm người chơi; ghi nhận thu/chi của buổi.",
            AllowedRoles = new[] { AppRoles.Admin, AppRoles.Treasurer }
        },
        new PermissionEntry
        {
            Key = Policies.ManagePlayers,
            Label = "Quản lý người chơi",
            Description = "Thêm, sửa, vô hiệu hóa người chơi và nhóm người chơi.",
            AllowedRoles = new[] { AppRoles.Admin, AppRoles.Treasurer }
        },
        new PermissionEntry
        {
            Key = Policies.ManageCourts,
            Label = "Quản lý sân",
            Description = "Tạo, sửa thông tin sân và giá thuê mặc định.",
            AllowedRoles = new[] { AppRoles.Admin, AppRoles.Treasurer }
        },
        new PermissionEntry
        {
            Key = Policies.ManageBookings,
            Label = "Quản lý đặt sân",
            Description = "Tạo lịch đặt sân định kỳ và tự sinh buổi đánh tương ứng.",
            AllowedRoles = new[] { AppRoles.Admin, AppRoles.Treasurer }
        },
        new PermissionEntry
        {
            Key = Policies.ManageFund,
            Label = "Quản lý quỹ",
            Description = "Điều chỉnh quỹ chung, xem lịch sử giao dịch quỹ.",
            AllowedRoles = new[] { AppRoles.Admin, AppRoles.Treasurer }
        },
        new PermissionEntry
        {
            Key = Policies.ExportData,
            Label = "Xuất dữ liệu",
            Description = "Tải báo cáo thu chi và danh sách công nợ ra CSV.",
            AllowedRoles = new[] { AppRoles.Admin, AppRoles.Treasurer }
        },
        new PermissionEntry
        {
            Key = Policies.ManageTemplates,
            Label = "Quản lý template",
            Description = "Tạo, sửa template thu tiền và template chi phí dùng chung.",
            AllowedRoles = new[] { AppRoles.Admin }
        },
        new PermissionEntry
        {
            Key = Policies.ManageUsers,
            Label = "Quản lý người dùng",
            Description = "Tạo tài khoản, gán vai trò, khóa/mở tài khoản đăng nhập.",
            AllowedRoles = new[] { AppRoles.Admin }
        },
        new PermissionEntry
        {
            Key = Policies.ViewAuditLog,
            Label = "Xem audit log",
            Description = "Truy vết các thao tác nhạy cảm: chốt buổi, mở lại, hủy, thu tiền, điều chỉnh quỹ.",
            AllowedRoles = new[] { AppRoles.Admin }
        },
        new PermissionEntry
        {
            Key = Policies.Maintenance,
            Label = "Bảo trì hệ thống",
            Description = "Xóa toàn bộ dữ liệu giao dịch để khởi tạo lại hệ thống.",
            AllowedRoles = new[] { AppRoles.Admin }
        }
    };

    /// <summary>Distinct list of role names referenced by the catalog, in display order.</summary>
    public static readonly IReadOnlyList<string> Roles = new[]
    {
        AppRoles.Admin, AppRoles.Treasurer, AppRoles.User
    };
}
