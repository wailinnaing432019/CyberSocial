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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // ပုံတွေပေါ်ဖို့

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);
    socket.on('send_message', (data) => {
        const messageData = {
            ...data,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        io.emit('receive_message', messageData);
    });
    socket.on('disconnect', () => console.log('User Disconnected'));
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