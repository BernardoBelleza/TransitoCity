import './style.css'
import * as THREE from 'three';
import { CameraControls } from './camera/camera-controls';
import { ModelLoader } from './models/model-loader';
import { RaycasterManager } from './interaction/raycaster-manager';
import { RoadSystem, RoadTileType, RoadOrientation } from './roads/road-system';
import { VehicleController, VehicleDirection } from './vehicles/vehicle-controller';
import { GameConfig } from './config/game-config';

// Removendo o conteúdo padrão do Vite
document.querySelector<HTMLDivElement>('#app')?.remove();

// Criando a cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(GameConfig.WORLD_BACKGROUND_COLOR);

// Criando a câmera
const camera = new THREE.PerspectiveCamera(
  75, 
  window.innerWidth / window.innerHeight,
  0.1,
  1000
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
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x4CAF50,
  roughness: 0.8,
  metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotacionar para ficar horizontal
ground.position.y = -0.05; // Ligeiramente abaixo da estrada
scene.add(ground);

// Inicializando o sistema de estradas
const roadSystem = new RoadSystem(scene);

// Configurando uma cidade simples como exemplo
// 0 = vazio, 1 = rua reta, 2 = interseção
// Adicionar 4 para orientação vertical (bit de orientação)
const cityMap = [
  [0, 0, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0],
  [1, 1, 2, 1, 1, 1, 1],
  [0, 0, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0],
  [0, 0, 2, 1, 1, 0, 0],
  [0, 0, 1, 0, 0, 0, 0],
];

// Aplicando o mapa à cidade
roadSystem.setRoadMap(cityMap);

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
    vehicleController1 = new VehicleController(carModel1, roadSystem, 1, 2, VehicleDirection.EAST);
    
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
        vehicleController2 = new VehicleController(carModel2, roadSystem, 3, 2, VehicleDirection.WEST);
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
});

// Variáveis para controle de tempo
let previousTime = 0;

// Função de animação
function animate(currentTime = 0) {
  requestAnimationFrame(animate);
  
  // Cálculo do delta time para movimento suave
  const deltaTime = (currentTime - previousTime) / 1000;
  previousTime = currentTime;
  
  // Atualizar controles de câmera
  cameraControls.update(deltaTime);
  
  // Atualizar os veículos se estiverem carregados
  if (vehicleController1) {
    vehicleController1.update(deltaTime);
  }
  
  if (vehicleController2) {
    vehicleController2.update(deltaTime);
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
