import './style.css'
import * as THREE from 'three';
import { CameraControls } from './camera/camera-controls';
import { ModelLoader } from './models/model-loader';
import { RaycasterManager } from './interaction/raycaster-manager';
import { RoadSystem } from './roads/road-system';
import { VehicleController, VehicleDirection } from './vehicles/vehicle-controller';
import { GameConfig } from './config/game-config';
import { TrafficLightSystem } from './traffic/traffic-light-system';
import { BuildingManager } from './buildings/building-manager';
import { BuildingType } from './buildings/building-types';
import { LightingManager, TimeOfDay } from './environment/lighting-manager';
import { TimeController } from './ui/time-controller';
import { StreetLights } from './environment/street-lights';
import { MultiplayerManager } from './multiplayer/multiplayer-manager';
import { WeatherManager, WeatherType } from './environment/weather-manager';

// Adicione no início do arquivo main.ts
const NETWORK_UPDATE_RATE = 10; // 10 atualizações por segundo (100ms)
let lastNetworkUpdate = 0;

// Removendo o conteúdo padrão do Vite
document.querySelector<HTMLDivElement>('#app')?.remove();

// Criando a cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(GameConfig.WORLD_BACKGROUND_COLOR);

// Onde você inicializa os sistemas
const lightingManager = new LightingManager(scene);
const roadSystem = new RoadSystem(scene);

// Adicione esta linha para desativar o grid por padrão
// roadSystem.toggleGridOutlines(); // Começar com o grid desativado

const buildingManager = new BuildingManager(scene, roadSystem, lightingManager);
const streetLights = new StreetLights(scene, roadSystem, lightingManager);
// Adicione esta linha
const weatherManager = new WeatherManager(scene, lightingManager);

// Inicializar o controlador de tempo (opcional - para interface do usuário)
// const timeController = new TimeController(lightingManager);

// Inicializando o sistema multiplayer
const multiplayerManager = new MultiplayerManager(scene);

// Criando a câmera
const camera = new THREE.PerspectiveCamera(
  75,                                    // Campo de visão em graus
  window.innerWidth / window.innerHeight, // Proporção da tela (aspect ratio)
  0.1,                                   // Plano de corte próximo
  1000                                   // Plano de corte distante
);
const [camX, camY, camZ] = GameConfig.CAMERA_INITIAL_POSITION;
camera.position.set(camX, camY, camZ);
const [lookX, lookY, lookZ] = GameConfig.CAMERA_LOOK_AT;
camera.lookAt(lookX, lookY, lookZ);

// Criando o renderizador
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras mais suaves
document.body.appendChild(renderer.domElement);

// Configurando controles de câmera
const cameraControls = new CameraControls(camera, renderer.domElement);

// Adicione estas variáveis
let cameraMode = 'free'; // 'free', 'follow', 'top'
const followOffset = new THREE.Vector3(0, 5, 10); // Distância da câmera ao seguir
let cameraLookTarget = new THREE.Vector3();
let smoothCameraFollow = true; // Ativa/desativa interpolação suave da câmera
let smoothFactor = 0.1; // Velocidade de interpolação (menor = mais suave)

// Adicione uma nova variável global para armazenar a última direção
let lastPlayerDirection = new THREE.Vector3(0, 0, -1); // Inicia olhando para o norte

// Criando um plano para o chão (grama)
const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x228B22,
  roughness: 0.8,
  metalness: 0.0
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotacionar para ficar horizontal
ground.position.y = -0.05; // Ligeiramente abaixo da estrada
ground.receiveShadow = true;
ground.castShadow = false; // O chão não projeta sombra
scene.add(ground);

// Configurando uma cidade com estradas e construções
// 0 = vazio ainda, 1 = rua reta, 2 = interseção
// 5 = casa, 6 = prédio, 7 = loja, 8 = hotel
const cityMap = [
  [0, 6, 1, 7, 8, 1, 5],
  [8, 7, 1, 6, 5, 1, 6],
  [1, 1, 2, 1, 1, 2, 1],
  [5, 8, 1, 7, 6, 1, 7],
  [7, 6, 1, 5, 8, 1, 8],
  [1, 1, 2, 1, 1, 2, 5],
  [0, 5, 1, 8, 7, 1, 0],
];

// Modificando o código para separar a configuração de estradas e construções
// Primeiro, criar um mapa apenas com estradas (1 e 2) e deixar o resto vazio (0)
const roadOnlyMap = cityMap.map(row => 
  row.map(value => (value === 1 || value === 2) ? value : 0)
);

// Aplicar apenas as estradas ao sistema de estradas
roadSystem.setRoadMap(roadOnlyMap);

// Desativar os contornos do grid imediatamente após criar o mapa
roadSystem.setGridOutlinesVisible(false);

// Agora o buildingManager usará o cityMap original, que contém informações
// de construções (valores 5-8) e ainda saberá onde estão as estradas
console.log("Iniciando sistema de construções...");
buildingManager.placeBuildingsFromCityMap(cityMap);

// Adicionar uma função para verificar manualmente cada posição
function checkBuildingPlacement() {
  for (let y = 0; y < cityMap.length; y++) {
    for (let x = 0; x < cityMap[y].length; x++) {
      const value = cityMap[y][x];
      if (value >= 5 && value <= 9) {
        console.log(`Posição (${x}, ${y}) contém: ${value}`);
        // Teste direto de colocação
        if (value === 5) buildingManager.placeBuilding(x, y, BuildingType.HOUSE);
        if (value === 6) buildingManager.placeBuilding(x, y, BuildingType.APARTMENT);
        if (value === 7) buildingManager.placeBuilding(x, y, BuildingType.SHOP);
        if (value === 8) buildingManager.placeBuilding(x, y, BuildingType.HOTEL);
        if (value === 9) buildingManager.placeBuilding(x, y, BuildingType.SPECIAL);
      }
    }
  }
}

// Comentar a linha que chama placeBuildingsFromCityMap e descomente esta:
// checkBuildingPlacement();

// Inicializando o sistema de sinaleiras APÓS configurar o mapa
const trafficLightSystem = new TrafficLightSystem(scene, roadSystem);

// Carro 1 e seu controlador
let carModel1: THREE.Object3D;
let vehicleController1: VehicleController;

// Carro 2 e seu controlador (direção oposta)
let carModel2: THREE.Object3D;
let vehicleController2: VehicleController;

// Criar um jogador controlável simples
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xff0000,
  metalness: 0.3,
  roughness: 0.7 
});
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 1, 0);
player.castShadow = true;
player.receiveShadow = true;
scene.add(player);

// Variáveis para controle do jogador
let playerDirection = 0; // 0=Norte, 1=Leste, 2=Sul, 3=Oeste
const playerSpeed = 0.1;
const playerRotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2]; // N, L, S, O

// Controles do jogador
const playerControls = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

// Variáveis para controle de movimento
let targetPosition: THREE.Vector3 | null = null;
let isMovingToTarget = false;
let movementMarker: THREE.Mesh | null = null;

// Eventos de teclado para mover o jogador
document.addEventListener('keydown', (event) => {
  // Teclas existentes...
  
  // Teclas para controlar o jogador
  switch(event.key) {
    case 'ArrowUp':
      playerControls.forward = true;
      break;
    case 'ArrowDown':
      playerControls.backward = true;
      break;
    case 'ArrowLeft':
      playerControls.left = true;
      break;
    case 'ArrowRight':
      playerControls.right = true;
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch(event.key) {
    case 'ArrowUp':
      playerControls.forward = false;
      break;
    case 'ArrowDown':
      playerControls.backward = false;
      break;
    case 'ArrowLeft':
      playerControls.left = false;
      break;
    case 'ArrowRight':
      playerControls.right = false;
      break;
  }
});

// Adicione ao event listener
document.addEventListener('keydown', (event) => {
  // Teclas existentes...
  
  // Tecla 'V' para alternar modos de câmera
  if (event.key === 'v' || event.key === 'V') {
    switch(cameraMode) {
      case 'free':
        cameraMode = 'follow';
        console.log("Câmera: Seguindo jogador");
        break;
      case 'follow':
        cameraMode = 'top';
        console.log("Câmera: Visão aérea");
        break;
      case 'top':
        cameraMode = 'free';
        console.log("Câmera: Livre");
        break;
    }
  }
});

// Adicionar esta funcionalidade para capturar teclas
document.addEventListener('keydown', (event) => {
  // Tecla 'G' para alternar a visualização da grade
  if (event.key === 'g' || event.key === 'G') {
    roadSystem.toggleGridOutlines();
  }
});

// Carregando o modelo 3D do primeiro carro
const modelLoader = new ModelLoader();

modelLoader.loadModel(
  '/models/Rally.glb',
  (model) => {
    // Configurando o primeiro carro (direcão leste)
    carModel1 = model;
    carModel1.scale.set(
      GameConfig.VEHICLE_SCALE, 
      GameConfig.VEHICLE_SCALE, 
      GameConfig.VEHICLE_SCALE
    );
    scene.add(carModel1);
    
    // Não é necessário definir a posição Y aqui, pois ela será definida pelo controlador
    
    // Criando o controlador para o primeiro carro
    vehicleController1 = new VehicleController(
      carModel1, 
      roadSystem, 
      2, 2, 
      VehicleDirection.EAST,
      trafficLightSystem
    );
    
    // Carregando o segundo carro
    modelLoader.loadModel(
      '/models/Rally.glb',
      (model2) => {
        carModel2 = model2;
        carModel2.scale.set(
          GameConfig.VEHICLE_SCALE, 
          GameConfig.VEHICLE_SCALE, 
          GameConfig.VEHICLE_SCALE
        );
        
        // Mudando a cor do segundo carro para diferenciar
        model2.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material = child.material.map(m => {
                const newMat = m.clone();
                newMat.color.setHex(0x3366FF); // Cor azul
                return newMat;
              });
            } else {
              const newMat = child.material.clone();
              newMat.color.setHex(0x3366FF); // Cor azul
              child.material = newMat;
            }
          }
        });
        
        scene.add(carModel2);
        
        // Não é necessário definir a posição Y aqui, pois ela será definida pelo controlador
        
        // Criando o controlador para o segundo carro (direção oposta)
        vehicleController2 = new VehicleController(
          carModel2, 
          roadSystem, 
          2, 5, 
          VehicleDirection.WEST,
          trafficLightSystem
        );
      }
    );
  }
);

// Configurando o raycaster para detectar cliques
const raycasterManager = new RaycasterManager(camera);

// Substitua ou modifique o event listener de clique existente
window.addEventListener('click', (event) => {
  // Ignorar cliques em UI
  const clickedElement = event.target as HTMLElement;
  if (clickedElement.tagName === 'BUTTON' || 
      clickedElement.closest('.ui-element')) {
    return;
  }

  raycasterManager.setFromMouseEvent(event);
  
  // Verificar interseção com o plano do chão
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = raycasterManager["raycaster"];
  
  if (raycaster) {
    const intersection = new THREE.Vector3();
    const intersects = raycaster.ray.intersectPlane(groundPlane, intersection);
    
    if (intersects) {
      console.log(`Clique em: (${intersection.x.toFixed(2)}, ${intersection.z.toFixed(2)})`);
      
      // Definir o novo destino
      targetPosition = new THREE.Vector3(
        intersection.x,
        player.position.y, // Manter a mesma altura
        intersection.z
      );
      
      // Define o ponto clicado como alvo da câmera também
      cameraLookTarget.copy(targetPosition);
      
      isMovingToTarget = true;
      
      // Calcular a direção para o destino (para girar o jogador)
      updatePlayerDirectionToTarget();
      
      // Adicionar marcador visual
      addClickMarker(intersection);
      
      // Sempre mudar para o modo "follow" quando clicar
      cameraMode = 'follow';
      console.log("Câmera: Seguindo jogador olhando para o destino");
    }
  }
});

// Função para adicionar marcador visual no local clicado
function addClickMarker(position) {
  // Remover marcador anterior se existir
  if (movementMarker) {
    scene.remove(movementMarker);
  }
  
  // Criar novo marcador
  const markerGeometry = new THREE.RingGeometry(0.5, 0.7, 32);
  const markerMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ffff, 
    transparent: true, 
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  
  movementMarker = new THREE.Mesh(markerGeometry, markerMaterial);
  movementMarker.position.copy(position);
  movementMarker.position.y = 0.1; // Ligeiramente acima do solo
  movementMarker.rotation.x = -Math.PI / 2; // Horizontal
  
  // Adicionar efeito de pulso
  movementMarker.userData = {
    pulseTime: 0,
    pulseSpeed: 3,
    originalScale: 1,
    maxScale: 1.5
  };
  
  scene.add(movementMarker);
}

// Função para calcular a direção para o destino
function updatePlayerDirectionToTarget() {
  if (!targetPosition) return;
  
  // Calcular ângulo para o destino
  const dx = targetPosition.x - player.position.x;
  const dz = targetPosition.z - player.position.z;
  
  // Determinar a melhor direção (norte, leste, sul, oeste)
  let angle = Math.atan2(dx, -dz); // Ângulo em radianos
  
  // Converter ângulo para nossa representação de direção (0-3)
  // Dividir o círculo em 4 partes e mapear para nossas direções
  // Norte: -π/4 a π/4
  // Leste: π/4 a 3π/4
  // Sul: 3π/4 a -3π/4
  // Oeste: -3π/4 a -π/4
  
  if (angle > -Math.PI/4 && angle <= Math.PI/4) {
    playerDirection = 0; // Norte
  } else if (angle > Math.PI/4 && angle <= 3*Math.PI/4) {
    playerDirection = 1; // Leste
  } else if (angle > 3*Math.PI/4 || angle <= -3*Math.PI/4) {
    playerDirection = 2; // Sul
  } else {
    playerDirection = 3; // Oeste
  }
  
  // Aplicar rotação
  player.rotation.y = playerRotations[playerDirection];
}

// Adicionar comandos de teclado

// document.addEventListener('keydown', (event) => {
//   // Teclas para destacar direções
//   switch(event.key) {
//     case 'n': // Norte
//       highlightDirection('north');
//       break;
//     case 's': // Sul
//       highlightDirection('south');
//       break;
//     case 'e': // Leste
//       highlightDirection('east');
//       break;
//     case 'w': // Oeste
//       highlightDirection('west');
//       break;
//   }
// });

// Adicionar ao event listener de teclas
document.addEventListener('keydown', (event) => {
  // Teclas existentes...
  
  // Tecla 'B' para gerar construções aleatórias
  if (event.key === 'b' || event.key === 'B') {
    buildingManager.generateRandomBuildings();
    console.log("Construções geradas aleatoriamente");
  }
  
  // Tecla 'C' para limpar construções
  if (event.key === 'c' || event.key === 'C') {
    // Implementar limpeza se necessário
  }
  
  // Números 5-8 para selecionar tipo de construção ativa
  if (event.key >= '5' && event.key <= '8') {
    const buildingType = parseInt(event.key);
    console.log(`Tipo de construção selecionado: ${buildingType}`);
    // Pode ser usado para colocar construções com o mouse depois
  }
});

// Tecla 'L' para debug do sistema de iluminação
document.addEventListener('keydown', (event) => {
  if (event.key === 'l' || event.key === 'L') {
    const timeOfDay = lightingManager.getTimeOfDay();
    const dayProgress = lightingManager.getDayProgress();
    
    console.log(`Estado atual do LightingManager:
      - Período: ${TimeOfDay[timeOfDay]}
      - Progresso do dia: ${dayProgress.toFixed(3)}
      - Hora aproximada: ${Math.floor(dayProgress * 24)}:${Math.floor((dayProgress * 24 * 60) % 60).toString().padStart(2, '0')}
    `);
    
    // Forçar manual update
    lightingManager.updateLighting();
  }
});

// Adicione ao event listener de teclado
document.addEventListener('keydown', (event) => {
  // Teclas existentes...
  
  // Tecla 'W' para testar diferentes condições climáticas
  if (event.key === 'w' || event.key === 'W') {
    const weatherTypes = Object.keys(WeatherType)
      .filter(key => isNaN(Number(key)))
      .map(key => WeatherType[key]);
    
    const nextWeatherIndex = (weatherTypes.indexOf(weatherManager.getCurrentWeather()) + 1) % weatherTypes.length;
    weatherManager.setWeather(nextWeatherIndex);
    console.log(`Clima alterado para: ${WeatherType[nextWeatherIndex]}`);
  }
  
  // Tecla 'R' para atualizar os dados climáticos da API
  if (event.key === 'r' || event.key === 'R') {
    weatherManager.fetchWeatherData();
    console.log("Atualizando dados climáticos...");
  }
});

// Função para destacar uma direção temporariamente
function highlightDirection(direction) {
  // Coordenadas de cada direção
  const directionCoords = {
    'north': new THREE.Vector3(0, 0, -100),
    'south': new THREE.Vector3(0, 0, 100),
    'east': new THREE.Vector3(100, 0, 0),
    'west': new THREE.Vector3(-100, 0, 0)
  };
  
  // Cores para cada direção
  const directionColors = {
    'north': 0x0000FF, // Azul
    'south': 0xFF0000, // Vermelho
    'east': 0x00FF00,  // Verde
    'west': 0xFFFF00   // Amarelo
  };
  
  // Criar um raio temporário
  const rayGeometry = new THREE.CylinderGeometry(0.5, 0.5, 200, 8);
  rayGeometry.rotateX(Math.PI / 2); // Alinhar com o eixo Z
  
  const rayMaterial = new THREE.MeshBasicMaterial({ 
    color: directionColors[direction],
    transparent: true,
    opacity: 0.7
  });
  
  const ray = new THREE.Mesh(rayGeometry, rayMaterial);
  
  // Rotacionar o raio para a direção correta
  if (direction === 'east') {
    ray.rotation.y = Math.PI / 2;
  } else if (direction === 'west') {
    ray.rotation.y = -Math.PI / 2;
  } else if (direction === 'south') {
    ray.rotation.y = Math.PI;
  }
  
  // Posicionar na origem
  ray.position.set(0, 1, 0);
  
  // Adicionar à cena
  scene.add(ray);
  
  // Adicionar texto da direção
  const textCanvas = document.createElement('canvas');
  textCanvas.width = 256;
  textCanvas.height = 128;
  const ctx = textCanvas.getContext('2d');
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
  
  ctx.font = 'Bold 48px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(direction.toUpperCase(), textCanvas.width/2, textCanvas.height/2);
  
  const texture = new THREE.CanvasTexture(textCanvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.copy(directionCoords[direction].clone().multiplyScalar(0.5));
  sprite.position.y = 10;
  sprite.scale.set(20, 10, 1);
  
  scene.add(sprite);
  
  // Remover após alguns segundos
  setTimeout(() => {
    scene.remove(ray);
    scene.remove(sprite);
    ray.geometry.dispose();
    ray.material.dispose();
    sprite.material.map.dispose();
    sprite.material.dispose();
  }, 2000);
}

// Variáveis para controle de tempo
let previousTime = 0;

// Adicione função para exibir informações de veículos

function createDebugPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.style.position = 'absolute';
  panel.style.top = '10px';
  panel.style.left = '10px';
  panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  panel.style.color = 'white';
  panel.style.padding = '10px';
  panel.style.fontFamily = 'monospace';
  panel.style.fontSize = '12px';
  panel.style.zIndex = '1000';
  document.body.appendChild(panel);
  return panel;
}

// const debugPanel = createDebugPanel();

// Versão mais simples usando sprites

function addSimpleDirectionMarkers() {
  // Criar canvas para cada direção
  function createTextCanvas(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Fundo transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar texto
    ctx.font = 'Bold 80px Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width/2, canvas.height/2);
    
    return canvas;
  }
  
  // Criar sprite para cada direção
  function createDirectionSprite(text, position, color) {
    const canvas = createTextCanvas(text, color);
    const texture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(10, 10, 1);
    
    scene.add(sprite);
    return sprite;
  }
  
  // Adicionar marcadores
  createDirectionSprite('N', new THREE.Vector3(0, 5, -60), '#0066FF');
  createDirectionSprite('S', new THREE.Vector3(0, 5, 60), '#FF0000');
  createDirectionSprite('E', new THREE.Vector3(60, 5, 0), '#00CC00');
  createDirectionSprite('W', new THREE.Vector3(-60, 5, 0), '#FFCC00');
}

// Chamar a função
addSimpleDirectionMarkers();

// Adicione essa função no arquivo main.ts
function teleportToPlayer(id: string): void {
  const remotePlayer = multiplayerManager.getRemotePlayer(id);
  if (remotePlayer) {
    // Teleportar para 5 unidades atrás do jogador remoto
    const position = remotePlayer.position.clone();
    player.position.copy(position);
    
    // Adicionar efeito visual
    const teleportEffect = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.5, 16, 100),
      new THREE.MeshBasicMaterial({ 
        color: 0x00FFFF, 
        transparent: true, 
        opacity: 0.7 
      })
    );
    teleportEffect.position.copy(player.position);
    teleportEffect.rotation.x = Math.PI / 2;
    scene.add(teleportEffect);
    
    // Animar e remover o efeito
    let scale = 0.1;
    const expandInterval = setInterval(() => {
      scale += 0.2;
      teleportEffect.scale.set(scale, scale, scale);
      teleportEffect.material.opacity -= 0.05;
      
      if (scale >= 3) {
        clearInterval(expandInterval);
        scene.remove(teleportEffect);
      }
    }, 50);
  }
}

// Adicione controle pelo teclado (teclas numéricas para teleportar)
document.addEventListener('keydown', (event) => {
  // Teclas existentes...
  
  // Teclas numéricas (1-9) para teleportar para jogadores
  if (event.key >= '1' && event.key <= '9') {
    const playerIndex = parseInt(event.key) - 1;
    const playerIds = multiplayerManager.getConnectedPlayerIds();
    
    if (playerIndex < playerIds.length) {
      teleportToPlayer(playerIds[playerIndex]);
    }
  }
  
  // Tecla 'P' para mostrar lista de jogadores
  if (event.key === 'p' || event.key === 'P') {
    showPlayerList();
  }
});

// Exibir lista de jogadores conectados
function showPlayerList(): void {
  const playerIds = multiplayerManager.getConnectedPlayerIds();
  const playerInfo = playerIds.map((id, index) => 
    `${index+1}: Jogador ${id.substring(0, 5)}`
  ).join('\n');
  
  // Criar elemento na tela
  const listElement = document.createElement('div');
  listElement.style.position = 'absolute';
  listElement.style.top = '50%';
  listElement.style.left = '50%';
  listElement.style.transform = 'translate(-50%, -50%)';
  listElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  listElement.style.color = 'white';
  listElement.style.padding = '20px';
  listElement.style.borderRadius = '5px';
  listElement.style.fontFamily = 'monospace';
  listElement.style.zIndex = '1000';
  listElement.style.width = '300px';
  
  listElement.innerHTML = `
    <h3>Jogadores Conectados</h3>
    <p>Pressione tecla numérica para teleportar</p>
    <pre>${playerInfo}</pre>
    <button id="close-player-list">Fechar</button>
  `;
  
  document.body.appendChild(listElement);
  
  // Fechar a lista
  document.getElementById('close-player-list').addEventListener('click', () => {
    document.body.removeChild(listElement);
  });
}

// Função para criar um minimapa
function createMinimap(): void {
  // Criar elemento canvas para o minimapa
  const minimapCanvas = document.createElement('canvas');
  minimapCanvas.width = 200;
  minimapCanvas.height = 200;
  minimapCanvas.id = 'minimap';
  minimapCanvas.style.position = 'absolute';
  minimapCanvas.style.bottom = '20px';
  minimapCanvas.style.right = '20px';
  minimapCanvas.style.border = '2px solid white';
  minimapCanvas.style.borderRadius = '100px';
  minimapCanvas.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  document.body.appendChild(minimapCanvas);
  
  // Função para atualizar o minimapa
  function updateMinimap() {
    const ctx = minimapCanvas.getContext('2d');
    const mapSize = roadSystem.getMapWidth() * roadSystem.getTileSize();
    const scale = 180 / mapSize; // Escala para o tamanho do canvas
    
    // Limpar canvas
    ctx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Desenhar fundo
    ctx.fillStyle = 'rgba(0, 100, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(100, 100, 90, 0, Math.PI * 2);
    ctx.fill();
    
    // Desenhar estradas
    ctx.fillStyle = 'rgba(50, 50, 50, 0.7)';
    roadSystem.getRoadMap().forEach((row, y) => {
      row.forEach((tile, x) => {
        if (tile.type !== 0) {
          const screenX = 100 + (tile.position.x * scale);
          const screenY = 100 + (tile.position.z * scale);
          ctx.fillRect(screenX - 5, screenY - 5, 10, 10);
        }
      });
    });
    
    // Desenhar jogador local
    ctx.fillStyle = 'red';
    const playerX = 100 + (player.position.x * scale);
    const playerY = 100 + (player.position.z * scale);
    ctx.beginPath();
    ctx.arc(playerX, playerY, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Desenhar direção do jogador
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(playerX, playerY);
    let dirX = 0, dirY = 0;
    
    switch(playerDirection) {
      case 0: dirY = -8; break; // Norte
      case 1: dirX = 8; break;  // Leste
      case 2: dirY = 8; break;  // Sul
      case 3: dirX = -8; break; // Oeste
    }
    
    ctx.lineTo(playerX + dirX, playerY + dirY);
    ctx.stroke();
    
    // Desenhar jogadores remotos
    const playerIds = multiplayerManager.getConnectedPlayerIds();
    playerIds.forEach(id => {
      const remotePlayer = multiplayerManager.getRemotePlayer(id);
      if (remotePlayer) {
        ctx.fillStyle = 'blue';
        const rpX = 100 + (remotePlayer.position.x * scale);
        const rpY = 100 + (remotePlayer.position.z * scale);
        ctx.beginPath();
        ctx.arc(rpX, rpY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Animar
    requestAnimationFrame(updateMinimap);
  }
  
  // Iniciar atualização do minimapa
  updateMinimap();
}

// Chamar a função para criar o minimapa
createMinimap();

// Adicione esta função para mostrar instruções
function showInstructions(): void {
  const instructions = document.createElement('div');
  instructions.style.position = 'absolute';
  instructions.style.top = '10px';
  instructions.style.right = '10px';
  instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  instructions.style.color = 'white';
  instructions.style.padding = '10px';
  instructions.style.borderRadius = '5px';
  instructions.style.fontFamily = 'Arial, sans-serif';
  instructions.style.fontSize = '14px';
  instructions.style.zIndex = '1000';
  instructions.style.maxWidth = '300px';
  instructions.style.pointerEvents = 'none';
  
  instructions.innerHTML = `
    <h3>Controles</h3>
    <ul>
      <li><b>Setas</b>: Mover jogador</li>
      <li><b>Clique</b>: Mover para posição</li>
      <li><b>ESC</b>: Cancelar movimento</li>
      <li><b>V</b>: Alternar modos de câmera</li>
      <li><b>S</b>: Alternar câmera suave</li>
      <li><b>+/-</b>: Ajustar suavidade</li>
      <li><b>P</b>: Lista de jogadores</li>
      <li><b>1-9</b>: Teleportar para jogador</li>
      <li><b>G</b>: Mostrar/ocultar grade</li>
    </ul>
  `;
  
  document.body.appendChild(instructions);
}

// Chamar a função
showInstructions();

// Variáveis para controle de execução em segundo plano
let isPageVisible = true;
let lastTimestamp = 0;
let fixedTimeStep = 1000 / 60; // 60 FPS em milissegundos
let gameInterval: number | null = null;

// Função para mostrar status de execução em segundo plano
function showBackgroundStatus(isRunning: boolean): void {
  let statusElement = document.getElementById('background-status');
  
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'background-status';
    statusElement.style.position = 'fixed';
    statusElement.style.bottom = '10px';
    statusElement.style.left = '10px';
    statusElement.style.padding = '8px 12px';
    statusElement.style.borderRadius = '4px';
    statusElement.style.fontFamily = 'Arial, sans-serif';
    statusElement.style.fontSize = '12px';
    statusElement.style.zIndex = '1001';
    document.body.appendChild(statusElement);
  }
  
  if (isRunning) {
    statusElement.style.backgroundColor = 'rgba(0, 200, 0, 0.8)';
    statusElement.textContent = 'Rodando em segundo plano';
    statusElement.style.display = 'block';
  } else {
    // Esconder depois de um tempo para indicar a transição
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 2000);
    
    statusElement.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
    statusElement.textContent = 'Modo de primeiro plano';
  }
}

// Atualizar a função de visibilidade para mostrar o status
document.addEventListener('visibilitychange', () => {
  isPageVisible = document.visibilityState === 'visible';
  
  if (isPageVisible) {
    // Quando a página volta a ficar visível
    showBackgroundStatus(false);
    if (gameInterval) {
      clearInterval(gameInterval);
      gameInterval = null;
    }
    requestAnimationFrame(animate);
  } else {
    // Quando a página fica invisível
    showBackgroundStatus(true);
    lastTimestamp = performance.now();
    gameInterval = window.setInterval(() => {
      const now = performance.now();
      const deltaTime = (now - lastTimestamp) / 1000;
      lastTimestamp = now;
      
      // Executar apenas a lógica do jogo, sem renderizar
      updateGameLogic(deltaTime);
    }, fixedTimeStep);
  }
});

// Função para atualizar a lógica do jogo (sem renderização)
function updateGameLogic(deltaTime: number) {
  // Atualizar o sistema de iluminação
  lightingManager.update(deltaTime);
  
  // Atualizar o sistema de clima (adicione esta linha)
  weatherManager.update(deltaTime);
  
  // Atualizar os postes de luz
  streetLights.update();
  
  // Atualizar as janelas iluminadas
  buildingManager.update(performance.now());
  
  // Atualizar o sistema de sinaleiras
  trafficLightSystem.update(deltaTime);
  
  // Atualizar os marcadores visuais dos jogadores
  multiplayerManager.updateBeacons(deltaTime);
  
  // Movimento automático para o alvo
  if (isMovingToTarget && targetPosition) {
    // Verificar se já chegamos próximo o suficiente do destino
    const distanceToTarget = player.position.distanceTo(targetPosition);
    
    if (distanceToTarget > 0.5) {
      // Calcular direção normalizada
      const direction = new THREE.Vector3();
      direction.subVectors(targetPosition, player.position).normalize();
      
      // Mover em direção ao alvo
      player.position.x += direction.x * playerSpeed;
      player.position.z += direction.z * playerSpeed;
      
      // Apenas manter restrições básicas para não cair fora do mundo
      const worldBoundary = 1000; // Valor muito maior que permitirá movimento amplo
      player.position.x = Math.max(-worldBoundary, Math.min(worldBoundary, player.position.x));
      player.position.z = Math.max(-worldBoundary, Math.min(worldBoundary, player.position.z));
      
      // Atualizar direção ocasionalmente com base no caminho
      if (Math.random() < 0.05) { // ~5% de chance por frame
        updatePlayerDirectionToTarget();
      }
      
      // Atualizar o cameraLookTarget para sempre olhar na direção do movimento
      // Isso mantém a câmera apontando para a direção correta mesmo com curvas
      if (distanceToTarget < 10) { // Quando estiver chegando perto
        // Gradualmente mudar o foco para o player em vez do destino final
        cameraLookTarget.lerp(player.position, 0.01);
      } else {
        // Olhar para o destino durante o percurso
        cameraLookTarget.copy(targetPosition);
      }
    } else {
      // Chegamos ao destino - salvar a direção final antes de parar
      if (isMovingToTarget) {
        // Salvar a direção para onde o jogador estava indo
        const finalDirection = new THREE.Vector3();
        finalDirection.subVectors(targetPosition, player.position).normalize();
        lastPlayerDirection.copy(finalDirection);
      }
      
      // Chegamos ao destino
      isMovingToTarget = false;
      
      // Remover o marcador (apenas quando a página estiver visível novamente)
      if (isPageVisible && movementMarker) {
        scene.remove(movementMarker);
        movementMarker = null;
      }
    }
  }
  
  // Atualizar animação do marcador de clique
  if (movementMarker) {
    const marker = movementMarker;
    marker.userData.pulseTime += deltaTime * marker.userData.pulseSpeed;
    
    const scaleFactor = marker.userData.originalScale + 
                       Math.sin(marker.userData.pulseTime) * 0.2;
    
    if (isPageVisible) {
      marker.scale.set(scaleFactor, scaleFactor, scaleFactor);
      marker.rotation.z += deltaTime * 2;
    }
  }
  
  // Atualizar os veículos se estiverem carregados
  if (vehicleController1) {
    vehicleController1.update(deltaTime);
  }
  
  if (vehicleController2) {
    vehicleController2.update(deltaTime);
  }
  
  // Limitar atualizações de rede
  const currentTime = performance.now();
  if (currentTime - lastNetworkUpdate > 1000 / NETWORK_UPDATE_RATE) {
    lastNetworkUpdate = currentTime;
    
    // Só enviar atualizações para o servidor na taxa definida
    if (isMovingToTarget && targetPosition) {
      multiplayerManager.movePlayer(player.position, playerDirection);
    }
  }
}

// Modificar a função animate para usar a nova função updateGameLogic
function animate(currentTime = 0) {
  if (!isPageVisible) return;
  
  requestAnimationFrame(animate);
  
  // Cálculo do delta time para movimento suave
  const deltaTime = (currentTime - previousTime) / 1000;
  previousTime = currentTime;
  
  // Atualizar toda a lógica do jogo
  updateGameLogic(deltaTime);
  
  // Parte exclusiva do loop visível - atualizar câmera e controles
  
  // Atualizar posição da câmera baseado no modo
  if (cameraMode === 'follow') {
    // Determinar qual direção usar para a câmera
    const dirToTarget = new THREE.Vector3();
    
    if (isMovingToTarget && targetPosition) {
      // Se estamos em movimento, calcular direção para o alvo
      dirToTarget.subVectors(targetPosition, player.position).normalize();
      
      // Atualizar também a última direção conhecida
      lastPlayerDirection.copy(dirToTarget);
    } else {
      // Se não estamos em movimento, usar a última direção conhecida
      dirToTarget.copy(lastPlayerDirection);
    }
    
    // Criar vetor oposto para posicionar a câmera atrás do jogador
    const backVector = dirToTarget.clone().multiplyScalar(-10); // 10 unidades atrás
    
    // Posição desejada da câmera (atrás do jogador)
    const targetCameraPosition = new THREE.Vector3(
      player.position.x + backVector.x,
      player.position.y + 5, // 5 unidades acima
      player.position.z + backVector.z
    );
    
    // Aplicar movimento suave à câmera se ativado
    if (smoothCameraFollow) {
      camera.position.lerp(targetCameraPosition, smoothFactor);
    } else {
      camera.position.copy(targetCameraPosition);
    }
    
    // Calcular ponto para olhar (ligeiramente à frente do jogador na direção salva)
    const lookPoint = player.position.clone().add(dirToTarget.multiplyScalar(5));
    camera.lookAt(lookPoint);
    
    // Desativar controles de câmera
    cameraControls.enabled = false;
  } 
  else if (cameraMode === 'top') {
    // Visão aérea
    camera.position.set(player.position.x, 40, player.position.z);
    camera.lookAt(player.position);
    cameraControls.enabled = false;
  }
  else {
    // Modo livre - reativar controles
    cameraControls.enabled = true;
  }
  
  // Parte de renderização
  renderer.render(scene, camera);
}

// Ajustando o tamanho da tela
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('Aplicação Three.js inicializada. Aguarde o carregamento do modelo 3D do carro...');

// Teste de funcionamento do sistema de tempo
console.log("Verificando sistema de tempo:");
console.log(`- LightingManager possui setTimeOfDay: ${typeof lightingManager.setTimeOfDay === 'function'}`);
console.log(`- LightingManager possui getDayProgress: ${typeof lightingManager.getDayProgress === 'function'}`);
console.log(`- LightingManager possui setDayDuration: ${typeof lightingManager.setDayDuration === 'function'}`);
console.log(`- TimeController inicializado: ${typeof timeController !== 'undefined'}`);

// Iniciar o loop de animação no carregamento inicial
animate();
