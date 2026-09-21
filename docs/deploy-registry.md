# Deploy InvoiceRegistry — làm theo từng bước

Ghi ngày 2026-09-21.

Vì sao có contract này, nó giải quyết gì, và những gì đã kiểm chứng: xem
[arc-onchain.md](arc-onchain.md). File này chỉ là quy trình thao tác.

Deploy **thẳng lên mainnet**, không qua testnet. Lý do: sai một lần trên mainnet tốn khoảng 2 cent,
contract không giữ tiền nên không có gì để mất, trong khi testnet tốn một vòng faucet để diễn tập
thứ rẻ hơn cả thời gian bỏ ra. Grant cũng bắt buộc phải có bản mainnet.

Toàn bộ quá trình **không đụng gì tới site đang chạy**. Chưa có dòng code nào trong giao diện gọi
tới registry, nên deploy xong app vẫn y nguyên. Việc nối vào giao diện làm sau.

---

## Chuẩn bị

### Ví deploy riêng

Đừng dùng key ví chính. Registry không có owner — deploy xong, key này không còn quyền gì trên
contract, nó chỉ là địa chỉ đã trả gas.

```bash
node -e "const{generatePrivateKey,privateKeyToAccount}=require('viem/accounts');const k=generatePrivateKey();console.log('key    ',k);console.log('address',privateKeyToAccount(k).address)"
```

In ra hai dòng:

```
key     0x3a7f…c214
address 0x7d8B…92aD
```

Thêm dòng **key** vào `.env.local` (file này đã nằm trong `.gitignore`):

```
DEPLOYER_PRIVATE_KEY=0x3a7f…c214
```

Giữ **address** lại, lát nữa cần để nạp tiền.

### Nạp USDC

Cần USDC thật trên Arc mainnet. Faucet của Circle chỉ mint testnet, không dùng được ở đây. Hai
đường: **CCTP / Circle Gateway** chuyển USDC từ Ethereum, Base, Arbitrum… sang Arc; hoặc **rút
thẳng từ sàn** nếu sàn đã hỗ trợ mạng Arc.

| Khoản | Số tiền |
| --- | --- |
| Deploy contract | 0.0206 USDC |
| Smoke test, 8 giao dịch | ~0.02 USDC gas |
| Smoke test tự chuyển rồi quay về ví | 0.02 USDC |
| **Nạp cho chắc** | **0.50 USDC** |

---

## Chạy

### 1. Compile

```bash
npm run contracts:build
```

Đúng thì in ra một dòng, không kèm warning nào:

```
InvoiceRegistry: 20 abi entries, 4471 bytes deployed
```

Có warning thì dừng lại.

### 2. Deploy

```bash
npm run contracts:deploy -- --network mainnet
```

Node sẽ in một khối cảnh báo `MODULE_TYPELESS_PACKAGE_JSON` — **vô hại**, đó là Node nói về việc
đọc file TypeScript, lần nào cũng có. Phần cần đọc:

```
network   Arc (chain 5042)
deployer  0x7d8B…92aD
gas funds 0.5 USDC

tx        0x…
          https://explorer.arc.io/tx/0x…

InvoiceRegistry deployed
address   0xABCD…1234
block     21990xxx
gas used  1028383 (0.020568 USDC)
          https://explorer.arc.io/address/0xABCD…1234

Add to .env.local, and to the Vercel build environment:
NEXT_PUBLIC_ARC_REGISTRY_MAINNET=0xABCD…1234
```

> **Điểm dừng kiểm tra.** `gas funds` phải khác 0. Nếu là `0 USDC` thì tiền chưa về — đợi rồi chạy
> lại, chưa tốn gì cả.

### 3. Dán địa chỉ

Copy nguyên dòng cuối script in ra, bỏ vào `.env.local`.

### 4. Smoke test

```bash
npm run contracts:smoke -- --network mainnet
```

Đây là bước quan trọng nhất — nó chứng minh contract **chạy đúng**, chứ không chỉ deploy được:

```
partial then full settlement
  ok  createInvoice          https://explorer.arc.io/tx/0x…
  ok  invoice opens as Open
  ok  outstanding equals the full amount
  ok  approve                https://…
  ok  pay (half)             https://…
  ok  invoice stays Open after a partial payment
  ok  outstanding drops by the amount paid
  ok  pay (remainder)        https://…
  ok  invoice flips to Paid once covered
  ok  paid total is recorded
  ok  nothing is outstanding

cancellation
  ok  createInvoice          https://…
  ok  cancel                 https://…
  ok  cancelled invoice reads as Cancelled

rejections
  ok  paying a cancelled invoice reverts
  ok  paying an unknown invoice reverts
  ok  reusing an invoice id reverts
  ok  cancelling a settled invoice reverts

smoke test passed
```

Dòng cuối phải là `smoke test passed`. Bất kỳ `assertion failed` nào — dừng lại.

Link explorer của contract chính là **bằng chứng mainnet để nộp grant**.

---

## Đưa lên chaospayment.xyz

Next.js nhúng `NEXT_PUBLIC_*` **lúc build**, không phải lúc chạy. Đặt biến trong runtime của Vercel
là vô tác dụng.

1. Vercel → Settings → Environment Variables → thêm `NEXT_PUBLIC_ARC_REGISTRY_MAINNET` cho
   **Production**.
2. Nhân tiện đặt luôn `NEXT_PUBLIC_ARC_NETWORK=mainnet`. Hiện chưa đặt, app chạy đúng mainnet nhờ
   giá trị mặc định trong `src/lib/arc.ts` — đúng, nhưng đúng do mặc định chứ không do ai quyết
   định.
3. Trigger build mới.
4. Kiểm tra: mở site, tìm địa chỉ contract trong bundle JS. Không thấy nghĩa là biến chưa tới được
   lúc build.

> `registryFor()` trong `src/lib/arc.ts` **ném lỗi** nếu địa chỉ sai định dạng. Gõ nhầm một ký tự
> trong env var là **build đỏ**. Đó là chủ ý: thà hỏng lúc build còn hơn ship một địa chỉ sai rồi
> khách bấm trả tiền vào hư không. Thấy build đỏ thì nhìn env var đầu tiên.

Không đặt biến cũng không sao: app chạy y như cũ, hoá đơn nằm trong trình duyệt như hiện tại.

---

## Sự cố hay gặp

| Thấy gì | Nghĩa là | Làm gì |
| --- | --- | --- |
| `DEPLOYER_PRIVATE_KEY is not set` | Chưa lưu key, hoặc sai tên biến | Kiểm tra `.env.local` |
| `gas funds 0 USDC` | Tiền chưa về ví deploy | Đợi rồi chạy lại — chưa tốn gì |
| `NEXT_PUBLIC_ARC_REGISTRY_MAINNET is not set` | Chạy smoke trước khi dán địa chỉ | Dán dòng script in ra |
| `Arc registry address "…" is not a 20-byte hex address` | Địa chỉ dán thiếu hoặc thừa ký tự | Copy lại nguyên dòng |
| `MODULE_TYPELESS_PACKAGE_JSON` | Node nói về việc đọc file TS | Bỏ qua, luôn xuất hiện |
| Lệnh treo quá 30 giây | RPC nghẽn | Ctrl+C, chạy lại |

Block trên Arc khoảng 0.51 giây và final ngay khi vào block, nên mỗi lệnh chỉ mất vài giây. Lệnh
nào lâu hơn nhiều là có vấn đề, không phải đang chờ xác nhận.

---

## Nếu muốn chạy thử trên testnet

App **không** đọc registry trên testnet, nên không có biến môi trường nào cho nó. Vẫn deploy và
kiểm thử được, chỉ là phải truyền địa chỉ bằng tay:

```bash
npm run contracts:deploy -- --network testnet
npm run contracts:smoke  -- --network testnet --registry 0x…
```

USDC testnet lấy ở [faucet.circle.com](https://faucet.circle.com), chọn mạng Arc Testnet.

---

## Sau khi deploy xong

Chưa nộp grant vội. Chỉ được nộp **một lần cho mỗi dự án**, không sửa lại được. Thứ tự còn lại:

1. Nối `settleDirect` vào `/checkout` — cần thêm id của request vào link thanh toán trước.
2. Push, Vercel build, kiểm tra trên site thật.
3. Viết mô tả và nộp.
