require(`express-async-errors`);
require(`dotenv`).config();
const express = require(`express`);
const {app, server} = require(`./db/socket`);
const { connectDB } = require(`./db/db`);
const cookieParser = require(`cookie-parser`);
const cors = require(`cors`);

const authRoutes = require(`./routes/auth.routes`);
const messageRoutes = require(`./routes/message.routes`);
const vapidRoutes = require(`./routes/vapid.routes`);
const fcmRoutes = require('./routes/fcm.routes');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

app.use("/api/auth", authRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/push", vapidRoutes);
app.use('/api/fcm', fcmRoutes); 

const PORT = process.env.PORT || 5000;

const start = async() => {
    try {
        await connectDB(process.env.MONGO_URI);
        console.log("Connection established");
        server.listen(PORT, console.log(`Server listening on port ${PORT}`));
    } catch (error) {
        console.log(error);
    }
}

start();