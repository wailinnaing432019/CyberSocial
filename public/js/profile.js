let user = null;
async function loadProfile() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    user = await res.json();

    document.getElementById('bioInput').value = user.bio || '';
    document.getElementById('current-avatar').src = user.avatar || '/uploads/default.png';
}

async function updateProfile() {
    const bio = document.getElementById('bioInput').value;
    const avatarFile = document.getElementById('avatarInput').files[0];
    const token = localStorage.getItem('token');

    const formData = new FormData();
    formData.append('bio', bio);
    if (avatarFile) formData.append('avatar', avatarFile);

    const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });

    if (res.ok) {
        alert("Profile updated!");
        location.reload();
    }
}

function toggleCommentsUI(postId) {
    const section = document.getElementById(`comment-section-${postId}`);
    const list = document.getElementById(`comment-list-${postId}`);

    // ပိတ်ထားရင် ဖွင့်မယ်၊ ဖွင့်ထားရင် ပိတ်မယ်
    if (section.classList.contains('hidden')) {
        section.classList.remove('hidden');

        // Post data ကို ရှာပြီး comment list ဆွဲထုတ်မယ်
        const post = window.allMyPosts.find(p => p.id === postId);

        if (post && post.Comments) {
            list.innerHTML = post.Comments.map(c => `
                <div class="flex items-start gap-2 mb-3">
                    <img src="${c.User?.avatar || '/uploads/default.png'}" class="w-7 h-7 rounded-full border">
                    <div class="bg-gray-100 p-2 px-3 rounded-2xl text-xs">
                        <span class="font-bold text-gray-900 block">@${c.User?.username || 'unknown'}</span>
                        <div class="text-gray-700">${c.text}</div>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = `<p class="text-[10px] text-gray-400">No comments yet.</p>`;
        }
    } else {
        section.classList.add('hidden');
    }
}
async function toggleLike(postId) {
    const token = localStorage.getItem('token');
    await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    loadMyPosts(); // UI Update ဖြစ်အောင်
}
async function loadMyPosts() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/posts/my-posts', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const posts = await res.json();
    window.allMyPosts = posts; // Global သိမ်းမယ်
    const feed = document.getElementById('my-posts-feed');
    feed.innerHTML = '';

    posts.forEach(post => {
        const isLiked = post.Likes?.some(l => l.userId === user.id);
        const likeIcon = isLiked ? '❤️' : '🤍';
        const likeColor = isLiked ? 'text-red-500' : 'text-gray-500';

        feed.innerHTML += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border mb-6" id="post-card-${post.id}">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        <img src="${user.avatar || '/uploads/default.png'}" class="w-9 h-9 rounded-full border">
                        <div>
                            <h4 class="font-bold text-sm text-gray-800">@${user.username}</h4>
                            <p class="text-[10px] text-gray-400">${new Date(post.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="editPostUI(${post.id})" class="p-2 text-gray-400 hover:text-indigo-500 transition rounded-full hover:bg-indigo-50">
                            ✏️
                        </button>
                        <button onclick="deletePost(${post.id})" class="p-2 text-gray-400 hover:text-red-500 transition rounded-full hover:bg-red-50">
                            🗑️
                        </button>
                    </div>
                </div>

                <div id="content-${post.id}" class="text-gray-700 text-sm mb-3 whitespace-pre-wrap">${post.content}</div>
                ${post.image ? `<img src="${post.image}" class="rounded-xl w-full mb-3 border">` : ''}

                <div class="flex items-center gap-6 py-3 border-t border-b border-gray-50 mb-3">
                    <button onclick="toggleLike(${post.id})" class="flex items-center gap-1 ${likeColor} transition">
                        <span>${likeIcon}</span> <span class="text-xs font-medium">${post.Likes?.length || 0}</span>
                    </button>
                    <button onclick="toggleCommentsUI(${post.id})" class="flex items-center gap-1 text-gray-500">
                        💬 <span class="text-xs font-medium">${post.Comments?.length || 0} Comments</span>
                    </button>
                </div>

                <div id="comment-section-${post.id}" class="hidden space-y-2 mb-4">
                    <div id="comment-list-${post.id}" class="max-h-40 overflow-y-auto">
                        </div>
                </div>
            </div>
        `;
    });
}

async function deletePost(postId) {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const token = localStorage.getItem('token');
    const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        loadMyPosts(); // list ကို ပြန် update လုပ်မယ်
    }
}

function editPostUI(postId) {
    const contentDiv = document.getElementById(`content-${postId}`);
    const oldText = contentDiv.innerText;

    contentDiv.innerHTML = `
        <textarea id="edit-input-${postId}" class="w-full p-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500">${oldText}</textarea>
        <div class="flex gap-2 mt-2">
            <button onclick="saveEdit(${postId})" class="bg-indigo-600 text-white px-3 py-1 rounded-md text-xs">Save</button>
            <button onclick="loadMyPosts()" class="bg-gray-200 px-3 py-1 rounded-md text-xs">Cancel</button>
        </div>
    `;
}

async function saveEdit(postId) {
    const newContent = document.getElementById(`edit-input-${postId}`).value;
    const token = localStorage.getItem('token');

    await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newContent })
    });
    loadMyPosts();
}
// loadProfile() ထဲမှာ loadMyPosts() ကိုပါ တွဲခေါ်ပေးပါ
async function init() {
    console.log("Initializing Profile and Posts...");
    await loadProfile();
    await loadMyPosts();
}