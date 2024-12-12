// Importowanie klienta MongoDB i konfiguracji zmiennych środowiskowych
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Pobranie URI z pliku .env
const uri = process.env.MONGO_URI;
let client;
let db;

// Funkcja asynchroniczna do połączenia z bazą danych
async function connectToDatabase() {
    try {
        // Sprawdza, czy klient nie jest już zainicjalizowany, jeśli nie, tworzy nowego klienta i łączy się
        if (!client) {
            client = new MongoClient(uri);
            await client.connect();
            console.log('Connected to MongoDB Atlas');
        }
        // Przypisuje bazę danych do zmiennej db
        db = client.db('ogbuda_db');
        return db;
    } catch (error) {
        // W przypadku błędu podczas łączenia, wyświetla błąd i wyrzuca wyjątek
        console.error('Error connecting to MongoDB Atlas:', error);
        throw error;
    }
}

// Funkcja zwracająca instancję bazy danych
function getDb() {
    // Jeśli baza danych nie została zainicjalizowana, wyrzuca błąd
    if (!db) {
        throw new Error('Database not initialized. Call connectToDatabase first.');
    }
    return db;
}

// Eksportowanie funkcji do wykorzystania w innych plikach
module.exports = { connectToDatabase, getDb };

