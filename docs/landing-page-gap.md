# Landing page — chỗ đã lạc hậu so với sản phẩm

Ghi ngày 2026-09-09, sau khi thêm navbar ví, danh bạ, hoá đơn in được, QR và trợ lý AI.

> **Đã xử lý ngày 2026-09-09.** `src/components/landing/ArcHome.tsx` đã được cập nhật; phần
> *Đã làm gì* ở cuối trang ghi lại từng thay đổi. Giữ nguyên phần mô tả khoảng cách bên dưới làm
> hồ sơ lý do, không phải việc còn tồn.

## 1. "Four things, finished" chỉ còn đúng 4/4, không còn đủ

Mảng `capabilities` render dưới tiêu đề **"Four things, finished. Nothing implied."**

Bốn mục cũ (id `01`-`04`) đều vẫn đúng, không cần sửa nội dung:

| id | Tiêu đề | Vẫn đúng? |
| --- | --- | --- |
| 01 | One currency all the way down | có |
| 02 | The wallet signs, the app never holds | có |
| 03 | A request is a URL | có, nhưng chưa nhắc QR |
| 04 | Every payment ends in a receipt | có, nhưng chỉ nói ArcScan — chưa nhắc hoá đơn in được |

Cái tiêu đề "Four things, finished" giờ là vấn đề: nó ngụ ý đã hết, trong khi app đã có thêm:

- **QR code** trên checkout và trên request đã lưu (`components/payments/PaymentQr.tsx`,
  `ShareActions.tsx`) — có thể gộp vào mục 03 thay vì thêm mục mới.
- **Hoá đơn in được / Save as PDF** (`components/payments/PaymentReceipt.tsx`) — nâng cấp thật
  cho mục 04, đáng nhắc riêng vì đó là bằng chứng cầm được, không chỉ một link ArcScan.
- **Danh bạ người nhận** (`/contacts`, `store/contacts.ts`) — không có mục nào nhắc tới, cần mục
  mới hoặc gộp vào 02/03.
- **Trợ lý AI** (`/api/chat`, `lib/assistant/`) — hoàn toàn không được nhắc ở đâu trên landing.
  Đây là tính năng lớn nhất bị bỏ sót.

## 2. Panel "What this is not" — thiếu một dòng công bố quan trọng

Panel tiêu đề **"READ THIS FIRST"**. Comment ở đầu component nói rõ triết lý:

> *"a payment MVP that hides its boundaries is worse than one that prints them"*

Panel liệt kê 5 giới hạn (chưa production, memo không onchain, dữ liệu chỉ ở browser, không đối
soát tự động, test dùng mock). Nhưng **không có dòng nào** nói trợ lý AI gửi câu hỏi và địa chỉ
ví ra ngoài cho nhà cung cấp mô hình. Điều này đã được ghi rõ ở
[docs/payment-assistant.md](payment-assistant.md):

> *"Shared questions, addresses and read results are processed by the AI provider."*

Trang duy nhất tự nhận là "đọc cái này trước" đang không nói điều mà tài liệu khác trong repo đã
nói. Nên coi đây là việc cần làm cùng đợt, không phải tuỳ chọn — nó đúng tinh thần chính panel đó
đề ra.

## 3. Điều hướng trong hero chưa trỏ tới `/contacts`

Hai nút hành động chỉ có "Open workspace" (`/dashboard`) và "Request payment" (`/pay?mode=request`).
Không sai, nhưng nếu thêm mục capability về danh bạ thì nên có đường dẫn tới `/contacts` ở đâu đó
gần nó — hiện chưa có link nào từ landing tới route này.

## Không cần đụng

Phần hero (headline, settlement path 5 bước, sample receipt), network constants panel, và
meta bar đầu trang vẫn mô tả đúng — không có gì lạc hậu ở đó.

---

## Đã làm gì

### Capabilities

Tiêu đề đổi thành **"Everything here is finished. Nothing implied."** — bỏ con số. Con số phải sửa
lại mỗi lần app lớn thêm, và lần vừa rồi nó đã sai mất bốn tính năng; vế *"Nothing implied"* mới là
vế có giá trị nên đó là vế được giữ.

Lưới đổi từ `xl:grid-cols-4` sang `xl:grid-cols-3`, sáu mục lấp vừa đúng hai hàng ba ô:

| id | Thay đổi |
| --- | --- |
| 01 | giữ nguyên |
| 02 | giữ nguyên |
| 03 | đổi thành "A request is a URL, or a QR"; thân bài nhắc quét mã. Link → `/pay?mode=request` |
| 04 | thân bài nhắc hoá đơn in được và Save as PDF, không chỉ ArcScan. Link → `/history` |
| 05 | **mới** — "Recipients you keep". Link → `/contacts`, đóng luôn mục 3 ở trên |
| 06 | **mới** — "An assistant that only reads". Không có route riêng nên dùng `hint` chỉ chỗ: góc dưới bên phải |

Mỗi card giờ là `flex flex-col`, link/hint dùng `mt-auto` nên chúng thẳng hàng đáy ô dù mô tả dài
ngắn khác nhau. Class mới: `landing-hero-title-primary`, `landing-capability-link`,
`landing-capability-hint` — đã thêm vào [bảng tra class](css-classes.md).

### Panel giới hạn

Thêm một dòng, đặt trước dòng về test mock:

> "The assistant sends your question, and any address you choose to share, to the AI provider.
> It has no tool that signs or sends."

### Animation — GSAP

`src/lib/visual/landing-motion.ts`, nạp động bằng `import()` trong `useIsomorphicLayoutEffect`
(`src/hooks/useIsomorphicLayoutEffect.ts`) nên GSAP không nằm trong bundle chặn lần vẽ đầu.

Trang là một terminal nên chuyển động phải đọc ra là **"đang in"**, không phải "đang trôi": mọi
quãng dịch dưới 16px, ease luôn `power2.out`, không scale, không xoay, không nảy. Timeline vào
trang chạy theo thứ tự một cái máy sẽ xuất ra — eyebrow → dòng 1 → dòng 2 → mô tả → thẻ settlement
→ **năm bước in lần lượt** (stagger 0.055s) → nút → chip; cột phải vào song song từ mốc 0.2s.
`ScrollTrigger` (`once: true`) lo phần capabilities và hai panel cuối.

Hai nguyên tắc cố ý giữ:

1. **Không tween số tiền.** [CHAOUI-ADAPTATION.md](CHAOUI-ADAPTATION.md) nói số tiền hiển thị
   thẳng, không chạy qua giá trị trung gian. Áp dụng cả cho `250.00` trên sample receipt: một con
   số đếm lên dạy người đọc rằng số trên trang này là đồ trang trí, ngược hẳn thứ một app thanh
   toán cần.
2. **Trạng thái tự nhiên của DOM là trạng thái cuối.** Tất cả dùng `gsap.from()`, nên nếu module
   không chạy — reduced motion, chunk lỗi, tắt JS — trang đã ở dạng hoàn chỉnh và đọc được.

Reduced motion đi qua `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`: callback không
chạy thì không có tween nào tồn tại, không phải "chạy rồi rút ngắn về 0".

### Còn để ngỏ

Nhịp `ChaosSphere` trên landing vẫn là `derivePulse("idle", 0.35)` cố định. Landing không có ví kết
nối nên không có trạng thái thật để đọc, khác với `SettlementPulse` trong app. Chưa đổi.
