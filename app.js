// UI Elements
const homeScreen = document.getElementById('home-screen');
const studyScreen = document.getElementById('study-screen');
const completionScreen = document.getElementById('completion-screen');

const sectionCheckboxesDiv = document.getElementById('section-checkboxes');
const sectionForm = document.getElementById('section-form');
const progressFill = document.getElementById('progress-fill');

const cardContainer = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const flipButton = document.getElementById('flip-button');

const ratingButtons = document.querySelectorAll('.rate-button');
const completionMessage = document.getElementById('completion-message');
const restartButton = document.getElementById('restart-button');
const endSessionButton = document.getElementById('end-session-button');

let allCards = [];
let availableSections = new Set();
let selectedSections = [];
let sessionSize = 15;
let sessionMode = "fixed";
let sessionQueue = [];
let sessionHistory = [];
let currentIndex = 0;
let easyCount = 0;

// Load deck.json
fetch('deck.json')
  .then(response => response.json())
  .then(data => {
    allCards = data;
    populateSections(data);
  })
  .catch(err => console.error('Error loading deck.json:', err));

// Populate section checkboxes
function populateSections(cards) {
  const tags = new Set();
  cards.forEach(card => card.tags.forEach(tag => tags.add(tag)));
  availableSections = tags;

  tags.forEach(tag => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${tag}" checked /> ${tag}`;
    sectionCheckboxesDiv.appendChild(label);
  });
}

// Handle Home Form Submit
sectionForm.addEventListener('submit', e => {
  e.preventDefault();
  selectedSections = Array.from(document.querySelectorAll('#section-checkboxes input:checked')).map(cb => cb.value);
  const sizeValue = document.querySelector('input[name="session-size"]:checked').value;

  if (selectedSections.length === 0) {
    alert('Please select at least one section.');
    return;
  }

  if (sizeValue === "unlimited") {
    sessionMode = "unlimited";
    sessionSize = Infinity;
  } else {
    sessionMode = "fixed";
    sessionSize = parseInt(sizeValue);
  }

  startSession();
});

// Start Session
function startSession() {
  sessionQueue = [];
  sessionHistory = [];
  currentIndex = 0;
  easyCount = 0;

  // Filter and shuffle
  const filtered = allCards.filter(card => card.tags.some(tag => selectedSections.includes(tag)));
  if (sessionMode === "fixed" && filtered.length < sessionSize) {
    alert(`Not enough cards in selected sections. You selected ${sessionSize}, but only ${filtered.length} available.`);
    return;
  }

  const shuffled = filtered.sort(() => 0.5 - Math.random());

  if (sessionMode === "fixed") {
    sessionQueue = shuffled.slice(0, sessionSize);
  } else {
    // Unlimited: use entire shuffled pool as initial queue
    sessionQueue = [...shuffled];
  }

  saveProgress();
  showStudyScreen();
  renderCard();
  updateProgress();
}

// Show Study Screen
function showStudyScreen() {
  homeScreen.classList.add('hidden');
  studyScreen.classList.remove('hidden');
  completionScreen.classList.add('hidden');

  if (sessionMode === "unlimited") {
    endSessionButton.classList.remove('hidden');
  } else {
    endSessionButton.classList.add('hidden');
  }
}

// Render Current Card
function renderCard() {
  if (currentIndex >= sessionQueue.length || (sessionMode === "fixed" && currentIndex >= sessionSize)) {
    finishSession();
    return;
  }

  const card = sessionQueue[currentIndex];
  cardContainer.classList.remove('flipped');
  cardFront.textContent = card.question;
  cardBack.textContent = card.answer;
}

// Handle Flip
flipButton.addEventListener('click', () => {
  cardContainer.classList.toggle('flipped');
});

// Handle Rating
ratingButtons.forEach(button => {
  button.addEventListener('click', () => {
    const rating = button.getAttribute('data-rating');
    handleRating(rating);
  });
});

function handleRating(rating) {
  const card = sessionQueue[currentIndex];
  sessionHistory.push({ id: card.id, rating });

  if (rating === 'Easy') easyCount++;

  if (sessionMode === "unlimited") {
    // Anki-style reinsertion
    let interval;
    if (rating === 'Hard') interval = getRandomInt(10, 15);
    else if (rating === 'Medium') interval = getRandomInt(25, 30);
    else interval = getRandomInt(45, 50);

    if (currentIndex + interval < sessionQueue.length) {
      sessionQueue.splice(currentIndex + interval, 0, card);
    } else {
      sessionQueue.push(card);
    }
  }
  // In fixed mode we don't reinsert

  currentIndex++;
  saveProgress();
  updateProgress();
  renderCard();
}

// Progress Bar
function updateProgress() {
  if (sessionMode === "fixed") {
    const percent = Math.min((currentIndex / sessionSize) * 100, 100);
    progressFill.style.width = `${percent}%`;
  } else {
    progressFill.style.width = `100%`;  // Always filled in unlimited mode
  }
}

// Finish Session
function finishSession() {
  studyScreen.classList.add('hidden');
  completionScreen.classList.remove('hidden');

  const total = sessionMode === "unlimited" ? sessionHistory.length : sessionSize;
  completionMessage.textContent = `You marked ${easyCount} of ${total} cards as Easy!`;

  localStorage.removeItem('flashcardSession');
}

// Restart
restartButton.addEventListener('click', () => {
  homeScreen.classList.remove('hidden');
  studyScreen.classList.add('hidden');
  completionScreen.classList.add('hidden');
});

// End Session Button (Unlimited mode)
endSessionButton.addEventListener('click', () => {
  finishSession();
});

// Local Storage
function saveProgress() {
  const data = {
    selectedSections,
    sessionSize,
    sessionMode,
    sessionQueue,
    currentIndex,
    sessionHistory,
    easyCount
  };
  localStorage.setItem('flashcardSession', JSON.stringify(data));
}

// Helper
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
