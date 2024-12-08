require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { connectToDatabase, getDb } = require('./db');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware для логирования запросов
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized', redirect: '/user.html' });
    }
};

let db;

// Запуск сервера и подключение к MongoDB
async function startServer() {
    try {
        db = await connectToDatabase();
        console.log('MongoDB Atlas connection established.');

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to connect to the database:', error);
        console.log('Please check your MongoDB Atlas credentials and try again.');
        process.exit(1);
    }
}


// Route для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route для страницы логина
app.get('/user', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

// Route для страницы регистрации
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signUp.html'));
});

// Route для страницы бронирования
app.get('/reservation', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reservation.html'));
});

// Route для страницы профиля пользователя
app.get('/profile', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// API endpoints
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.collection('users').find({}).toArray();
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Error retrieving users' });
    }
});

// Обработчик POST-запроса для регистрации (signup)
app.post('/signup', async (req, res) => {
    const { nickname, password, email, date } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.collection('users').insertOne({ nickname, password: hashedPassword, email, date });
        console.log('User created:', result);
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ message: 'Error creating user' });
    }
});

// Обработчик POST-запроса для логина
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.collection('users').findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id;
            res.status(200).json({ message: 'Login successful', redirect: '/profile' });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Обработчик POST-запроса для бронирования
app.post('/reserve', isAuthenticated, async (req, res) => {
    const { date, time, pcType } = req.body;
    const userId = req.session.userId;

    try {
        const result = await db.collection('reservations').insertOne({ userId, date, time, pcType });
        res.status(201).json({ message: 'Reservation successful' });
    } catch (err) {
        console.error('Error during reservation:', err);
        res.status(500).json({ message: 'Error making reservation' });
    }
});

// API endpoint для получения информации о пользователе и его бронированиях
app.get('/api/user-info', isAuthenticated, async (req, res) => {
    try {
        const user = await db.collection('users').findOne({ _id: req.session.userId });
        const reservations = await db.collection('reservations').find({ userId: req.session.userId }).toArray();
        res.json({ user, reservations });
    } catch (err) {
        console.error('Error fetching user info:', err);
        res.status(500).json({ message: 'Error fetching user information' });
    }
});

// Обработчик для выхода из системы
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).json({ message: 'Error logging out' });
        } else {
            res.json({ message: 'Logout successful', redirect: '/user.html' });
        }
    });
});

// Обработчик 404 (страница не найдена)
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Запуск сервера
startServer();

