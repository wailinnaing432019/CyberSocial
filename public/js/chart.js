// chart.js
let socket;

document.addEventListener('DOMContentLoaded', () => {
    // io ရှိမရှိ အရင်စစ်မယ်
    if (typeof io !== 'undefined') {
        socket = io('http://localhost:3000');
        console.log("✅ Socket connected to 3000");

        socket.on('receive_message', (data) => {
            const chatBox = document.getElementById('chat-box');

            // user object က dashboard.js ကနေ လာရမှာဖြစ်ပါတယ်
            const isMe = (typeof user !== 'undefined' && user) ? (data.userId === user.id) : false;

            const messageHTML = `
                <div class="flex ${isMe ? 'justify-end' : 'justify-start'} mb-2">
                    <div class="flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[80%]">
                        <img src="${data.avatar || '/uploads/default.png'}" class="w-6 h-6 rounded-full border shadow-sm">
                        <div>
                            <div class="${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'} p-2 px-3 rounded-2xl shadow-sm text-[11px]">
                                ${data.text}
                            </div>
                            <p class="text-[9px] text-gray-400 mt-1 ${isMe ? 'text-right' : 'text-left'}">${data.time || ''}</p>
                        </div>
                    </div>
                </div>
            `;
            chatBox.innerHTML += messageHTML;
            chatBox.scrollTop = chatBox.scrollHeight;
        });
    } else {
        console.error("❌ Socket.io library not loaded! Check HTML script tags.");
    }
});

function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (socket && msg && typeof user !== 'undefined') {
        socket.emit('send_message', {
            username: user.username,
            avatar: user.avatar,
            text: msg,
            userId: user.id
        });
        input.value = '';
    }
}

function toggleChatBody() {
    const body = document.getElementById('chat-body');
    body.classList.toggle('hidden');
}