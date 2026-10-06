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

## HTTP 402: `GET /api/paid/network`

Một tài nguyên tốn 0,01 USDC để đọc (ảnh chụp Arc: block, gas price). Luồng viết tay trên `settleDirect`, **không phải giao thức x402 chuẩn**: không có header chữ ký, không có facilitator.

1. `GET` không kèm gì → `402` với `x-payment-scheme: chaospay-settle-direct` và body mô tả đúng lời gọi cần thực hiện: `settleDirect` (registry, `requestKey`, `issuer`, `token`, `amount`, `memoHash`), `permit` (domain EIP-712, spender, value) và `url` (cùng khoản thanh toán dưới dạng link cho người).
2. Agent ký permit EIP-2612 rồi gọi `registry.settleDirect(...)` từ ví của nó.
3. Agent `GET` lại với header `x-payment-request-id: <requestId từ bước 1>` → `200` kèm dữ liệu và `x-payment-invoice-id`.

Nếu thử lại khi chưa có khoản thanh toán nào được ghi nhận, server trả `402` với **cùng** `requestId`, nên agent có thể trả rồi thử lại mà không cần xin lại. Header sai định dạng trả `400`.

**Một lần trả mở khoá tài nguyên trong 5 phút** (`PROOF_TTL_SECONDS`). Server không lưu trạng thái nên không đánh dấu được "đã dùng"; thứ nó làm được là giới hạn thời gian, vì hợp đồng từ chối thanh toán cùng một id hai lần. Quá 5 phút, server trả `402` với `requestId` mới. `requestId` đóng vai bearer token: trên chain chỉ có `requestKey` (băm của nó), nên người nhìn thấy giao dịch không suy ra được id.

Tài nguyên nào cũng có điều khoản gắn với đường dẫn của nó (nằm trong `memoHash`, và `memoHash` nằm trong id hoá đơn), nên một khoản trả cho tài nguyên này không mở được tài nguyên khác cùng giá.

Cần `PAYWALL_PAY_TO` (địa chỉ nhận tiền) và registry; thiếu một trong hai thì route trả `501`.
