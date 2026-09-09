# Landing page — chỗ đã lạc hậu so với sản phẩm

Ghi ngày 2026-09-09, sau khi thêm navbar ví, danh bạ, hoá đơn in được, QR và trợ lý AI.
`src/components/landing/ArcHome.tsx` chưa đụng tới trong lúc làm các tính năng đó, nên giờ nó
mô tả một bản SealPay cũ hơn bản đang chạy.

## 1. "Four things, finished" chỉ còn đúng 4/4, không còn đủ

[ArcHome.tsx:31-57](../src/components/landing/ArcHome.tsx#L31-L57) — mảng `capabilities`, render
ở [dòng 187-195](../src/components/landing/ArcHome.tsx#L187-L195) dưới tiêu đề
**"Four things, finished. Nothing implied."** ([dòng 181](../src/components/landing/ArcHome.tsx#L181)).

Bốn mục hiện có (id `01`-`04`) đều vẫn đúng, không cần sửa nội dung:

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

[ArcHome.tsx:230](../src/components/landing/ArcHome.tsx#L230), tiêu đề **"READ THIS FIRST"**.
Comment ở đầu component ([dòng 64](../src/components/landing/ArcHome.tsx#L64)) nói rõ triết lý:

> *"a payment MVP that hides its boundaries is worse than one that prints them"*

Panel liệt kê 5 giới hạn (chưa production, memo không onchain, dữ liệu chỉ ở browser, không đối
soát tự động, test dùng mock). Nhưng **không có dòng nào** nói trợ lý AI gửi câu hỏi và địa chỉ
ví ra ngoài cho nhà cung cấp mô hình. Điều này đã được ghi rõ ở
[docs/payment-assistant.md](payment-assistant.md):

> *"Shared questions, addresses and read results are processed by the AI provider."*

Trang duy nhất tự nhận là "đọc cái này trước" đang không nói điều mà tài liệu khác trong repo đã
nói. Nên coi đây là việc cần làm cùng đợt, không phải tuỳ chọn — nó đúng tinh thần chính panel đó
đề ra.

Gợi ý một dòng để thêm (không bắt buộc dùng nguyên văn):

> "The assistant sends your question and any address you share to the AI provider. It has no
> signing or sending tool."

## 3. Điều hướng trong hero chưa trỏ tới `/contacts`

Hai nút hành động ở [ArcHome.tsx:115-127](../src/components/landing/ArcHome.tsx#L115-L127) chỉ có
"Open workspace" (`/dashboard`) và "Request payment" (`/pay?mode=request`). Không sai, nhưng nếu
thêm mục capability về danh bạ thì nên có đường dẫn tới `/contacts` ở đâu đó gần nó — hiện chưa
có link nào từ landing tới route này.

## Về animation

`ChaosSphere` trên landing ([ArcHome.tsx:19-21](../src/components/landing/ArcHome.tsx#L19-L21),
render ở [dòng 148-166](../src/components/landing/ArcHome.tsx#L148-L166)) tải qua `next/dynamic`
với `ssr: false`, xoay được bằng kéo chuột (`interactive`), đèn LED bật khi `led`. Nhịp đập lấy từ
`derivePulse("idle", 0.35)` — cố định, không phản ánh trạng thái thật vì landing page không có
ví kết nối để đọc. Đây là chỗ nếu muốn animation nói lên điều gì đó thật (giống cách
`SettlementPulse` trong app phản ánh trạng thái giao dịch thật, hay quả cầu trần trong
`AssistantWidget` đập nhanh khi trợ lý đang trả lời) thì cần nguồn dữ liệu khác — không có sẵn ở
đây, để ngỏ cho lúc quay lại.

## Không cần đụng

Phần hero (headline, settlement path 5 bước, sample receipt), network constants panel, và
meta bar đầu trang vẫn mô tả đúng — không có gì lạc hậu ở đó.
