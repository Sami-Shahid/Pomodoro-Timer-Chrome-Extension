let timeLeft = 25 * 60;
let originalTime = 25 * 60;
let isRunning = false;
let timerDisplay;
let startButton;
let resetButton;
let pomodoroButton;
let minutesInput;
let secondsInput;
let setCustomButton;

// Format time as MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Update the display
function updateDisplay() {
    if (timerDisplay) {
        timerDisplay.textContent = formatTime(timeLeft);
    }
}

// Sync state with background script
function syncState() {
    chrome.runtime.sendMessage({ command: 'syncState' }, (response) => {
        console.log('Syncing state:', response);
        if (response) {
            timeLeft = response.timeLeft;
            originalTime = response.originalTime;
            isRunning = response.isRunning;
            updateDisplay();
            updateButtonState();
            // Update inputs to show current time
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            minutesInput.value = minutes;
            secondsInput.value = seconds;
        }
    });
}

// Update button state based on timer status
function updateButtonState() {
    if (!startButton) return;

    if (isRunning) {
        startButton.textContent = 'Pause';
        startButton.classList.add('pause');
    } else {
        startButton.textContent = 'Start';
        startButton.classList.remove('pause');
    }
}

// Validate and set custom time
function setCustomTime() {
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;

    // Validate input
    if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        // Reset invalid inputs
        minutesInput.value = '0';
        secondsInput.value = '0';
        return;
    }

    const totalSeconds = minutes * 60 + seconds;

    if (totalSeconds > 0) {
        chrome.runtime.sendMessage({ command: 'setTime', time: totalSeconds }, (response) => {
            if (response && response.success) {
                isRunning = response.isRunning;
                timeLeft = response.timeLeft;
                updateDisplay();
                updateButtonState();
                pomodoroButton.classList.remove('active');
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    timerDisplay = document.getElementById('timer');
    startButton = document.getElementById('start');
    resetButton = document.getElementById('reset');
    pomodoroButton = document.getElementById('pomodoro');
    minutesInput = document.getElementById('minutes');
    secondsInput = document.getElementById('seconds');
    setCustomButton = document.getElementById('set-custom');
    const themeToggle = document.getElementById('theme-toggle');

    // Load saved theme preference
    chrome.storage.local.get(['theme'], (result) => {
        if (result.theme === 'light') {
            document.body.classList.add('light-mode');
            themeToggle.checked = true;
        }
    });

    // Handle theme toggle
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('light-mode');
            chrome.storage.local.set({ theme: 'light' });
        } else {
            document.body.classList.remove('light-mode');
            chrome.storage.local.set({ theme: 'dark' });
        }
    });

    // Start/Pause timer
    startButton.addEventListener('click', () => {
        if (isRunning) {
            chrome.runtime.sendMessage({ command: 'pause' }, (response) => {
                if (response && response.success) {
                    isRunning = response.isRunning;
                    timeLeft = response.timeLeft;
                    updateButtonState();
                }
            });
        } else {
            chrome.runtime.sendMessage({ command: 'start' }, (response) => {
                if (response && response.success) {
                    isRunning = response.isRunning;
                    timeLeft = response.timeLeft;
                    updateButtonState();
                }
            });
        }
    });

    // Reset timer
    resetButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ command: 'reset' }, (response) => {
            if (response && response.success) {
                isRunning = response.isRunning;
                timeLeft = response.timeLeft;
                updateDisplay();
                updateButtonState();
                // Reset inputs to match current time
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                minutesInput.value = minutes;
                secondsInput.value = seconds;
            }
        });
    });

    // Pomodoro button
    pomodoroButton.addEventListener('click', () => {
        if (!isRunning) {
            const pomodoroSeconds = 25 * 60; // 25 minutes in seconds
            chrome.runtime.sendMessage({ command: 'setTime', time: pomodoroSeconds }, (response) => {
                if (response && response.success) {
                    isRunning = response.isRunning;
                    timeLeft = response.timeLeft;
                    updateDisplay();
                    updateButtonState();
                    pomodoroButton.classList.add('active');
                    // Update inputs to show current time
                    minutesInput.value = Math.floor(timeLeft / 60);
                    secondsInput.value = timeLeft % 60;
                }
            });
        }
    });

    // Input validation
    function validateInput(input) {
        let value = parseInt(input.value) || 0;
        if (value < 0) value = 0;
        if (value > 59) value = 59;
        input.value = value;
    }

    minutesInput.addEventListener('input', () => validateInput(minutesInput));
    secondsInput.addEventListener('input', () => validateInput(secondsInput));

    // Set custom time button
    setCustomButton.addEventListener('click', setCustomTime);

    // Allow Enter key to set custom time
    minutesInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setCustomTime();
        }
    });
    secondsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setCustomTime();
        }
    });

    // Initial state sync
    syncState();
});

// Listen for state updates from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'stateUpdate') {
        timeLeft = request.timeLeft;
        isRunning = request.isRunning;
        updateDisplay();
        updateButtonState();
    }
});

// Update display every second
setInterval(() => {
    if (isRunning) {
        chrome.runtime.sendMessage({ command: 'getTime' }, (response) => {
            if (response) {
                timeLeft = response.timeLeft;
                isRunning = response.isRunning;
                updateDisplay();
                updateButtonState();
            }
        });
    }
}, 1000);