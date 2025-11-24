const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from /public
app.use(express.static('public'));

const waitingUsers = []; // queue of sockets waiting for partner
const partners = new Map(); // socket.id -> partnerSocket.id

function matchUser(socket) {
  // If there is someone waiting, pair them
  while (waitingUsers.length > 0) {
    const other = waitingUsers.shift();
    // Skip if they disconnected
    if (!io.sockets.sockets.get(other.id)) continue;

    // Create a pair
    partners.set(socket.id, other.id);
    partners.set(other.id, socket.id);

    // Notify both users
    socket.emit('partner_found');
    other.emit('partner_found');
    return;
  }

  // No one available – put this user in queue
  waitingUsers.push(socket);
  socket.emit('waiting');
}

function disconnectPartner(socket, notify = true) {
  const partnerId = partners.get(socket.id);
  if (!partnerId) return;

  const partnerSocket = io.sockets.sockets.get(partnerId);

  // Remove the links
  partners.delete(socket.id);
  partners.delete(partnerId);

  // Optionally notify the partner
  if (partnerSocket && notify) {
    partnerSocket.emit('partner_left');
    // Partner goes back into queue automatically
    matchUser(partnerSocket);
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User wants to find a partner
  socket.on('find_partner', () => {
    // If they already have a partner, break that link first
    disconnectPartner(socket, false);
    matchUser(socket);
  });

  // Incoming chat message from this user
  socket.on('chat_message', (msg) => {
    const partnerId = partners.get(socket.id);
    if (!partnerId) {
      // No partner – maybe still waiting
      socket.emit('system_message', 'No partner yet. Please wait…');
      return;
    }

    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit('chat_message', msg);
    }
  });

  // User pressed "Next"
  socket.on('next', () => {
    disconnectPartner(socket, true);
    matchUser(socket);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove from waiting queue if they were there
    const index = waitingUsers.findIndex((s) => s.id === socket.id);
    if (index !== -1) {
      waitingUsers.splice(index, 1);
    }

    // If they had a partner, notify and re-queue that partner
    disconnectPartner(socket, true);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
