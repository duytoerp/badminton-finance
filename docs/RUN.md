# Hướng dẫn chạy project

## 1. Yêu cầu môi trường

- .NET 8 SDK (https://dotnet.microsoft.com/download)
- Node.js 20+ & npm
- SQL Server 2019+ (LocalDB / Express / Docker đều được)
- (Tuỳ chọn) Visual Studio 2022, VS Code, Rider

## 2. Cấu trúc thư mục

```
Project VL/
├── backend/
│   ├── BadmintonFinance.sln
│   ├── BadmintonFinance.Api/         # Web API (entry)
│   ├── BadmintonFinance.Application/ # DTO, Service, Validator
│   ├── BadmintonFinance.Domain/      # Entity, Enum, Exception
│   └── BadmintonFinance.Infrastructure/  # DbContext, Auth, Migrations
├── frontend/                         # React + Vite + PWA
└── docs/
```

## 3. Cấu hình SQL Server

Sửa connection string trong `backend/BadmintonFinance.Api/appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=BadmintonFinanceDb;Trusted_Connection=True;TrustServerCertificate=True"
}
```

Đổi `Jwt:Key` thành chuỗi random dài ≥ 32 ký tự.

## 4. Tạo database

**Cách A — EF Core migrations (khuyến nghị):**

```powershell
cd "c:\Project VL\backend\BadmintonFinance.Api"
dotnet tool install --global dotnet-ef    # nếu chưa có
dotnet ef migrations add InitialCreate --project ..\BadmintonFinance.Infrastructure --startup-project .
dotnet ef database update --project ..\BadmintonFinance.Infrastructure --startup-project .
```

Khi app khởi động lần đầu cũng tự gọi `db.Database.Migrate()` + seed admin / quỹ mặc định.

**Cách B — Chạy SQL trực tiếp:**

Mở SSMS hoặc `sqlcmd`, chạy file:
`backend/BadmintonFinance.Infrastructure/Migrations/001_Initial.sql`

## 5. Chạy backend

```powershell
cd "c:\Project VL\backend\BadmintonFinance.Api"
dotnet restore
dotnet run
```

Mặc định API chạy ở `http://localhost:5000` (và `https://localhost:5001`). Swagger UI: `http://localhost:5000/swagger`.

**Tài khoản admin mặc định:**
- Username: `admin`
- Password: `Admin@123`

## 6. Chạy frontend

```powershell
cd "c:\Project VL\frontend"
npm install
npm run dev
```

Mở `http://localhost:5173`. Vite đã proxy `/api` → `http://localhost:5000`.

Để chạy thử trên điện thoại cùng wifi:

```powershell
npm run dev -- --host
```

Trên iPhone/Android, mở `http://<IP-máy-tính>:5173`.

## 7. Build production

```powershell
# Frontend
cd "c:\Project VL\frontend"
npm run build         # output: dist/

# Backend
cd "c:\Project VL\backend"
dotnet publish BadmintonFinance.Api -c Release -o ..\publish
```

Có thể host frontend tĩnh trên cùng Kestrel bằng cách copy `frontend/dist` vào `BadmintonFinance.Api/wwwroot` và thêm `app.UseDefaultFiles(); app.UseStaticFiles();` vào [Program.cs](../backend/BadmintonFinance.Api/Program.cs).

## 8. PWA — cài lên home screen

Sau khi `npm run build && npm run preview`:

- **iPhone (Safari):** mở site → nút Share → "Add to Home Screen".
- **Android (Chrome):** banner "Cài đặt ứng dụng" hiện tự động, hoặc menu ⋮ → "Install app".

Khi cài đặt xong, app chạy fullscreen, có service worker cache `/api` (NetworkFirst, timeout 5s) → vẫn xem được dữ liệu khi mất mạng tạm thời.

## 9. Luồng nghiệp vụ điển hình tại sân

1. Mở app → tab **Buổi đánh** → bấm **+** → tạo buổi mới (chọn sân, ngày, giờ).
2. Vào chi tiết buổi → bấm **+ Người chơi** → chọn từ danh sách (search nhanh).
3. Bấm **+ Chi phí** → nhập tiền sân, đồ uống...
4. Phí/slot tự tính = `TotalExpense / TotalSlots`. AmountDue mỗi người = `FeePerSlot × SlotCount`.
5. Bấm **Thu** trên từng người → preset số tiền = số còn nợ → 1 chạm là xong (Cash mặc định).
6. Khi xong, bấm **🔒 Chốt buổi**:
   - Hệ thống kiểm tra có ≥ 1 người và đã có chi phí.
   - Cập nhật `TotalIncome / TotalExpense / Balance`.
   - Cộng `Balance` vào quỹ chung và ghi `BadmintonFundTransaction`.
   - Ghi `AuditLog` action `Close`.
7. Nếu cần sửa: **🔓 Mở lại buổi** → nhập lý do ≥ 5 ký tự → API trả Open, ghi `AuditLog` action `Reopen`.

## 10. Các business rules quan trọng (đã code trong [SessionService.cs](../backend/BadmintonFinance.Application/Services/SessionService.cs))

- `EnsureNotClosed` — chặn mọi thao tác sửa khi `Status == Closed`.
- `CloseSessionAsync` — bắt buộc có người chơi + có expense > 0.
- `ComputePaymentStatus` — Unpaid / PartialPaid / Paid / OverPaid theo so sánh `amountPaid` với `amountDue`.
- `RecalculateFees` — chạy mỗi khi thêm/xóa participant hoặc expense.
- `AddParticipantAsync` — vẫn cho thêm khi player đang nợ, nhưng trả `warnings` để frontend hiển thị banner cảnh báo.

## 11. Tài liệu API

- Swagger UI: `http://localhost:5000/swagger`
- Sample request/response: [api-samples.http](api-samples.http) (mở bằng VS Code REST Client).
