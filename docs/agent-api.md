# Agent API

Hai endpoint cho agent tạo link thanh toán và đọc kết quả. Không có server state, không có ví ở server, không có phí: link tự mang điều khoản, người trả ký trong ví của họ (`settleDirect`), và kết quả được đọc lại từ `InvoiceRegistry` trên chain.

Cần `NEXT_PUBLIC_ARC_REGISTRY_MAINNET` trong **build** environment. Thiếu thì cả hai endpoint trả `501 registry_not_configured`, vì không có registry thì chain không ghi tên khoản thanh toán và agent không có cách nào biết link đã được trả.

## `POST /api/request`

```json
{ "to": "0x…", "amount": "12.50", "memo": "Report #4", "reference": "JOB-9" }
```

`to` và `amount` bắt buộc; `memo` (tối đa 120 ký tự) và `reference` (tối đa 48) tuỳ chọn. Mọi trường phải là chuỗi. Quá giới hạn thì bị từ chối chứ không bị cắt, vì hợp đồng cam kết đúng văn bản memo. Thiếu `reference` thì server tạo `SP-XXXXXXXX` giống giao diện.

`201`:

```json
{
  "id": "<uuid>",
  "invoiceId": "0x8…",
  "url": "https://…/checkout?to=…&amount=…&id=<uuid>",
  "statusUrl": "https://…/api/request/0x8…",
  "status": "pending",
  "to": "0x…", "amount": "12.5", "token": "USDC", "chainId": 5042, "network": "Arc"
}
```

Gửi `url` cho người trả. Dùng `statusUrl` để poll.

## `GET /api/request/<invoiceId>`

- `{ "invoiceId", "status": "pending" }`: chưa có gì được thanh toán dưới id này.
- `{ "status": "paid", "to", "payer", "amount", "paidAt", "txHash", "blockNumber", "explorerUrl", … }`: đã thanh toán.

`txHash` lấy từ log `InvoicePaid`, mà RPC công khai của Arc chỉ giữ khoảng 100.000 block gần nhất (đo được ≈ 14 giờ; xa hơn trả `pruned history unavailable`). Khoản thanh toán cũ hơn thì `txHash`, `blockNumber` và `explorerUrl` là `null`, còn `status: "paid"` vẫn đúng vì nó đọc thẳng state của hợp đồng.

Một hoá đơn direct chỉ tồn tại trên chain sau khi có người trả, nên `pending` cũng là kết quả của một id gõ sai hoặc chưa từng được cấp. Poll mỗi vài giây là đủ; endpoint giới hạn 120 lượt/phút/IP, còn `POST` là 60.

Lỗi luôn có dạng `{ "error": { "code", "message" } }`.

## Chưa có

- Xác thực agent. Hai endpoint đang mở; rate limit nằm trong bộ nhớ của từng instance.
