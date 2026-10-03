# K Coffee — Dashboard new

Bản local được phát triển riêng theo `UI NEW DASHBOARD.png`. Các thay đổi nằm trong thư mục này. Source Apps Script và HTML cũ ở thư mục cha được giữ nguyên.

## Mở giao diện

Trong Terminal:

```sh
cd '/Users/admin/Documents/Management Hub/Dashboard new'
npm run dev
```

Mở http://127.0.0.1:8790/index.html. Không cần `npm install`. Server chỉ phục vụ file trong thư mục này trên loopback 127.0.0.1. Mở trực tiếp bằng `file://` sẽ không tải được ES modules/JSON; dùng localhost.

## Sửa file nào?

- `index.html`: khung trang, menu, các vùng nội dung.
- `styles.css`: Barlow, palette navy/green, card, spacing và responsive.
- `app.js`: render, bộ lọc, chuyển tab, modal chi tiết, import/export snapshot.
- `analytics.js`: các công thức thống kê và chuẩn hóa dữ liệu.
- `data/snapshot.json`: bản dữ liệu thật được đọc ngày 28/09/2026 lúc 16:24 (giờ Việt Nam).
- `assets/`: logo và font local, không phụ thuộc CDN.
- `analytics.test.mjs`: kiểm tra các trường hợp có rủi ro đếm sai. Chạy `npm test`.

## Thiết kế từ ảnh tham chiếu

Giữ menu ngang, 4 KPI, panel phân tích lớn bên trái và lịch sử/deadline/team ở bên phải. Thay các vùng chữ đỏ bằng nội dung có thể tính từ database:

- **Performance:** hồ sơ PIC chuyển bằng mũi tên; tỷ lệ Done; task quá hạn; deadline 3 ngày; High/Urgent; lịch deadline Weekly/Monthly; nhắc dữ liệu thiếu.
- **Staff:** phân bổ đầu việc theo từng PIC, bao gồm task đồng phụ trách.
- **Project:** nhóm từ cột Dự án/Campaign, số task mở/Done/quá hạn và tỷ lệ hoàn thành.
- **Campaign:** cùng nguồn cột D nhưng lọc tên chứa “Campaign” hoặc “CP”. Đây là quy tắc suy ra từ tên, chưa phải phân loại riêng trong database.
- **History:** lịch sử mượn/trả thực tế, ghi rõ chưa có lịch sử Task.
- **Deadline:** ưu tiên task mở đến hạn từ hôm nay tới 3 ngày sau; nếu không có, lấy hạn sắp tới gần nhất; cuối cùng dùng task quá hạn.

Tỷ lệ hoàn thành = Done / (tổng task − Cancelled). Đây là tiến độ đầu việc, không phải điểm đánh giá nhân sự. Chart Weekly là số task theo deadline Thứ hai–Chủ nhật, không giả định deadline là ngày hoàn tất. Task nhiều PIC được tính cho từng người; tổng workload nhân sự có thể lớn hơn tổng task.

## Dữ liệu và phạm vi hoạt động

Snapshot gồm 106 task (50 mở, 56 Done), 42 thiết bị, 6 yêu cầu, 12 dòng nhật ký và 7 hồ sơ nhân sự. Email và số điện thoại không được đưa vào snapshot UI.

Nguồn được xác định từ `ManagerWebApp.js` và đọc bằng Google Sheets connector:

- Task workbook: `1PK6RkpgYfGq2V3SJpABXFtoF6Jq2V7bHA5JkBIcWQXU` — Task Master, List Setup, USERS.
- Asset workbook: `1aHNi-ZWdsT4MRkP1B_vmLD6rcbB-rTY-PrIDsoo29xA` — FORM ĐĂNG KÝ, NHẬT KÝ ĐĂNG KÝ THIẾT BỊ, DANH SÁCH THIẾT BỊ.

**Không có đồng bộ tự động.** Refresh đọc lại file `data/snapshot.json` trên máy. Nút thông tin nguồn cho phép nhập JSON vào phiên xem và xuất bản đang xem. Muốn lưu snapshot mới lâu dài, thay file dữ liệu bằng bản cùng cấu trúc rồi Refresh. Import kiểm tra cấu trúc và không ghi vào Google Sheets.

Nút Tạo Task đưa tới hướng dẫn mở Task Master; không gửi email hoặc tạo dữ liệu thử trên hệ thống thật. Các bảng tài sản chỉ đọc. Muốn đưa UI này vào Apps Script cần tích hợp phần render với backend sau khi chốt UI.

## Những điểm cần lưu ý trong source đã scan

1. Link user gửi có chữ “còn” dính sau `/exec`. Đường dẫn đã kiểm tra là `/exec` không có phần dư.
2. Deploy ngày kiểm tra trả lỗi **ReferenceError: require is not defined**, dòng 1, `UI GMAIL ASSET/2x/server`. Source editor cũng có `UI GMAIL ASSET/2x/server.gs`. Server Node.js đã bị đưa vào Apps Script. Chưa sửa deploy vì yêu cầu lần này chỉ làm trong Dashboard new.
3. Root `test_script.js` là bản sao JS UI với dashboard chưa hoàn thiện, không phải test suite. Không nạp file đó vào bản local mới.
4. Task Master có 13 nhóm mã ID trùng. Local dùng khóa theo dòng nguồn và luôn hiển thị dòng Sheet trong chi tiết, không xóa/gộp các task cùng ID.
5. Snapshot có 38 task mở thiếu deadline, 19 task thiếu PIC; các số này thay đổi theo bộ lọc. Task thử nghiệm được giữ nguyên và có tùy chọn ẩn.
6. Không có tab TASK ACTIVITY trong metadata workbook. Không có completedAt/updatedAt để dựng lịch sử task hay tỷ lệ hoàn thành đúng hạn. Cần thêm lịch sử phía backend trước khi cung cấp những chỉ số đó.
7. `apiGetManagerDashboard()` hiện gọi `cleanupDuplicateColumns_()`, vì vậy không được coi là hàm đọc thuần. Bản local dùng snapshot đọc qua connector, không gọi hàm này.
8. Nhiều API mutation của backend chỉ kiểm tra email đăng nhập; cần audit phân quyền phía server trước khi mở rộng vận hành. Bản local không gọi các API này.
9. Khi dùng clasp ở thư mục cha, cần loại toàn bộ **Dashboard new/** và các server/test local khỏi phạm vi push. Không đẩy thư mục preview này nguyên trạng vào Apps Script.

## Kiểm tra

- Node syntax check: app.js và analytics.js.
- Unit checks: ngày không hợp lệ, Cancelled, biên 3 ngày, tuần qua tháng, exact multi-PIC, VŨ TRẦN/Vu Tran, tên BART không gán nhầm ADMIN, duplicate ID, 106 dòng và 56 Done.
- Kiểm tra trình duyệt: tải dashboard, tab Campaign, hiện Done 50→106, lọc VŨ TRẦN ra 3 task, responsive điện thoại 390px không tràn ngang.

## Overall Perfomance (29/09/2026)

Bộ chọn ở góc phải chuyển Staff / Project / Campaign. Staff giữ spotlight và có tab phân bổ đội ngũ. Các ô chỉ số mở danh sách task trong đúng góc nhìn và bộ lọc hiện tại: tiến độ đầu việc, quá hạn, đến hạn từ hôm nay đến 3 ngày sau, High/Urgent, Feedback, thiếu deadline, thiếu PIC và task mở. Campaign thay ô task mở bằng lịch đăng từ hôm nay đến 7 ngày sau (gồm Done, loại Cancelled).

Project bao gồm toàn bộ nhóm Dự án / Campaign, ưu tiên nhóm quá hạn. Mỗi nhóm hiển thị PIC, task hủy, tiến độ, rủi ro, hạn sắp tới; Campaign bổ sung kênh và ngày đăng còn thiếu. Không có ngày hoàn thành, effort, budget hoặc kết quả marketing nên không tính năng suất, đúng hạn hay ROI. Campaign vẫn suy ra từ tên chứa Campaign/CP, không phải phân loại đã xác minh.

### Spotlight dùng chung cho Staff, Project và Campaign

Ba góc nhìn cùng dùng bố cục hồ sơ bên trái, vòng tiến độ, cảnh báo và lịch deadline bên phải. Project/Campaign có dropdown chọn nhóm và mũi tên chuyển nhóm, ghi nhớ lựa chọn riêng. Mọi chỉ số, popup task và kiểm tra chất lượng dữ liệu trong spotlight đều giới hạn theo nhóm đang chọn cùng bộ lọc hiện tại. Campaign bổ sung kênh triển khai và lịch đăng dự kiến 7 ngày tới.

### Mobile-first adaptation

`mobile.css` áp dụng dưới 721px; desktop tiếp tục dùng `styles.css`. `mobile.js` bổ sung bộ lọc/lịch sử/đội ngũ đóng mở và gắn nhãn cho các bảng được render động. Trên mobile, bảng Task, thiết bị, yêu cầu và nhật ký thành thẻ dọc; dialog thành bottom sheet; spotlight dùng hồ sơ gọn và cặp chỉ số cân đối.

Thanh điều hướng 6 mục lấy phong cách liquid glass từ `V1/ManagerApp.html`: nền blur/saturate, viền sáng, active nổi, hiệu ứng nhấn; bổ sung nhãn, safe-area và reduced-motion. Không dùng chấm thông báo giả. Dock chỉ hiện icon như V1, có lớp blur feather bên dưới; cuộn xuống ẩn hoàn toàn cả dock và lớp blur; cuộn lên/phía đầu trang hiện lại. Thanh điều hướng ẩn khi phát hiện bàn phím chạm qua VisualViewport. Cần kiểm tra thêm trên thiết bị iOS/Android thật cho bàn phím và safe-area; kiểm tra trình duyệt đã bao phủ 320px, 390px và desktop 1440px.

### Rà UI 30/09/2026

Đã sửa căn stretch của các panel dưới Dashboard trên mobile, căn trái Hồ sơ, và fallback mã thiết bị trong Nhật ký. Calendar dùng popover nằm trên form, cùng chiều rộng cho nền và lưới 7 cột; hỗ trợ chọn khoảng/ngày đơn, chuyển tháng, Xóa ngày, Áp dụng và Escape. Desktop giới hạn vị trí theo kích thước lịch thực để không vượt viewport. Đã kiểm tra sáu tab ở 320px, mobile 390px và calendar desktop 1440px. Không gửi form hoặc thay đổi dữ liệu nguồn trong quá trình kiểm tra.

### QR thiết bị

Tab **Danh sách thiết bị** có nút **Quét QR**. QR hỗ trợ mã thuần (`ECOM0003`) hoặc deep-link dạng `?asset=ECOM0003`; sau khi quét, UI mở thẳng hồ sơ thiết bị với trạng thái, vị trí, người mượn, hạn trả và các dòng nhật ký/yêu cầu liên quan. Hồ sơ có nút sao chép deep-link để tạo QR dán lại cho thiết bị. Quét camera dùng `BarcodeDetector` khi trình duyệt hỗ trợ; khi không hỗ trợ, camera hệ thống vẫn có thể quét QR deep-link và mở thẳng hồ sơ. Đây vẫn là dữ liệu snapshot local, nên muốn cập nhật liên tục cần backend trả về dashboard mới hoặc endpoint thiết bị theo mã.
