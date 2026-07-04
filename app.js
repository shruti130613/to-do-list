/* ==========================================================================
   State & Global Configuration
   ========================================================================== */
let tasks = [];
let activeFilter = 'all';
let audioCtx = null;
let soundEnabled = true;
let animationFrameId = null;

// DOM Elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const categorySelect = document.getElementById('category-select');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const themeToggle = document.getElementById('theme-toggle');
const soundToggle = document.getElementById('sound-toggle');
const toastContainer = document.getElementById('toast-container');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');

// SVG Ring & Progress Elements
const progressRing = document.getElementById('progress-ring-circle');
const progressBarInner = document.getElementById('progress-bar-inner');
const progressPercentText = document.getElementById('progress-percentage-text');
const motivationalState = document.getElementById('motivational-state');

// Circular progress calculations (Radius = 26)
const ringCircumference = 2 * Math.PI * 26;
if (progressRing) {
  progressRing.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
  progressRing.style.strokeDashoffset = ringCircumference;
}

// Fun randomized placeholders
const funnyPlaceholders = [
  "Buy milk before the cat starts judging me...",
  "Conquer the world, or just clean my room...",
  "Water the plants so they don't plan a rebellion...",
  "Find where my keys went. They are plotting something...",
  "Write a bestseller, or just take a nap...",
  "Do 10 pushups (or just think about it)...",
  "Eat a dynamic smoothie and vibe...",
  "Smile at a stranger, or a mirror...",
  "Organize my desk to look productive...",
  "Pretend to work for 15 minutes..."
];

/* ==========================================================================
   Sound Synthesizer (Web Audio API)
   ========================================================================== */
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'add') {
      // Ascending double chirp
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.start(now);
      osc.stop(now + 0.15);
    } 
    else if (type === 'complete') {
      // Arpeggio chime (C5 - E5 - G5)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      
      osc.start(now);
      osc.stop(now + 0.35);
    } 
    else if (type === 'delete') {
      // Descending slide whoosh
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.25);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      
      osc.start(now);
      osc.stop(now + 0.25);
    } 
    else if (type === 'error') {
      // Buzz sound
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    console.warn("Sound play failed", e);
  }
}

/* ==========================================================================
   HTML5 Canvas Confetti Celebration Engine
   ========================================================================== */
let confettiParticles = [];
const confettiColors = ['#ff5e97', '#a855f7', '#00d2ff', '#fbbf24', '#34d399'];

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeConfettiCanvas);
resizeConfettiCanvas();

class ConfettiParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 6;
    this.color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    
    // Spread velocity
    this.vx = (Math.random() - 0.5) * 12;
    this.vy = -Math.random() * 12 - 5;
    
    this.gravity = 0.35;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
    this.opacity = 1;
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    this.opacity -= 0.008;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    
    // Draw small rectangle / diamond
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

function spawnConfetti(originX, originY) {
  // If confetti is already active, append to it
  const particleCount = 80;
  for (let i = 0; i < particleCount; i++) {
    confettiParticles.push(new ConfettiParticle(originX, originY));
  }
  
  if (!animationFrameId) {
    updateAndDrawConfetti();
  }
}

function updateAndDrawConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  
  // Filter out faded or off-screen particles
  confettiParticles = confettiParticles.filter(
    p => p.opacity > 0 && p.y < confettiCanvas.height && p.x > 0 && p.x < confettiCanvas.width
  );

  confettiParticles.forEach(p => {
    p.update();
    p.draw();
  });

  if (confettiParticles.length > 0) {
    animationFrameId = requestAnimationFrame(updateAndDrawConfetti);
  } else {
    animationFrameId = null;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

/* ==========================================================================
   Validation Toasts
   ========================================================================== */
function showToast(message) {
  playSound('error');
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-emoji">🚨</span>
    <span class="toast-message">${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // Exit animation timeout
  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3500);
}

function validateInput(text) {
  const trimmed = text.trim();
  
  // Rule 1: Empty text
  if (trimmed === "") {
    showToast("Whoa! You can't add an empty task. That's *too* chill. 🧊");
    return false;
  }
  
  // Rule 2: Too short (meaningful text)
  if (trimmed.length < 2) {
    showToast("Make it a bit longer! Tell me what you're actually doing. 🧠");
    return false;
  }
  
  // Rule 3: Only special characters
  const alphanumeric = /[a-zA-Z0-9\u00C0-\u00FF]/;
  if (!alphanumeric.test(trimmed)) {
    showToast("C'mon, use actual letters or numbers! Emojis alone are cool but need text! ✨");
    return false;
  }

  // Rule 4: Anti HTML injections
  if (/<[^>]*>/g.test(trimmed)) {
    showToast("Clever coding! But let's stick to normal text tasks. 😉");
    return false;
  }
  
  return true;
}

/* ==========================================================================
   Local Storage Sync
   ========================================================================== */
function loadState() {
  const savedTasks = localStorage.getItem('mast_mola_tasks');
  const savedTheme = localStorage.getItem('mast_mola_theme');
  const savedSound = localStorage.getItem('mast_mola_sound');
  
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
  }
  
  // Apply theme
  const currentTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcons(currentTheme);

  // Apply sound setting
  if (savedSound !== null) {
    soundEnabled = JSON.parse(savedSound);
  }
  updateSoundIcons(soundEnabled);
}

function saveState() {
  localStorage.setItem('mast_mola_tasks', JSON.stringify(tasks));
}

/* ==========================================================================
   Progress & Motivation Check
   ========================================================================== */
function updateProgress() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  
  // Update linear progress bar
  if (progressBarInner) {
    progressBarInner.style.width = `${percentage}%`;
  }

  // Update SVG Ring
  if (progressRing) {
    const offset = ringCircumference - (percentage / 100) * ringCircumference;
    progressRing.style.strokeDashoffset = offset;
  }

  // Update text label
  if (progressPercentText) {
    progressPercentText.textContent = `${percentage}%`;
  }

  // Update motivational state message
  if (motivationalState) {
    if (total === 0) {
      motivationalState.textContent = "Chill mode activated 🧊";
    } else if (percentage === 0) {
      motivationalState.textContent = "Lazy loading... 💤";
    } else if (percentage <= 33) {
      motivationalState.textContent = "Off to a good start! 🚀";
    } else if (percentage <= 66) {
      motivationalState.textContent = "You are flowing! 🌊";
    } else if (percentage < 100) {
      motivationalState.textContent = "Almost legendary status! ⚡";
    } else {
      motivationalState.textContent = "Absolute Legend! 🎉";
    }
  }

  // Show/Hide Clear Completed Done button
  if (clearCompletedBtn) {
    if (completed > 0) {
      clearCompletedBtn.classList.remove('hidden');
    } else {
      clearCompletedBtn.classList.add('hidden');
    }
  }
}

/* ==========================================================================
   Core Task Logic (Append, Complete, Delete)
   ========================================================================== */
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `todo-item level-${task.urgency} ${task.completed ? 'completed' : ''}`;
  li.dataset.id = task.id;

  // Category Emoji Lookup
  const categoryEmojis = {
    fun: '🎉',
    work: '💼',
    personal: '🧠'
  };
  const categoryEmoji = categoryEmojis[task.category] || '📌';

  li.innerHTML = `
    <div class="item-left">
      <label class="checkbox-container" aria-label="Toggle completed state">
        <input type="checkbox" ${task.completed ? 'checked' : ''}>
        <span class="checkmark"></span>
      </label>
      <div class="item-details">
        <span class="todo-text">${escapeHTML(task.text)}</span>
        <div class="todo-meta">
          <span class="badge badge-category">${categoryEmoji} ${task.category}</span>
          <span class="badge badge-urgency">${task.urgency}</span>
        </div>
      </div>
    </div>
    <button class="delete-btn" title="Delete Task" aria-label="Delete Task">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    </button>
  `;

  // Attach interactive events
  const checkbox = li.querySelector('input[type="checkbox"]');
  const deleteBtn = li.querySelector('.delete-btn');

  // Checkbox Event (Complete / Re-open)
  checkbox.addEventListener('change', (e) => {
    const isCompleted = e.target.checked;
    task.completed = isCompleted;
    
    if (isCompleted) {
      li.classList.add('completed');
      playSound('complete');
      
      // Spawn confetti relative to the click coordinates
      const rect = checkbox.getBoundingClientRect();
      spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
      li.classList.remove('completed');
      playSound('add');
    }
    
    saveState();
    updateProgress();
    
    // If active filter is applied, we might need to fade out
    if (activeFilter !== 'all') {
      setTimeout(() => {
        renderTasks();
      }, 300);
    }
  });

  // Delete Task Event
  deleteBtn.addEventListener('click', (e) => {
    playSound('delete');
    
    // Add remove animation
    li.classList.add('remove-anim');
    li.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveState();
      renderTasks();
    });
  });

  return li;
}

function renderTasks() {
  // Clear previous list
  todoList.innerHTML = '';

  const filteredTasks = tasks.filter(task => {
    if (activeFilter === 'active') return !task.completed;
    if (activeFilter === 'completed') return task.completed;
    return true;
  });

  // Toggle Empty State Display
  if (filteredTasks.length === 0) {
    emptyState.classList.remove('hidden');
    todoList.style.display = 'none';
    
    // Change empty emoji based on filter
    const emptyEmoji = emptyState.querySelector('.empty-emoji');
    const emptyTitle = emptyState.querySelector('h3');
    const emptyDesc = emptyState.querySelector('p');

    if (activeFilter === 'completed') {
      emptyEmoji.textContent = '🐢';
      emptyTitle.textContent = 'No done deals yet!';
      emptyDesc.textContent = 'Complete some items to see them shine here!';
    } else if (activeFilter === 'active') {
      emptyEmoji.textContent = '🕶️';
      emptyTitle.textContent = 'Nothing active!';
      emptyDesc.textContent = 'All relaxed and done. Sit back or add another vibe!';
    } else {
      emptyEmoji.textContent = '🏝️';
      emptyTitle.textContent = 'Total Chill Zone!';
      emptyDesc.textContent = 'No tasks here. Go grab a dynamic smoothie or add one!';
    }
  } else {
    emptyState.classList.add('hidden');
    todoList.style.display = 'flex';
    
    filteredTasks.forEach(task => {
      todoList.appendChild(createTaskElement(task));
    });
  }

  updateProgress();
}

function addTask(text, category, urgency) {
  const newTask = {
    id: Date.now(),
    text: text.trim(),
    completed: false,
    category: category,
    urgency: urgency
  };

  tasks.unshift(newTask); // Add to beginning of list
  saveState();
  playSound('add');
  
  // Render new tasks
  renderTasks();
}

/* ==========================================================================
   Helper Utilities
   ========================================================================== */
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Light & Dark theme toggle helpers
function updateThemeIcons(theme) {
  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');
  if (theme === 'light') {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  } else {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  }
}

// Sound toggle helpers
function updateSoundIcons(enabled) {
  const soundOn = soundToggle.querySelector('.sound-on-icon');
  const soundOff = soundToggle.querySelector('.sound-off-icon');
  if (enabled) {
    soundOn.classList.remove('hidden');
    soundOff.classList.add('hidden');
  } else {
    soundOn.classList.add('hidden');
    soundOff.classList.remove('hidden');
  }
}

function randomizePlaceholder() {
  const randomIndex = Math.floor(Math.random() * funnyPlaceholders.length);
  todoInput.placeholder = funnyPlaceholders[randomIndex];
}

/* ==========================================================================
   Event Listeners Setup
   ========================================================================== */
todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const text = todoInput.value;
  const category = categorySelect.value;
  const urgency = document.querySelector('input[name="urgency"]:checked').value;

  if (validateInput(text)) {
    addTask(text, category, urgency);
    todoInput.value = ''; // clear input
    randomizePlaceholder();
  }
});

// Randomize placeholder on input focus
todoInput.addEventListener('focus', randomizePlaceholder);

// Filter tabs clicking
filterBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    filterBtns.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    activeFilter = e.target.dataset.filter;
    renderTasks();
    playSound('add');
  });
});

// Clear Completed Click
clearCompletedBtn.addEventListener('click', () => {
  const completedCount = tasks.filter(t => t.completed).length;
  if (completedCount > 0) {
    playSound('delete');
    
    // Add anim to completed items
    const completedItems = document.querySelectorAll('.todo-item.completed');
    completedItems.forEach(item => {
      item.classList.add('remove-anim');
    });

    // Wait for exit animation
    setTimeout(() => {
      tasks = tasks.filter(t => !t.completed);
      saveState();
      renderTasks();
    }, 350);
  }
});

// Theme Switcher Click
themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('mast_mola_theme', newTheme);
  
  updateThemeIcons(newTheme);
  playSound('add');
});

// Sound Toggle Click
soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('mast_mola_sound', JSON.stringify(soundEnabled));
  
  updateSoundIcons(soundEnabled);
  if (soundEnabled) {
    playSound('add');
  }
});

/* ==========================================================================
   App Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderTasks();
  randomizePlaceholder();
});
