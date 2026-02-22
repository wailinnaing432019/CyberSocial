// chat.js
let currentChatMode = 'community';
let chatPartnerId = null;
let unreadCounts = {}; // { userId: count } ပုံစံနဲ့ သိမ်းမယ်
// စာလက်ခံတဲ့အပိုင်းကို Function သီးသန့်ထုတ်လိုက်ပါ
function setupSocketListeners() {
    if (!socket) return;

    socket.on('receive_message', (data) => {
        // user object က dashboard.js မှာ ရှိရမယ်
        const isMe = (typeof user !== 'undefined' && user) ? (data.userId === user.id) : false;

        // လက်ရှိဖွင့်ထားတဲ့ Chat Room နဲ့ ပို့လိုက်တဲ့ စာရဲ့ Room တူမှ ပြမယ်
        // Private chat ထဲ ရောက်နေရင် Community စာတွေ ဒီအတိုင်း တက်မလာအောင် စစ်တာပါ
        let currentRoom = 'community';
        if (currentChatMode === 'private' && chatPartnerId) {
            currentRoom = [user.id, chatPartnerId].sort((a, b) => a - b).join('_');
        }
        // ၁။ ကိုယ်က အဲဒီ Room ကို ဖွင့်မထားရင် Badge ပြမယ် (Private Chat အတွက်ပဲ)
        if (data.room !== currentRoom && data.room !== 'community') {
            const senderId = data.userId;
            unreadCounts[senderId] = (unreadCounts[senderId] || 0) + 1;
            updateUnreadBadge(senderId);
            return; // Chat box ထဲ စာသွားမပြတော့ဘူး
        }
        if (data.room === currentRoom) {
            displayMessage({
                id: data.id, // DB ကလာတဲ့ ID
                text: data.text,
                sender: data.sender || 'Unknown',
                avatar: data.avatar,
                image: data.image, // ပုံ URL ပါရင် ပြမယ်
                isEdited: data.isEdited,
                isMe: isMe,
                time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
    });

    // ၂။ စာပြင်လိုက်တာ (Edit) ကို နားထောင်ခြင်း
    socket.on('message_edited', (data) => {
        // Selector ထဲမှာ Space မပါအောင် သတိထားပါ (#msg-${data.messageId})
        const msgWrapper = document.querySelector(`#msg-${data.messageId}`);

        if (msgWrapper) {
            const msgTextSpan = msgWrapper.querySelector('.message-text');
            if (msgTextSpan) {
                // စာသားကို အသစ်လဲမယ်
                msgTextSpan.innerText = data.newText;

                // (edited) label မရှိသေးရင် အသစ်ထည့်မယ်၊ ရှိပြီးသားဆိုရင် အချိန်ကို Update လုပ်မယ်
                let editedLabel = msgWrapper.querySelector('.italic');
                const timeStr = data.updatedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                if (editedLabel) {
                    editedLabel.innerText = `(edited ${timeStr})`;
                } else {
                    msgTextSpan.insertAdjacentHTML('afterend', `
                        <span class="text-[8px] opacity-60 italic ml-1" title="Last updated: ${timeStr}">
                            (edited ${timeStr})
                        </span>
                    `);
                }
            }
        }
    });

    // ၃။ စာဖျက်လိုက်တာ (Delete) ကို နားထောင်ခြင်း
    socket.on('message_deleted', (data) => {
        const el = document.getElementById(`msg-${data.messageId}`);
        if (el) {
            el.classList.add('opacity-0', 'scale-95'); // Animation လေးနဲ့ ပျောက်သွားအောင်
            setTimeout(() => el.remove(), 300);
        }
    });

    socket.on('display_typing', (data) => {
        const indicator = document.getElementById('typing-indicator');
        const typingText = document.getElementById('typing-text');

        // ကိုယ်တိုင်ရိုက်နေတာမဟုတ်မှပဲ ပြမယ်
        if (data.sender !== user.username) {
            typingText.innerText = `${data.sender} is typing...`;
            indicator.classList.remove('hidden');

            // Chat box ကို အောက်ဆုံးထိ ဆွဲချမယ် (indicator ပေါ်လာရင် မြင်ရအောင်)
            const chatBox = document.getElementById('chat-box');
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    });

    socket.on('hide_typing', () => {
        document.getElementById('typing-indicator').classList.add('hidden');
    });
}


let typingTimeout; // ဒါလေးကို function အပြင်မှာ ကြေညာထားဖို့ မမေ့ပါနဲ့

function handleChatKeydown(e) {
    const roomName = currentChatMode === 'community' ? 'community' : [user.id, chatPartnerId].sort((a, b) => a - b).join('_');

    // ၁။ Enter ခေါက်ပြီး စာပို့မယ့် Logic
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // စာကြောင်းအသစ်မဆင်းအောင် တားမယ်

        sendMessage();

        // စာပို့လိုက်ပြီဖြစ်တဲ့အတွက် Typing indicator ကို ချက်ချင်းရပ်ခိုင်းမယ်
        socket.emit('stop_typing', { room: roomName });
        clearTimeout(typingTimeout);
        return; // Enter ခေါက်ရင် အောက်က typing logic ထဲ ဆက်မသွားတော့ဖို့
    }

    // ၂။ Typing Indicator Logic (Enter မဟုတ်တဲ့ တခြား key တွေ ရိုက်နေရင်)
    // Socket ကို 'typing' event လွှတ်မယ်
    socket.emit('typing', { room: roomName, sender: user.username });

    // စာရိုက်တာ ခဏရပ်သွားရင် 'stop_typing' လွှတ်ဖို့ Timeout လုပ်မယ်
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', { room: roomName });
    }, 5000); // ၂ စက္ကန့်ကြာရင် ပျောက်သွားမယ်
}

// Textarea အမြင့်ကို စာသားနဲ့အညီ ညှိပေးတာ
function autoResize(el) {
    el.style.height = '36px'; // Reset height
    el.style.height = el.scrollHeight + 'px';
}



let isEditing = false;

function editMsg(messageId, oldText, room) {
    isEditing = true;
    const input = document.getElementById('chat-input');
    const idField = document.getElementById('edit-message-id');
    const indicator = document.getElementById('edit-mode-indicator');
    const sendIcon = document.getElementById('send-icon');

    // ၁။ စာသားထည့်မယ်
    input.value = oldText;

    // ၂။ Textarea height ကို စာသားနဲ့အညီ ညှိမယ်
    input.style.height = '';
    input.style.height = input.scrollHeight + 'px';
    input.focus();

    // ၃။ Logic ပိုင်း
    idField.value = messageId;
    indicator.classList.remove('hidden');

    // ၄။ Send Button Icon ကို Update/Save ပုံစံပြောင်းမယ် (Optional)
    // sendIcon.innerHTML = `<path ... (အမှန်ခြစ် icon) />`;
}

function cancelEdit() {
    isEditing = false;
    const input = document.getElementById('chat-input');
    const indicator = document.getElementById('edit-mode-indicator');

    input.value = '';
    input.style.height = '36px'; // မူလအမြင့် ပြန်ထားမယ်
    document.getElementById('edit-message-id').value = '';
    indicator.classList.add('hidden');
}
// ဒီ function လေးပါ ထည့်ထားပေးပါ (HTML ထဲက ခေါ်ဖို့)
function prepareEdit(msgId) {
    const msgElement = document.querySelector(`#msg-${msgId} .message-text`);
    // "(edited)" ဆိုတဲ့ စာသားပါနေရင် ဖယ်ထုတ်ပြီး စာသားသက်သက်ပဲ ယူမယ်
    let text = msgElement.innerText.replace('(edited)', '').trim();

    const roomName = currentChatMode === 'community' ? 'community' : [user.id, chatPartnerId].sort((a, b) => a - b).join('_');
    editMsg(msgId, text, roomName);
}



// စာပို့တဲ့ function (ဥပမာ sendMessage) ကို ဒီလို ပြင်ပါ
async function uploadChatImage(input) {
    if (!input.files || !input.files[0]) return;

    const formData = new FormData();
    formData.append('image', input.files[0]);

    try {
        const res = await fetch('/api/chat/upload', {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const { imageUrl } = await res.json();

        // Preview ပြမယ်
        document.getElementById('chat-preview-img').src = imageUrl;
        document.getElementById('pending-image-url').value = imageUrl;
        document.getElementById('chat-image-preview-container').classList.remove('hidden');

    } catch (err) {
        alert("Image upload failed!");
    }
}

function clearChatPreview() {
    document.getElementById('chat-image-preview-container').classList.add('hidden');
    document.getElementById('pending-image-url').value = '';
    document.getElementById('chat-preview-img').src = '';
}

// စာပို့တဲ့ function မှာ ပုံရော စာရော တွဲပို့မယ်
function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    const imageUrl = document.getElementById('pending-image-url').value;
    const messageId = document.getElementById('edit-message-id').value;

    if (!text && !imageUrl) return; // နှစ်ခုလုံးမရှိရင် မပို့ဘူး

    const myData = (typeof user !== 'undefined') ? user : {};
    let roomName = currentChatMode === 'community' ? 'community' : [myData.id, chatPartnerId].sort((a, b) => a - b).join('_');

    if (isEditing) {
        // Edit logic (ပုံပါရင် Edit မရအောင် လုပ်ထားတာ ပိုစိတ်ချရတယ်)
        socket.emit('edit_message', { messageId, newText: text, userId: myData.id, room: roomName });
        cancelEdit();
    } else {
        // Normal Message (ပုံရော စာရော တစ်ခါတည်းပို့မယ်)
        const data = {
            room: roomName,
            userId: myData.id,
            avatar: myData.avatar,
            sender: myData.username,
            text: text, // တွဲပါလာတဲ့စာ (Caption)
            image: imageUrl, // တွဲပါလာတဲ့ပုံ
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socket.emit('chat_message', data);

        // ပို့ပြီးရင် အကုန်ရှင်းမယ်
        input.value = '';
        input.style.height = '36px';
        clearChatPreview();
    }
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

    // Unread count ကို reset ချမယ်
    unreadCounts[userId] = 0;
    updateUnreadBadge(userId);
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
    loadChatHistory('community');
}
// displayMessage function ကို ဒီလိုလေး ပြင်ကြည့်ပါ
function displayMessage(data) {
    const chatBox = document.getElementById('chat-box');
    const msgId = data.id;
    // Room logic: community မဟုတ်ရင် user id နှစ်ခုကို sort လုပ်ပြီး room နာမည်ပေးမယ်
    const roomName = data.room || (currentChatMode === 'community' ? 'community' : [user.id, chatPartnerId].sort((a, b) => a - b).join('_'));

    const hasText = data.text && data.text.trim().length > 0;
    const hasImage = !!data.image;

    // ၁။ Edit Button Logic: ပုံရှိရှိ မရှိရှိ စာသားရှိရင် Edit ခွင့်ပေးမယ်
    const editBtn = (data.isMe && hasText) ? `
        <button onclick="prepareEdit(${msgId})" class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
        </button>` : '';

    // ၂။ Delete Button
    const deleteBtn = data.isMe ? `
        <button onclick="deleteMsg(${msgId}, '${roomName}')" class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>` : '';

    // ၃။ Edited Label Logic
    const editedTimeHtml = data.isEdited ? `
        <span class="text-[8px] opacity-60 italic ml-1" title="Last updated: ${data.updatedAt || data.time}">
            (edited ${data.updatedAt || ''})
        </span>` : '';

    // ၄။ Bubble Style: စာသားမပါဘဲ ပုံချည်းပဲဆိုရင် background မပြဘူး
    const bubbleClass = hasText
        ? (data.isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none')
        : ''; // No background for image-only messages

    // ၅။ Content Wrapper: ပုံနဲ့ စာသားကို စနစ်တကျ ပြမယ်
    const contentHtml = `
        <div class="message-content-wrapper ${bubbleClass} rounded-2xl shadow-sm text-[11px] overflow-hidden">
            ${hasImage ? `
                <div class="relative group cursor-pointer">
                    <img src="${data.image}" 
                         class="w-full max-w-[240px] block transition-transform hover:scale-[1.02]"
                         onclick="window.open('${data.image}', '_blank')">
                </div>
            ` : ''}
            
            ${hasText ? `
                <div class="p-2 px-3">
                    <span class="message-text">${data.text}</span>
                    ${editedTimeHtml}
                </div>
            ` : ''}
        </div>
    `;

    // ၆။ Final Message Component
    const html = `
        <div id="msg-${msgId}" class="flex ${data.isMe ? 'justify-end' : 'justify-start'} mb-2 group">
            <div class="flex ${data.isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-1 max-w-[80%]">
                <img src="${data.avatar || '/uploads/default.png'}" class="w-6 h-6 rounded-full border shadow-sm flex-shrink-0">
                <div class="flex flex-col ${data.isMe ? 'items-end' : 'items-start'}">
                    ${contentHtml}
                    <div class="flex items-center gap-2 mt-1 px-1">
                        ${editBtn}
                        ${deleteBtn}
                        <p class="text-[9px] text-gray-400">${data.time}</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    chatBox.insertAdjacentHTML('beforeend', html);
    chatBox.scrollTop = chatBox.scrollHeight;
}

socket.on('message_edited', (data) => {
    const msgDiv = document.querySelector(`#msg-${data.messageId}.message-text`);
    if (msgDiv) {
        msgDiv.innerText = data.newText;
        // (Edited) ဆိုတဲ့စာသားလေး ဘေးမှာ ကပ်ပေးလို့ရတယ်
        if (!msgDiv.innerHTML.includes('edited')) {
            msgDiv.innerHTML += ' <span class="text-[8px] opacity-50">(edited)</span>';
        }
    }
});
// ဖျက်ဖို့ socket ပို့တဲ့ function
function deleteMsg(messageId, room) {
    if (confirm("Delete this message?")) {
        socket.emit('delete_message', { messageId, userId: user.id, room });
    }
}

// Socket က ပြန်ပို့လာရင် UI ကနေ ဖယ်ထုတ်မယ်
socket.on('message_deleted', (data) => {
    const el = document.getElementById(`msg - ${data.messageId} `);
    if (el) el.remove();
});
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
                id: msg.id,
                text: msg.text,
                sender: msg.sender.username,
                avatar: msg.sender.avatar,
                image: msg.image, // ပုံရှိရင် ပုံပါပြမယ်
                isEdited: msg.isEdited,
                isMe: isMe,
                time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        });
    } catch (err) {
        console.error("History error:", err);
    }
}


function sendSocketMessage(text, image = null) {
    // လက်ရှိ ရှိပြီးသား sendMessage logic ကို ခွဲထုတ်ရေးတာပါ
    const roomName = currentChatMode === 'community' ? 'community' : [user.id, chatPartnerId].sort((a, b) => a - b).join('_');
    const data = {
        room: roomName,
        userId: user.id,
        avatar: user.avatar,
        text: text,
        image: image, // ပုံ URL ပါရင် ထည့်ပို့မယ်
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    socket.emit('chat_message', data);
}
// openPrivateChat() နဲ့ switchToCommunity() ထဲမှာ ဒါကို ခေါ်ပေးပါ
// ဥပမာ- loadChatHistory(roomName);