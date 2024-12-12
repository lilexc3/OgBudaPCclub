require('dotenv').config();
// Importowanie niezbednych bibliotek
const express = require('express');
const bodyParser = require('body-parser');
const { connectToDatabase, getDb } = require('./db');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');

// Utworzenie aplikacji Express
const app = express();
const PORT = process.env.PORT || 3000;

// Ustawienie parsera JSON
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Middleware, ktory loguje kazdy request
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// Middleware, ktory sprawdza, czy uzytkownik jest zalogowany
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized', redirect: '/user.html' });
    }
};

// Zmienne globalne
let db;

// Funkcja uruchamiajaca serwer
async function startServer() {
    try {
        // Polaczenie z baz danych
        db = await connectToDatabase();
        console.log('MongoDB Atlas connection established.');

        // Uruchomienie serwera
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to connect to the database:', error);
        console.log('Please check your MongoDB Atlas credentials and try again.');
        process.exit(1);
    }
}

// routing
app.get('/', (req, res) => {
    // Zwraca strone glowna
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/user', (req, res) => {
    // Zwraca strone logowania
    res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

app.get('/signup', (req, res) => {
    // Zwraca strone rejestracji
    res.sendFile(path.join(__dirname, 'public', 'signUp.html'));
});

app.get('/reservation', isAuthenticated, (req, res) => {
    // Zwraca strone rezerwacji, ale tylko dla zalogowanych uzytkownikow
    res.sendFile(path.join(__dirname, 'public', 'reservation.html'));
});

app.get('/profile', isAuthenticated, (req, res) => {
    // Zwraca strone profilu, ale tylko dla zalogowanych uzytkownikow
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/api/users', async (req, res) => {
    try {
        // Zwraca liste wszystkich uzytkownikow
        const users = await db.collection('users').find({}).toArray();
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Error retrieving users' });
    }
});

app.post('/signup', async (req, res) => {
    const { nickname, password, email, date } = req.body;

    try {
        // Sprawdza, czy uzytkownik o podanym emailu juz istnieje
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hasuje haslo i tworzy nowego uzytkownika
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.collection('users').insertOne({ nickname, password: hashedPassword, email, date });
        console.log('User created:', result);
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ message: 'Error creating user' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Sprawdza, czy uzytkownik o podanym emailu i hasle istnieje
        const user = await db.collection('users').findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id.toString();
            res.status(200).json({ message: 'Login successful', redirect: '/profile.html' });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Error logging in' });
    }
});

app.post('/reserve', isAuthenticated, async (req, res) => {
    const { date, time, pcType } = req.body;
    const userId = req.session.userId;

    try {
        // Tworzy nowa rezerwacje
        const result = await db.collection('reservations').insertOne({ userId, date, time, pcType });
        res.status(201).json({ message: 'Reservation successful' });
    } catch (err) {
        console.error('Error during reservation:', err);
        res.status(500).json({ message: 'Error making reservation' });
    }
});

app.get('/api/user-info', isAuthenticated, async (req, res) => {
    try {
        // Zwraca informacje o zalogowanym uzytkowniku
        const userId = new ObjectId(req.session.userId);
        const user = await db.collection('users').findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const reservations = await db.collection('reservations').find({ userId: req.session.userId }).toArray();
        res.json({ user, reservations });
    } catch (err) {
        console.error('Error fetching user info:', err);
        res.status(500).json({ message: 'Error fetching user information' });
    }
});

app.get('/api/username', isAuthenticated, async (req, res) => {
    try {
        // Zwraca nazwe uzytkownika zalogowanego
        const userId = new ObjectId(req.session.userId);
        const user = await db.collection('users').findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ nickname: user.nickname });
    } catch (err) {
        console.error('Error fetching username:', err);
        res.status(500).json({ message: 'Error fetching username' });
    }
});

app.post('/logout', (req, res) => {
    // Usuwa sesje uzytkownika i wylogowuje go
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).json({ message: 'Error logging out' });
        } else {
            res.json({ message: 'Logout successful', redirect: '/user.html' });
        }
    });
});

app.get('/api/auth-status', (req, res) => {
    // Sprawdza, czy uzytkownik jest zalogowany
    if (req.session.userId) {
        res.json({ isAuthenticated: true });
    } else {
        res.json({ isAuthenticated: false });
    }
});

app.use((req, res) => {
    // Zwraca strone 404, gdy nie znaleziono strony
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

startServer();

