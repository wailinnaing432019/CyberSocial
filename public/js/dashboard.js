let user = null;
async function initDashboard() {
    const token = localStorage.getItem('token');
    if (!token) return window.location.href = 'index.html';

    // ကိုယ့် Profile Info ကို Navbar မှာ ပြဖို့
    const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    user = await res.json();
    console.log("Logged in user:", user);
    document.getElementById('welcome-text').innerText = `${user.username}`;
    document.getElementById('nav-avatar').src = user.avatar || '/uploads/default.png';

    loadPosts();
    loadUserList();
}

// "View All / See Less" Toggle Function
function toggleComments(postId, btn) {
    const post = window.allPosts.find(p => p.id === postId);
    const commentListDiv = document.getElementById(`comment-list-${postId}`);

    if (btn.innerText.includes("View all")) {
        const allCommentsHTML = post.Comments.map(c => `
            <div class="flex items-start gap-2 mb-3 animate-fade-in">
                <img src="${c.User?.avatar || '/uploads/default.png'}" class="w-8 h-8 rounded-full object-cover border border-gray-100">
                <div class="bg-gray-100 p-2 px-3 rounded-2xl text-sm max-w-[85%]">
                    <span class="font-bold text-gray-900 block text-xs">${c.User ? c.User.username : 'unknown'}</span> 
                    <div class="text-gray-700">${c.text}</div>
                </div>
            </div>
        `).join('');

        commentListDiv.innerHTML = allCommentsHTML;
        btn.innerText = "See less";
    } else {
        const displayComments = post.Comments.slice(0, 2);
        const minimalHTML = displayComments.map(c => `
            <div class="flex items-start gap-2 mb-3">
                <img src="${c.User?.avatar || '/uploads/default.png'}" class="w-8 h-8 rounded-full object-cover border border-gray-100">
                <div class="bg-gray-100 p-2 px-3 rounded-2xl text-sm max-w-[85%]">
                    <span class="font-bold text-gray-900 block text-xs">${c.User ? c.User.username : 'unknown'}</span> 
                    <div class="text-gray-700">${c.text}</div>
                </div>
            </div>
        `).join('');

        commentListDiv.innerHTML = minimalHTML;
        btn.innerText = `View all ${post.Comments.length} comments`;
    }
}

// Comment တစ်ခုချင်းစီကို HTML ပြောင်းခြင်း (Avatar ပါဝင်သော Facebook Style)
const formatComment = (c) => `
    <div class="flex items-start gap-2 mb-3 animate-fade-in">
        <img src="${c.User?.avatar || '/uploads/default.png'}" class="w-8 h-8 rounded-full object-cover border border-gray-100">
        <div class="bg-gray-100 p-2 px-3 rounded-2xl text-sm max-w-[85%]">
            <span class="font-bold text-gray-900 block text-xs">${c.User ? c.User.username : 'unknown'}</span> 
            <div class="text-gray-700">${c.text}</div>
        </div>
    </div>
`;

async function loadPosts() {
    if (!user) {
        console.log("Waiting for user data...");
        return;
    }
    try {
        const res = await fetch('/api/posts');
        const posts = await res.json();

        // အောက်က showAllComments function အတွက် posts တွေကို global သိမ်းထားခြင်း
        window.allPosts = posts;

        const feed = document.getElementById('feed');
        feed.innerHTML = '';
        const currentUserId = user.id;
        console.log("Current User ID:", currentUserId);

        posts.forEach(post => {
            // Like Logic
            const isLiked = post.Likes?.some(like => like.userId === currentUserId);
            const likeColor = isLiked ? 'text-red-500' : 'text-gray-500';
            const likeButtonHTML = isLiked
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-red-500"><path d="m11.645 20.91l-.007-.003l-.022-.012a15.247 15.247 0 0 1-.383-.218a25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25C2.25 5.322 4.714 3 7.5 3c1.557 0 3.046.716 4 1.967C12.454 3.716 13.943 3 15.5 3c2.786 0 5.25 2.322 5.25 5.25c0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17a15.247 15.247 0 0 1-.383.219l-.022.012l-.007.004l-.003.001Z" /></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-gray-500"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>`;

            // Comment UI Logic: ၂ ခုပဲ အရင်ပြမယ်
            const displayComments = post.Comments ? post.Comments.slice(0, 2) : [];
            const hasMoreComments = post.Comments?.length > 2;

            const commentsHTML = displayComments.map(c => formatComment(c)).join('');

            feed.innerHTML += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                    <div class="flex items-center gap-3 mb-4">
                        <img src="${post.User?.avatar || '/uploads/default.png'}" class="w-10 h-10 rounded-full object-cover border">
                        <div>
                            <h4 class="font-bold text-gray-800">${post.User?.username || 'user'}</h4>
                            <p class="text-[10px] text-gray-400">${new Date(post.createdAt).toLocaleString()}</p>
                        </div>
                    </div>

                    <div class="text-gray-700 leading-relaxed mb-4">
                        ${post.content} 
                    </div>

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
                        ${commentsHTML}
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
                </div>
            `;
        });
    } catch (err) {
        console.error("Error loading posts:", err);
    }
}

// "View All" နှိပ်ရင် အကုန်ပြမယ့် function
function showAllComments(postId, btn) {
    const post = window.allPosts.find(p => p.id === postId);
    const commentListDiv = document.getElementById(`comment-list-${postId}`);

    const allCommentsHTML = post.Comments.map(c => `
        <div class="bg-gray-50 p-2 rounded-lg text-sm mb-2 animate-fade-in">
            <span class="font-bold text-indigo-600">${c.User ? c.User.username : 'unknown'}:</span> 
            ${c.text}
        </div>
    `).join('');

    commentListDiv.innerHTML = allCommentsHTML;
    btn.remove(); // "View all" ခလုတ်ကို ဖျက်လိုက်မယ်
}
async function toggleLike(postId) {
    const token = localStorage.getItem('token');
    await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    loadPosts(); // UI Update ဖြစ်အောင်
}

async function addComment(postId) {
    const text = document.getElementById(`comment-input-${postId}`).value;
    const token = localStorage.getItem('token');

    await fetch(`/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text })
    });
    loadPosts();
}
// SQL Injection Vulnerable Search
async function searchUsers() {
    const query = document.getElementById('searchUser').value;
    const res = await fetch(`/api/users/search?username=${query}`);
    const users = await res.json();

    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '';

    if (users.length > 0) {
        users.forEach(u => {
            resultsDiv.innerHTML += `
    <div class="p-3 border border-gray-100 rounded-lg bg-gray-50 mb-2">
        <strong class="text-indigo-600">${u.username}</strong>
        <p class="text-sm text-gray-600">${u.bio || 'No bio available'}</p>
    </div>`;
        });
    } else {
        resultsDiv.innerHTML = '<p>No users found.</p>';
    }
}
// async function loadPosts() {
//     const res = await fetch('/api/posts');
//     const posts = await res.json();
//     const feed = document.getElementById('feed');
//     feed.innerHTML = '';

//     posts.forEach(post => {
//         const postEl = document.createElement('div');
//         postEl.className = 'post-card';
//         // ❌ Vulnerable line: Using innerHTML allows <script> tags to run
//         postEl.innerHTML = `
//             <strong>${post.User.username}</strong>
//             <p>${post.content}</p> 
//             <small>${new Date(post.createdAt).toLocaleString()}</small>
//         `;
//         feed.appendChild(postEl);
//     });
// }

async function submitPost() {
    const content = document.getElementById('postContent').value;
    const imageFile = document.getElementById('postImage').files[0];
    const token = localStorage.getItem('token');

    const formData = new FormData();
    formData.append('content', content);
    if (imageFile) formData.append('image', imageFile);

    await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }, // Content-Type မထည့်ရပါ (Multer က ကိုင်တွယ်မှာမို့လို့)
        body: formData
    });

    location.reload(); // Refresh to see new post
}

// Post ဖျက်တဲ့ function
async function deletePost(postId) {
    if (!confirm("Are you sure?")) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    location.reload();
}
async function loadUsers() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await res.json();
    const list = document.getElementById('user-list');

    users.forEach(user => {
        // ကိုယ့်နာမည်ကိုယ် ပြန်မပြအောင် စစ်မယ် (ဥပမာ currentUserId ရှိရင်)
        const userDiv = `
            <div onclick="startChat(${user.id}, '${user.username}')" 
                 class="flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-xl cursor-pointer transition">
                <img src="${user.avatar || '/uploads/default.png'}" class="w-10 h-10 rounded-full border">
                <div>
                    <p class="text-sm font-bold text-gray-800">${user.username}</p>
                    <p class="text-xs text-gray-400">Online</p>
                </div>
            </div>
        `;
        list.innerHTML += userDiv;
    });
}

async function loadUserList() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/users/all', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await res.json();
        const userListContainer = document.getElementById('user-list');
        userListContainer.innerHTML = ''; // အရင်ရှင်းမယ်

        users.forEach(user => {
            const userItem = `
                <div onclick="openPrivateChat(${user.id}, '${user.username}')" 
                     class="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition group">
                    <div class="relative">
                        <img src="${user.avatar || '/uploads/default.png'}" class="w-11 h-11 rounded-full object-cover border border-gray-200">
                        <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-800 truncate">${user.username}</p>
                        <p class="text-xs text-gray-500 truncate">${user.bio || 'Say hi!'}</p>
                    </div>
                </div>
            `;
            userListContainer.innerHTML += userItem;
        });
    } catch (err) {
        console.error("User list error:", err);
    }
}

document.addEventListener('DOMContentLoaded', loadUsers);
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}