# Project Agent Instructions

## Tech Stack

- Frontend: Vue 3, TypeScript, Vite, Pinia và Vuetify.
- Backend: Node.js ESM, TypeScript, Fastify 5 và Prisma 7.
- Data/services: PostgreSQL 16, Redis 7 và MinIO.
- Realtime và Zalo integration: Socket.IO và `zca-js`.
- Frontend entry point: `frontend/src/main.ts`; backend entry point: `backend/src/app.ts`.

## Rule CodeGraph

- Với yêu cầu phân tích, sửa hoặc review TypeScript/JavaScript/Vue, ưu tiên dùng CodeGraph MCP trước khi đọc nhiều file bằng `rg`.
- Dùng CodeGraph cho tìm symbol, caller/callee, call graph, dependency, edit context và impact analysis.
- Với backend Fastify/Prisma hoặc frontend Vue/Pinia, dùng CodeGraph để phân tích module, route, component, composable, store và behavior trước khi sửa.
- Với markup Vue/HTML thuần, translation/language key, CSS/Tailwind usage và kiểm tra trực quan, không dùng CodeGraph làm nguồn chính; dùng `rg` và đọc trực tiếp source của project.
- Với thay đổi UI cần xác minh render, layout hoặc interaction, dùng Playwright khi phù hợp.
- Với logic trong Vue component, composable, Pinia store hoặc event flow TypeScript/JavaScript, vẫn ưu tiên dùng CodeGraph.
- Nếu CodeGraph không kết nối, index chưa sẵn sàng hoặc kết quả thiếu, fallback sang `rg` và báo ngắn gọn.
- Không chạy CodeGraph cho yêu cầu chỉ đổi text, class Tailwind, format, tài liệu hoặc thao tác Git đơn giản.
- Sau khi thêm, xóa, đổi tên function/class/component hoặc thay đổi call chain TypeScript/JavaScript/Vue, dùng CodeGraph kiểm tra lại caller/callee hoặc impact trước khi báo hoàn tất.
- Không dùng `codegraph_memory_*`, không sinh tài liệu và không tạo file theo dõi nếu người dùng chưa yêu cầu.
- CodeGraph chỉ dùng để đọc/phân tích; mọi thay đổi source vẫn tuân theo quy trình xác nhận, test và review của dự án.

## Rule nâng cấp hệ thống và database migration

- Mọi thay đổi cấu trúc database như thêm, sửa, xóa table, column, index, constraint hoặc enum phải được thực hiện bằng Prisma migration; không sửa trực tiếp database production hoặc chỉ thay đổi `schema.prisma` mà thiếu migration.
- Mỗi thay đổi database phải tăng version hệ thống theo convention hiện tại của dự án ở các package/manifest liên quan, để trang `/settings/system-upgrade` nhận diện được bản nâng cấp.
- Phải kiểm tra migration và version mới xuất hiện trong trạng thái nâng cấp hệ thống trước khi báo hoàn tất.
- Không tự động chạy `prisma migrate deploy`, `prisma db push` hoặc bất kỳ lệnh nào làm thay đổi database thật; người dùng sẽ chủ động chạy migration từ `/settings/system-upgrade`.
- Không xóa, đổi tên hoặc làm mất dữ liệu hiện có khi chưa có chiến lược migration an toàn và chưa được người dùng yêu cầu rõ ràng.
- Khi migration không tương thích ngược hoặc cần thao tác thủ công, phải ghi rõ trong kết quả bàn giao để người dùng xử lý theo đúng thứ tự nâng cấp.
- Chỉ tạo migration sau khi đã xác định rõ schema thay đổi, phạm vi dữ liệu ảnh hưởng và cách rollback/khôi phục phù hợp.

## Rule môi trường DEV local (Backend & Frontend)

- **Backend (Port 3000):**
  - Chạy bằng `tsx watch` để server tự động hot-reload trong ~1 giây khi sửa bất kỳ file `.ts` nào:
    `npx tsx watch --env-file=.env src/app.ts` (thư mục `backend/`).
  - *Lưu ý quan trọng:* Cú pháp bắt buộc đặt `watch` trước `--env-file=.env` (không dùng `tsx --env-file=.env watch ...`) để tránh lỗi `ERR_MODULE_NOT_FOUND`.
  - Khi cần chạy nền ẩn trên Windows/PowerShell:
    `Start-Process -FilePath "npx.cmd" -ArgumentList "tsx watch --env-file=.env src/app.ts" -WorkingDirectory "backend" -WindowStyle Hidden`
- **Frontend (Port 5173):**
  - Chạy bằng Vite dev server: `npm run dev` (thư mục `frontend/`).
  - Vite proxy `/api` và `/socket.io` sang `http://localhost:3000`.
- **Nguyên tắc kiểm tra trạng thái (Pre-check):**
  - Khi gặp lỗi mạng, lỗi API hoặc lỗi đăng nhập (thông báo sai thông tin), trước tiên phải kiểm tra cổng `3000` có đang ở trạng thái `Listen` hay không, tránh nhầm lẫn mã `502 Bad Gateway` (do backend chưa bật) với lỗi nghiệp vụ/sai tài khoản.

## Rule Docker và dịch vụ phụ trợ

- DEV local dùng `docker-compose.dev.yml` để chạy PostgreSQL tại `localhost:5433`; không nhầm với PostgreSQL mặc định tại port `5432`.
- Trước khi kết luận lỗi backend do database, kiểm tra container và health của PostgreSQL, Redis và MinIO nếu tính năng đang sử dụng các dịch vụ đó.
- Không tự ý dừng, xóa container hoặc xóa Docker volume vì có thể làm mất dữ liệu local.
- Không dùng `docker compose down -v`, `prisma migrate reset` hoặc lệnh destructive khác nếu chưa được người dùng yêu cầu rõ ràng.
- Production dùng `docker-compose.yml`; không chạy nhầm cấu hình production để thao tác database DEV hoặc ngược lại.

## Rule backend Fastify và Prisma

- Backend dùng Node.js ESM và TypeScript; giữ đúng convention import/module hiện có.
- Dùng Prisma Client singleton hiện có tại `backend/src/shared/database/prisma-client.ts`; không tự tạo `new PrismaClient()` trần nếu code cần PostgreSQL adapter hoặc tenant guard.
- Khi sửa API có liên quan tổ chức, user, dữ liệu CRM hoặc phân quyền, phải kiểm tra tenant context, RLS và quyền truy cập trước khi sửa.
- Thay đổi schema database bắt buộc dùng Prisma migration; không chỉ sửa `schema.prisma` và không sửa trực tiếp database production.
- Không tự động chạy `prisma migrate deploy`, `prisma db push`, `prisma migrate reset` hoặc seed trên database thật.
- Khi reset hoặc thay đổi mật khẩu, phải lưu bcrypt hash, không lưu mật khẩu dạng rõ trong source, log hoặc file tạm; phải xác minh bằng `bcrypt.compare`.
- Khi sửa route/service, giữ nguyên HTTP contract, mã lỗi và shape response nếu yêu cầu không nêu thay đổi API.

## Rule frontend Vue và Pinia

- Frontend dùng Vue 3, TypeScript, Vite, Pinia và Vuetify; tuân thủ cấu trúc component/store/composable hiện có.
- Không tự ý đổi API path, request field hoặc response shape giữa frontend và backend khi chưa kiểm tra cả hai phía.
- Với logic trong component, composable, Pinia store hoặc event flow, dùng CodeGraph để kiểm tra caller/callee và phạm vi ảnh hưởng.
- Với markup, translation key, CSS/Tailwind hoặc thay đổi text đơn thuần, dùng `rg` và đọc trực tiếp source thay vì chạy CodeGraph không cần thiết.
- Với thay đổi UI, layout hoặc interaction, dùng Playwright hoặc kiểm tra trực quan khi phù hợp.
- Khi gặp lỗi API/login, phân biệt lỗi nghiệp vụ `4xx` với lỗi kết nối/proxy `502`, `503` và `504` trước khi sửa code.

## Rule phát triển UI và components

- Ưu tiên dùng component Vuetify và design token/theme hiện có trước khi tự viết HTML hoặc CSS.
- Với button, input, select, dialog, menu, table, tabs, chip, snackbar và tooltip, dùng component tương ứng của Vuetify như `v-btn`, `v-text-field`, `v-select`, `v-dialog`, `v-menu`, `v-data-table`, `v-tabs`, `v-chip`, `v-snackbar` và `v-tooltip` thay vì hardcode component tương đương.
- Trước khi tạo UI mới, phải tìm trong `frontend/src/components/` xem đã có custom component dùng chung hoặc pattern tương tự chưa; ưu tiên tái sử dụng và mở rộng bằng props/slots.
- Không tạo modal, dropdown, form control hoặc notification riêng nếu Vuetify đã đáp ứng được yêu cầu, trừ khi có lý do kỹ thuật rõ ràng.
- Dùng `props`, `slots`, `density`, `variant`, màu semantic và theme hiện có thay vì lặp lại style cho từng màn hình.
- Không hardcode màu, font-size, spacing, border-radius hoặc kích thước tùy tiện khi đã có token/class/style dùng chung; hạn chế inline style và các giá trị pixel rời rạc.
- Dùng icon theo convention hiện có của module: `@mdi/font` qua `v-icon` hoặc `lucide-vue-next`; không chèn SVG inline lớn hoặc dùng ký tự Unicode thay icon.
- Không hardcode text hiển thị trong UI nếu text cần dịch; dùng `vue-i18n` và translation key theo convention của dự án.
- Khi một khối UI có khả năng dùng lại hoặc template bắt đầu phức tạp, tách thành custom component có tên và interface rõ ràng; không sao chép markup giữa nhiều view.
- UI mới phải giữ nhất quán với layout, responsive behavior, accessibility và theme hiện có; không tự thêm thư viện UI khác nếu chưa được yêu cầu.

## Rule kiểm thử và xác minh

- Trong môi trường DEV local, KHÔNG chạy `npm run build` (cả frontend lẫn backend) để tránh lãng phí thời gian và làm chậm tốc độ phát triển. Frontend đã có Vite HMR (hot-reload trong ~100ms) và backend có `tsx watch`.
- Khi cần kiểm tra nhanh tính đúng đắn của TypeScript/type-check ở frontend, ưu tiên chạy lệnh nhẹ `npx vue-tsc --noEmit` (không đóng gói file, chỉ soi lỗi kiểu).
- Backend: chạy kiểm tra hẹp trước, chỉ chạy `npm test` cho các module/unit test liên quan khi có thay đổi logic nghiệp vụ.
- Frontend: chạy kiểm tra hẹp trước, chỉ chạy `npm test` cho các component/composable có test khi cần kiểm chứng logic.
- Chỉ chạy `npm run build` khi chuẩn bị đóng gói Docker, tạo bản release production hoặc khi người dùng yêu cầu rõ ràng.
- Khi sửa lỗi, ưu tiên tạo kiểm thử tái hiện lỗi trước khi sửa; không chỉ xác minh bằng cảm quan.
- Không tạo test, fixture, script thử nghiệm, log debug hoặc output kỹ thuật ở project root; mọi file tạm phải nằm trong `tmp/`.
- Không coi việc server khởi động thành công là đủ; phải kiểm tra endpoint hoặc behavior bị ảnh hưởng.
- Trước khi báo hoàn tất, ghi rõ các lệnh xác minh đã chạy và kết quả; không tuyên bố “đã sửa” nếu chưa có bằng chứng kiểm tra.

## Rule bảo mật và dữ liệu nhạy cảm

- Không ghi password, access token, refresh token, JWT secret, encryption key, API key hoặc `DATABASE_URL` vào log, source, test fixture hay kết quả bàn giao.
- Không commit file `.env`, dữ liệu người dùng, dump database hoặc artifact trong `tmp/` nếu chưa có yêu cầu rõ ràng.
- Khi cần debug auth, chỉ log email/user ID đã được giới hạn; không log password hoặc toàn bộ token.
- Không tải, xuất hoặc sửa dữ liệu người dùng ngoài phạm vi yêu cầu.
- Không dùng dữ liệu production để test local nếu chưa ẩn danh hoặc chưa được cho phép.

## Rule quy trình thay đổi

- Tuân thủ quy trình 2 bước của Global rules (lượt đầu phân tích và đề xuất → người dùng `ok` mới thực thi thay đổi); đối với các câu hỏi tra cứu thông tin, đối chiếu, giải thích hoặc tư vấn thuần túy không làm thay đổi tệp hay hệ thống, trả lời phân tích trực tiếp.
- Tìm nguyên nhân gốc trước khi sửa lỗi (Root Cause Investigation); không áp dụng bản vá tạm bợ khi chưa rõ nguyên nhân.
- Không tự ý commit Git, tạo branch, deploy hoặc chạy migration production khi người dùng chưa yêu cầu rõ ràng.
- **Quy tắc phát triển trên nhánh `develop` và cập nhật phiên bản:**
  - Mọi công việc phát triển, sửa lỗi hoặc tính năng mới chỉ được thực hiện và push lên nhánh `develop`. Nhánh `main` do người dùng tự merge thủ công.
  - Mỗi lần chuẩn bị commit/push lên nhánh `develop` có thay đổi tính năng, sửa lỗi hoặc cấu trúc, bắt buộc phải:
    1. Tăng version hệ thống (theo chuẩn SemVer: patch khi sửa lỗi/refactor nhỏ, minor khi thêm tính năng/migration) đồng bộ tại `backend/package.json`, `frontend/package.json` và cập nhật `RELEASE_MIGRATION_BASELINES` trong `backend/src/modules/system-upgrade/migration-release-manifest.ts` nếu có migration mới.
    2. Cập nhật `CHANGELOG.md` ghi rõ số version mới, ngày tháng và chi tiết các nội dung đã thay đổi (Added / Changed / Fixed).

## Rule cấu trúc thư mục và phạm vi file

- Không tạo file mới ở project root nếu file đó không phải configuration, documentation hoặc entrypoint được xác định rõ.
- Giữ dependency flow một chiều; không tạo import vòng hoặc để module tầng thấp phụ thuộc ngược vào page/view hay route.
- Khi không chắc file mới thuộc đâu, phải xác định trách nhiệm của file trước; không đặt tùy tiện vào `utils`, `helpers`, `common` hoặc `shared`.

### Cấu trúc thư mục chuẩn

```text
.
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   ├── config/              # Đọc và validate cấu hình runtime
│   │   ├── modules/<domain>/     # Route/service/schema/type theo nghiệp vụ
│   │   └── shared/              # Hạ tầng dùng chung giữa nhiều domain
│   ├── prisma/
│   │   ├── schema.prisma        # Mô hình dữ liệu khai báo
│   │   ├── migrations/          # Thay đổi schema có version
│   │   ├── rls/                 # Policy/SQL RLS
│   │   └── seeds/               # Dữ liệu seed có chủ đích
│   ├── scripts/                 # Backfill, vận hành, seed hoặc migration hỗ trợ
│   └── tests/                   # Test chính thức của backend
├── frontend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── api/                 # API client và mapping contract
│   │   ├── assets/              # Asset tĩnh và style dùng chung
│   │   ├── components/          # Component UI dùng lại, nhóm theo domain
│   │   ├── composables/         # Logic reactive dùng lại, không chứa page markup
│   │   ├── layouts/             # Khung bố cục cấp ứng dụng
│   │   ├── plugins/             # Vuetify, plugin và tích hợp khởi tạo app
│   │   ├── router/              # Route definitions và navigation guards
│   │   ├── stores/              # Pinia state/action theo bounded context
│   │   └── views/               # Page-level orchestration
│   └── tests/                   # Test chính thức của frontend nếu có
├── docs/                        # Tài liệu kiến trúc, triển khai và vận hành
├── scripts/                     # Script cấp repository nếu có
├── tmp/                         # Test/script/output debug tạm, không commit/deploy
├── docker/                      # Dockerfile và file build image
├── docker-compose*.yml          # Cấu hình compose theo môi trường
└── AGENTS.md
```

### Quy tắc Backend theo thư mục

- `backend/src/modules/<domain>/` chỉ chứa code thuộc domain đó; route nhận request, service xử lý nghiệp vụ, schema/type mô tả contract và helper nội bộ domain.
- `backend/src/shared/` chỉ chứa hạ tầng hoặc logic được dùng thật sự bởi nhiều domain; không đặt nghiệp vụ riêng của một module vào đây.
- `backend/prisma/` chỉ quản lý schema, migration, RLS và seed; không đặt route hoặc business service vào thư mục này.
- `backend/scripts/` dành cho tác vụ chạy chủ động như backfill, seed, dry-run hoặc kiểm tra vận hành; không import script vào runtime production.
- `backend/tests/` chứa test chính thức; test thử nghiệm một lần, fixture tạm và output debug phải đặt trong `tmp/`.
- Dependency flow ưu tiên: `route → service → shared/database`; route không tự chứa truy vấn phức tạp nếu nghiệp vụ có thể đặt trong service.

### Quy tắc Frontend theo thư mục

- `frontend/src/views/` chỉ điều phối page-level, layout và kết nối store; không sao chép component dùng chung giữa các view.
- `frontend/src/components/<domain>/` chứa UI theo domain; component dùng cho nhiều domain đặt trong nhóm dùng chung phù hợp.
- `frontend/src/stores/` chứa state, getter và action; không đặt markup hoặc logic hiển thị thuần túy vào store.
- `frontend/src/composables/` chứa logic reactive hoặc behavior dùng lại; không đặt component UI vào composable.
- `frontend/src/api/` là nơi tập trung API client, interceptor và mapping request/response; component không tự tạo Axios client riêng.
- `frontend/src/layouts/`, `router/`, `plugins/` và `assets/` giữ đúng vai trò hạ tầng ứng dụng; không dùng làm thư mục chứa code nghiệp vụ tùy tiện.
- Dependency flow ưu tiên: `view → component/store/composable → api`; component dùng lại không được phụ thuộc ngược vào một view cụ thể.

### Quy tắc thêm domain hoặc tính năng mới

- Trước khi tạo thư mục mới, tìm domain/pattern hiện có để mở rộng thay vì tạo cấu trúc song song.
- Tính năng backend mới phải xác định rõ module, route/service, test và migration liên quan trước khi code.
- Tính năng frontend mới phải xác định rõ view, component, store/composable và API layer liên quan trước khi code.
- Nếu thay đổi cả frontend và backend, giữ tên domain và contract nhất quán giữa hai bên.
- Không đổi tên hoặc di chuyển thư mục hiện có chỉ để làm đẹp cấu trúc nếu không thuộc phạm vi yêu cầu.
