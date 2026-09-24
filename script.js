// 1. Hàm tự động vẽ 12 vạch chia giờ tròn xịn xò
function buildClockTicks(clockFaceId) {
    const clockFace = document.getElementById(clockFaceId);
    const offsetDistance = "-62px";
    if (!clockFace) return;
    
    for (let i = 0; i < 12; i++) {
        const tick = document.createElement('div');
        tick.className = 'clock-tick-mark';
        if (i % 3 === 0) tick.classList.add("main-tick");
        const angle = i * 30;
        tick.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(${offsetDistance})`;
        clockFace.appendChild(tick);
    }
}

// 2. Hàm lấy dữ liệu giờ/ngày theo Múi giờ
function getTimeData(timeZone) {
    const now = new Date();
    
    // Lấy số giờ, phút, giây
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    });
    
    let hour = 0, minute = 0, second = 0;
    formatter.formatToParts(now).forEach(p => {
        if (p.type === 'hour') hour = parseInt(p.value);
        if (p.type === 'minute') minute = parseInt(p.value);
        if (p.type === 'second') second = parseInt(p.value);
    });

    // Lấy chuỗi Thứ, Ngày/Tháng/Năm dạng tiếng Việt (VD: Thứ Tư, 30/07/2025)
    const dateStr = now.toLocaleDateString('vi-VN', {
        timeZone: timeZone,
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return { hour, minute, second, dateStr };
}

// 3. Cập nhật góc xoay kim & chữ hiển thị
function updateClockWidget(prefix, timeZone) {
    const { hour, minute, second, dateStr } = getTimeData(timeZone);

    // Tính độ xoay kim
    const secDeg = (second / 60) * 360;
    const minDeg = ((minute + second / 60) / 60) * 360;
    const hourDeg = (((hour % 12) + minute / 60) / 12) * 360;

    // Xoay kim
    const hHand = document.getElementById(`${prefix}-hour`);
    const mHand = document.getElementById(`${prefix}-minute`);
    const sHand = document.getElementById(`${prefix}-second`);
    
    if (hHand) hHand.style.transform = `rotate(${hourDeg}deg)`;
    if (mHand) mHand.style.transform = `rotate(${minDeg}deg)`;
    if (sHand) sHand.style.transform = `rotate(${secDeg}deg)`;

    // Cập nhật dòng giờ số (09:41:20)
    const digiElem = document.getElementById(`${prefix}-digital`);
    if (digiElem) {
        const h = String(hour).padStart(2, '0');
        const m = String(minute).padStart(2, '0');
        const s = String(second).padStart(2, '0');
        digiElem.innerText = `${h}:${m}:${s}`;
    }

    // Cập nhật ngày tháng
    const dateElem = document.getElementById(`${prefix}-date`);
    if (dateElem) dateElem.innerText = dateStr;
}

// 4. Chạy chương trình
document.addEventListener("DOMContentLoaded", function() {
    // Vẽ vạch 12 giờ cho 2 đồng hồ
    buildClockTicks('clock-face-vn');
    buildClockTicks('clock-face-jp');

    // Cập nhật thời gian liên tục mỗi giây
    function tickAll() {
        updateClockWidget('vn', 'Asia/Ho_Chi_Minh');
        updateClockWidget('jp', 'Asia/Tokyo');
    }

    tickAll();
    setInterval(tickAll, 1000);
    setInterval(() => {
        
}, interval);updateClock(); // Initial call to display the time immediately
    setInterval(updateClock, 1000);
});

//2. JavaScript code progress bar

function updateProgressBar() {
    const startDate = new Date(2026, 8, 9).getTime();
    const endDate = new Date(2026, 11, 31).getTime();
    const now = new Date().getTime();

    const totalDuration = endDate - startDate;
    const elapsedDuration = now - startDate;

    let percentage = (elapsedDuration / totalDuration) * 100;
    
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;

    const formattedPercent = percentage.toFixed(2) + '%';
    
    const progressBarFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (progressBarFill) progressBarFill.style.width = formattedPercent;
    if (progressText) progressText.innerText = formattedPercent;
}

updateProgressBar();

//3. Popup & Feed

const modal = document.getElementById('post-modal'); //Tìm giá trị trong HTML
const btnCloseModal = document.getElementById('btn-close-modal'); //Tìm giá trị trong HTML
const btnSubmitPost = document.getElementById('btn-submit-post'); //Tìm giá trị trong HTML
const fileInput = document.getElementById('post-input-file').files[0]; //Tìm giá trị trong HTML
const previewBox = document.getElementById('image-preview'); //Tìm giá trị trong HTML
const textInput = document.getElementById('post-input-text').value; //Tìm giá trị trong HTML
const feedContainer = document.querySelector('.feed-container'); //Tìm giá trị trong CSS
let selectedImageBase64 = ''; //Biến tạm chứa dữ liệu ảnh
//3.1 Mở Modal đăng bài
function openPostModal() {
    if(modal) modal.classList.add('active');
}
//3.2 Đóng Modal đăng bài và dọn dẹp
function closePostModal() {
    if(modal) modal.classList.remove('active');
    textInput.value = "";
    fileInput.value = "";
    previewBox.innerHTML = '';
    selectedImageBase64 = '';
}
//3.3 Bắt sự kiện bấm nút ❌ để đóng popup
if(btnCloseModal) btnCloseModal.addEventListener('click', closePostModal);
// Gán sự kiện mở popup cho nút Camera/Nút đăng bài ở Menu đáy
const addBtn = document.querySelector('.add-btn');
if(addBtn) addBtn.addEventListener('click', openPostModal);
//3.4 Đọc và hiển thị ảnh xem trước ngay khi vừa chọn file
if(fileInput) {
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                selectedImageBase64 = event.target.result;
                previewBox.innerHTML = `<img src="${selectedImageBase64}" alt="A person in a warm indoor room with soft natural light and a calm, relaxed mood. The person is looking at a phone or camera and the setting feels cozy and comfortable. No text is visible.">`;
            };
            reader.readAsDataURL(file);
        }
    });
}
//3.5 Xử lý khi bấm nút "Đăng bài"
if(btnSubmitPost) {
    btnSubmitPost.addEventListener('click', function() {
        const content = textInput.value;
        if (!content && !selectedImageBase64) {
            alert('Phương ơi, hãy gõ nội dung hoặc chọn một tấm ảnh nhé!');
            return;
        }
        //3.5.1 Khung chứa ảnh (nếu người dùng có chọn ảnh)
        const imageHTML = selectedImageBase64
        ? '<div class="post-img-box" style="margin-top:10px;"><img src="${selectedImageBase64}" alt="A personal photo shared in a warm indoor setting with soft natural light and a calm, relaxed mood. No text is visible." style="width:100%; border-radius:12px;"></div>'
        : '';
        //3.5.2 Đúc thẻ bài đăng mới
        const newPostCard = document.createElement('div');
        newPostCard.className = 'post-card';
        newPostCard.innerHTML = `
            <div class="post-user">
                <div class="user-avatar">🙍‍♂️</div>
                <div class="user-meta">
                    <span class="user-name">Ouji</span>
                    <span class="post-time">2 giờ trước</span>
                </div>
            </div>
            <div class="post-body">
                <p style="margin:0; line-height:1.4;">${content}</p>
                ${imageHTML}
            </div>
            <div class="post-footer" style="margin-top:12px; display: flex; gap:8px;">
                <button style="border:none; background: #FDE9EE; padding: 4px 10px; border-radius:8px; font-size: 0.8rem;">❤️ 0</button>
                <button style="border:none; background: #E8F3E6; padding: 4px 10px; border-radius:8px; font-size: 0.8rem;">💬 0</button>
            </div>
        `;
        //3.5.3 Đẩy bài viết mới lên ĐẦU danh sách Bảng tin
        const firstPost = feedContainer.querySelector('.post-card');
        if (firstPost) {
            feedContainer.insertBefore(newPostCard, firstPost);
        } else {
            feedContainer.appendChild(newPostCard);
        }
        //3.5.4 Đóng popup
        closePostModal();
    })
}

//4. Xử lý chuyển tab & cập nhật trạng thái footer

const navItems = document.querySelectorAll('.bottom-nav .nav-item');

navItems.forEach(item => {
    item.addEventListener('click', function() {
        //Nếu là nút Đăng bài (mở Popup) thì không đổi Tab active
        if (this.id === 'btn-open-post') return;
        //Bỏ class 'active' của tất cả nút
        navItems.forEach(nav => nav.classList.remove('active'));
        //Thêm class 'active vào đúng nút vừa thao tác
        this.classList.add('active');
        //Lấy tên khu vực cần hiển thị từ data-target
        const targetSectionId = this.getAttribute('data-target')
        //Tăng số lượng trang thì dùng targetSectionId để ẩn/hiện trang tương ứng
        console.log("Đã chuyển sang tab:", targetSectionId);
    });
});

// Sự kiện bấm nút (+) Nổi để mở Modal Đăng bài
const fabBtn = document.getElementById('fab-post-btn');
if (fabBtn) {
    fabBtn.addEventListener('click', function() {
        // Gọi hàm mở popup đăng bài của em
        if (typeof openPostModal === 'function') {
            openPostModal();
        }
    });
}