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
