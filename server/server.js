const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Configuração do servidor
const app = express();
app.use(cors());

// Armazenamento de jogadores
const players = {};

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://bebelleza.netlify.app", 
      "http://localhost:5173",
      "https://bebelleza.space",
      "https://transitocity.netlify.app" // Adicione todas as origens possíveis
    ],
    methods: ["GET", "POST"]
  }
});

// Endpoint para verificar status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    connectedPlayers: Object.keys(players).length,
    playerIds: Object.keys(players),
    uptime: process.uptime()
  });
});

// Lógica do WebSocket
io.on('connection', (socket) => {
  console.log(`Jogador conectado: ${socket.id}`);
  
  // Inicializar jogador com posição padrão
  players[socket.id] = {
    id: socket.id,
    position: { x: 0, y: 0, z: 0 },
    direction: 0,
    color: Math.floor(Math.random() * 0xffffff) // Cor aleatória
  };
  
  // Enviar lista de jogadores existentes para o novo jogador
  socket.emit('players', Object.values(players));
  
  // Informar outros jogadores sobre o novo jogador
  socket.broadcast.emit('playerJoined', players[socket.id]);
  
  // Atualizar posição
  socket.on('updatePosition', (data) => {
    // Atualizar dados do jogador no servidor
    if (players[socket.id]) {
      players[socket.id].position = data.position || players[socket.id].position;
      players[socket.id].direction = data.direction !== undefined ? 
                                     data.direction : players[socket.id].direction;
    }
    
    // Transmitir para outros jogadores
    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      ...data
    });
  });
  
  // Quando um jogador desconecta
  socket.on('disconnect', () => {
    console.log(`Jogador desconectado: ${socket.id}`);
    socket.broadcast.emit('playerLeft', socket.id);
    delete players[socket.id]; // Remover jogador do armazenamento
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});