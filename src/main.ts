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
import { showMariaModel } from './maria-visualizer';

// Removendo o conteúdo padrão do Vite
document.querySelector<HTMLDivElement>('#app')?.remove();

// Criando a cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(GameConfig.WORLD_BACKGROUND_COLOR);

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
document.body.appendChild(renderer.domElement);

// Configurando controles de câmera
const cameraControls = new CameraControls(camera, renderer.domElement);

// Adicionando luz para que o modelo seja visível
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Criando um plano para o chão (grama)
const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
const groundMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x4CAF50,
  roughness: 0.8,
  metalness: 0.0
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotacionar para ficar horizontal
ground.position.y = -0.05; // Ligeiramente abaixo da estrada
scene.add(ground);

// Inicializando o sistema de estradas
const roadSystem = new RoadSystem(scene);

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

// Agora o buildingManager usará o cityMap original, que contém informações
// de construções (valores 5-8) e ainda saberá onde estão as estradas
console.log("Iniciando sistema de construções...");
const buildingManager = new BuildingManager(scene, roadSystem);

// Colocar construções conforme o mapa original
console.log("Mapa da cidade:", cityMap);
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

// Adicionando o event listener para cliques
window.addEventListener('click', (event) => {
  raycasterManager.setFromMouseEvent(event);
  
  if (carModel1) {
    const intersects = raycasterManager.checkIntersection(carModel1);
    
    if (intersects.length > 0) {
      alert('Maria Gay');
    }
  }
  
  // Verificar interseção com o plano do chão
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = raycasterManager.getRaycaster();
  
  if (raycaster) {
    const intersection = new THREE.Vector3();
    const intersects = raycaster.ray.intersectPlane(groundPlane, intersection);
    
    if (intersects) {
      // Converter coordenadas do mundo para coordenadas do grid
      const tileSize = roadSystem.getTileSize();
      const gridX = Math.floor((intersection.x + tileSize/2) / tileSize);
      const gridY = Math.floor((intersection.z + tileSize/2) / tileSize);
      
      console.log(`Clique na grade: (${gridX}, ${gridY})`);
      
      // Adicionar uma construção aleatória (pode ser modificado para usar o tipo selecionado)
      const randomType = buildingManager.getRandomBuildingType();
      buildingManager.placeBuilding(gridX, gridY, randomType);
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

// Adicionar comandos de teclado

document.addEventListener('keydown', (event) => {
  // Teclas para destacar direções
  switch(event.key) {
    case 'n': // Norte
      highlightDirection('north');
      break;
    case 's': // Sul
      highlightDirection('south');
      break;
    case 'e': // Leste
      highlightDirection('east');
      break;
    case 'w': // Oeste
      highlightDirection('west');
      break;
  }
});

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

document.addEventListener('keydown', (event) => {
  if (event.key === 'm' || event.key === 'M') {
    showMariaModel();
    console.log("Visualizador do modelo Maria ativado");
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

const debugPanel = createDebugPanel();

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

// Função de animação
function animate(currentTime = 0) {
  requestAnimationFrame(animate);
  
  // Cálculo do delta time para movimento suave
  const deltaTime = (currentTime - previousTime) / 1000;
  previousTime = currentTime;
  
  // Atualizar o sistema de sinaleiras
  trafficLightSystem.update(deltaTime);
  
  // Atualizar controles de câmera
  cameraControls.update(deltaTime);
  
  // Atualizar os veículos se estiverem carregados
  if (vehicleController1) {
    vehicleController1.update(deltaTime);
  }
  
  if (vehicleController2) {
    vehicleController2.update(deltaTime);
  }
  
  // Atualizar informações de debug
  if (vehicleController1) {
    const info = vehicleController1.getVehicleDebugInfo();
    debugPanel.innerHTML = `
      <h3>Veículo 1</h3>
      <p>Posição: Tile (${info.tileX}, ${info.tileY})</p>
      <p>Tipo: ${info.tileType}</p>
      <p>Direção: ${['Norte', 'Leste', 'Sul', 'Oeste'][info.direction]}</p>
      <p>Progresso: ${(info.progress * 100).toFixed(1)}%</p>
      <p>Velocidade: ${info.speed.toFixed(2)}</p>
      <p>Mundo: (${info.worldPosition.x.toFixed(1)}, ${info.worldPosition.y.toFixed(1)}, ${info.worldPosition.z.toFixed(1)})</p>
      <p>Estado: ${info.isStopped ? 'Parado' : (info.isDecelerating ? 'Freando' : (info.isAccelerating ? 'Acelerando' : 'Normal'))}</p>
    `;
  }
  
  renderer.render(scene, camera);
}

// Iniciando a animação
animate();

// Ajustando o tamanho da tela
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('Aplicação Three.js inicializada. Aguarde o carregamento do modelo 3D do carro...');
