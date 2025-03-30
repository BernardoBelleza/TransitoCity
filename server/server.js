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
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Armazenar informações dos jogadores
const players = {};

// Lógica do WebSocket
io.on('connection', (socket) => {
  console.log(`Jogador conectado: ${socket.id}`);
  
  // Inicializar jogador com posição padrão
  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 0,
    z: 0,
    direction: 0,
    color: Math.random() * 0xffffff, // Cor aleatória
    model: 'player'
  };
  
  // Enviar lista de jogadores existentes para o novo jogador
  socket.emit('players', Object.values(players));
  
  // Informar outros jogadores sobre o novo jogador
  socket.broadcast.emit('playerJoined', players[socket.id]);
  
  // Receber atualizações de posição
  socket.on('updatePosition', (data) => {
    // Atualizar dados do jogador
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      players[socket.id].direction = data.direction;
      
      // Transmitir a atualização para outros jogadores
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });
  
  // Quando um jogador desconecta
  socket.on('disconnect', () => {
    console.log(`Jogador desconectado: ${socket.id}`);
    
    // Informar outros jogadores
    socket.broadcast.emit('playerLeft', socket.id);
    
    // Remover da lista de jogadores
    delete players[socket.id];
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});