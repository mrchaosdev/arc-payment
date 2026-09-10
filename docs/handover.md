# Bàn giao — trạng thái và việc còn lại

Ghi ngày 2026-09-09. Mục đích: mở repo ở máy khác là làm tiếp được ngay, không phải dò lại
những thứ đã tốn thời gian để tìm ra.

README mô tả sản phẩm và cách chạy. File này mô tả **trạng thái hiện tại**, **những cái bẫy đã
gặp**, và **việc còn lại**.

## Trạng thái

Toàn bộ kiểm tra đang xanh:

| Lệnh | Kết quả |
| --- | --- |
| `npm run build` | thành công |
| `npm run lint` | sạch |
| `npm test` | 20/20 |
| `npm run test:e2e` | 24/24 |

Chưa commit tại thời điểm ghi: navbar ví (`WalletControls`), danh bạ, store trợ lý dùng chung,
`usePendingPayments`, và `src/app/contacts/`.

## Bản đồ

### Route

| Route | Kiểu | Ghi chú |
| --- | --- | --- |
| `/` | tĩnh | Trang giới thiệu |
| `/dashboard` | tĩnh | Tổng quan workspace |
| `/pay` | động | Gửi và tạo yêu cầu (đọc `?to=`, `?amount=`, `?mode=`) |
| `/requests` | tĩnh | Link đã lưu, có QR và chia sẻ |
| `/history` | tĩnh | Lịch sử, hoá đơn in được |
| `/contacts` | tĩnh | Danh bạ người nhận |
| `/checkout` | động | Màn người trả tiền. **Không dùng `AppShell`** nên không có sidebar và không có trợ lý |
| `/settings` | tĩnh | Cài đặt |
| `/api/chat` | động | `GET` trả `{configured}`, `POST` stream câu trả lời |

Route tĩnh được prerender lúc build — xem bẫy số 2.

### Store (zustand + persist, đều là localStorage)

| Store | Khoá localStorage | Giới hạn |
| --- | --- | --- |
| `store/payments` | `chaospay-workspace-v1` | 200 payment, 200 request |
| `store/contacts` | `chaospay-contacts-v1` | 100 liên hệ |
| `store/settings` | `chaospay-settings` | — |
| `store/assistant` | *không lưu* | chỉ chia sẻ trạng thái mở/đóng giữa sidebar và quả cầu |

Toàn bộ dữ liệu nằm trong trình duyệt. Đổi máy hoặc đổi trình duyệt là mất — đây là giới hạn
thiết kế, không phải lỗi, và giao diện có nói rõ điều đó.

### Chỗ dễ tìm nhầm

- `lib/payments.ts` — validate theo từng trường (`recipientError`, `amountError`), làm tròn phí
  lên đơn vị USDC, và `paymentTotals`. `lib/contacts.ts` dùng lại `recipientError` từ đây.
- `hooks/usePendingPayments.ts` — **một** watcher receipt cho toàn app, mount trong navbar.
- `lib/assistant/` — `knowledge.ts` (system prompt, chỉ chạy phía server), `tools.ts`,
  `protocol.ts`. Chi tiết ở [docs/payment-assistant.md](payment-assistant.md).
- Tên class giao diện: [docs/css-classes.md](css-classes.md).

## Biến môi trường

| Biến | Phía | Bắt buộc lúc |
| --- | --- | --- |
| `GEMINI_API_KEY` | server | **runtime** là đủ |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | client | **build** |
| `COINGECKO_API_KEY` | server | tuỳ chọn |

`NEXT_PUBLIC_*` bị nhúng cứng vào bundle lúc `next build`. Đặt lúc runtime không có tác dụng.

Trên Vercel: Project Settings → Environment Variables → chọn scope Production → **redeploy**.
Vercel không áp biến mới cho deployment cũ. File `.env.vercel` ở gốc repo (đã bị gitignore) có
sẵn nội dung để dán vào.

## Sáu cái bẫy đã tốn thời gian

Ghi lại để không phải tìm lại lần hai.

**1. wagmi gộp mọi lệnh đọc contract qua Multicall3.** Mock RPC trong test trả về `uint256` trần
sẽ làm viem giải mã thất bại và query retry vĩnh viễn — biểu hiện là số dư kẹt ở "Loading USDC…"
chứ không báo lỗi. Mock phải giải mã `aggregate3` rồi trả về mảng `(bool, bytes)`; xem đầu file
`tests/e2e/navigation.spec.ts`. Arc Testnet **có** deploy Multicall3 tại
`0xcA11bde05977b3631167028862bE2a173976CA11`, nên đây thuần tuý là vấn đề của test.

**2. Route tĩnh đóng băng `process.env` vào lúc build.** Trước đây `AppShell` kiểm tra
`process.env.GEMINI_API_KEY` để quyết định hiện trợ lý. Hậu quả: build không có key thì trợ lý
**biến mất vĩnh viễn** khỏi các trang tĩnh, kể cả khi runtime có key — không lỗi, không log.
Nay widget tự gọi `GET /api/chat` lúc chạy rồi tự ẩn. **Đừng đưa cổng chặn theo env trở lại
`AppShell`.**

**3. WalletConnect không có project id thì kêu to.** Chưa có `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`,
`config.ts` chỉ chào ví `injected` và `safe`; bỏ luôn Rainbow vì nó cũng chạy nền WalletConnect.
Nếu chào chúng khi chưa có id, mỗi lần mở hộp thoại connect sẽ có 403 từ `api.web3modal.org` và
400 từ `pulse.walletconnect.org`. Test `workspace.spec.ts` canh chỗ này.

**4. Overlay dev-tools của Next.js cũng mang `role="alert"`.** `getByRole("alert")` trần sẽ khớp
2 phần tử ở chế độ dev. Luôn dùng `.filter({ hasText })` hoặc locator theo class.

**5. `timeout` của Playwright là 90s, không phải 45s mặc định.** Test dài nhất chạy 6 lần tải
trang qua dev server; ở 45s có hai test nằm sát trần và đỏ ngẫu nhiên dù nội dung đúng.

**6. `@google/genai` export `Stream` trong `.d.ts` nhưng không có lúc chạy.** `instanceof Stream`
qua được `tsc` rồi chết ở bước build. Route đang thu hẹp kiểu bằng `Symbol.asyncIterator in result`.

Ngoài ra: repo dùng **CRLF**. Ghi file bằng LF sẽ tạo diff toàn file.

## Việc còn lại

Xếp theo thứ tự đáng làm trước.

**1. Đổi khoá Gemini.** Khoá hiện tại đã lộ trong lịch sử chat. Tạo khoá mới ở
[aistudio.google.com/apikey](https://aistudio.google.com/apikey), cập nhật `.env.local`,
`.env.vercel` và Vercel, rồi xoá khoá cũ.

**2. Lấy WalletConnect project id.** Hiện **ví trên điện thoại không kết nối được** — chỉ ví
extension vào được. Lấy free ở [cloud.reown.com](https://cloud.reown.com), bỏ dấu `#` trong
`.env.vercel`, build lại. Code đã rẽ nhánh sẵn, không phải sửa gì.

**3. Ba poller chồng nhau ở `/pay`.** `PaymentStudio` giữ poller riêng 5s cho giao dịch đang bay,
`usePendingPayments` quét 8s, số dư refetch 15s. Cùng một hash bị hai watcher hỏi. Hướng gọn:
để `PaymentStudio` đọc trạng thái từ store thay vì tự poll.

**4. Popover trong navbar đóng cứng vị trí** (`top-28 sm:top-16 right-4`). Đổi chiều cao header
là lệch. CSS anchor positioning là lời giải đúng nhưng hỗ trợ trình duyệt còn hẹp.

**5. Select danh bạ ở `/pay` luôn trở về "Choose a contact"** sau khi chọn, không cho biết đang
dùng liên hệ nào. Trong `onChange` cũng có một dòng `setFieldErrors` thừa vì `edit()` đã tự xoá
lỗi trường.

**6. `SplashCursor` chỉ được phép chạy ở route landing.** Bản từng nối vào `AppShell` đã gây rò rỉ
bộ nhớ GPU khi resize và có thể để canvas chết phủ toàn trang khi mất WebGL context. Bản hiện tại
giữ các bản vá đó, tải động từ `ArcHome`, dùng canvas fixed theo viewport và không nhận pointer event,
bỏ qua thiết bị coarse-pointer và reduced-motion, rồi tự ngừng render sau 2,4 giây không tương tác.
Không chuyển nó trở lại `AppShell`; xem
[docs/CHAOUI-ADAPTATION.md](CHAOUI-ADAPTATION.md#the-splash-cursor--landing-only-and-budgeted).

## Quy ước khi sửa tiếp

- **Đọc tài liệu Next trước khi dùng API mới**: `node_modules/next/dist/docs/`. Bản Next trong
  repo có thay đổi phá vỡ so với thói quen cũ — đây là yêu cầu trong `AGENTS.md`.
- **Tên class**: kebab-case một gạch, theo chức năng. Tra ở [docs/css-classes.md](css-classes.md).
- **Test**: unit đặt ở `tests/*.test.mjs` (chạy bằng type-stripping của Node, không cần build),
  browser ở `tests/e2e/*.spec.ts`.
- Trước khi chạy `npm run test:e2e`, **dừng dev server cũ** nếu có. Playwright dùng lại server
  đang chạy ở cổng 3000, nên một server khởi động trước khi đổi biến môi trường sẽ mang giá trị cũ.
