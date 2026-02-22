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
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // ပုံတွေပေါ်ဖို့


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
            // ၁။ Database မှာ အရင်သိမ်းမယ်
            const savedMsg = await Message.create({
                text: data.text,
                room: data.room,
                senderId: data.userId
            });

            // ၂။ ပြန်ပို့မယ့် data ထဲမှာ Database က ID နဲ့ အချိန်ကိုပါ ထည့်ပေးလိုက်မယ်
            const responseData = {
                ...data,
                id: savedMsg.id,
                createdAt: savedMsg.createdAt
            };

            io.to(data.room).emit('receive_message', responseData);
        } catch (err) {
            console.error("Message error:", err);
        }
    });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes.js'));
app.use('/api/posts', require('./routes/postRoutes.js'));
app.use('/api/users', require('./routes/userRoutes'));

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