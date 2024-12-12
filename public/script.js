// Dodanie nasluchiwacza zdarzenia 'DOMContentLoaded',
// kt ry jest wyzwalany, gdy dokument HTML zostanie w pe ni wczytany
document.addEventListener('DOMContentLoaded', function() {
    // Pobranie elementu slidera i tablicy slajd w
    const slider = document.querySelector('.slider');
    const slides = document.querySelectorAll('.slide');
    // Inicjalizacja indeksu aktualnie wy swietlanego slajdu
    let currentIndex = 0;

    // Funkcja pokazywania slajdu o podanym indeksie
    function showSlide(index) {
        // Ustawienie stylu transform, aby przesun  slider o odpowiedni procent
        slider.style.transform = `translateX(-${index * 100}%)`;
    }

    // Funkcja zwi kszenia do nast pnego slajdu
    function nextSlide() {
        // Zmiana indeksu na nast pny, ale nie wicej ni ilo  slajd w
        currentIndex = (currentIndex + 1) % slides.length;
        // Pokazywanie slajdu o nowym indeksie
        showSlide(currentIndex);
    }

    // Uruchamianie funkcji nast pnego slajdu co 20000 milisekund
    setInterval(nextSlide, 20000);

    // Pokazywanie pierwszego slajdu
    showSlide(0);
});
