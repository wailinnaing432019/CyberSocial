// chart.js
let socket;
// chat.js သို့မဟုတ် dashboard.js ထဲမှာ ထည့်ရန်
let currentChatMode = 'community';
let chatPartnerId = null;
document.addEventListener('DOMContentLoaded', () => {
    // io ရှိမရှိ အရင်စစ်မယ်
    if (typeof io !== 'undefined') {
        socket = io('http://localhost:3000');
        console.log("✅ Socket connected to 3000");

        socket.on('receive_message', (data) => {
            // လက်ရှိ Login ဝင်ထားတဲ့ user id နဲ့ တိုက်စစ်မယ်
            const isMe = (typeof user !== 'undefined' && user) ? (data.userId === user.id) : false;

            displayMessage({
                text: data.text,
                sender: data.sender || 'Unknown',
                avatar: data.avatar,
                isMe: isMe,
                time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        });
    } else {
        console.error("❌ Socket.io library not loaded! Check HTML script tags.");
    }
});



// စာပို့တဲ့ function
function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !socket) return;

    // လက်ရှိ Login ဝင်ထားတဲ့ User Data ကို ယူမယ် (Dashboard.js ထဲက user object ဖြစ်ရပါမယ်)
    const myData = (typeof user !== 'undefined') ? user : {};

    // Room ID သတ်မှတ်ခြင်း
    let roomName = 'community';
    if (currentChatMode === 'private' && chatPartnerId) {
        // ID နှစ်ခုကို ငယ်စဉ်ကြီးလိုက်စီပြီး Room Name ဆောက်မယ် (ဥပမာ: "1_5")
        roomName = [myData.id, chatPartnerId].sort((a, b) => a - b).join('_');
    }

    const data = {
        room: roomName,
        userId: myData.id,
        avatar: myData.avatar,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    socket.emit('chat_message', data);
    input.value = '';
}
function toggleChatBody() {
    const widget = document.getElementById('chat-widget');
    const icon = document.getElementById('chat-icon');

    // 336px က chat-body ရဲ့ အမြင့်ပါ
    if (widget.classList.contains('translate-y-[336px]')) {
        widget.classList.remove('translate-y-[336px]');
        icon.style.transform = 'rotate(180deg)';
    } else {
        widget.classList.add('translate-y-[336px]');
        icon.style.transform = 'rotate(0deg)';
    }
}



function openPrivateChat(userId, username) {
    currentChatMode = 'private';
    chatPartnerId = userId;

    // UI ပြောင်းလဲခြင်း
    document.getElementById('chat-target-name').innerText = "Chat with " + username;
    document.getElementById('private-chat-banner').classList.remove('hidden');
    document.getElementById('chat-box').innerHTML = ''; // အဟောင်းတွေ ရှင်းမယ်

    // Chat ပွင့်လာအောင်လုပ်မယ်
    const widget = document.getElementById('chat-widget');
    widget.classList.remove('translate-y-[336px]');

    // Socket Room Join ခြင်း
    // Room ID ကို ငယ်တဲ့ ID ကနေ ကြီးတဲ့ ID စဉ်ပြီး ဆောက်မယ် (ဥပမာ: 1_5)
    const myId = JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id;
    const roomName = [myId, userId].sort((a, b) => a - b).join('_');

    socket.emit('join_room', roomName);
    loadChatHistory(roomName)
    console.log("Joined Private Room:", roomName);
}

function switchToCommunity() {
    currentChatMode = 'community';
    chatPartnerId = null;
    document.getElementById('chat-target-name').innerText = "Community Chat";
    document.getElementById('private-chat-banner').classList.add('hidden');
    document.getElementById('chat-box').innerHTML = '';

    socket.emit('join_room', 'community'); // Global room ကို ပြန်ဝင်မယ်
}
function displayMessage(data) {
    const chatBox = document.getElementById('chat-box');
    const html = `
        <div class="flex ${data.isMe ? 'justify-end' : 'justify-start'} mb-2">
            <div class="flex ${data.isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[80%]">
                <img src="${data.avatar || '/uploads/default.png'}" class="w-6 h-6 rounded-full border shadow-sm">
                <div>
                    <div class="${data.isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'} p-2 px-3 rounded-2xl shadow-sm text-[11px]">
                        ${data.text}
                    </div>
                    <p class="text-[9px] text-gray-400 mt-1 ${data.isMe ? 'text-right' : 'text-left'}">${data.time}</p>
                </div>
            </div>
        </div>
    `;
    chatBox.insertAdjacentHTML('beforeend', html);
    chatBox.scrollTop = chatBox.scrollHeight;
}
// js/chat.js ထဲမှာ ဒီ function အသစ်ကို ထည့်ပါ
async function loadChatHistory(roomName) {
    const token = localStorage.getItem('token');
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '<p class="text-center text-xs text-gray-400">Loading history...</p>';

    try {
        const res = await fetch(`/api/users/chat-history/${roomName}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await res.json();
        chatBox.innerHTML = ''; // loading ကို ဖြုတ်မယ်

        messages.forEach(msg => {
            // dashboard.js ထဲက user.id နဲ့ တူမတူ စစ်ပြီး ဘယ်ဘက်/ညာဘက် ခွဲပြမယ်
            const isMe = msg.senderId === user.id;
            displayMessage({
                text: msg.text,
                sender: msg.sender.username,
                avatar: msg.sender.avatar,
                isMe: isMe,
                time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        });
    } catch (err) {
        console.error("History error:", err);
    }
}

// openPrivateChat() နဲ့ switchToCommunity() ထဲမှာ ဒါကို ခေါ်ပေးပါ
// ဥပမာ- loadChatHistory(roomName);