# Định hướng dài hạn

Ghi ngày 2026-09-13. Mục đích: giữ lại **lý do** của những quyết định lớn, để lần sau mở repo
không phải tranh luận lại từ đầu.

README mô tả sản phẩm. [handover.md](handover.md) mô tả trạng thái và cái bẫy. File này mô tả
**nó đang đi đâu, và vì sao đi đường đó**.

## Sản phẩm này là gì

Bản v1 xoay quanh **một giao dịch**: nhập địa chỉ, ký, in biên lai. Đó là phần dễ, và bất kỳ đội
nào cũng làm xong trong một tuần.

Hướng đi dài hạn là xoay quanh **một mối quan hệ** — người mà bạn đòi tiền lặp đi lặp lại:

> **Công nợ phải thu (AR) bằng stablecoin, cho doanh nghiệp dịch vụ VN bill khách nước ngoài.**

Lý do chọn hướng này, không phải "một app thanh toán đẹp hơn":

- **Circle sẽ chiếm tầng rail.** Gửi, gas, swap, CCTP, Gateway — cạnh tranh ở đó là thua. Nhưng
  Circle sẽ không làm: điều khoản thanh toán, số hoá đơn, VAT, lịch nhắc nợ, đối soát với sổ kế toán.
- **Chỉ nghiệp vụ công nợ mới tích luỹ.** v1 không sở hữu thứ gì sống lâu hơn một profile trình
  duyệt, nên không ai mất gì nếu nó biến mất. Đó là trần thật, và thêm tính năng không phá được nó.
- **Đó là chỗ Arc là điều kiện cần, không phải lựa chọn dễ chịu.** Phí trả bằng chính USDC và
  finality dưới một giây là hai thứ khiến hoá đơn định kỳ và đối soát tức thì làm được ở đây mà
  không làm được chỗ khác.
- **Trợ lý AI chỉ hết là đồ trang trí khi nó đọc sổ của bạn**, chứ không phải đọc chain. Việc đó
  chỉ khả thi sau khi có dữ liệu — nên nó nằm ở cuối lộ trình, không phải đầu.

## Bốn quyết định kiến trúc

Làm sớm khi repo còn nhỏ. Cả bốn đều rẻ ở 8.5k dòng và đắt ở 50k dòng.

**1. Mô hình dữ liệu: từ *giao dịch* sang *thực thể*.** Quan trọng nhất.

```
Counterparty  →  Invoice (có vòng đời)  →  Settlement (0..n sự kiện onchain)
```

Hiện `store/payments` là hai mảng phẳng. Đời thật của công nợ là: trả **làm hai lần**, trả
**thiếu**, trả **trễ**, trả **từ ví khác ví đã thoả thuận**. Mảng phẳng không diễn đạt nổi bất kỳ
trường hợp nào trong đó. `lib/reconcile.ts` đã phải chọn luật "một đổi một" chính vì thiếu tầng
`Settlement` — khi có nó, một hoá đơn giữ được nhiều lần trả.

**2. localStorage → server, vẫn non-custodial.** Đăng nhập bằng chữ ký ví (SIWE). Server giữ **bản
ghi**, không bao giờ giữ khoá. Đây là thứ duy nhất tạo ra tích luỹ.

**3. Gỡ Arc ra khỏi ~38 điểm hardcode `ARC_TESTNET_ID`.** Gom vào một chain config, để ngày Arc lên
mainnet là **đổi một dòng**, và để nhận tiền đa chain qua CCTP là chuyện làm được.

**4. Đối soát lên server.** Bốn vòng quét chồng nhau trong trình duyệt (xem handover, việc còn lại
số 3) không phải lỗi hiệu năng — là triệu chứng của logic nằm sai chỗ. Một watcher `Transfer` log
phía server làm cho hoá đơn tự biết đã được trả kể cả khi không ai mở app.

## Lộ trình

| GĐ | Mục tiêu | Trạng thái |
| --- | --- | --- |
| **0** | Sửa WalletConnect (ví điện thoại), xoay khoá Gemini, **đối soát tự động trên storage hiện tại** | Đối soát **xong**; hai việc kia cần credential, xem handover việc 1–2 |
| **1** | Schema `Counterparty/Invoice/Settlement` + server + SIWE + reference onchain | chưa |
| **2** | Vòng đời hoá đơn: phát hành → gửi → nhắc → tự đánh dấu đã thu → xuất file | chưa |
| **3** | Nhận đa chain qua CCTP; API + webhook cho merchant | chưa |
| **4** | Trợ lý đọc sổ: "quý trước bên nào trả trễ nhất", "còn bao nhiêu chưa thu" | chưa |

Thứ tự này là bắt buộc, không phải gợi ý. Giai đoạn 0 cố tình làm đối soát **trên localStorage**
trước khi xây lại backend: mục đích là chứng minh vòng đòi-tiền khép kín có giá trị, trước khi bỏ
một tháng vào hạ tầng cho nó.

Giai đoạn 2 là bản đầu tiên một doanh nghiệp thật dùng được.

## Chủ động không làm

Ghi ra để khỏi bị cám dỗ:

- **Không thêm UI/animation.** Landing đã vượt xa mức MVP cần.
- **Không thêm chain vào `lib/wagmi/config.ts`.** Bốn mainnet đang có không đường thanh toán nào
  dùng; xoá bớt thì đúng hơn thêm.
- **Trang Swap: đóng băng.** Là kit của Circle bọc lại, không tích luỹ gì, không thuộc câu chuyện
  công nợ.
- **Không thêm tính năng AI trước khi có dữ liệu.** Thứ tự hiện tại đang ngược.

## Rủi ro phải nhìn thẳng

- **Circle tự xây tầng này.** Muốn sống thì phải ở chỗ họ sẽ không xuống: nghiệp vụ ngành dọc, kế
  toán, ngữ cảnh địa phương — không phải "gửi đẹp hơn".
- **Khung pháp lý VN với crypto và ngoại hối.** Nó định hình thiết kế: sản phẩm phải luôn là **phần
  mềm lập hoá đơn và lưu bản ghi quyết toán**, không giữ tiền, không bao giờ custody. Giữ tính chất
  non-custodial không chỉ là triết lý — đó là lá chắn.
- **Chưa có người dùng thật.** Mọi thứ trên trang này là giả thuyết cho tới khi có **một** agency
  hoặc freelancer đang bill khách nước ngoài dùng nó lần thứ hai. Tìm người đó nên chạy song song
  với giai đoạn 1, không phải chờ tới giai đoạn 2.
