//1. JavaScript code to update the clock every second

function updateClock() {
    const now = new Date();
    const vnTimeStr = now.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const jpTimeStr = now.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    document.getElementById('vn-time').innerText = vnTimeStr;
    document.getElementById('jp-time').innerText = jpTimeStr;
}   

setInterval(updateClock, 1000);
updateClock(); // Initial call to display the time immediately

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
const fileInput = document.getElementById('post-input-file'); //Tìm giá trị trong HTML
const previewBox = document.getElementById('image-preview'); //Tìm giá trị trong HTML
const textInput = document.getElementById('post-input-text'); //Tìm giá trị trong HTML
const feedContainer = document.querySelector('.feed-container'); //Tìm giá trị trong CSS
let selectedImageBase64 = ''; //Biến tạm chứa dữ liệu ảnh
//3.1 Mở Modal đăng bài
function openPostModal() {
    if(modal) modal.classList.add('active');
}
//3.2 Đóng Modal đăng bài và dọn dẹp
function closePostModal() {
    if(modal) modal.classList.remove('active');
    textInput.value = '';
    fileInput.value = '';
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
        const content = textInput.value.trim();
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

//5. Database
const firebaseConfig = {
  apiKey: "AIzaSyBGqOyIaK8K_pCfuym9YqrRR4g83jBvbYc",
  authDomain: "hikari-space-e6f88.firebaseapp.com",
  projectId: "hikari-space-e6f88",
  storageBucket: "hikari-space-e6f88.firebasestorage.app",
  messagingSenderId: "132300026099",
  appId: "1:132300026099:web:3a1790b84d5433c1310786",
  measurementId: "G-FQNGCW6RH2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

//6. Xử lý khung Nhật ký ảnh
//6.1 Lắng nghe ảnh mới từ Colection "moments" trên Firebase
db.collection("moments_demo").orderBy("createdAt", "desc")
  .onSnapshot(snapshot => {
      const momentsList = document.getElementById('moments-list');
      
      //6.1.1 Giữ lại nút "+ Thêm ảnh" ở đầu, xóa đống ảnh cũ đi vẽ lại
      const addBtnHTML = momentsList.querySelector('.moment-add-card').outerHTML;
      momentsList.innerHTML = addBtnHTML;

      snapshot.forEach(doc => {
          const data = doc.data();
          const item = document.createElement('div');
          item.className = 'moment-item';
          item.innerHTML = `<img src="${data.imageUrl}" alt="A shared community memory with a warm, everyday social atmosphere. The image shows a cozy indoor scene with natural light and a gentle mood. No text is visible.">`;
          momentsList.appendChild(item);
      });
  });

//6.2 Tải ảnh nhanh lên Khung Khoảnh Khắc khi bấm nút "+"
const momentFileInput = document.getElementById('moment-file-input');
if(momentFileInput) {
    momentFileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            //6.2.1 Upload ảnh lên Firebase Storage
            const storageRef = storage.ref(`moments/${Date.now()}_${file.name}`);
            await storageRef.put(file);
            const imageUrl = await storageRef.getDownloadURL();

            //6.2.2 Lưu link ảnh vào Collection "moments"
            await db.collection("moments_demo").add({
                imageUrl: imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Đã thêm 1 tấm ảnh vào Khoảnh khắc chung! ✨');
        }
    });
    imageHTML = `<img src="${imageUrl}" alt="A photo shared by the community in a cozy indoor setting with soft natural light and a gentle, welcoming mood. No text is visible." style="max-width:100%; border-radius:12px; margin-top:8px;" />`;
}

//7. Gửi bài đăng lên cloud
async function submitPostToFirebase(content, file) {
    let imageUrl = "";
    if(file) {
       const storageRef = storage.ref(`images/${Date.now()}_${file.name}`);
       await storageRef.put(file);
       imageUrl = await storageRef.getDownloadURL();
       imageHTML = `<img src="${imageUrl}" alt="A photo shared by the community in a cozy indoor setting with soft natural light and a gentle, welcoming mood. No text is visible." style="max-width:100%; border-radius:12px; margin-top:8px;" />`;
    }
    await db.collection("posts_demo").add({
        author: "Ouji",
        location: "Việt Nam 🇻🇳",
        content: content,
        imageUrl: imageUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}