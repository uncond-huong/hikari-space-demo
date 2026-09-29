// ==========================================
// 0. IMPORT FIREBASE
// ==========================================
import { 
    db, 
    auth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    addDoc, 
    doc, 
    setDoc, updateDoc, arrayUnion, arrayRemove,
    onSnapshot, 
    serverTimestamp, 
    query, 
    orderBy,
    collection
} from "./firebase.js";

// Biến lưu tên hiển thị của người dùng đang đăng nhập
let currentUserName = "Thành viên";
let currentAvatarUrl = "";
let activeCommentPostId = null;
let commentUnsubscribe = null;

// ==========================================
// THÔNG TIN CLOUDINARY
// ==========================================
const CLOUD_NAME = "zwyvvrqi"; 
const UPLOAD_PRESET = "hikari-preset";

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
// HÀM HIỂN THỊ TOAST THÔNG BÁO (KIỂU FACEBOOK)
// ==========================================
function showToast(message, icon = "✨") {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    if (!toast || !toastMsg) return;

    toastMsg.innerText = message;
    if (toastIcon) toastIcon.innerText = icon;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

// Tự động chọn câu thông báo cá nhân hóa theo tài khoản
function getCustomToastInfo() {
    const user = auth.currentUser;
    if (!user) return { msg: "Thao tác thành công! ✨", icon: "✨" };

    const email = (user.email || "").toLowerCase();

    // 1. Dành cho Hường (huongsoft@hikari.com)
    if (email.includes("soft")) {
        return { 
            msg: "Ui, cảm ơn công chúa đã chia sẻ nhen... 💖", 
            icon: "🌸" 
        };
    }

    // 2. Dành cho Phương (phuong@hikari.com)
    if (email.includes("phuong")) {
        return { 
            msg: "Đã góp phần làm nàng ấy vui! ✨", 
            icon: "🪷" 
        };
    }

    // 3. Dành cho Khách mời (guest@hikari.com hoặc khác)
    return { 
        msg: "Cảm ơn bạn đã kết nối với chúng tôi! 🌿", 
        icon: "💌" 
    };
}

// Lấy tên tác giả đăng bài động từ tài khoản
function getAuthorName() {
    const user = auth.currentUser;
    if (!user) return "Thành viên";
    return currentUserName || (user.email ? user.email.split('@')[0] : "Thành viên");
}

// ==========================================
// XÁC THỰC NGƯỜI DÙNG (FIREBASE AUTH)
// ==========================================

// Lắng nghe trạng thái đăng nhập & Cập nhật tên/avatar Realtime
onAuthStateChanged(auth, (user) => {
    const loginOverlay = document.getElementById('login-overlay');
    if (user) {
        // Đã đăng nhập -> Ẩn form & Mở khóa cuộn trang
        if (loginOverlay) loginOverlay.style.display = 'none';
        document.body.classList.remove('login-locked');
        console.log("Đã đăng nhập thành công:", user.email);

        // Lắng nghe Realtime Tên hiển thị & Avatar từ Firestore "users"
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            const userNameElem = document.getElementById('user-name');
            const myAvatarImg = document.getElementById('my-avatar-img');
            const inputDisplayName = document.getElementById('input-display-name');

            if (docSnap.exists() && docSnap.data().displayName) {
                currentUserName = docSnap.data().displayName;
            } else {
                currentUserName = user.email ? user.email.split('@')[0] : "Thành viên";
            }

            // Gán tên lên góc chào Header
            if (userNameElem) userNameElem.innerText = currentUserName;

            // Điền sẵn tên vào ô nhập trong Popup nếu đang rỗng
            if (inputDisplayName && !inputDisplayName.value) {
                inputDisplayName.value = currentUserName;
            }

            // Cập nhật Avatar
            if (docSnap.exists() && docSnap.data().avatarUrl) {
                currentAvatarUrl = docSnap.data().avatarUrl;
                if (myAvatarImg) myAvatarImg.src = currentAvatarUrl;
            }
            if (docSnap.exists() && docSnap.data().avatarUrl && myAvatarImg) {
                myAvatarImg.src = docSnap.data().avatarUrl;
            }
        });

    } else {
        // Chưa đăng nhập -> Hiện form & Khóa cuộn trang
        if (loginOverlay) loginOverlay.style.display = 'flex';
        document.body.classList.add('login-locked');
    }    
});

// Xử lý sự kiện bấm nút Đăng nhập
function setupLoginEvent() {
    const btnLogin = document.getElementById('btn-login-submit');
    if (btnLogin) {
        btnLogin.addEventListener('click', async (e) => {
            if (e) e.preventDefault(); // Chặn reload trang ngầm

            const emailInput = document.getElementById('login-email');
            const passInput = document.getElementById('login-pass');
            const errorMsg = document.getElementById('login-error-msg');

            const email = emailInput ? emailInput.value.trim() : '';
            const pass = passInput ? passInput.value.trim() : '';

            if (!email || !pass) {
                const emptyMsg = "Vui lòng nhập đầy đủ Email và Mật khẩu!";
                if (errorMsg) errorMsg.innerText = emptyMsg;
                return;
            }

            btnLogin.innerText = "Đang kiểm tra...";
            btnLogin.disabled = true;
            if (errorMsg) errorMsg.innerText = "";

            try {
                await signInWithEmailAndPassword(auth, email, pass);
            } catch (error) {
                console.error("Lỗi đăng nhập:", error);
                let msg = "Tài khoản hoặc mật khẩu không chính xác!";
                if (errorMsg) errorMsg.innerText = msg;
            } finally {
                btnLogin.innerText = "Đăng nhập";
                btnLogin.disabled = false;
            }
        });
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
                showToast("Hãy gõ nội dung hoặc chọn một tấm ảnh/video nhé!", "📝");
                return;
            }

            btnSubmitScreenPost.innerText = "Đang đăng...";
            btnSubmitScreenPost.disabled = true;

            try {
                let mediaUrl = "";
                let isVideo = false;

                if (selectedPostFile) {
                    isVideo = selectedPostFile.type.startsWith('video/');
                    mediaUrl = await uploadToCloudinary(selectedPostFile);
                }

                // Lưu vào Firestore collection "posts_test"
                await addDoc(collection(db, "posts_test"), {
                    author: getAuthorName(),
                    authorAvatarUrl: currentAvatarUrl,
                    location: "Việt Nam 🇻🇳",
                    content: content,
                    mediaUrl: mediaUrl,
                    isVideo: isVideo,
                    createdAt: serverTimestamp()
                });

                // Hiện Toast thông báo cá nhân hóa
                const toastInfo = getCustomToastInfo();
                showToast(toastInfo.msg, toastInfo.icon);

                closeCreatePostScreen();
            } catch (error) {
                console.error("Lỗi khi đăng bài:", error);
                showToast("Đăng bài thất bại: " + error.message, "❌");
            } finally {
                btnSubmitScreenPost.innerText = "Đăng";
                btnSubmitScreenPost.disabled = false;
            }
        });
    }
}

// ==========================================
// 4. POPUP CẢM XÚC, TÊN HIỂN THỊ & ĐỔI MẬT KHẨU
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
            const newNameInput = document.getElementById('input-display-name');
            const newName = newNameInput ? newNameInput.value.trim() : '';
            const currentUser = auth.currentUser;

            if (!currentUser) return;

            btnSaveStatus.innerText = "Lưu...";
            btnSaveStatus.disabled = true;

            try {
                // 1. Lưu Tên hiển thị mới vào Firestore
                if (newName) {
                    await setDoc(doc(db, "users", currentUser.uid), {
                        displayName: newName,
                        email: currentUser.email,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                    currentUserName = newName;
                }

                // 2. Lưu Cảm xúc
                if (newStatus) {
                    await setDoc(doc(db, "user_status_test", CURRENT_USER_ID), {
                        status: newStatus,
                        updatedAt: serverTimestamp()
                    });
                }

                showToast("Đã cập nhật thông tin thành công!", "✨");
                if (statusModal) statusModal.classList.remove('active');

            } catch (error) {
                console.error("Lỗi cập nhật thông tin:", error);
                showToast("Không thể cập nhật: " + error.message, "❌");
            } finally {
                btnSaveStatus.innerText = "Cập nhật";
                btnSaveStatus.disabled = false;
            }
        });
    }

    onSnapshot(doc(db, "user_status_test", CURRENT_USER_ID), (docSnap) => {
        if (docSnap.exists() && docSnap.data().status && myStatusBubble) {
            myStatusBubble.innerText = docSnap.data().status;
            myStatusBubble.style.display = 'block';
        }
    });
}

// Xử lý đổi Avatar
function setupAvatarEvents() {
    const btnChangeAvatar = document.getElementById('btn-trigger-change-avatar');
    const avatarFileInput = document.getElementById('avatar-file-input');

    if (btnChangeAvatar && avatarFileInput) {
        btnChangeAvatar.addEventListener('click', () => {
            avatarFileInput.click();
        });
    }

    if (avatarFileInput) {
        avatarFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const currentUser = auth.currentUser;
            if (!currentUser) {
                showToast("Vui lòng đăng nhập trước khi đổi avatar!", "⚠️");
                return;
            }

            try {
                if (btnChangeAvatar) btnChangeAvatar.innerText = "Đang tải ảnh lên...";

                const avatarUrl = await uploadToCloudinary(file);

                // Lưu vào Firestore collection "users"
                await setDoc(doc(db, "users", currentUser.uid), {
                    avatarUrl: avatarUrl,
                    email: currentUser.email,
                    updatedAt: serverTimestamp()
                }, { merge: true });

                showToast("Đã cập nhật ảnh đại diện mới thành công! ✨", "📷");

                const statusModal = document.getElementById('status-modal');
                if (statusModal) statusModal.classList.remove('active');

            } catch (error) {
                console.error("Lỗi đổi avatar:", error);
                showToast("Không thể đổi avatar: " + error.message, "❌");
            } finally {
                if (btnChangeAvatar) btnChangeAvatar.innerText = "📷 Chọn ảnh đại diện mới";
                avatarFileInput.value = '';
            }
        });
    }
}

// Xử lý Đổi Mật Khẩu
function setupChangePasswordEvents() {
    const modal = document.getElementById('change-pass-modal');
    const btnClose = document.getElementById('btn-close-pass-modal');
    const btnSave = document.getElementById('btn-save-new-pass');
    const msg = document.getElementById('change-pass-msg');

    window.openChangePasswordModal = function() {
        if (modal) modal.classList.add('active');
    };

    if (btnClose) {
        btnClose.addEventListener('click', () => {
            if (modal) modal.classList.remove('active');
            clearInputs();
        });
    }

    function clearInputs() {
        if (document.getElementById('input-old-pass')) document.getElementById('input-old-pass').value = '';
        if (document.getElementById('input-new-pass')) document.getElementById('input-new-pass').value = '';
        if (document.getElementById('input-confirm-pass')) document.getElementById('input-confirm-pass').value = '';
        if (msg) msg.innerText = '';
    }

    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            const oldPass = document.getElementById('input-old-pass').value.trim();
            const newPass = document.getElementById('input-new-pass').value.trim();
            const confirmPass = document.getElementById('input-confirm-pass').value.trim();
            const user = auth.currentUser;

            if (!oldPass || !newPass || !confirmPass) {
                msg.style.color = '#FF5A5A';
                msg.innerText = 'Vui lòng nhập đầy đủ thông tin!';
                return;
            }

            if (newPass.length < 6) {
                msg.style.color = '#FF5A5A';
                msg.innerText = 'Mật khẩu mới phải có ít nhất 6 ký tự!';
                return;
            }

            if (newPass !== confirmPass) {
                msg.style.color = '#FF5A5A';
                msg.innerText = 'Mật khẩu xác nhận không khớp!';
                return;
            }

            btnSave.innerText = 'Đang đổi...';
            btnSave.disabled = true;

            try {
                const credential = EmailAuthProvider.credential(user.email, oldPass);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPass);

                msg.style.color = '#4CAF50';
                msg.innerText = 'Đổi mật khẩu thành công! 🎉';

                setTimeout(() => {
                    if (modal) modal.classList.remove('active');
                    clearInputs();
                }, 1500);

            } catch (error) {
                console.error("Lỗi đổi mật khẩu:", error);
                msg.style.color = '#FF5A5A';
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    msg.innerText = 'Mật khẩu hiện tại không đúng!';
                } else {
                    msg.innerText = 'Đổi thất bại: ' + error.message;
                }
            } finally {
                btnSave.innerText = 'Lưu mật khẩu';
                btnSave.disabled = false;
            }
        });
    }
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

            const defaultAvatar = "avatar.jpg";
            const avatarUrl = data.authorAvatarUrl || defaultAvatar;


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
                    <img src="${avatarUrl}" class="post-avatar-img" alt="Avatar">
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

        // 1. Vẽ tất cả ảnh khoảnh khắc đã đăng ra trước (bên trái)
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.imageUrl) {
                const item = document.createElement('div');
                item.className = 'moment-item';
                item.innerHTML = `<img src="${data.imageUrl}" alt="Khoảnh khắc">`;
                momentsList.appendChild(item);
            }            
        });

        // 2. Vẽ DUY NHẤT 1 nút "+ Thêm ảnh" ở cuối (bên phải)
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
                const imageUrl = await uploadToCloudinary(file);
                
                await addDoc(collection(db, "moments_test"), {
                    imageUrl: imageUrl,
                    createdAt: serverTimestamp()
                });

                // Hiện Toast thông báo cá nhân hóa
                const toastInfo = getCustomToastInfo();
                showToast(toastInfo.msg, toastInfo.icon);

                e.target.value = '';
            } catch (error) {
                console.error("Lỗi thêm khoảnh khắc:", error);
                showToast("Không thêm được ảnh: " + error.message, "❌");
            }
        });
    }
}

// ==========================================
// 7. THẢ TIM & BÌNH LUẬN LOGIC
// ==========================================

// Hàm Thả / Bỏ tim bài viết
async function toggleLikePost(postId, likesArray = []) {
    const user = auth.currentUser;
    if (!user) {
        showToast("Vui lòng đăng nhập để thả tim!", "⚠️");
        return;
    }

    const postRef = doc(db, "posts_test", postId);
    const isLiked = likesArray.includes(user.uid);

    try {
        if (isLiked) {
            await updateDoc(postRef, { likes: arrayRemove(user.uid) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(user.uid) });
        }
    } catch (error) {
        console.error("Lỗi thả tim:", error);
        showToast("Thao tác thất bại: " + error.message, "❌");
    }
}

// Mở Popup Bình luận bài viết
function openCommentModal(postId) {
    activeCommentPostId = postId;
    const modal = document.getElementById('comment-modal');
    if (modal) modal.classList.add('active');

    const commentList = document.getElementById('comment-list');
    if (commentList) commentList.innerHTML = '<p style="text-align:center; color:#888; font-size:12px;">Đang tải bình luận...</p>';

    // Hủy listener cũ nếu có
    if (commentUnsubscribe) commentUnsubscribe();

    // Lắng nghe Realtime bình luận của bài viết
    const commentsRef = query(collection(db, "posts_test", postId, "comments"), orderBy("createdAt", "asc"));
    commentUnsubscribe = onSnapshot(commentsRef, (snapshot) => {
        if (!commentList) return;
        commentList.innerHTML = '';

        if (snapshot.empty) {
            commentList.innerHTML = '<p style="text-align:center; color:#888; font-size:12px;">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
            return;
        }

        snapshot.forEach(docSnap => {
            const cData = docSnap.data();
            const avatar = cData.authorAvatarUrl || "avatar.png";
            const item = document.createElement('div');
            item.className = 'comment-item-box';
            item.innerHTML = `
                <img src="${avatar}" class="comment-user-avatar" alt="Avatar">
                <div class="comment-content-box">
                    <span class="comment-author-name">${cData.author || 'Thành viên'}</span>
                    <span class="comment-text-body">${cData.text || ''}</span>
                </div>
            `;
            commentList.appendChild(item);
        });

        // Cuộn xuống cuối
        commentList.scrollTop = commentList.scrollHeight;
    });
}

// Cài đặt sự kiện nút Gửi bình luận & Đóng Popup
function setupCommentEvents() {
    const btnClose = document.getElementById('btn-close-comment');
    const btnSend = document.getElementById('btn-send-comment');
    const inputComment = document.getElementById('input-comment-text');
    const modal = document.getElementById('comment-modal');

    if (btnClose) {
        btnClose.addEventListener('click', () => {
            if (modal) modal.classList.remove('active');
            if (commentUnsubscribe) commentUnsubscribe();
            activeCommentPostId = null;
        });
    }

    if (btnSend && inputComment) {
        btnSend.addEventListener('click', async () => {
            const text = inputComment.value.trim();
            const user = auth.currentUser;
            if (!text || !activeCommentPostId || !user) return;

            btnSend.disabled = true;
            try {
                await addDoc(collection(db, "posts_test", activeCommentPostId, "comments"), {
                    author: getAuthorName(),
                    authorAvatarUrl: currentAvatarUrl || "avatar.png",
                    text: text,
                    createdAt: serverTimestamp()
                });
                inputComment.value = '';
            } catch (error) {
                console.error("Lỗi gửi bình luận:", error);
                showToast("Gửi thất bại: " + error.message, "❌");
            } finally {
                btnSend.disabled = false;
            }
        });
    }
}

// 2. Cập nhật hàm listenToPostsRealtime() để hiển thị lượt Tim & Bình luận
function listenToPostsRealtime() {
    const postsQuery = query(collection(db, "posts_test"), orderBy("createdAt", "desc"));

    onSnapshot(postsQuery, (snapshot) => {
        const feedContainer = document.getElementById('feed-posts');
        if (!feedContainer) return;

        feedContainer.innerHTML = '';
        const currentUser = auth.currentUser;

        snapshot.forEach(docSnap => {
            const postId = docSnap.id;
            const data = docSnap.data();
            const postCard = document.createElement('div');
            postCard.className = 'post-card';

            const defaultAvatar = "avatar.png"; 
            const avatarUrl = data.authorAvatarUrl || defaultAvatar;

            // Xử lý Lượt thả tim
            const likesArray = data.likes || [];
            const likeCount = likesArray.length;
            const isLikedByMe = currentUser && likesArray.includes(currentUser.uid);

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
                    <img src="${avatarUrl}" class="post-avatar-img" alt="Avatar">
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
                    <button class="btn-like ${isLikedByMe ? 'liked' : ''}" data-id="${postId}">
                        ${isLikedByMe ? '❤️' : '🤍'} <span class="like-count">${likeCount}</span>
                    </button>
                    <button class="btn-comment" data-id="${postId}">
                        💬 <span class="comment-count">Bình luận</span>
                    </button>
                </div>
            `;

            // Gán sự kiện cho Nút Thả tim & Nút Bình luận
            const btnLike = postCard.querySelector('.btn-like');
            const btnComment = postCard.querySelector('.btn-comment');

            if (btnLike) {
                btnLike.addEventListener('click', () => toggleLikePost(postId, likesArray));
            }
            if (btnComment) {
                btnComment.addEventListener('click', () => openCommentModal(postId));
            }

            feedContainer.appendChild(postCard);
        });
    });
}

// ==========================================
// 8. KHỞI CHẠY TẤT CẢ KHI PAGE LOAD XONG
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

    setupLoginEvent();
    setupCreatePostEvents();
    setupStatusModalEvents();
    setupAvatarEvents();
    setupChangePasswordEvents();
    setupNavigation();

    setupMomentUploadListener();
    listenToMomentsRealtime();
    listenToPostsRealtime();
});