# Arc: những gì đã đo, và InvoiceRegistry

Ghi ngày 2026-09-21.

> Cập nhật cuối ngày: code đã nối payment-link vào `settleDirect`. Link registry mang UUID ngẫu
> nhiên; invoice ID được contract dẫn xuất từ UUID + người nhận + token + số tiền + memo hash và
> nằm trong namespace riêng, nên người thấy link không thể chiếm ID bằng điều khoản giả.
> `useWorkspaceSync` đọc `InvoicePaid` cho request registry; request cũ vẫn dùng bộ đối soát
> transfer để tương thích ngược. Contract đã deploy trên Arc mainnet tại
> `0xc3a4f4cf8d63819556b1eb9a2fd0489918f44b35`; app production vẫn dùng transfer trực tiếp cho đến
> khi có `NEXT_PUBLIC_ARC_REGISTRY_MAINNET` lúc build.

[roadmap.md](roadmap.md) nói dự án đi đâu. [handover.md](handover.md) nói trạng thái và cái bẫy.
File này nói **Arc thực sự hành xử thế nào** — đo trên mainnet, không chép lại từ tài liệu — và
**contract nào được thêm vào vì điều đó**.

Mọi con số dưới đây lấy từ `https://rpc.mainnet.arc.io` ngày 2026-09-21. Đo lại được bằng
`eth_getLogs`, `eth_getBlockByNumber` và `eth_call` với state override. RPC của Arc **không** hỗ
trợ `eth_simulateV1` hay `debug_traceCall`, nhưng **có** hỗ trợ state override — nên chạy được
bytecode đã compile trên EVM thật mà không tốn đồng nào.

## 1. Arc khác EVM thường ở đâu

### USDC có hai mặt, một số dư

| Giao diện | Địa chỉ | Decimals |
| --- | --- | --- |
| Native (gas) | — | **18** |
| ERC-20 | `0x3600000000000000000000000000000000000000` | **6** |

Cùng một tài sản, chênh nhau đúng `10^12`. Không có wrapped USDC trên Arc. Trộn `msg.value` với
`balanceOf()` trong cùng một phép tính là sai một triệu lần.

`viem` khai báo `arc.nativeCurrency.decimals = 18` dù symbol là `USDC`. Script nào tự dựng lại
chain definition đều có nguy cơ đặt nhầm 6 — nên `scripts/*.mjs` lấy chain thẳng từ `viem/chains`
và chỉ bổ sung RPC với explorer (viem không ship hai thứ này cho Arc).

### Hai luồng sự kiện, và 37.9% nằm ngoài luồng ERC-20

| Nguồn | Địa chỉ | Ghi nhận | Decimals |
| --- | --- | --- | --- |
| Native, EIP-7708 | `0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE` | **Mọi** chuyển USDC | 18 |
| ERC-20 | `0x3600…0000` | Chỉ qua interface ERC-20 | 6 |

Đo trên 200 block:

```
log từ system emitter      1,417
log từ contract ERC-20        891
  có cặp ở system emitter     880
  không cặp, value = 0          7
  không cặp, from == to         4
chỉ có ở system emitter       537  = 37.9%
```

**Kết luận:** quét riêng system emitter thấy mọi khoản đúng một lần. Quét cả hai sẽ đếm đôi mọi
ERC-20 transfer. Quét riêng ERC-20 — cái repo từng làm — bỏ sót 37.9%, vì USDC là native token nên
nút "gửi" thường của ví là một native transfer và không phát log ERC-20 nào.

Hai ngoại lệ duy nhất mà system emitter im lặng: `value == 0` và `from == to`. Cả hai đều đúng tài
liệu, và không cái nào thanh toán được hoá đơn.

### Block trùng timestamp là chuyện bình thường

Đo 60 block liên tiếp:

```
thời gian block trung bình   0.51 s
số giây phân biệt              30
số giây có >1 block            29
nhiều nhất trong một giây       3 block
timestamp lùi về sau            0 lần
```

Timestamp **không giảm**, nhưng **không tăng ngặt**. Sắp xếp sự kiện theo timestamp rồi tie-break
bằng `logIndex` là sai, vì `logIndex` reset về 0 ở mỗi block. Phải sắp theo **block number** trước,
rồi mới tới `logIndex`.

### Sàn phí 20 Gwei

`baseFeePerGas` đo được là **đúng 20.000 Gwei** — chain đang nằm ngay trên sàn giao thức.
`eth_gasPrice` là 21.80 Gwei. Giao dịch có `maxFeePerGas` dưới 20 Gwei bị mempool **loại bỏ lặng
lẽ**: không receipt, không lỗi, không bao giờ vào block. viem suy `maxFeePerGas` từ base fee nên
vượt sàn; nhưng chỗ nào lấy thẳng base fee làm `maxFeePerGas` là nằm sát mép.

### USDC hỗ trợ EIP-2612 permit

```
permit(...) với chữ ký rác  ->  revert Error("ECRecover: invalid signature")
selector không tồn tại      ->  revert không có data
name() = "USDC"   version() = "2"   decimals() = 6
```

Bytecode của USDC chỉ 1798 byte và **không chứa** cả `transferFrom` lẫn `approve` — nó là lớp vỏ
chuyển tiếp xuống precompile. Tìm selector trong bytecode ở đây không chứng minh được gì; phải gọi
thử mới biết.

### Deploy contract không bị allowlist

`eth_estimateGas` cho bytecode `InvoiceRegistry`, từ một địa chỉ bất kỳ không có tiền, chạy được.
Không permission, không allowlist.

```
deploy gas   1,028,383  ->  0.0206 USDC ở 20 Gwei
```

### Địa chỉ và endpoint

| | Mainnet | Testnet |
| --- | --- | --- |
| Chain ID | `5042` | `5042002` |
| RPC | `rpc.mainnet.arc.io` (repo dùng bản blockdaemon) | `rpc.testnet.arc.io` |
| Explorer | `explorer.arc.io` (Blockscout) | `explorer.testnet.arc.io` |
| USDC | `0x3600…0000` | `0x3600…0000` |
| EURC | `0xbEf5…21c1` | `0x89B5…D72a` |

Explorer testnet trong repo trước đây là `testnet.arcscan.app` — sai, đã sửa. API của Blockscout
nằm sau Cloudflare challenge nên script không gọi được; dùng thẳng RPC.

## 2. Đã sửa gì vì những điều trên

**`src/hooks/useWorkspaceSync.ts`** quét system emitter thay cho contract ERC-20, chia `10^12` về
thang 6 chữ số, bỏ qua mint (`from == 0x0`).

**`src/lib/reconcile.ts`** sắp xếp theo `blockNumber` rồi `logIndex`. `IncomingTransfer` có thêm
trường `blockNumber`.

**Gộp bản sao.** Hook từng chứa một bản `matchTransfers` và `parseUnits` riêng, và **không import
`src/lib/reconcile.ts`** ở đâu cả. Tức là 8 unit test của module đó đang kiểm thử code chết, còn
logic thật thì không ai test — và hai bản đã trôi khác nhau. Giờ hook import module chung; bản sao
trong hook đã xoá.

Gộp xong phải so lại hai bản đã trôi ra sao, vì bản được giữ sẽ thành bản chạy thật. Chúng khác
nhau ở số lẻ quá 6 chữ số: bản trong hook trả `undefined`, còn `reconcile.ts` gọi `parseUnits` của
viem — mà hàm đó **không ném lỗi, nó làm tròn**. `"1.9999999"` thành `2000000`, đủ để một khoản
chuyển 2 USDC tất toán một hoá đơn không ai thoả thuận. Comment ngay trên hàm đã hứa giá trị không
dùng được thì "không bao giờ khớp", nhưng điều đó chưa từng được thực thi. `unitsOf` giờ từ chối
thẳng phần thập phân dài hơn 6 chữ số, và có test đỏ khi bỏ guard đi.

**`tests/e2e/arc-mock.ts`** phát log từ system emitter ở 18 chữ số, vì mock cũ giả lập một hành vi
không tồn tại trên chain. Nó cũng xuất chain id, host RPC, tên mạng và URL explorer đọc từ `ARC`,
nên bộ e2e không còn ghim cứng một mạng nào.

**`src/components/layout/DashboardSidebar.tsx`** đọc `ARC_FUNDING` thay vì tự khai đích đến. Bản
chép trong đó đã trôi: trên mainnet nó trỏ `/docs` mất anchor `#quickstart`, và gắn cứng
`target="_blank"` nên mở một trang nội bộ trong tab mới.

Ba lỗi khác nhau, cùng một bệnh với `matchTransfers`: một quyết định được chép ra nhiều bản thay vì
dùng chung, rồi các bản trôi khỏi nhau. E2E hiện **30/30**.

## 3. InvoiceRegistry

`contracts/InvoiceRegistry.sol`, đã deploy trên Arc mainnet tại
[`0xc3a4f4cf8d63819556b1eb9a2fd0489918f44b35`](https://explorer.arc.io/address/0xc3a4f4cf8d63819556b1eb9a2fd0489918f44b35)
ở block `22030464`. Artifact có 21 ABI entries, runtime bytecode 4,636 bytes. Compiler chuẩn hoá CRLF
thành LF nên metadata hash tái lập giống nhau trên Windows và Linux.

### Vấn đề nó giải

Một `transfer` ERC-20 trần không mang theo mã hoá đơn. `matchTransfers` vì thế phải **đoán**: khớp
theo số tiền chính xác, người nhận, và thứ tự thời gian. Mọi luật trong đó là cách đi vòng quanh
một thông tin mà người trả biết còn chain thì không ghi. Contract ghi nó lại, và đối soát trở thành
một phép **đọc**.

### Thiết kế

Không owner, không admin, không upgrade, không `payable`, không bao giờ giữ số dư — `pay` chuyển
token thẳng từ người trả sang người phát hành trong cùng một lệnh. Trả từng phần được giữ thành
nhiều settlement, đúng cái mảng phẳng hiện tại không diễn đạt nổi.

Compile ở `evmVersion: paris` dù Arc lấy Osaka làm baseline — paris có trước PUSH0, MCOPY và
transient storage, nên bytecode chạy trên mọi EVM hậu-merge.

### `settleDirect`: vì sao vẫn một giao dịch

Yêu cầu thanh toán chỉ nằm trong trình duyệt người phát hành cho tới khi có người trả, nên không có
hoá đơn on-chain để gọi `pay`. Bắt người phát hành publish trước là đặt một chữ ký và một khoản gas
chắn trước hành động vốn miễn phí và tức thì.

Thay vào đó người **trả** ký một permit EIP-2612 off-chain — không tốn gas — và `settleDirect` tạo
hoá đơn rồi tất toán trong đúng một transaction. Số giao dịch on-chain không đổi so với hiện tại,
mà chain giờ ghi lại hoá đơn nào được trả.

Permit được gọi trong `try/catch`: một permit đã mined, hoặc allowance cấp theo cách thường, sẽ làm
nó revert vì nonce đã dùng — chuyện đó không được phép làm hỏng một khoản trả vốn đã đủ allowance.
Nếu đến lúc kéo tiền vẫn không có allowance thì cả transaction revert.

### Đã kiểm chứng những gì

Nạp bytecode vào một địa chỉ giả bằng `eth_call` state override, chạy trên EVM thật của Arc:

```
ok  createInvoice hợp lệ              success
ok  createInvoice amount = 0          ZeroAmount
ok  createInvoice token = 0x0         ZeroToken
ok  pay hoá đơn không tồn tại         InvoiceUnknown
ok  cancel hoá đơn không tồn tại      InvoiceUnknown
ok  outstanding id lạ                 success, 0
ok  settleDirect amount = 0           ZeroAmount
ok  settleDirect token = 0x0          ZeroToken
ok  settleDirect issuer = 0x0         ZeroIssuer
ok  settleDirect không có allowance   TransferFailed
```

Trường hợp cuối đáng chú ý: chữ ký permit rác bị `try/catch` nuốt đúng như thiết kế, rồi dừng sạch
ở bước kéo tiền.

`tests/registry.test.mjs` so ABI viết tay trong `src/lib/registry.ts` với ABI đã compile, nên hai
bên không trôi khác nhau âm thầm.

### Còn phải kiểm chứng trên chain

`npm run contracts:simulate` đã chạy `settleDirect` trên EVM mainnet của Arc bằng state override:
nạp runtime bytecode, cấp số dư tạm cho một ví ngẫu nhiên, ký EIP-712 permit thật, rồi để registry
kéo USDC trong cùng `eth_call`. Call thành công và toàn bộ state tạm bị vứt; không tốn tiền.

Đã kiểm chứng tính bền vững qua nhiều transaction và receipt thật. `scripts/smoke-registry.mjs`
ký EIP-712 thật, xoá allowance trước, gọi `settleDirect`, rồi kiểm tra invoice Paid và nonce permit
tăng đúng một. Smoke test mainnet đã qua sau khi deploy; testnet là lựa chọn diễn tập, không phải
điều kiện bắt buộc.

### Quy trình

Từng bước, kèm output để đối chiếu và bảng sự cố: [deploy-registry.md](deploy-registry.md).

Tóm tắt: deploy thẳng mainnet (sai một lần tốn ~2 cent, contract không giữ tiền), cần khoảng 0.50
USDC, rồi đặt `NEXT_PUBLIC_ARC_REGISTRY_MAINNET` trong build environment của Vercel. App không đọc
registry trên testnet, nên không có biến nào cho nó; script vẫn nhận `--registry` nếu muốn thử.

Không có registry thì app chạy y như cũ, chỉ là hoá đơn nằm trong trình duyệt.

## 4. Còn lại

- Đặt `NEXT_PUBLIC_ARC_REGISTRY_MAINNET` ở Vercel Production, build lại, rồi thử bằng hai ví.
- Ghi demo ngắn từ request đến trạng thái Paid để dùng trong hồ sơ grant.
- Giao diện vẫn gọi explorer là "ArcScan"; mainnet là `explorer.arc.io` chạy Blockscout.
- `/pay` không có request ID vẫn là transfer thường. Registry hiện dành cho payment link; đây là
  fallback chủ ý, không phải lỗi cấu hình.
