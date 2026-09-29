// ==========================================
// 0. IMPORT FIREBASE
// ==========================================
import { 
    db,  
    collection, 
    addDoc,
    doc,
    setDoc,
    onSnapshot, 
    serverTimestamp, 
    query, 
    orderBy
} from "./firebase.js";

// ==========================================
// THÔNG TIN CLOUDINARY (THAY CHO FIREBASE STORAGE)
// ==========================================
const CLOUD_NAME = "zwyvvrqi"; 
const UPLOAD_PRESET = "hikari-preset"; // Ví dụ: ml_default hoặc hikari_preset

async function uploadToCloudinary(file) {
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    if (data.secure_url) {
        return data.secure_url;
    } else {
        throw new Error(data.error?.message || "Lỗi tải media lên Cloudinary!");
    }
}

// ==========================================
// 1. ĐỒNG HỒ & MÚI GIỜ
// ==========================================

function buildClockTicks(clockFaceId) {
    const clockFace = document.getElementById(clockFaceId);
    if (!clockFace) return;
    
    const oldTicks = clockFace.querySelectorAll('.clock-tick-mark');
    oldTicks.forEach(tick => tick.remove());

    for (let i = 0; i < 12; i++) {
        const tick = document.createElement('div');
        tick.className = 'clock-tick-mark';
        if (i % 3 === 0) tick.classList.add("main-tick");
        const angle = i * 30;
        tick.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-52px)`;
        clockFace.appendChild(tick);
    }
}

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
// 3. MÀN HÌNH ĐĂNG BÀI TOÀN MÀN HÌNH
// ==========================================

let selectedPostFile = null;

function openCreatePostScreen() {
    const createPostScreen = document.getElementById('create-post-screen');
    if (createPostScreen) createPostScreen.classList.add('active');
}

function closeCreatePostScreen() {
    const createPostScreen = document.getElementById('create-post-screen');
    const textInputScreen = document.getElementById('post-screen-text');
    const previewContainer = document.getElementById('post-screen-preview');
    const imageFileInput = document.getElementById('post-file-image');
    const videoFileInput = document.getElementById('post-file-video');

    if (createPostScreen) createPostScreen.classList.remove('active');
    if (textInputScreen) textInputScreen.value = '';
    if (previewContainer) previewContainer.innerHTML = '';
    if (imageFileInput) imageFileInput.value = '';
    if (videoFileInput) videoFileInput.value = '';
    selectedPostFile = null;
}

function setupCreatePostEvents() {
    const fabBtn = document.getElementById('fab-post-btn');
    const navPostBtn = document.getElementById('btn-open-post');
    const btnBackPost = document.getElementById('btn-back-post');
    const btnSubmitScreenPost = document.getElementById('btn-submit-screen-post');
    const imageFileInput = document.getElementById('post-file-image');
    const videoFileInput = document.getElementById('post-file-video');
    const previewContainer = document.getElementById('post-screen-preview');

    if (fabBtn) fabBtn.addEventListener('click', openCreatePostScreen);
    if (navPostBtn) navPostBtn.addEventListener('click', openCreatePostScreen);
    if (btnBackPost) btnBackPost.addEventListener('click', closeCreatePostScreen);

    function handleFileSelected(file) {
        if (!file) return;
        selectedPostFile = file;
        const isVideo = file.type.startsWith('video/');
        const fileUrl = URL.createObjectURL(file);

        if (previewContainer) {
            previewContainer.innerHTML = `
                <div style="position:relative; margin-top: 10px;">
                    ${isVideo 
                        ? `<video src="${fileUrl}" controls style="width:100%; max-height:200px; border-radius:12px;"></video>` 
                        : `<img src="${fileUrl}" style="width:100%; max-height:200px; object-fit:cover; border-radius:12px;">`
                    }
                    <button id="btn-remove-preview" style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.6); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; display:flex; align-items:center; justify-content:center;">×</button>
                </div>
            `;

            document.getElementById('btn-remove-preview').addEventListener('click', () => {
                previewContainer.innerHTML = '';
                selectedPostFile = null;
                if (imageFileInput) imageFileInput.value = '';
                if (videoFileInput) videoFileInput.value = '';
            });
        }
    }

    if (imageFileInput) imageFileInput.addEventListener('change', (e) => handleFileSelected(e.target.files[0]));
    if (videoFileInput) videoFileInput.addEventListener('change', (e) => handleFileSelected(e.target.files[0]));

    // Đăng bài với Cloudinary & Firestore
    if (btnSubmitScreenPost) {
        btnSubmitScreenPost.addEventListener('click', async () => {
            const textInputScreen = document.getElementById('post-screen-text');
            const content = textInputScreen ? textInputScreen.value.trim() : '';

            if (!content && !selectedPostFile) {
                alert('Phương ơi, hãy gõ nội dung hoặc chọn một tấm ảnh/video nhé!');
                return;
            }

            btnSubmitScreenPost.innerText = "Đang đăng...";
            btnSubmitScreenPost.disabled = true;

            try {
                let mediaUrl = "";
                let isVideo = false;

                if (selectedPostFile) {
                    isVideo = selectedPostFile.type.startsWith('video/');
                    // Tải file lên Cloudinary
                    mediaUrl = await uploadToCloudinary(selectedPostFile);
                }

                // Lưu vào Firestore collection "posts_test"
                await addDoc(collection(db, "posts_test"), {
                    author: "Ouji",
                    location: "Việt Nam 🇻🇳",
                    content: content,
                    mediaUrl: mediaUrl,
                    isVideo: isVideo,
                    createdAt: serverTimestamp()
                });

                alert("Đã đăng khoảnh khắc thành công! ✨");
                closeCreatePostScreen();
            } catch (error) {
                console.error("Lỗi khi đăng bài:", error);
                alert("Đăng bài thất bại: " + error.message);
            } finally {
                btnSubmitScreenPost.innerText = "Đăng";
                btnSubmitScreenPost.disabled = false;
            }
        });
    }
}

// ==========================================
// 4. POPUP CẢM XÚC TRÊN AVATAR
// ==========================================

function setupStatusModalEvents() {
    const myAvatarWrapper = document.getElementById('my-avatar-wrapper');
    const statusModal = document.getElementById('status-modal');
    const btnCloseStatus = document.getElementById('btn-close-status');
    const btnSaveStatus = document.getElementById('btn-save-status');
    const inputUserStatus = document.getElementById('input-user-status');
    const myStatusBubble = document.getElementById('my-status-bubble');
    const emojiChips = document.querySelectorAll('.emoji-chip');

    const CURRENT_USER_ID = "Ouji";

    if (myAvatarWrapper) {
        myAvatarWrapper.addEventListener('click', () => {
            if (statusModal) statusModal.classList.add('active');
        });
    }

    if (btnCloseStatus) {
        btnCloseStatus.addEventListener('click', () => {
            if (statusModal) statusModal.classList.remove('active');
        });
    }

    emojiChips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (inputUserStatus) inputUserStatus.value = chip.innerText;
        });
    });

    if (btnSaveStatus) {
        btnSaveStatus.addEventListener('click', async () => {
            const newStatus = inputUserStatus ? inputUserStatus.value.trim() : '';
            if (newStatus) {
                btnSaveStatus.innerText = "Lưu...";
                btnSaveStatus.disabled = true;

                try {
                    await setDoc(doc(db, "user_status", CURRENT_USER_ID), {
                        status: newStatus,
                        updatedAt: serverTimestamp()
                    });

                    if (statusModal) statusModal.classList.remove('active');
                    if (inputUserStatus) inputUserStatus.value = '';
                } catch (error) {
                    console.error("Lỗi lưu cảm xúc:", error);
                    alert("Không lưu được cảm xúc: " + error.message);
                } finally {
                    btnSaveStatus.innerText = "Cập nhật";
                    btnSaveStatus.disabled = false;
                }
            }
        });
    }

    onSnapshot(doc(db, "user_status", CURRENT_USER_ID), (docSnap) => {
        if (docSnap.exists() && docSnap.data().status && myStatusBubble) {
            myStatusBubble.innerText = docSnap.data().status;
            myStatusBubble.style.display = 'block';
        }
    });
}

// ==========================================
// 5. CHUYỂN TAB (NAVIGATION)
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
// 6. FIREBASE REALTIME LISTENERS
// ==========================================

function listenToPostsRealtime() {
    const postsQuery = query(collection(db, "posts_test"), orderBy("createdAt", "desc"));

    onSnapshot(postsQuery, (snapshot) => {
        const feedContainer = document.getElementById('feed-posts');
        if (!feedContainer) return;

        feedContainer.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            const postCard = document.createElement('div');
            postCard.className = 'post-card';

            let mediaHTML = '';
            if (data.mediaUrl) {
                if (data.isVideo) {
                    mediaHTML = `<video src="${data.mediaUrl}" controls style="width:100%; max-height:250px; border-radius:12px; margin-top:8px;"></video>`;
                } else {
                    mediaHTML = `<img src="${data.mediaUrl}" alt="Ảnh bài viết" style="width:100%; max-height:250px; object-fit:cover; border-radius:12px; margin-top:8px;">`;
                }
            }

            postCard.innerHTML = `
                <div class="post-user">
                    <div class="user-avatar">🙍‍♂️</div>
                    <div class="user-meta">
                        <span class="user-name">${data.author || 'Thành viên'}</span>
                        <span class="post-time">${data.location || 'HIKARI'}</span>
                    </div>
                </div>
                <div class="post-body">
                    <p class="post-text">${data.content || ''}</p>
                    ${mediaHTML}
                </div>
                <div class="post-footer">
                    <button class="btn-like">❤️ <span class="like-count">0</span></button>
                    <button class="btn-comment">💬 <span class="comment-count">0</span></button>
                </div>
            `;
            feedContainer.appendChild(postCard);
        });
    });
}

function listenToMomentsRealtime() {
    const momentsQuery = query(collection(db, "moments_test"), orderBy("createdAt", "desc"));

    onSnapshot(momentsQuery, (snapshot) => {
        const momentsList = document.getElementById('moments-list');
        if (!momentsList) return;

        momentsList.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.imageUrl) {
                const item = document.createElement('div');
                item.className = 'moment-item';
                item.innerHTML = `<img src="${data.imageUrl}" alt="Khoảnh khắc" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
                momentsList.appendChild(item);
            }            
        });

        const addBtn = document.createElement('div');
        addBtn.className = 'moment-add-card';
        addBtn.onclick = () => document.getElementById('moment-file-input').click();
        addBtn.innerHTML = `
            <div class="plus-icon">+</div>
            <span>Thêm ảnh</span>
        `;
        momentsList.appendChild(addBtn);
    });
}

// Upload khoảnh khắc nhanh bằng Cloudinary
function setupMomentUploadListener() {
    const momentFileInput = document.getElementById('moment-file-input');
    if (momentFileInput && !momentFileInput.dataset.hasListener) {
        momentFileInput.dataset.hasListener = "true";
        momentFileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            try {
                // Tải ảnh khoảnh khắc lên Cloudinary
                const imageUrl = await uploadToCloudinary(file);
                
                // Lưu link vào Firestore collection "moments_test"
                await addDoc(collection(db, "moments_test"), {
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

// ==========================================
// 7. KHỞI CHẠY TẤT CẢ KHI PAGE LOAD XONG
// ==========================================

document.addEventListener("DOMContentLoaded", function() {
    buildClockTicks('clock-face-vn');
    buildClockTicks('clock-face-jp');
    
    function tickAll() {
        updateClockWidget('vn', 'Asia/Ho_Chi_Minh');
        updateClockWidget('jp', 'Asia/Tokyo');
    }
    tickAll();
    setInterval(tickAll, 1000);

    updateProgressBar();

    setupCreatePostEvents();
    setupStatusModalEvents();
    setupNavigation();

    setupMomentUploadListener();
    listenToMomentsRealtime();
    listenToPostsRealtime();
});