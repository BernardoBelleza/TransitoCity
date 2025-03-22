import * as THREE from 'three';
import { RoadSystem, RoadTileType } from '../roads/road-system';
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
      0.8,
      2.0, // Altura para 3 luzes
      0.4
    );
    
    const housingMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222, // Cor mais escura para contraste
      roughness: 0.7,
      metalness: 0.3
    });
    
    this.housing = new THREE.Mesh(housingGeometry, housingMaterial);
    this.container.add(this.housing);
    
    // Criar as luzes usando esferas em vez de círculos para melhor aparência 3D
    const lightGeometry = new THREE.SphereGeometry(0.25, 16, 16); // Esfera com mais segmentos
    
    // Luz vermelha
    const redLightMaterial = new THREE.MeshStandardMaterial({
      color: 0x330000,
      emissive: 0x330000,
      emissiveIntensity: 0.5,
      roughness: 0.1, // Mais liso
      metalness: 0.2,
      transparent: true,
      opacity: 0.9 // Leve transparência para efeito realista
    });
    
    this.redLight = new THREE.Mesh(lightGeometry, redLightMaterial);
    this.redLight.position.z = 0.21; // Ligeiramente à frente
    this.redLight.position.y = 0.6;
    this.housing.add(this.redLight);
    
    // Luz amarela
    const yellowLightMaterial = new THREE.MeshStandardMaterial({
      color: 0x333300,
      emissive: 0x333300,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    
    this.yellowLight = new THREE.Mesh(lightGeometry, yellowLightMaterial);
    this.yellowLight.position.z = 0.21;
    this.yellowLight.position.y = 0;
    this.housing.add(this.yellowLight);
    
    // Luz verde
    const greenLightMaterial = new THREE.MeshStandardMaterial({
      color: 0x003300,
      emissive: 0x003300,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    
    this.greenLight = new THREE.Mesh(lightGeometry, greenLightMaterial);
    this.greenLight.position.z = 0.21;
    this.greenLight.position.y = -0.6;
    this.housing.add(this.greenLight);
    
    // Adicionar uma borda em torno de cada luz para maior detalhe
    const borderGeometry = new THREE.TorusGeometry(0.26, 0.03, 16, 32);
    const borderMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    
    const redBorder = new THREE.Mesh(borderGeometry, borderMaterial);
    redBorder.position.copy(this.redLight.position);
    redBorder.position.z += 0.01;
    redBorder.rotation.z = Math.PI / 2;
    this.housing.add(redBorder);
    
    const yellowBorder = new THREE.Mesh(borderGeometry, borderMaterial);
    yellowBorder.position.copy(this.yellowLight.position);
    yellowBorder.position.z += 0.01;
    yellowBorder.rotation.z = Math.PI / 2;
    this.housing.add(yellowBorder);
    
    const greenBorder = new THREE.Mesh(borderGeometry, borderMaterial);
    greenBorder.position.copy(this.greenLight.position);
    greenBorder.position.z += 0.01;
    greenBorder.rotation.z = Math.PI / 2;
    this.housing.add(greenBorder);
    
    // Adicionar um poste de sustentação para a sinaleira
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3.0);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.7,
      metalness: 0.3
    });
    
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = -2.5; // Posicionar abaixo da caixa da sinaleira
    this.container.add(pole);
    
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
    (this.redLight.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
    (this.yellowLight.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
    (this.greenLight.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
    
    // Desativar brilho para todas
    (this.redLight.material as THREE.MeshStandardMaterial).opacity = 0.8;
    (this.yellowLight.material as THREE.MeshStandardMaterial).opacity = 0.8;
    (this.greenLight.material as THREE.MeshStandardMaterial).opacity = 0.8;
    
    // Ativar a luz correspondente ao estado atual com efeito mais forte
    switch (state) {
      case TrafficLightState.RED:
        (this.redLight.material as THREE.MeshStandardMaterial).color.setHex(0xFF0000);
        (this.redLight.material as THREE.MeshStandardMaterial).emissive.setHex(0xFF0000);
        (this.redLight.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5; // Mais brilhante
        (this.redLight.material as THREE.MeshStandardMaterial).opacity = 1.0;
        break;
      case TrafficLightState.YELLOW:
        (this.yellowLight.material as THREE.MeshStandardMaterial).color.setHex(0xFFFF00);
        (this.yellowLight.material as THREE.MeshStandardMaterial).emissive.setHex(0xFFFF00);
        (this.yellowLight.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
        (this.yellowLight.material as THREE.MeshStandardMaterial).opacity = 1.0;
        break;
      case TrafficLightState.GREEN:
        (this.greenLight.material as THREE.MeshStandardMaterial).color.setHex(0x00FF00);
        (this.greenLight.material as THREE.MeshStandardMaterial).emissive.setHex(0x00FF00);
        (this.greenLight.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
        (this.greenLight.material as THREE.MeshStandardMaterial).opacity = 1.0;
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

// Interface para representar uma interseção com suas sinaleiras
interface IntersectionLights {
  x: number;
  y: number;
  northLight: TrafficLight;
  eastLight: TrafficLight;
  southLight: TrafficLight;
  westLight: TrafficLight;
  timeSinceLastChange: number;
  currentAxis: 'NS' | 'EW'; // Eixo atual com luz verde (Norte-Sul ou Leste-Oeste)
  currentState: TrafficLightState; // Estado atual das luzes no eixo ativo
}

export class TrafficLightSystem {
  private scene: THREE.Scene;
  private roadSystem: RoadSystem;
  private intersections: IntersectionLights[] = [];
  
  constructor(scene: THREE.Scene, roadSystem: RoadSystem) {
    this.scene = scene;
    this.roadSystem = roadSystem;
    console.log("Inicializando sistema de sinaleiras");
    this.setupTrafficLights();
  }
  
  // Configurar sinaleiras em todas as interseções
  private setupTrafficLights(): void {
    console.log("Configurando sinaleiras...");
    const roadMap = this.roadSystem.getRoadMap();
    if (!roadMap) {
      console.error("RoadMap não disponível");
      return;
    }
    
    console.log("Mapa de estradas:", roadMap.length, "x", roadMap[0]?.length);
    
    let count = 0;
    // Percorrer o mapa inteiro procurando por interseções
    for (let y = 0; y < roadMap.length; y++) {
      for (let x = 0; x < roadMap[y].length; x++) {
        const tile = roadMap[y][x];
        
        // Verificar se é uma interseção
        if (tile && tile.type === RoadTileType.INTERSECTION) {
          console.log(`Interseção encontrada em (${x},${y}). Tipo: ${tile.type}`);
          count++;
          this.createIntersectionLights(x, y);
        }
      }
    }
    console.log("Total de interseções encontradas:", count);
  }
  
  // Modificar o método createIntersectionLights
  private createIntersectionLights(x: number, y: number): void {
    const tilePosition = this.roadSystem.getTileWorldPosition(x, y);
    if (!tilePosition) {
      console.error("Posição não encontrada para", x, y);
      return;
    }
    
    const tileSize = this.roadSystem.getTileSize();
    const distance = tileSize / 3;
    const height = 3.0; // Aumentada de 1.0 para 3.0
    const rightOffset = 1.0; // Deslocamento para a direita (baseado na direção de cada sinaleira)
    
    console.log(`Criando sinaleiras para interseção em (${x},${y}) na posição (${tilePosition.x}, ${tilePosition.y}, ${tilePosition.z})`);
    
    // Criar as quatro sinaleiras
    const northLight = new TrafficLight(TrafficLightDirection.NORTH);
    const eastLight = new TrafficLight(TrafficLightDirection.EAST);
    const southLight = new TrafficLight(TrafficLightDirection.SOUTH);
    const westLight = new TrafficLight(TrafficLightDirection.WEST);
    
    // Posicionar as sinaleiras nos cantos da interseção, ajustadas para a via da direita
    const northObj = northLight.getObject3D();
    northObj.position.set(
      tilePosition.x - rightOffset, // Ajustado para a direita do ponto de vista Norte (esquerda em coordenadas)
      tilePosition.y + height,
      tilePosition.z - distance
    );
    
    const eastObj = eastLight.getObject3D();
    eastObj.position.set(
      tilePosition.x + distance,
      tilePosition.y + height,
      tilePosition.z - rightOffset // Ajustado para a direita do ponto de vista Leste (para cima em coordenadas)
    );
    
    const southObj = southLight.getObject3D();
    southObj.position.set(
      tilePosition.x + rightOffset, // Ajustado para a direita do ponto de vista Sul (direita em coordenadas)
      tilePosition.y + height,
      tilePosition.z + distance
    );
    
    const westObj = westLight.getObject3D();
    westObj.position.set(
      tilePosition.x - distance,
      tilePosition.y + height,
      tilePosition.z + rightOffset // Ajustado para a direita do ponto de vista Oeste (para baixo em coordenadas)
    );
    
    // Adicionar à cena
    this.scene.add(northObj);
    this.scene.add(eastObj);
    this.scene.add(southObj);
    this.scene.add(westObj);
    
    console.log(`Sinaleiras adicionadas à cena para interseção (${x},${y})`);
    
    // Configuração inicial: Norte-Sul verde, Leste-Oeste vermelho
    northLight.setState(TrafficLightState.GREEN);
    southLight.setState(TrafficLightState.GREEN);
    eastLight.setState(TrafficLightState.RED);
    westLight.setState(TrafficLightState.RED);
    
    // Registrar a interseção
    this.intersections.push({
      x,
      y,
      northLight,
      eastLight,
      southLight,
      westLight,
      timeSinceLastChange: 0,
      currentAxis: 'NS', // Começamos com Norte-Sul aberto
      currentState: TrafficLightState.GREEN
    });
  }
  
  // Atualizar todas as sinaleiras
  public update(deltaTime: number): void {
    // Para cada interseção, atualizar o estado das sinaleiras
    for (const intersection of this.intersections) {
      intersection.timeSinceLastChange += deltaTime;
      
      // Lógica para mudar o estado das sinaleiras
      if (intersection.currentAxis === 'NS') {
        if (intersection.currentState === TrafficLightState.GREEN && 
            intersection.timeSinceLastChange >= 10) { // 10 segundos no verde
          // Mudar Norte-Sul para amarelo
          intersection.northLight.setState(TrafficLightState.YELLOW);
          intersection.southLight.setState(TrafficLightState.YELLOW);
          intersection.currentState = TrafficLightState.YELLOW;
          intersection.timeSinceLastChange = 0;
        }
        else if (intersection.currentState === TrafficLightState.YELLOW && 
                 intersection.timeSinceLastChange >= 3) { // 3 segundos no amarelo
          // Mudar Norte-Sul para vermelho e Leste-Oeste para verde
          intersection.northLight.setState(TrafficLightState.RED);
          intersection.southLight.setState(TrafficLightState.RED);
          intersection.eastLight.setState(TrafficLightState.GREEN);
          intersection.westLight.setState(TrafficLightState.GREEN);
          intersection.currentAxis = 'EW';
          intersection.currentState = TrafficLightState.GREEN;
          intersection.timeSinceLastChange = 0;
        }
      }
      else { // 'EW'
        if (intersection.currentState === TrafficLightState.GREEN && 
            intersection.timeSinceLastChange >= 10) { // 10 segundos no verde
          // Mudar Leste-Oeste para amarelo
          intersection.eastLight.setState(TrafficLightState.YELLOW);
          intersection.westLight.setState(TrafficLightState.YELLOW);
          intersection.currentState = TrafficLightState.YELLOW;
          intersection.timeSinceLastChange = 0;
        }
        else if (intersection.currentState === TrafficLightState.YELLOW && 
                 intersection.timeSinceLastChange >= 3) { // 3 segundos no amarelo
          // Mudar Leste-Oeste para vermelho e Norte-Sul para verde
          intersection.eastLight.setState(TrafficLightState.RED);
          intersection.westLight.setState(TrafficLightState.RED);
          intersection.northLight.setState(TrafficLightState.GREEN);
          intersection.southLight.setState(TrafficLightState.GREEN);
          intersection.currentAxis = 'NS';
          intersection.currentState = TrafficLightState.GREEN;
          intersection.timeSinceLastChange = 0;
        }
      }
    }
  }
  
  // Verificar se um veículo pode cruzar uma interseção
  public canCrossIntersection(tileX: number, tileY: number, direction: number): boolean {
    // Encontrar a interseção correspondente
    const intersection = this.intersections.find(i => i.x === tileX && i.y === tileY);
    if (!intersection) return true; // Se não encontrar, permitir o tráfego
    
    // Verificar a direção do veículo
    if (direction === 0 || direction === 2) { // NORTH or SOUTH
      return intersection.northLight.getState() === TrafficLightState.GREEN || 
             intersection.northLight.getState() === TrafficLightState.YELLOW;
    } else { // EAST or WEST
      return intersection.eastLight.getState() === TrafficLightState.GREEN || 
             intersection.eastLight.getState() === TrafficLightState.YELLOW;
    }
  }
}