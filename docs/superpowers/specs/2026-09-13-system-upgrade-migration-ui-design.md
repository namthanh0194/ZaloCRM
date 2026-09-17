# Đặc tả: System Upgrade và Database Migration UI

Ngày: 2026-09-13
Trạng thái: Chờ người dùng duyệt đặc tả

## Mục tiêu

Tạo một trang quản trị để chủ tổ chức kiểm tra phiên bản source code, trạng thái database và chạy các migration còn thiếu mà không cần mở terminal.

Trang này chỉ hỗ trợ chạy migration có sẵn trong source code local đã deploy. Hệ thống không tự động `git pull`, không tự tải SQL từ GitHub để thực thi và không tự rebuild container.

## Phạm vi quyền

- Chỉ user có role `owner` được truy cập trang và gọi API migration.
- User có role khác nhận `403` từ backend, kể cả khi tự gọi endpoint.
- Việc kiểm tra trạng thái migration không làm thay đổi database.

## Kiểm tra phiên bản source

- Phiên bản local lấy từ trường `version` trong `backend/package.json`.
- Phiên bản GitHub lấy từ `backend/package.json` trên branch mặc định của remote `origin`.
- Kết quả hiển thị local version, GitHub version và trạng thái: bằng nhau, GitHub mới hơn hoặc local mới hơn.
- Nếu GitHub mới hơn, giao diện chỉ cảnh báo cần cập nhật source/deploy trước; không chạy migration từ nội dung remote.
- Nếu GitHub không truy cập được, hiển thị lỗi kiểm tra GitHub nhưng vẫn cho phép kiểm tra migration local.

## Kiểm tra database và migration

Backend đối chiếu danh sách thư mục migration local với bảng `_prisma_migrations`:

- `applied`: migration có `finished_at` và chưa bị rollback.
- `pending`: migration local chưa có bản ghi đã hoàn thành.
- `failed`: migration có bản ghi lỗi hoặc chưa hoàn tất.
- `missing_file`: migration được database tham chiếu nhưng source local thiếu `migration.sql`.

Mỗi dòng hiển thị tên migration, trạng thái, thời gian chạy gần nhất và thông báo lỗi nếu có. Database phải được kiểm tra kết nối trước khi trả trạng thái.

Nếu phát hiện migration folder thiếu `migration.sql`, hệ thống đánh dấu lỗi integrity và khóa nút chạy migration để tránh tiếp tục triển khai một lịch sử migration không đầy đủ.

## API dự kiến

### `GET /api/v1/system/upgrade/status`

Trả về:

- `localVersion`
- `remoteVersion`
- `versionStatus`
- `databaseConnected`
- `migrationIntegrity`
- `migrations[]`
- `pendingCount`
- `canMigrate`

Endpoint yêu cầu auth và role `owner`.

### `POST /api/v1/system/upgrade/migrate`

- Chỉ role `owner` được gọi.
- Từ chối nếu database chưa kết nối, migration integrity lỗi hoặc đang có một phiên migration khác chạy.
- Chạy `prisma migrate deploy` trong runtime của app.
- Không nhận SQL tùy ý từ request body.
- Trả về trạng thái từng migration và output đã được chuẩn hóa, không trả secret hoặc giá trị môi trường.
- Ghi audit log gồm user, thời gian, version local, số migration thành công và lỗi nếu có.

Migration phải có khóa chạy đồng thời để hai cửa sổ trình duyệt không cùng chạy một lần.

## Giao diện

Route đề xuất: `/settings/system-upgrade`.

Giao diện gồm:

1. Tiêu đề “Nâng cấp hệ thống” và nút “Kiểm tra lại”.
2. Thẻ database: kết nối thành công/thất bại.
3. Thẻ source: local version, GitHub version và cảnh báo chênh lệch.
4. Danh sách migration với trạng thái và thời gian chạy.
5. Nút “Chạy migration còn thiếu”, chỉ enabled khi `canMigrate=true` và `pendingCount > 0`.
6. Hộp xác nhận trước khi chạy.
7. Kết quả chạy, lỗi rõ ràng và nút kiểm tra lại sau khi hoàn tất.

Không hiển thị trang hoặc nút này cho user không phải `owner`; backend vẫn là lớp bảo vệ chính.

## An toàn và xử lý lỗi

- Không dùng `prisma db push --accept-data-loss` cho thao tác từ UI.
- Không cho phép truyền tên file hoặc câu SQL từ client để thực thi.
- Không chạy migration nếu source có migration file bị thiếu.
- Nếu một migration lỗi, dừng theo hành vi của Prisma và hiển thị migration lỗi; không tự đánh dấu thành công.
- Không tự sửa hoặc xóa lịch sử `_prisma_migrations`.
- Khi source local chưa cập nhật theo GitHub, migration UI không tự động cập nhật source.

## Kiểm thử và xác minh

- Unit test kiểm tra phân quyền: chỉ `owner` được xem trạng thái và chạy migration.
- Unit test kiểm tra phân loại `applied`, `pending`, `failed`, `missing_file`.
- Unit test kiểm tra khóa chống chạy đồng thời.
- Integration test chạy migration trên database test và xác minh bảng `_prisma_migrations`.
- Kiểm thử UI với database mới, database đã cập nhật, migration pending và migration integrity lỗi.
- Xác minh sau triển khai bằng API status, API migrate và kiểm tra trực tiếp database.

## Ngoài phạm vi

- Tự động `git pull`, build image hoặc restart Docker.
- Tự động tải và chạy migration từ GitHub.
- Rollback migration từ UI.
- Tạo cơ chế migration riêng thay thế Prisma.
- Triển khai phân quyền hội thoại `conversation_access`; tính năng đó sẽ dùng cơ chế migration này ở một thay đổi riêng.
