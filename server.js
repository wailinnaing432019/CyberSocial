require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./models');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // Express ကို server ထဲ ထည့်လိုက်တာ
const io = new Server(server, {
    cors: { origin: "*" }
});

const { Message, User } = require('./models');
const { verifyToken } = require('./middleware/authMiddleware.js');
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // ပုံတွေပေါ်ဖို့

let onlineUsers = new Map(); // { userId: socketId }
// server.js (Socket.io code)
io.on('connection', (socket) => {

    // Room ထဲဝင်ခြင်း (Community သို့မဟုတ် Private Room)
    socket.on('join_room', (roomName) => {
        // အရင်ဝင်ထားတဲ့ Room တွေထဲက ထွက်မယ် (Optional)
        socket.rooms.forEach(room => {
            if (room !== socket.id) socket.leave(room);
        });

        socket.join(roomName);
        console.log(`User joined: ${roomName}`);
    });

    socket.on('chat_message', async (data) => {
        try {
            const savedMsg = await Message.create({
                text: data.text,
                room: data.room,
                senderId: data.userId,
                status: 'sent',
                image: data.image || null
            });

            const responseData = {
                ...data,
                id: savedMsg.id,
                createdAt: savedMsg.createdAt
            };

            // ၁။ လက်ရှိ Room ထဲမှာ ရှိနေတဲ့သူတွေကို စာပို့မယ် (Chat Box ထဲ စာပေါ်ဖို့)
            io.to(data.room).emit('receive_message', responseData);

            // ၂။ 🔥 Badge အတွက်: တစ်ဖက်လူကို Socket ID နဲ့ တိုက်ရိုက် လှမ်းအော်မယ်
            // data.room က "1_2" ပုံစံမို့လို့ လက်ခံမယ့်သူ ID ကို ခွဲထုတ်မယ်
            const roomIds = data.room.split('_');
            const receiverId = roomIds.find(id => Number(id) !== Number(data.userId));

            // တစ်ဖက်လူ Online ရှိနေရင် သူ့ဆီ Badge တိုးဖို့ Event လွှတ်မယ်
            const receiverSocketId = onlineUsers.get(Number(receiverId));
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('unread_update', {
                    senderId: data.userId,
                    room: data.room
                });
            }

        } catch (err) {
            console.error("Message error:", err);
        }
    });

    socket.on('edit_message', async (data) => {
        try {
            await Message.update(
                { text: data.newText, isEdited: true },
                { where: { id: data.messageId, senderId: data.userId } }
            );
            // Room ထဲက လူအားလုံးကို စာပြင်လိုက်ပြီလို့ အကြောင်းကြားမယ်
            io.to(data.room).emit('message_edited', {
                messageId: data.messageId,
                newText: data.newText
            });
        } catch (err) {
            console.error("Edit error:", err);
        }
    });

    socket.on('register_user', (userId) => {
        onlineUsers.set(userId, socket.id);
        io.emit('update_online_users', Array.from(onlineUsers.keys()));
    });

    socket.on('delete_message', async (data) => {
        try {
            // ၁။ Database ကနေ တကယ်ဖျက်မယ်
            // senderId ပါ စစ်ထားလို့ တခြားသူရဲ့ message ကို ဖျက်လို့မရအောင် ကာကွယ်ပြီးသားဖြစ်မယ်
            await Message.destroy({
                where: {
                    id: data.messageId,
                    senderId: data.userId
                }
            });

            console.log(`Message ${data.messageId} deleted by User ${data.userId}`);

            // ၂။ Room ထဲက လူအားလုံးဆီ (ပို့တဲ့သူရော၊ လက်ခံတဲ့သူရော) ဖျက်ခိုင်းလိုက်မယ်
            io.to(data.room).emit('message_deleted', { messageId: data.messageId });

        } catch (err) {
            console.error("❌ Delete Error:", err);
        }
    });

    socket.on('typing', (data) => {
        socket.to(data.room).emit('display_typing', data);
    });

    socket.on('stop_typing', (data) => {
        socket.to(data.room).emit('hide_typing');
    });

    // Message ဖတ်ပြီးကြောင်း Room ထဲက လူတွေကို အကြောင်းကြားမယ်
    socket.on('message_read', ({ room, readerId }) => {
        // စာပို့တဲ့သူဆီကို UI update လုပ်ဖို့ လှမ်းပြောမယ်
        socket.to(room).emit('update_seen_ui', { room, readerId });
    });

    socket.on('message_delivered', ({ messageId, senderId }) => {
        io.to(senderId).emit('update_status', { messageId, status: 'delivered' });
    });
    socket.on('disconnect', () => {
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                break;
            }
        }
        io.emit('update_online_users', Array.from(onlineUsers.keys()));
    });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes.js'));
app.use('/api/posts', require('./routes/postRoutes.js'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/chat', require('./routes/chatRoutes.js'));

// Database & Server Start
const PORT = process.env.PORT || 5000;

db.sequelize.authenticate().then(() => {
    console.log("✅ Database Connected.");
    // app.listen ကို ဖြုတ်ပြီး server.listen ကိုပဲ သုံးပါ
    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("❌ DB Connection Error:", err);
});