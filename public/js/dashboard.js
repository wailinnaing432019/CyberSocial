// dashboard.js
let user = null;
let activeUsers = [];
let unreadCounts = {}; // Global unread counts object

const socket = io();
async function initDashboard() {
    const token = localStorage.getItem('token');
    // ၁။ အရင်ဆုံး မဖတ်ရသေးတဲ့ counts တွေကို ယူမယ်
    try {
        const res = await fetch('/api/chat/unread-all', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        unreadCounts = await res.json();
    } catch (e) {
        console.error("Unread error:", e);
    }
    if (!token) return window.location.href = 'index.html';

    try {
        const res = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        user = await res.json();

        // Socket Registration
        socket.emit('register_user', user.id);
        socket.emit('join_room', 'community');

        // 🔥 Chat Listener တွေကို စတင်နားထောင်ခိုင်းမယ်
        if (typeof setupSocketListeners === 'function') {
            setupSocketListeners();
        }

        updateNavbar(user);
        updateUserUI(user);
        loadPosts();
        await loadUserList(); // ဒါကို await ခံထားရင် ပိုစိတ်ချရတယ်

        // 🔥 ဒီနေရာမှာ ထည့်ပါ
        checkAutoChat();

        if (typeof loadChatHistory === 'function') {
            loadChatHistory('community');
        }
    } catch (err) {
        console.error("Dashboard init error:", err);
    }
}

// Online Users Update
socket.on('update_online_users', (onlineIds) => {
    // ID တွေကို Number အဖြစ်ပြောင်းသိမ်းတာ ပိုစိတ်ချရတယ်
    activeUsers = onlineIds.map(id => Number(id));
    loadUserList();
});


// --- UI Helper Functions ---

function updateUnreadBadge(userId, count) {
    const userItem = document.querySelector(`.user-item[data-id="${userId}"]`);
    if (!userItem) return;

    let badge = userItem.querySelector('.unread-badge');

    if (count > 0) {
        if (!badge) {
            // Badge မရှိသေးရင် အသစ်ထည့်မယ်
            userItem.insertAdjacentHTML('beforeend', `
                <span class="unread-badge bg-red-500 text-white text-[10px] px-1.5 rounded-full absolute right-2">
                    ${count}
                </span>
            `);
        } else {
            badge.innerText = count;
            badge.classList.remove('hidden');
        }
    } else if (badge) {
        badge.remove(); // count ၀ ဆိုရင် ဖြုတ်ပစ်မယ်
    }
}

function updateNavbar(userData) {
    const avatar = document.getElementById('nav-avatar');
    const nameText = document.getElementById('welcome-text');
    if (avatar) avatar.src = userData.avatar || '/uploads/default.png';
    if (nameText) nameText.innerText = userData.username;
}

function updateUserUI(userData) {
    const avatarUrl = userData.avatar || '/uploads/default.png';
    const inputAvatar = document.getElementById('post-input-avatar');
    if (inputAvatar) inputAvatar.src = avatarUrl;
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
}

// --- Post & Social Functions ---

async function loadPosts() {
    if (!user) return;
    try {
        const res = await fetch('/api/posts');
        const posts = await res.json();
        window.allPosts = posts;

        const feed = document.getElementById('feed');
        if (!feed) return;
        feed.innerHTML = '';

        posts.forEach(post => {
            const isLiked = post.Likes?.some(like => Number(like.userId) === Number(user.id));
            const likeColor = isLiked ? 'text-red-500' : 'text-gray-500';
            const likeButtonHTML = isLiked
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-red-500"><path d="m11.645 20.91l-.007-.003l-.022-.012a15.247 15.247 0 0 1-.383-.218a25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25C2.25 5.322 4.714 3 7.5 3c1.557 0 3.046.716 4 1.967C12.454 3.716 13.943 3 15.5 3c2.786 0 5.25 2.322 5.25 5.25c0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17a15.247 15.247 0 0 1-.383.219l-.022.012l-.007.004l-.003.001Z" /></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-gray-500"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>`;

            const displayComments = post.Comments ? post.Comments.slice(0, 2) : [];
            const hasMoreComments = post.Comments?.length > 2;

            feed.innerHTML += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                    <div class="flex items-center gap-3 mb-4">
                        <img src="${post.User?.avatar || '/uploads/default.png'}" class="w-10 h-10 rounded-full object-cover border">
                        <div>
                            <h4 class="font-bold text-gray-800"><a href="user-profile.html?id=${post.userId}" class="font-bold hover:underline">
    ${post.User?.username || 'user'}
</a></h4>
                            <p class="text-[10px] text-gray-400">${new Date(post.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="text-gray-700 mb-4">${post.content}</div>
                    ${post.image ? `<img src="${post.image}" class="rounded-xl w-full mb-4 border">` : ''}
                    
                    <div class="flex items-center gap-6 py-3 border-t border-b border-gray-50 mb-4">
                        <button onclick="toggleLike(${post.id})" class="flex items-center gap-1 ${likeColor} transition hover:scale-110">
                            <span>${likeButtonHTML}</span>
                            <span class="text-sm font-medium">${post.Likes?.length || 0}</span>
                        </button>
                        <div class="flex items-center gap-1 text-gray-500">
                            💬 <span class="text-sm font-medium">${post.Comments?.length || 0} Comments</span>
                        </div>
                    </div>

                    <div id="comment-list-${post.id}" class="space-y-1">
                        ${displayComments.map(c => formatComment(c)).join('')}
                    </div>

                    ${hasMoreComments ? `
                        <button onclick="toggleComments(${post.id}, this)" class="text-xs text-indigo-500 font-semibold mt-2 mb-4 hover:underline">
                            View all ${post.Comments.length} comments
                        </button>
                    ` : '<div class="mb-4"></div>'}

                    <div class="flex gap-2 border-t pt-4">
                        <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..." 
                               class="flex-1 bg-gray-100 p-2 rounded-full text-sm outline-none px-4 focus:ring-1 focus:ring-indigo-300">
                        <button onclick="addComment(${post.id})" class="text-indigo-600 font-bold text-sm px-2">Send</button>
                    </div>
                </div>`;
        });
    } catch (err) {
        console.error("Error loading posts:", err);
    }
}

// Post တွေကို Render လုပ်တဲ့အပိုင်းကို function သီးသန့်ထုတ်လိုက်ရင် ပိုကောင်းတယ်
function renderPosts(posts) {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';

    posts.forEach(post => {
        const isLiked = post.Likes?.some(like => Number(like.userId) === Number(user.id));
        const likeColor = isLiked ? 'text-red-500' : 'text-gray-500';
        const likeButtonHTML = isLiked
            ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-red-500"><path d="m11.645 20.91l-.007-.003l-.022-.012a15.247 15.247 0 0 1-.383-.218a25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25C2.25 5.322 4.714 3 7.5 3c1.557 0 3.046.716 4 1.967C12.454 3.716 13.943 3 15.5 3c2.786 0 5.25 2.322 5.25 5.25c0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17a15.247 15.247 0 0 1-.383.219l-.022.012l-.007.004l-.003.001Z" /></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-gray-500"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>`;

        const displayComments = post.Comments ? post.Comments.slice(0, 2) : [];
        const hasMoreComments = post.Comments?.length > 2;

        feed.innerHTML += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                    <div class="flex items-center gap-3 mb-4">
                        <img src="${post.User?.avatar || '/uploads/default.png'}" class="w-10 h-10 rounded-full object-cover border">
                        <div>
                            <h4 class="font-bold text-gray-800"><a href="user-profile.html?id=${post.userId}" class="font-bold hover:underline">
    ${post.User?.username || 'user'}
</a></h4>
                            <p class="text-[10px] text-gray-400">${new Date(post.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="text-gray-700 mb-4">${post.content}</div>
                    ${post.image ? `<img src="${post.image}" class="rounded-xl w-full mb-4 border">` : ''}
                    
                    <div class="flex items-center gap-6 py-3 border-t border-b border-gray-50 mb-4">
                        <button onclick="toggleLike(${post.id})" class="flex items-center gap-1 ${likeColor} transition hover:scale-110">
                            <span>${likeButtonHTML}</span>
                            <span class="text-sm font-medium">${post.Likes?.length || 0}</span>
                        </button>
                        <div class="flex items-center gap-1 text-gray-500">
                            💬 <span class="text-sm font-medium">${post.Comments?.length || 0} Comments</span>
                        </div>
                    </div>

                    <div id="comment-list-${post.id}" class="space-y-1">
                        ${displayComments.map(c => formatComment(c)).join('')}
                    </div>

                    ${hasMoreComments ? `
                        <button onclick="toggleComments(${post.id}, this)" class="text-xs text-indigo-500 font-semibold mt-2 mb-4 hover:underline">
                            View all ${post.Comments.length} comments
                        </button>
                    ` : '<div class="mb-4"></div>'}

                    <div class="flex gap-2 border-t pt-4">
                        <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..." 
                               class="flex-1 bg-gray-100 p-2 rounded-full text-sm outline-none px-4 focus:ring-1 focus:ring-indigo-300">
                        <button onclick="addComment(${post.id})" class="text-indigo-600 font-bold text-sm px-2">Send</button>
                    </div>
                </div>`;
    });
}
function toggleComments(postId, btn) {
    const post = window.allPosts.find(p => p.id === postId);
    const commentListDiv = document.getElementById(`comment-list-${postId}`);

    if (btn.innerText.includes("View all")) {
        commentListDiv.innerHTML = post.Comments.map(c => formatComment(c)).join('');
        btn.innerText = "See less";
    } else {
        commentListDiv.innerHTML = post.Comments.slice(0, 2).map(c => formatComment(c)).join('');
        btn.innerText = `View all ${post.Comments.length} comments`;
    }
}

const formatComment = (c) => `
    <div class="flex items-start gap-2 mb-3 animate-fade-in">
        <img src="${c.User?.avatar || '/uploads/default.png'}" class="w-8 h-8 rounded-full object-cover border border-gray-100">
        <div class="bg-gray-100 p-2 px-3 rounded-2xl text-sm max-w-[85%]">
            <span class="font-bold text-gray-900 block text-xs">${c.User ? c.User.username : 'unknown'}</span> 
            <div class="text-gray-700">${c.text}</div>
        </div>
    </div>
`;

async function toggleLike(postId) {
    const token = localStorage.getItem('token');
    await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    loadPosts();
}

async function addComment(postId) {
    const text = document.getElementById(`comment-input-${postId}`).value;
    if (!text) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text })
    });
    loadPosts();
}

async function searchUsers() {
    const query = document.getElementById('searchUser').value;
    const res = await fetch(`/api/users/search?username=${query}`);
    const users = await res.json();
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = users.map(u => `
        <div class="p-3 border border-gray-100 rounded-lg bg-gray-50 mb-2">
            <strong class="text-indigo-600">${u.username}</strong>
            <p class="text-sm text-gray-600">${u.bio || 'No bio available'}</p>
        </div>
    `).join('') || '<p>No users found.</p>';
}

async function submitPost() {
    const content = document.getElementById('postContent').value;
    const imageFile = document.getElementById('postImage').files[0];
    if (!content && !imageFile) return;

    const formData = new FormData();
    formData.append('content', content);
    if (imageFile) formData.append('image', imageFile);

    await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
        body: formData
    });
    location.reload();
}

const postImageInput = document.getElementById('postImage');
if (postImageInput) {
    postImageInput.addEventListener('change', function (e) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('image-preview').src = e.target.result;
            document.getElementById('image-preview-container').classList.remove('hidden');
        };
        if (this.files[0]) reader.readAsDataURL(this.files[0]);
    });
}

function clearPreview() {
    document.getElementById('postImage').value = "";
    document.getElementById('image-preview-container').classList.add('hidden');
}

// User List (Dashboard sidebar)
async function loadUserList() {
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/users/all', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await res.json();
        const userListContainer = document.getElementById('user-list');
        if (!userListContainer) return;

        userListContainer.innerHTML = '';

        // Online users ကို ထိပ်ဆုံးပို့မယ်
        users.sort((a, b) => activeUsers.includes(Number(b.id)) - activeUsers.includes(Number(a.id)));

        users.forEach(u => {
            if (Number(u.id) === Number(user.id)) return;
            const isOnline = activeUsers.includes(Number(u.id));
            const count = unreadCounts[Number(u.id)] || 0;
            // badgeClass ကို empty string အစား hidden/block နဲ့ သေသေချာချာ ခွဲလိုက်ပါ
            const badgeDisplay = count > 0 ? 'flex' : 'hidden';

            const userItem = `
                <div onclick="openPrivateChat(${u.id}, '${u.username}')" 
                     class="flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-2xl cursor-pointer transition-all">
                    <div class="relative">
                        <img src="${u.avatar || '/uploads/default.png'}" class="w-11 h-11 rounded-full object-cover">
                        <div class="absolute bottom-0 right-0 w-3 h-3 ${isOnline ? 'bg-green-500' : 'bg-gray-300'} border-2 border-white rounded-full"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-800 truncate">${u.username}</p>
                        <p class="text-[11px] text-gray-500 truncate">${isOnline ? 'Active Now' : (u.bio || 'Offline')}</p>
                    </div>
                    <div id="unread-${u.id}" class="${badgeDisplay} bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] items-center justify-center rounded-full shadow-sm">
        ${count}
    </div>
                </div>`;
            userListContainer.insertAdjacentHTML('beforeend', userItem);
        });
    } catch (err) {
        console.error("User list error:", err);
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}



function filterUserList(query) {
    const term = query.toLowerCase().trim();
    const userItems = document.querySelectorAll('#user-list > div');

    userItems.forEach(item => {
        const username = item.querySelector('p.font-bold').innerText.toLowerCase();
        if (username.includes(term)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}
function searchPosts(query) {
    const term = query.toLowerCase().trim();
    const feed = document.getElementById('feed');

    // window.allPosts ထဲမှာ ရှိပြီးသား Post တွေကို Filter လုပ်မယ်
    if (!window.allPosts) return;

    const filtered = window.allPosts.filter(post =>
        post.content.toLowerCase().includes(term) ||
        post.User.username.toLowerCase().includes(term)
    );
    console.log("Filtered posts:", filtered);
    // Filter ဖြစ်သွားတဲ့ Post တွေကိုပဲ Feed မှာ ပြန်ပြမယ်
    renderPosts(filtered);
}
// Search လုပ်ပြီးရင် Result box ကို ပြန်ပိတ်ဖို့
function clearNavSearch() {
    document.getElementById('nav-search-input').value = '';
    const resultsDiv = document.getElementById('nav-search-results');
    resultsDiv.innerHTML = '';
    resultsDiv.classList.add('hidden');
}

// Profile ကနေလာတဲ့ Chat Link ကို စစ်ဆေးပေးမယ့် Function
async function checkAutoChat() {
    const urlParams = new URLSearchParams(window.location.search);
    const chatWithId = urlParams.get('chatWith');

    if (chatWithId) {
        // အစ်ကို့ Code ထဲက User List ရောက်တဲ့အထိ ခဏစောင့်မယ်
        let retryCount = 0;
        const checkExist = setInterval(async () => {
            // User list ထဲမှာ အဲဒီ user ရှိမရှိ အရင်ကြည့်မယ်
            const res = await fetch(`/api/users/${chatWithId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();

            if (data.user) {
                console.log("Auto opening chat with:", data.user.username);
                // အစ်ကို့ဆီမှာ ရှိပြီးသား openPrivateChat ကို လှမ်းခေါ်လိုက်တာပါ
                openPrivateChat(data.user.id, data.user.username);
                clearInterval(checkExist);

                // URL က parameter ကို ပြန်ဖျက်ထုတ်လိုက်မယ် (Refresh လုပ်ရင် ထပ်ခါထပ်ခါ မပွင့်အောင်)
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            if (++retryCount > 5) clearInterval(checkExist); // ၅ ကြိမ်ထိ ရှာမတွေ့ရင် ရပ်မယ်
        }, 500);
    }
}





// Result Box ပြင်ပကို နှိပ်ရင် ပိတ်သွားအောင်
document.addEventListener('click', (e) => {
    const resultsDiv = document.getElementById('nav-search-results');
    const searchInput = document.getElementById('nav-search-input');
    if (!resultsDiv.contains(e.target) && e.target !== searchInput) {
        resultsDiv.classList.add('hidden');
    }
});
// document.addEventListener('DOMContentLoaded', initDashboard);