# Quỹ Cầu Lông — Mobile-first finance app

Ứng dụng quản lý thu chi cho nhóm đánh cầu lông vãng lai. Backend ASP.NET Core 8 + SQL Server + EF Core, frontend React (Vite) PWA, JWT auth, mobile-first UI.

## Cấu trúc

```
backend/                 ASP.NET Core 8 solution (Api / Application / Domain / Infrastructure)
frontend/                React + Vite + vite-plugin-pwa
docs/RUN.md              Hướng dẫn chạy chi tiết
docs/api-samples.http    Sample request/response
```

## Quick start

```powershell
# Backend
cd "c:\Project VL\backend\BadmintonFinance.Api"
dotnet restore
dotnet run                # http://localhost:5000  + /swagger

# Frontend (terminal khác)
cd "c:\Project VL\frontend"
npm install
npm run dev               # http://localhost:5173
```

Mặc định: `admin / Admin@123`.

Đọc [docs/RUN.md](docs/RUN.md) để biết chi tiết.

## Tính năng chính

- Quản lý người chơi (Member / Guest), theo dõi nợ tích lũy
- Quản lý sân (tên, địa chỉ, giá mặc định)
- Quản lý buổi đánh: Draft → Open → Closed (kèm Reopen có lý do + audit log)
- Tính phí/slot tự động: `FeePerSlot = TotalExpense / TotalSlots`
- Thu nhanh: 1–2 chạm với preset số tiền còn nợ (`QuickPayment` API)
- Quỹ chung: nhận balance khi chốt buổi, lịch sử giao dịch quỹ đầy đủ
- Báo cáo thu chi theo khoảng ngày + top công nợ
- PWA: cài lên home screen iOS / Android, hoạt động khi mất mạng tạm thời
- Mobile-first: bottom nav 5 tab, FAB, bottom sheet, nút ≥ 48px, input ≥ 16px (chống zoom iOS)

### Phân quyền (RBAC)

App dùng 3 vai trò seeded sẵn. Mỗi endpoint backend gắn một policy (`[Authorize(Policy = Policies.X)]`); frontend ẩn nút bằng các helper `canX()` trong `frontend/src/store/auth.ts`.

| Vai trò | Quyền chính |
|---|---|
| `Admin` | Toàn quyền: tất cả ô của Treasurer + quản lý người dùng, template, audit log, bảo trì (xóa dữ liệu) |
| `Treasurer` | Vận hành hằng ngày: buổi đánh, người chơi, sân, đặt sân, quỹ, xuất CSV |
| `User` | Chỉ xem (không có policy nào cho phép thao tác ghi) |

Tài khoản mặc định: `admin / Admin@123` (xem [DbSeeder.cs](backend/BadmintonFinance.Infrastructure/Persistence/DbSeeder.cs)). Đổi mật khẩu ngay sau lần đăng nhập đầu.

Tạo / khóa người dùng, gán vai trò ở trang **/admin/users**. Xem ma trận quyền hiện hành ở **/admin/permissions**.

#### Single source of truth

Toàn bộ ma trận khai báo trong [`backend/BadmintonFinance.Api/Authorization/PermissionCatalog.cs`](backend/BadmintonFinance.Api/Authorization/PermissionCatalog.cs). File này được dùng cho:
1. Đăng ký policy trong `Program.cs` (vòng lặp qua `PermissionCatalog.Permissions`).
2. Endpoint `GET /api/admin/permissions/matrix` để trang **/admin/permissions** hiển thị.

Nhờ vậy ma trận và authorization runtime không thể lệch nhau.

#### Mở rộng quyền

Thêm 1 quyền mới gồm 3 bước:
1. Thêm hằng vào [`Policies.cs`](backend/BadmintonFinance.Api/Authorization/Policies.cs) và 1 entry vào `PermissionCatalog.Permissions` (label / mô tả tiếng Việt / `AllowedRoles`).
2. Gắn `[Authorize(Policy = Policies.X)]` lên (các) endpoint cần bảo vệ.
3. Thêm helper `canX()` trong [`frontend/src/store/auth.ts`](frontend/src/store/auth.ts) để frontend ẩn / hiện nút tương ứng.
