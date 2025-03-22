import * as THREE from 'three';
import { GameConfig } from '../config/game-config';

// Enumeração para os estados da sinaleira
export enum TrafficLightState {
  RED,
  YELLOW,
  GREEN
}

// Enumeração para as direções das sinaleiras
export enum TrafficLightDirection {
  NORTH,
  EAST,
  SOUTH,
  WEST
}

// Classe que representa uma sinaleira
export class TrafficLight {
  private container: THREE.Group;
  private housing: THREE.Mesh;
  private redLight: THREE.Mesh;
  private yellowLight: THREE.Mesh;
  private greenLight: THREE.Mesh;
  
  private state: TrafficLightState = TrafficLightState.RED;
  private direction: TrafficLightDirection;
  
  constructor(direction: TrafficLightDirection) {
    this.direction = direction;
    this.container = new THREE.Group();
    
    // Criar a caixa da sinaleira
    const housingGeometry = new THREE.BoxGeometry(
      GameConfig.TRAFFIC_LIGHT_SIZE,
      GameConfig.TRAFFIC_LIGHT_SIZE * 3, // Altura para 3 luzes
      GameConfig.TRAFFIC_LIGHT_SIZE / 2
    );
    
    const housingMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.7,
      metalness: 0.3
    });
    
    this.housing = new THREE.Mesh(housingGeometry, housingMaterial);
    this.container.add(this.housing);
    
    // Criar as luzes
    const lightGeometry = new THREE.CircleGeometry(GameConfig.TRAFFIC_LIGHT_SIZE * 0.3, 16);
    
    // Luz vermelha
    const redLightMaterial = new THREE.MeshStandardMaterial({
      color: GameConfig.TRAFFIC_LIGHT_OFF_COLOR,
      emissive: GameConfig.TRAFFIC_LIGHT_OFF_COLOR,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.5
    });
    
    this.redLight = new THREE.Mesh(lightGeometry, redLightMaterial);
    this.redLight.position.z = GameConfig.TRAFFIC_LIGHT_SIZE / 4 + 0.01; // Ligeiramente à frente
    this.redLight.position.y = GameConfig.TRAFFIC_LIGHT_SIZE;
    this.housing.add(this.redLight);
    
    // Luz amarela
    const yellowLightMaterial = new THREE.MeshStandardMaterial({
      color: GameConfig.TRAFFIC_LIGHT_OFF_COLOR,
      emissive: GameConfig.TRAFFIC_LIGHT_OFF_COLOR,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.5
    });
    
    this.yellowLight = new THREE.Mesh(lightGeometry, yellowLightMaterial);
    this.yellowLight.position.z = GameConfig.TRAFFIC_LIGHT_SIZE / 4 + 0.01;
    this.yellowLight.position.y = 0;
    this.housing.add(this.yellowLight);
    
    // Luz verde
    const greenLightMaterial = new THREE.MeshStandardMaterial({
      color: GameConfig.TRAFFIC_LIGHT_OFF_COLOR,
      emissive: GameConfig.TRAFFIC_LIGHT_OFF_COLOR,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.5
    });
    
    this.greenLight = new THREE.Mesh(lightGeometry, greenLightMaterial);
    this.greenLight.position.z = GameConfig.TRAFFIC_LIGHT_SIZE / 4 + 0.01;
    this.greenLight.position.y = -GameConfig.TRAFFIC_LIGHT_SIZE;
    this.housing.add(this.greenLight);
    
    // Orientar a sinaleira de acordo com a direção
    this.orientLight();
    
    // Definir estado inicial
    this.setState(TrafficLightState.RED);
  }
  
  private orientLight(): void {
    // Posicionar a sinaleira de acordo com a direção
    switch (this.direction) {
      case TrafficLightDirection.NORTH:
        this.container.rotation.y = Math.PI;
        break;
      case TrafficLightDirection.EAST:
        this.container.rotation.y = Math.PI / 2;
        break;
      case TrafficLightDirection.SOUTH:
        this.container.rotation.y = 0;
        break;
      case TrafficLightDirection.WEST:
        this.container.rotation.y = -Math.PI / 2;
        break;
    }
  }
  
  // Obter o objeto 3D da sinaleira
  public getObject3D(): THREE.Object3D {
    return this.container;
  }
  
  // Atualizar o estado da sinaleira
  public setState(state: TrafficLightState): void {
    this.state = state;
    
    // Resetar todas as luzes para o estado "desligado"
    (this.redLight.material as THREE.MeshStandardMaterial).color.setHex(GameConfig.TRAFFIC_LIGHT_OFF_COLOR);
    (this.redLight.material as THREE.MeshStandardMaterial).emissive.setHex(GameConfig.TRAFFIC_LIGHT_OFF_COLOR);
    
    (this.yellowLight.material as THREE.MeshStandardMaterial).color.setHex(GameConfig.TRAFFIC_LIGHT_OFF_COLOR);
    (this.yellowLight.material as THREE.MeshStandardMaterial).emissive.setHex(GameConfig.TRAFFIC_LIGHT_OFF_COLOR);
    
    (this.greenLight.material as THREE.MeshStandardMaterial).color.setHex(GameConfig.TRAFFIC_LIGHT_OFF_COLOR);
    (this.greenLight.material as THREE.MeshStandardMaterial).emissive.setHex(GameConfig.TRAFFIC_LIGHT_OFF_COLOR);
    
    // Ativar a luz correspondente ao estado atual
    switch (state) {
      case TrafficLightState.RED:
        (this.redLight.material as THREE.MeshStandardMaterial).color.setHex(GameConfig.TRAFFIC_LIGHT_RED_COLOR);
        (this.redLight.material as THREE.MeshStandardMaterial).emissive.setHex(GameConfig.TRAFFIC_LIGHT_RED_COLOR);
        break;
      case TrafficLightState.YELLOW:
        (this.yellowLight.material as THREE.MeshStandardMaterial).color.setHex(GameConfig.TRAFFIC_LIGHT_YELLOW_COLOR);
        (this.yellowLight.material as THREE.MeshStandardMaterial).emissive.setHex(GameConfig.TRAFFIC_LIGHT_YELLOW_COLOR);
        break;
      case TrafficLightState.GREEN:
        (this.greenLight.material as THREE.MeshStandardMaterial).color.setHex(GameConfig.TRAFFIC_LIGHT_GREEN_COLOR);
        (this.greenLight.material as THREE.MeshStandardMaterial).emissive.setHex(GameConfig.TRAFFIC_LIGHT_GREEN_COLOR);
        break;
    }
  }
  
  // Obter o estado atual da sinaleira
  public getState(): TrafficLightState {
    return this.state;
  }
  
  // Obter a direção da sinaleira
  public getDirection(): TrafficLightDirection {
    return this.direction;
  }
}