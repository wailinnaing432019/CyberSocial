// chat.js
let currentChatMode = 'community';
let chatPartnerId = null;
let isEditing = false;
let typingTimeout;

function setupSocketListeners() {
    if (!socket) return;

    // Double Listeners မဖြစ်အောင် အရင်ရှင်းတယ်
    socket.off('receive_message');
    socket.off('message_edited');
    socket.off('message_deleted');
    socket.off('display_typing');
    socket.off('hide_typing');

    // ၁။ စာအသစ်ဝင်လာခြင်း
    socket.on('receive_message', (data) => {
        const isMe = (user && Number(data.userId) === Number(user.id));

        // ၁။ ကိုယ်ပို့တဲ့စာဆိုရင် Badge လုံးဝမတိုးဘူး၊ Screen မှာပဲ စာပြမယ်
        if (isMe) {
            let currentRoom = (currentChatMode === 'private' && chatPartnerId)
                ? [Number(user.id), Number(chatPartnerId)].sort((a, b) => a - b).join('_')
                : 'community';
            if (data.room === currentRoom) displayMessage({ ...data, isMe: true });
            return;
        }

        // ၂။ လက်ရှိ ကိုယ်ဖွင့်ထားတဲ့ Chat Room ကို တွက်မယ်
        let activeRoom = (currentChatMode === 'private' && chatPartnerId)
            ? [Number(user.id), Number(chatPartnerId)].sort((a, b) => a - b).join('_')
            : 'community';

        // ၃။ Case: စာဝင်လာပေမယ့် ကိုယ်က တခြားနေရာရောက်နေရင် (Badge တိုးမယ်)
        if (data.room !== activeRoom && data.room !== 'community') {
            const senderId = Number(data.userId);

            // Local variable ထဲမှာ count ကို အရင်တိုးမယ်
            unreadCounts[senderId] = (unreadCounts[senderId] || 0) + 1;

            // 🔥 ဒီနေရာက Real-time UI Update လုပ်တဲ့ အပိုင်းပါ
            const badgeEl = document.getElementById(`unread-${senderId}`);
            if (badgeEl) {
                badgeEl.innerText = unreadCounts[senderId]; // နံပါတ်ကို ချက်ချင်းပြောင်းမယ်
                badgeEl.classList.remove('hidden');       // hidden ဖြစ်နေရင် ဖော်လိုက်မယ်
                badgeEl.classList.add('flex');            // flex ပြန်လုပ်မယ်
            }
        }
        // ၄။ Case: ကိုယ်က အဲဒီ Chat Window ကို ဖွင့်ထားရင် (စာပြမယ် + Seen လုပ်မယ်)
        if (data.room === activeRoom) {
            displayMessage({ ...data, isMe: false });

            // ဖွင့်ထားတဲ့ Chat မို့လို့ Badge ကို သုညလုပ်ပြီး ဖျောက်မယ်
            unreadCounts[data.userId] = 0;
            const badgeEl = document.getElementById(`unread-${data.userId}`);
            if (badgeEl) {
                badgeEl.classList.add('hidden');
                badgeEl.classList.remove('flex');
            }

            // DB update & socket emit
            fetch(`/api/chat/seen/${activeRoom}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            socket.emit('message_read', { room: activeRoom, readerId: user.id });
        }
    });
    socket.on('unread_update', (data) => {
        console.log("🔔 New message notification for badge:", data);

        // ၁။ Global unreadCounts ကို update လုပ်မယ်
        const senderId = Number(data.senderId);
        unreadCounts[senderId] = (unreadCounts[senderId] || 0) + 1;

        // ၂။ UI မှာရှိတဲ့ Badge ကို ချက်ချင်း တိုးခိုင်းမယ်
        const badgeEl = document.getElementById(`unread-${senderId}`);
        if (badgeEl) {
            badgeEl.innerText = unreadCounts[senderId];
            badgeEl.classList.remove('hidden');
            badgeEl.classList.add('flex');
        }
    });


    // ၂။ စာပြင်ခြင်း (Edit)
    socket.on('message_edited', (data) => {
        const msgWrapper = document.querySelector(`#msg-${data.messageId}`);
        if (msgWrapper) {
            const msgTextSpan = msgWrapper.querySelector('.message-text');
            if (msgTextSpan) {
                msgTextSpan.innerText = data.newText;
                let editedLabel = msgWrapper.querySelector('.italic');
                const timeStr = data.updatedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                if (editedLabel) {
                    editedLabel.innerText = `(edited ${timeStr})`;
                } else {
                    msgTextSpan.insertAdjacentHTML('afterend', `
                        <span class="text-[8px] opacity-60 italic ml-1">(edited ${timeStr})</span>
                    `);
                }
            }
        }
    });

    // ၃။ စာဖျက်ခြင်း (Delete)
    socket.on('message_deleted', (data) => {
        const el = document.getElementById(`msg-${data.messageId}`);
        if (el) {
            el.classList.add('opacity-0', 'scale-95');
            setTimeout(() => el.remove(), 300);
        }
    });

    // ၄။ Typing Indicator
    socket.on('display_typing', (data) => {
        const indicator = document.getElementById('typing-indicator');
        const typingText = document.getElementById('typing-text');
        if (data.sender !== user.username) {
            typingText.innerText = `${data.sender} is typing...`;
            indicator.classList.remove('hidden');
            const chatBox = document.getElementById('chat-box');
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    });

    socket.on('hide_typing', () => {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.classList.add('hidden');
    });

    // ၁။ Message အသစ်ရောက်လာရင် delivered ဖြစ်ကြောင်း ပြန်ပြောမယ်
    socket.on('receive_private_message', (msg) => {
        socket.emit('message_delivered', { messageId: msg.id, senderId: msg.senderId });
        // Chat window ပွင့်နေရင် seen လို့ပါ တန်းပို့မယ်
        if (activeChatUserId === msg.senderId) {
            socket.emit('message_seen', { messageId: msg.id, senderId: msg.senderId });
        }
    });

    socket.on('update_seen_ui', ({ room }) => {
        // လက်ရှိ Client မှာ ဘယ် Room ဖွင့်ထားလဲ တွက်မယ်
        let currentRoom = 'community';
        if (currentChatMode === 'private' && chatPartnerId) {
            currentRoom = [Number(user.id), Number(chatPartnerId)].sort((a, b) => a - b).join('_');
        }
        // လက်ရှိ ပွင့်နေတဲ့ room ဆိုရင် အမှန်ခြစ်တွေ အပြာရောင်ပြောင်း
        if (currentRoom === room) {
            document.querySelectorAll('.tick-icon').forEach(tick => {
                tick.innerHTML = '✔✔';
                tick.classList.replace('text-gray-400', 'text-blue-500');
            });
        }
    });
}

// --- Chat Input & Actions ---

function handleChatKeydown(e) {
    const roomName = currentChatMode === 'community' ? 'community' : [Number(user.id), Number(chatPartnerId)].sort((a, b) => a - b).join('_');

    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
        socket.emit('stop_typing', { room: roomName });
        clearTimeout(typingTimeout);
        return;
    }

    socket.emit('typing', { room: roomName, sender: user.username });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', { room: roomName });
    }, 2000);
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    const imageUrl = document.getElementById('pending-image-url').value;
    const messageId = document.getElementById('edit-message-id').value;

    if (!text && !imageUrl) return;

    let roomName = currentChatMode === 'community' ? 'community' : [Number(user.id), Number(chatPartnerId)].sort((a, b) => a - b).join('_');

    if (isEditing) {
        socket.emit('edit_message', { messageId, newText: text, userId: user.id, room: roomName });
        cancelEdit();
    } else {
        socket.emit('chat_message', {
            room: roomName,
            userId: user.id,
            avatar: user.avatar,
            sender: user.username,
            text: text,
            image: imageUrl,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        input.value = '';
        input.style.height = '36px';
        clearChatPreview();
    }
}

// --- Edit & Delete Functions ---

function prepareEdit(msgId) {
    const msgElement = document.querySelector(`#msg-${msgId} .message-text`);
    let text = msgElement.innerText.trim();

    isEditing = true;
    const input = document.getElementById('chat-input');
    input.value = text;
    input.focus();
    input.style.height = input.scrollHeight + 'px';

    document.getElementById('edit-message-id').value = msgId;
    document.getElementById('edit-mode-indicator').classList.remove('hidden');
}

function cancelEdit() {
    isEditing = false;
    document.getElementById('chat-input').value = '';
    document.getElementById('edit-message-id').value = '';
    document.getElementById('edit-mode-indicator').classList.add('hidden');
}

function deleteMsg(messageId, room) {
    if (confirm("Delete this message?")) {
        socket.emit('delete_message', { messageId, userId: user.id, room });
    }
}

// --- Room Management ---

async function openPrivateChat(userId, username) {
    currentChatMode = 'private';
    chatPartnerId = Number(userId);

    document.getElementById('chat-target-name').innerText = "Chat with " + username;
    document.getElementById('private-chat-banner').classList.remove('hidden');
    document.getElementById('chat-box').innerHTML = '';

    const widget = document.getElementById('chat-widget');
    widget.classList.remove('translate-y-[336px]');

    // ၁။ Global variable ထဲမှာ count ကို သုည ပြန်လုပ်မယ်
    unreadCounts[chatPartnerId] = 0;

    // ၂။ UI မှာရှိတဲ့ အနီရောင် Badge လေးကို ဖျောက်မယ်
    const badgeEl = document.getElementById(`unread-${chatPartnerId}`);
    if (badgeEl) {
        badgeEl.innerText = '0';
        badgeEl.classList.add('hidden');
        badgeEl.classList.remove('flex');
    }
    const roomName = [Number(user.id), Number(userId)].sort((a, b) => a - b).join('_');

    // ၁။ DB မှာ seen status သွားပြင်မယ်
    await fetch(`/api/chat/seen/${roomName}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    // ၂။ တစ်ဖက်လူကို Socket ကနေ လှမ်းပြောမယ် (မင်းပို့ထားတဲ့စာ ငါဖတ်လိုက်ပြီ)
    socket.emit('message_read', { room: roomName, readerId: user.id });

    socket.emit('join_room', roomName);

    // Chat ဖွင့်လိုက်ရင် Badge ဖြုတ်မယ်
    if (typeof unreadCounts !== 'undefined') {
        unreadCounts[chatPartnerId] = 0;
        if (typeof updateUnreadBadge === 'function') {
            updateUnreadBadge(chatPartnerId);
        }
    }

    loadChatHistory(roomName);
}

function switchToCommunity() {
    currentChatMode = 'community';
    chatPartnerId = null;
    document.getElementById('chat-target-name').innerText = "Community Chat";
    document.getElementById('private-chat-banner').classList.add('hidden');
    document.getElementById('chat-box').innerHTML = '';
    socket.emit('join_room', 'community');
    loadChatHistory('community');
}

// --- History & UI ---


async function loadChatHistory(roomName) {
    const token = localStorage.getItem('token');
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '<p class="text-center text-[10px] text-gray-400 p-4">Loading history...</p>';

    try {
        const res = await fetch(`/api/users/chat-history/${roomName}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await res.json();
        chatBox.innerHTML = '';

        messages.forEach(msg => {
            displayMessage({
                id: msg.id,
                text: msg.text,
                sender: msg.sender.username,
                avatar: msg.sender.avatar,
                image: msg.image,
                isEdited: msg.isEdited,
                status: msg.status,
                seenBy: msg.seenBy,
                isMe: Number(msg.senderId) === Number(user.id),
                time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        });
    } catch (err) {
        console.error("History error:", err);
    }
}

function displayMessage(data) {
    const chatBox = document.getElementById('chat-box');
    const msgId = data.id;
    const roomName = currentChatMode === 'community' ? 'community' : [Number(user.id), Number(chatPartnerId)].sort((a, b) => a - b).join('_');

    const hasText = data.text && data.text.trim().length > 0;
    const hasImage = !!data.image;

    // --- Status Ticks Logic ---
    let statusTicks = '';
    if (data.isMe && currentChatMode !== 'community') {
        const tickClass = data.status === 'seen' ? 'text-blue-400' : 'text-gray-400';
        const ticks = data.status === 'seen' ? '✔✔' : '✔';
        statusTicks = `<span id="tick-${msgId}" class="tick-icon ${tickClass} ml-1 font-bold">${ticks}</span>`;
    }

    const editBtn = (data.isMe && hasText) ? `<button onclick="prepareEdit(${msgId})" class="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-indigo-500"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>` : '';
    const deleteBtn = data.isMe ? `<button onclick="deleteMsg(${msgId}, '${roomName}')" class="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-red-500"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>` : '';

    const bubbleClass = hasText ? (data.isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none') : '';

    const html = `
        <div id="msg-${msgId}" class="flex ${data.isMe ? 'justify-end' : 'justify-start'} mb-2 group">
            <div class="flex ${data.isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-1 max-w-[85%]">
                <img src="${data.avatar || '/uploads/default.png'}" class="w-6 h-6 rounded-full border shadow-sm flex-shrink-0">
                <div class="flex flex-col ${data.isMe ? 'items-end' : 'items-start'}">
                    <div class="${bubbleClass} rounded-2xl shadow-sm text-[11px] overflow-hidden relative">
                        ${hasImage ? `<img src="${data.image}" class="w-full max-w-[200px] block cursor-pointer" onclick="window.open('${data.image}', '_blank')">` : ''}
                        ${hasText ? `<div class="p-2 px-3"><span class="message-text">${data.text}</span>${data.isEdited ? `<span class="text-[8px] opacity-60 italic ml-1">(edited)</span>` : ''}</div>` : ''}
                    </div>
                    <div class="flex items-center gap-2 mt-0.5 px-1">
                        ${data.isMe ? `${editBtn} ${deleteBtn}` : ''}
                        <p class="text-[8px] text-gray-400 flex items-center">
                            ${data.time} 
                            ${statusTicks}
                        </p>
                    </div>
                </div>
            </div>
        </div>`;

    chatBox.insertAdjacentHTML('beforeend', html);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// UI Helpers
function toggleChatBody() {
    const widget = document.getElementById('chat-widget');
    const icon = document.getElementById('chat-icon');
    widget.classList.toggle('translate-y-[336px]');
    icon.style.transform = widget.classList.contains('translate-y-[336px]') ? 'rotate(0deg)' : 'rotate(180deg)';
}

function autoResize(el) {
    el.style.height = '36px';
    el.style.height = el.scrollHeight + 'px';
}

async function uploadChatImage(input) {
    if (!input.files?.[0]) return;
    const formData = new FormData();
    formData.append('image', input.files[0]);
    try {
        const res = await fetch('/api/chat/upload', {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const { imageUrl } = await res.json();
        document.getElementById('chat-preview-img').src = imageUrl;
        document.getElementById('pending-image-url').value = imageUrl;
        document.getElementById('chat-image-preview-container').classList.remove('hidden');
    } catch (err) { alert("Upload failed!"); }
}

function clearChatPreview() {
    document.getElementById('chat-image-preview-container').classList.add('hidden');
    document.getElementById('pending-image-url').value = '';
}