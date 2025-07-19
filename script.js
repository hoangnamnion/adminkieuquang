// Di chuyển toàn bộ mã JavaScript từ thẻ <script> trong admin.html vào đây
// Website state
let isMaintenance = false;
const API_URL = 'https://kieuquangadmin.onrender.com/api';

// DOM Elements
const websiteToggle = document.getElementById('websiteToggle');
const siteStatus = document.getElementById('siteStatus');
const saveAccountBtn = document.getElementById('saveAccount');
const reviewsList = document.getElementById('reviewsList');

// Initialize
loadMaintenanceState();
loadReviews();
loadCodes();

// Load codes and links
async function loadCodes() {
    try {
        const response = await fetch(`${API_URL}/codelink`);
        if (response.ok) {
            const codes = await response.json();
            displayCodes(codes);
        } else {
            console.error('Error loading codes:', response.statusText);
            showToast('Không thể tải danh sách mã');
        }
    } catch (error) {
        console.error('Error loading codes:', error);
        showToast('Lỗi kết nối khi tải danh sách mã');
    }
}

// Display codes in the list
function displayCodes(codes) {
    const codesList = document.getElementById('codesList');
    
    if (codes.length === 0) {
        codesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Chưa có mã nào được tạo</p>
            </div>
        `;
        return;
    }

    codesList.innerHTML = codes.map(code => `
        <div class="code-item" data-id="${code.id}">
            <div class="code-header">
                <div class="code-info">
                    <div class="code-value">${code.code}</div>
                    <div class="code-link">${code.link}</div>
                    <div class="code-type"><b>Loại:</b> ${code.type || 'Không xác định'}</div>
                </div>
                <div class="code-actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteCode('${code.id}')">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </div>
            <div class="code-date">
                Tạo lúc: ${new Date(code.createdAt).toLocaleString('vi-VN')}
            </div>
        </div>
    `).join('');
}

// Delete code
async function deleteCode(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa mã này?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/codelink/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Đã xóa mã thành công!');
            loadCodes(); // Reload the list
        } else {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error(`Server error: ${errorText}`);
        }
    } catch (error) {
        console.error('Error deleting code:', error);
        showToast(`Lỗi: ${error.message || 'Không thể xóa mã'}`);
    }
}

// Save code and link
document.getElementById('saveCodeLink').addEventListener('click', async function() {
    const code = document.getElementById('codeInput').value;
    if (!code) {
        showToast('Vui lòng nhập mã code!');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/codelink`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        if (response.ok) {
            const data = await response.json();
            showToast('Đã lưu mã thành công!');
            document.getElementById('codeInput').value = '';
            loadCodes();
        } else {
            const errorText = await response.text();
            showToast(`Lỗi: ${errorText}`);
        }
    } catch (error) {
        showToast(`Lỗi: ${error.message || 'Không thể kết nối đến server'}`);
    }
});

// Initialize toggle state
websiteToggle.addEventListener('change', async function() {
    try {
        isMaintenance = !isMaintenance;
        console.log('Sending request to:', `${API_URL}/maintenance`);
        const response = await fetch(`${API_URL}/maintenance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isMaintenance })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Server response:', data);
            updateSiteStatus();
            showToast(isMaintenance ? 'Đã bật chế độ bảo trì!' : 'Đã tắt chế độ bảo trì!');
        } else {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error(`Server error: ${errorText}`);
        }
    } catch (error) {
        console.error('Detailed error:', error);
        showToast(`Lỗi: ${error.message || 'Không thể kết nối đến server'}`);
        isMaintenance = !isMaintenance; // Revert the state
        websiteToggle.checked = !websiteToggle.checked; // Revert toggle
    }
});

// Save account info
saveAccountBtn.addEventListener('click', function() {
    const username = document.getElementById('accountUsername').value;
    const password = document.getElementById('accountPassword').value;

    if (username && password) {
        // Save to localStorage for demo
        localStorage.setItem('accountInfo', JSON.stringify({ username, password }));
        showToast('Đã lưu thông tin tài khoản!');
    } else {
        showToast('Vui lòng điền đầy đủ thông tin!');
    }
});

// Load reviews
function loadReviews() {
    const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
    reviewsList.innerHTML = reviews.map(review => `
        <div class="review-item">
            <div class="review-header">
                <span class="review-name">${review.name}</span>
                <div class="review-actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteReview('${review.name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="review-content">${review.content}</div>
        </div>
    `).join('');
}

// Delete review
function deleteReview(name) {
    const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
    const updatedReviews = reviews.filter(review => review.name !== name);
    localStorage.setItem('reviews', JSON.stringify(updatedReviews));
    loadReviews();
    showToast('Đã xóa đánh giá!');
}

// Update site status
function updateSiteStatus() {
    if (isMaintenance) {
        siteStatus.textContent = 'Đang bảo trì';
        siteStatus.className = 'status-badge status-maintenance';
    } else {
        siteStatus.textContent = 'Đang hoạt động';
        siteStatus.className = 'status-badge status-active';
    }
}

// Load initial maintenance state
//

// Show toast message
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Quản lý tài nguyên mục
const resourceTypeSelect = document.getElementById('resourceTypeSelect');
const resourceCopy1 = document.getElementById('resourceCopy1');
const resourceCopy2 = document.getElementById('resourceCopy2');
const resourceLink1 = document.getElementById('resourceLink1');
const resourceLink2 = document.getElementById('resourceLink2');
const resourceLink3 = document.getElementById('resourceLink3');
const saveResourceBtn = document.getElementById('saveResourceBtn');

async function loadResourceForType(type) {
    try {
        const res = await fetch(`${API_URL}/tainguyen?type=${encodeURIComponent(type)}`);
        if (res.ok) {
            const text = await res.text();
            const [copy1, copy2, link1, link2, link3] = text.split('|');
            resourceCopy1.value = copy1 || '';
            resourceCopy2.value = copy2 || '';
            resourceLink1.value = link1 || '';
            resourceLink2.value = link2 || '';
            resourceLink3.value = link3 || '';
        } else {
            resourceCopy1.value = '';
            resourceCopy2.value = '';
            resourceLink1.value = '';
            resourceLink2.value = '';
            resourceLink3.value = '';
        }
    } catch {
        resourceCopy1.value = '';
        resourceCopy2.value = '';
        resourceLink1.value = '';
        resourceLink2.value = '';
        resourceLink3.value = '';
    }
}

resourceTypeSelect.addEventListener('change', function() {
    loadResourceForType(this.value);
});

saveResourceBtn.addEventListener('click', async function() {
    const type = resourceTypeSelect.value;
    const data = [
        resourceCopy1.value.trim(),
        resourceCopy2.value.trim(),
        resourceLink1.value.trim(),
        resourceLink2.value.trim(),
        resourceLink3.value.trim()
    ].join('|');
    try {
        const res = await fetch(`${API_URL}/tainguyen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data })
        });
        if (res.ok) {
            showToast('Đã lưu tài nguyên thành công!');
        } else {
            showToast('Lỗi khi lưu tài nguyên!');
        }
    } catch {
        showToast('Lỗi kết nối khi lưu tài nguyên!');
    }
});

// Load tài nguyên cho mục mặc định khi vào trang
loadResourceForType(resourceTypeSelect.value); 