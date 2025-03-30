const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Configuração do servidor
const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://bebelleza.netlify.app", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

// Lógica do WebSocket
io.on('connection', (socket) => {
  console.log(`Jogador conectado: ${socket.id}`);
  
  socket.on('updatePosition', (data) => {
    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      ...data
    });
  });
  
  socket.on('disconnect', () => {
    socket.broadcast.emit('playerLeft', socket.id);
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});