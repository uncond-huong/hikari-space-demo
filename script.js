// ==========================================
// 0. IMPORT FIREBASE (LUÔN ĐẶT TRÊN ĐẦU FILE)
// ==========================================
import { 
    db, 
    storage, 
    collection, 
    addDoc, 
    onSnapshot, 
    serverTimestamp, 
    query, 
    orderBy, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "./firebase.js";

// ==========================================
// 1. ĐỒNG HỒ & MÚI GIỜ
// ==========================================

// 1.1 Tự động vẽ 12 vạch chia giờ
function buildClockTicks(clockFaceId) {
    const clockFace = document.getElementById(clockFaceId);
    const offsetDistance = "-62px";
    if (!clockFace) return;
    
    const oldTicks = clockFace.querySelectorAll('.clock-tick-mark');
    oldTicks.forEach(tick => tick.remove());
    
    for (let i = 0; i < 12; i++) {
        const tick = document.createElement('div');
        tick.className = 'clock-tick-mark';
        if (i % 3 === 0) tick.classList.add("main-tick");
        const angle = i * 30;
        tick.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(${offsetDistance})`;
        clockFace.appendChild(tick);
    }
}

// 1.2 Lấy dữ liệu giờ/ngày theo Múi giờ
function getTimeData(timeZone) {
    const now = new Date();
    
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

    const dateStr = now.toLocaleDateString('vi-VN', {
        timeZone: timeZone,
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return { hour, minute, second, dateStr };
}

// 1.3 Cập nhật góc xoay kim & chữ hiển thị
function updateClockWidget(prefix, timeZone) {
    const { hour, minute, second, dateStr } = getTimeData(timeZone);

    const secDeg = (second / 60) * 360;
    const minDeg = ((minute + second / 60) / 60) * 360;
    const hourDeg = (((hour % 12) + minute / 60) / 12) * 360;

    const hHand = document.getElementById(`${prefix}-hour`);
    const mHand = document.getElementById(`${prefix}-minute`);
    const sHand = document.getElementById(`${prefix}-second`);
    
    if (hHand) hHand.style.transform = `rotate(${hourDeg}deg)`;
    if (mHand) mHand.style.transform = `rotate(${minDeg}deg)`;
    if (sHand) sHand.style.transform = `rotate(${secDeg}deg)`;

    const digiElem = document.getElementById(`${prefix}-digital`);
    if (digiElem) {
        const h = String(hour).padStart(2, '0');
        const m = String(minute).padStart(2, '0');
        const s = String(second).padStart(2, '0');
        digiElem.innerText = `${h}:${m}:${s}`;
    }

    const dateElem = document.getElementById(`${prefix}-date`);
    if (dateElem) dateElem.innerText = dateStr;
}

// ==========================================
// 2. THANH TIẾN ĐỘ (PROGRESS BAR)
// ==========================================

function updateProgressBar() {
    const startDate = new Date(2026, 8, 9).getTime(); // Tháng 9 (Index 8)
    const endDate = new Date(2026, 11, 31).getTime(); // Tháng 12 (Index 11)
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

// ==========================================
// 3. POPUP & FEED LOCAL
// ==========================================

let selectedImageBase64 = '';

function openPostModal() {
    const modal = document.getElementById('post-modal');
    if (modal) modal.classList.add('active');
}

function closePostModal() {
    const modal = document.getElementById('post-modal');
    const textInput = document.getElementById('post-input-text');
    const fileInput = document.getElementById('post-input-file');
    const previewBox = document.getElementById('image-preview');

    if (modal) modal.classList.remove('active');
    if (textInput) textInput.value = "";
    if (fileInput) fileInput.value = "";
    if (previewBox) previewBox.innerHTML = '';
    selectedImageBase64 = '';
}

window.openPostModal = openPostModal;
window.closePostModal = closePostModal;

function setupFeedEvents() {
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnSubmitPost = document.getElementById('btn-submit-post');
    const fileInput = document.getElementById('post-input-file');
    const previewBox = document.getElementById('image-preview');
    const addBtn = document.querySelector('.add-btn');
    const fabBtn = document.getElementById('fab-post-btn');

    if (btnCloseModal) btnCloseModal.addEventListener('click', closePostModal);
    if (addBtn) addBtn.addEventListener('click', openPostModal);
    if (fabBtn) fabBtn.addEventListener('click', openPostModal);

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    selectedImageBase64 = event.target.result;
                    if (previewBox) {
                        previewBox.innerHTML = `<img src="${selectedImageBase64}" style="max-width:100%; border-radius:12px;">`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnSubmitPost) {
        btnSubmitPost.addEventListener('click', async function() {
            const textInput = document.getElementById('post-input-text');
            const fileInputElem = document.getElementById('post-input-file');
            const content = textInput ? textInput.value : '';
            const file = fileInputElem && fileInputElem.files ? fileInputElem.files[0] : null;

            if (!content && !selectedImageBase64) {
                alert('Phương ơi, hãy gõ nội dung hoặc chọn một tấm ảnh nhé!');
                return;
            }

            // Gửi lên Cloud nếu có kết nối
            await submitPostCloud(content, file);

            // Đóng popup
            closePostModal();
        });
    }
}

// ==========================================
// 4. CHUYỂN TAB (NAVIGATION)
// ==========================================

function setupNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (this.id === 'btn-open-post') return;
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            const targetSectionId = this.getAttribute('data-target');
            console.log("Đã chuyển sang tab:", targetSectionId);
        });
    });
}

// ==========================================
// 5. FIREBASE LOGIC
// ==========================================

function listenToMomentsRealtime() {
    const momentsQuery = query(collection(db, "moments_demo"), orderBy("createdAt", "desc"));

    onSnapshot(momentsQuery, (snapshot) => {
        const momentsList = document.getElementById('moments-list');
        if (!momentsList) return;

        const addBtn = momentsList.querySelector('.moment-add-card');
        const addBtnHTML = addBtn ? addBtn.outerHTML : "";
        momentsList.innerHTML = addBtnHTML;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.imageUrl) {
                const item = document.createElement('div');
                item.className = 'moment-item';
                item.innerHTML = `<img src="${data.imageUrl}" alt="Khoảnh khắc" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
                momentsList.appendChild(item);
            }            
        });
    });
}

function setupMomentUploadListener() {
    const momentFileInput = document.getElementById('moment-file-input');
    if (momentFileInput && !momentFileInput.dataset.hasListener) {
        momentFileInput.dataset.hasListener = "true";
        momentFileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const storageRef = ref(storage, `moments/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const imageUrl = await getDownloadURL(storageRef);
                
                await addDoc(collection(db, "moments_demo"), {
                    imageUrl: imageUrl,
                    createdAt: serverTimestamp()
                });
                alert('Đã thêm 1 tấm ảnh vào Khoảnh khắc chung! ✨');
                e.target.value = '';
            } catch (error) {
                console.error("Lỗi thêm khoảnh khắc:", error);
                alert("Không thêm được ảnh: " + error.message);
            }
        });
    }
}

async function submitPostCloud(content, file) {
    if (!content && !file) return false;
    try {
        let imageUrl = "";
        if (file) {
            const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
        }
        await addDoc(collection(db, "posts_demo"), {
            author: "Ouji",
            location: "Việt Nam 🇻🇳",
            content: content,
            imageUrl: imageUrl,
            createdAt: serverTimestamp()
        });
        console.log("Đã gửi bài lên Cloud thành công! ✨");
        return true;              
    } catch (error) {
        console.error("Lỗi gửi bài lên Cloud:", error);
        alert("Đăng bài thất bại: " + error.message);
        return false;
    }
}

// ==========================================
// 6. KHỞI CHẠY TẤT CẢ KHI PAGE LOAD XONG
// ==========================================

document.addEventListener("DOMContentLoaded", function() {
    // 1. Dựng vạch đồng hồ & chạy đếm giờ
    buildClockTicks('clock-face-vn');
    buildClockTicks('clock-face-jp');
    
    function tickAll() {
        updateClockWidget('vn', 'Asia/Ho_Chi_Minh');
        updateClockWidget('jp', 'Asia/Tokyo');
    }
    tickAll();
    setInterval(tickAll, 1000);

    // 2. Chạy thanh tiến trình
    updateProgressBar();

    // 3. Khởi tạo các sự kiện giao diện
    setupFeedEvents();
    setupNavigation();

    // 4. Khởi tạo Firebase listeners
    setupMomentUploadListener();
    listenToMomentsRealtime();
});