# Kế hoạch thực hiện: System Upgrade & Database Migration UI

Ngày: 2026-09-13
Đặc tả tham chiếu: `docs/superpowers/specs/2026-09-13-system-upgrade-migration-ui-design.md`

## Mục tiêu
Xây dựng trang giao diện `/settings/system-upgrade` cho phép chủ tổ chức (`owner`):
1. Kiểm tra version local `backend/package.json` so với version trên GitHub.
2. Kiểm tra trạng thái kết nối PostgreSQL và tính toàn vẹn của thư mục migration.
3. Xem danh sách chi tiết các migration: đã chạy (thời gian) và chưa chạy.
4. Bấm nút chạy các migration còn thiếu (`prisma migrate deploy`) có khóa chống chạy đồng thời và ghi audit log.

---

## Danh sách file tác động
- `backend/src/modules/system-upgrade/system-upgrade-service.ts` (Mới: logic so sánh version, kiểm tra migration status, lock deploy)
- `backend/src/modules/system-upgrade/system-upgrade-routes.ts` (Mới: endpoints GET status, POST migrate có bảo vệ auth + role owner)
- `backend/src/app.ts` (Cập nhật: đăng ký route `/api/v1/system/upgrade`)
- `frontend/src/views/settings/SystemUpgradeView.vue` (Mới: giao diện nâng cấp hệ thống và danh sách migration)
- `frontend/src/router/index.ts` (Cập nhật: thêm route `/settings/system-upgrade`)
- `frontend/src/views/SettingsView.vue` (Cập nhật: thêm menu Nâng cấp hệ thống cho owner)
- `backend/tests/system-upgrade.test.ts` (Mới: unit test service & route phân quyền)

---

## Các bước thực hiện (TDD)

### Nhiệm vụ 1: Core Service & Migration Status Logic
- **Mục tiêu**: Viết hàm phân loại migration (`applied`, `pending`, `missing_file`), đọc version và lock deploy.
- **Test**: `backend/tests/system-upgrade.test.ts`
- **Xác minh**: Chạy test kiểm tra logic đọc danh sách migration và phân loại chính xác.

### Nhiệm vụ 2: Backend Route & Permission Enforcement
- **Mục tiêu**: Endpoint `GET /api/v1/system/upgrade/status` và `POST /api/v1/system/upgrade/migrate`.
- **Quy tắc**: Chỉ `user.role === 'owner'` được phép truy cập. Mọi role khác trả về `403`.
- **Xác minh**: Test gọi endpoint với user `member`, `admin` (bị 403) và `owner` (thành công).

### Nhiệm vụ 3: Frontend View & Router
- **Mục tiêu**: Tạo giao diện `SystemUpgradeView.vue` theo đúng mẫu tham khảo (Thẻ trạng thái DB, thẻ Version GitHub vs Local, danh sách migration kèm tag màu, nút chạy migration).
- **Tích hợp**: Thêm route và hiển thị mục menu tại trang Cài đặt cho owner.
- **Xác minh**: Build frontend không lỗi TypeScript/Vite.

### Nhiệm vụ 4: Build, Deploy & End-to-End Verification
- **Mục tiêu**: Build lại container backend/frontend, gọi trực tiếp API và kiểm tra giao diện trên trình duyệt.
- **Xác minh**:
  - Kiểm tra `GET /api/v1/system/upgrade/status` trả về đúng 110 migration đã có.
  - Kiểm tra giao diện web tại `http://localhost:3080/settings/system-upgrade`.
