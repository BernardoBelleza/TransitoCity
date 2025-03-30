import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';

interface PlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  direction: number;
  color: number;
  model: string;
}

export class MultiplayerManager {
  private socket: Socket;
  private scene: THREE.Scene;
  private remotePlayers: Map<string, THREE.Object3D> = new Map();
  private localPlayerId: string;
  private isConnected: boolean = false;
  private beacons: THREE.Mesh[] = [];
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.beacons = [];
    
    // Conectar ao servidor WebSocket
    this.socket = io('http://localhost:3000');
    
    // Configurar eventos do socket
    this.setupSocketEvents();
  }
  
  private setupSocketEvents(): void {
    // Conexão estabelecida
    this.socket.on('connect', () => {
      console.log('Conectado ao servidor. ID:', this.socket.id);
      this.localPlayerId = this.socket.id;
      this.isConnected = true;
    });
    
    // Receber lista inicial de jogadores
    this.socket.on('players', (players: PlayerState[]) => {
      console.log('Recebidos jogadores existentes:', players.length);
      
      players.forEach(player => {
        if (player.id !== this.localPlayerId) {
          this.addRemotePlayer(player);
        }
      });
    });
    
    // Novo jogador entrou
    this.socket.on('playerJoined', (player: PlayerState) => {
      console.log('Novo jogador entrou:', player.id);
      this.addRemotePlayer(player);
    });
    
    // Jogador se moveu
    this.socket.on('playerMoved', (player: PlayerState) => {
      this.updateRemotePlayer(player);
    });
    
    // Jogador saiu
    this.socket.on('playerLeft', (playerId: string) => {
      console.log('Jogador saiu:', playerId);
      this.removeRemotePlayer(playerId);
    });
    
    // Desconexão
    this.socket.on('disconnect', () => {
      console.log('Desconectado do servidor');
      this.isConnected = false;
      
      // Limpar jogadores remotos
      this.clearRemotePlayers();
    });
  }
  
  // Adicionar um jogador remoto à cena
  private addRemotePlayer(player: PlayerState): void {
    // Verificar se já existe
    if (this.remotePlayers.has(player.id)) return;
    
    // Grupo para o jogador e seus elementos visuais
    const playerGroup = new THREE.Group();
    
    // Modelo do jogador (cubo colorido)
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: player.color || 0x3366FF,
      metalness: 0.3,
      roughness: 0.7 
    });
    const playerMesh = new THREE.Mesh(geometry, material);
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true;
    playerGroup.add(playerMesh);
    
    // Adicionar um farol girando acima do jogador
    const beaconGeometry = new THREE.CylinderGeometry(0, 0.5, 1, 8);
    const beaconMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFFFF00,
      transparent: true,
      opacity: 0.8
    });
    const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
    beacon.position.y = 3;
    beacon.userData.rotationSpeed = 3; // Velocidade de rotação
    playerGroup.add(beacon);
    
    // Adicionar um círculo no solo sob o jogador
    const ringGeometry = new THREE.RingGeometry(1.2, 1.5, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: player.color || 0x3366FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2; // Horizontal
    ring.position.y = 0.1; // Ligeiramente acima do solo
    playerGroup.add(ring);
    
    // Adicionar nome do jogador
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'Bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Jogador ${player.id.substring(0, 5)}`, 128, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const nameSprite = new THREE.Sprite(spriteMaterial);
    nameSprite.position.y = 3.5;
    nameSprite.scale.set(3, 0.75, 1);
    playerGroup.add(nameSprite);
    
    // Posicionar o grupo
    playerGroup.position.set(player.x, player.y, player.z);
    
    // Adicionar à cena
    this.scene.add(playerGroup);
    
    // Salvar no mapa
    this.remotePlayers.set(player.id, playerGroup);
    
    // Função de animação do farol (adicionar ao loop principal)
    this.beacons.push(beacon);
  }
  
  // Atualizar a posição de um jogador remoto
  private updateRemotePlayer(player: PlayerState): void {
    const playerMesh = this.remotePlayers.get(player.id);
    if (playerMesh) {
      // Atualizar posição
      playerMesh.position.set(player.x, player.y + 1, player.z);
      
      // Atualizar rotação baseado na direção
      const rotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2]; // N, L, S, O
      playerMesh.rotation.y = rotations[player.direction];
    }
  }
  
  // Remover um jogador remoto
  private removeRemotePlayer(playerId: string): void {
    const playerMesh = this.remotePlayers.get(playerId);
    if (playerMesh) {
      this.scene.remove(playerMesh);
      this.remotePlayers.delete(playerId);
    }
  }
  
  // Limpar todos os jogadores remotos
  private clearRemotePlayers(): void {
    this.remotePlayers.forEach((mesh, id) => {
      this.scene.remove(mesh);
    });
    this.remotePlayers.clear();
  }
  
  // Enviar atualização de posição do jogador local
  public updatePosition(x: number, y: number, z: number, direction: number): void {
    if (!this.isConnected) return;
    
    this.socket.emit('updatePosition', {
      x, y, z, direction
    });
  }
  
  // Método para atualizar quando o jogador se move com as teclas
  public movePlayer(position: THREE.Vector3, direction: number): void {
    this.updatePosition(position.x, position.y, position.z, direction);
  }
  
  // Atualizar os faróis giratórios
  public updateBeacons(deltaTime: number): void {
    for (const beacon of this.beacons) {
      beacon.rotation.y += beacon.userData.rotationSpeed * deltaTime;
    }
  }
  
  // Retornar objeto 3D de um jogador remoto pelo ID
  public getRemotePlayer(id: string): THREE.Object3D | null {
    return this.remotePlayers.get(id) || null;
  }

  // Retornar lista de IDs de jogadores conectados
  public getConnectedPlayerIds(): string[] {
    return Array.from(this.remotePlayers.keys());
  }
}