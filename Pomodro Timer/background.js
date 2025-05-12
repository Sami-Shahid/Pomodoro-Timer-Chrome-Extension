// Initialize with default values
let timeLeft = 25 * 60;
let originalTime = 25 * 60;  // Store the original time
let isRunning = false;

// Load saved state when extension starts
chrome.storage.local.get(['timeLeft', 'isRunning', 'originalTime'], (result) => {
    console.log('Loading saved state:', result);
    if (result.timeLeft !== undefined) {
        timeLeft = result.timeLeft;
    }
    if (result.originalTime !== undefined) {
        originalTime = result.originalTime;
    }
    if (result.isRunning !== undefined) {
        isRunning = result.isRunning;
        if (isRunning) {
            startTimer();
        }
    }
});

// Save state whenever it changes
function saveState() {
    const state = {
        timeLeft: timeLeft,
        isRunning: isRunning,
        originalTime: originalTime
    };
    console.log('Saving state:', state);
    chrome.storage.local.set(state);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    switch (request.command) {
        case 'start':
            startTimer();
            sendResponse({ success: true, timeLeft, isRunning });
            break;
        case 'pause':
            pauseTimer();
            sendResponse({ success: true, timeLeft, isRunning });
            break;
        case 'reset':
            resetTimer();
            sendResponse({ success: true, timeLeft, isRunning });
            break;
        case 'setTime':
            setTime(request.time);
            sendResponse({ success: true, timeLeft, isRunning });
            break;
        case 'getTime':
            sendResponse({ timeLeft, isRunning });
            break;
        case 'syncState':
            sendResponse({ timeLeft, isRunning, originalTime });
            break;
    }
    return true;
});

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'pomodoroTimer') {
        timeLeft--;
        saveState();

        if (timeLeft <= 0) {
            chrome.alarms.clear('pomodoroTimer');
            isRunning = false;
            saveState();
            showNotification();
        }
    }
});

function startTimer() {
    if (!isRunning) {
        isRunning = true;
        saveState();
        // Create an alarm that fires every second
        chrome.alarms.create('pomodoroTimer', {
            periodInMinutes: 1 / 60 // 1 second
        });
    }
}

function pauseTimer() {
    if (isRunning) {
        chrome.alarms.clear('pomodoroTimer');
        isRunning = false;
        saveState();
    }
}

function resetTimer() {
    chrome.alarms.clear('pomodoroTimer');
    isRunning = false;
    timeLeft = originalTime;  // Reset to original time
    saveState();
}

function setTime(minutes) {
    chrome.alarms.clear('pomodoroTimer');
    isRunning = false;
    timeLeft = minutes;
    originalTime = minutes;  // Update original time when setting new time
    saveState();
}

function showNotification() {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'image48.png',
        title: 'Pomodoro Timer',
        message: 'Time is up!',
        priority: 2
    });
}