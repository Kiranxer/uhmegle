const socket = io();

const statusEl = document.getElementById('status');
const chatWindow = document.getElementById('chatWindow');
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let connected = false;

function addMessage(text, type = 'system') {
  const div = document.createElement('div');
  div.classList.add('message', type);
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setConnectedState(isConnected) {
  connected = isConnected;
  nextBtn.disabled = !isConnected;
  sendBtn.disabled = !isConnected;
}

// UI events
startBtn.addEventListener('click', () => {
  addMessage('Searching for partner…', 'system');
  setStatus('Looking for partner…');
  socket.emit('find_partner');
  startBtn.disabled = true;
});

nextBtn.addEventListener('click', () => {
  addMessage('Skipping to next partner…', 'system');
  setStatus('Looking for a new partner…');
  socket.emit('next');
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!connected) return;

  const text = messageInput.value.trim();
  if (!text) return;

  // Show it locally
  addMessage(text, 'me');

  // Send to server
  socket.emit('chat_message', text);

  messageInput.value = '';
});

// Socket.IO events
socket.on('waiting', () => {
  setStatus('Waiting for another user…');
  setConnectedState(false);
});

socket.on('partner_found', () => {
  addMessage('You are now connected to a stranger. Say hi! 👋', 'system');
  setStatus('Connected');
  setConnectedState(true);
  startBtn.disabled = false; // so they could “Start” again after manual refresh
});

socket.on('partner_left', () => {
  addMessage('Your partner has left the chat.', 'system');
  setStatus('Partner left. Looking for a new one…');
  setConnectedState(false);
});

socket.on('chat_message', (msg) => {
  addMessage(msg, 'partner');
});

socket.on('system_message', (msg) => {
  addMessage(msg, 'system');
});

// When connection first established
socket.on('connect', () => {
  setStatus('Connected to server. Click "Start" to begin.');
});

// When we lose connection to server
socket.on('disconnect', () => {
  setStatus('Disconnected from server.');
  setConnectedState(false);
  startBtn.disabled = true;
  nextBtn.disabled = true;
  sendBtn.disabled = true;
  addMessage('Lost connection to server.', 'system');
});
