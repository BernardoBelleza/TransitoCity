import * as THREE from 'three';
import { BuildingType } from './building-types';
import { RoadSystem, RoadTileType } from '../roads/road-system';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class BuildingManager {
  private scene: THREE.Scene;
  private roadSystem: RoadSystem;
  private buildings: Map<string, THREE.Object3D> = new Map();
  private buildingModels: { [key in BuildingType]?: THREE.Group } = {};
  
  constructor(scene: THREE.Scene, roadSystem: RoadSystem) {
    this.scene = scene;
    this.roadSystem = roadSystem;
    
    // Criar modelos básicos (serão substituídos por GLB no futuro)
    this.createBasicBuildingModels();
  }
  
  // Criar modelos 3D básicos para cada tipo de construção
  private createBasicBuildingModels(): void {
    // Casa (simples, com telhado)
    const houseGroup = new THREE.Group();
    
    // Base da casa
    const houseBaseGeometry = new THREE.BoxGeometry(8, 5, 8);
    const houseBaseMaterial = new THREE.MeshStandardMaterial({ color: 0xE8D0A9 });
    const houseBase = new THREE.Mesh(houseBaseGeometry, houseBaseMaterial);
    houseBase.position.y = 2.5;
    houseGroup.add(houseBase);
    
    // Telhado triangular
    const roofGeometry = new THREE.ConeGeometry(6, 4, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 7;
    roof.rotation.y = Math.PI / 4;
    houseGroup.add(roof);
    
    // Adicionar janelas
    const windowGeometry = new THREE.PlaneGeometry(2, 2);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.7
    });
    
    // Janela frente
    const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow.position.set(0, 3, 4.01);
    houseGroup.add(frontWindow);
    
    // Janela de trás
    const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    backWindow.position.set(0, 3, -4.01);
    backWindow.rotation.y = Math.PI;
    houseGroup.add(backWindow);
    
    // Janelas laterais
    const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    leftWindow.position.set(-4.01, 3, 0);
    leftWindow.rotation.y = -Math.PI / 2;
    houseGroup.add(leftWindow);
    
    const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    rightWindow.position.set(4.01, 3, 0);
    rightWindow.rotation.y = Math.PI / 2;
    houseGroup.add(rightWindow);
    
    // Porta
    const doorGeometry = new THREE.PlaneGeometry(2, 3);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.5, 4.01);
    houseGroup.add(door);
    
    this.buildingModels[BuildingType.HOUSE] = houseGroup;
    
    // Prédio (mais alto com vários andares)
    const apartmentGroup = new THREE.Group();
    
    // Base do prédio
    const apartmentGeometry = new THREE.BoxGeometry(9, 20, 9);
    const apartmentMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0 });
    const apartmentBase = new THREE.Mesh(apartmentGeometry, apartmentMaterial);
    apartmentBase.position.y = 10;
    apartmentGroup.add(apartmentBase);
    
    // Topo do prédio
    const roofTopGeometry = new THREE.BoxGeometry(9.5, 1, 9.5);
    const roofTopMaterial = new THREE.MeshStandardMaterial({ color: 0x505050 });
    const roofTop = new THREE.Mesh(roofTopGeometry, roofTopMaterial);
    roofTop.position.y = 20.5;
    apartmentGroup.add(roofTop);
    
    // Janelas
    for (let floor = 0; floor < 6; floor++) {
      for (let i = -1; i <= 1; i++) {
        // Janelas frontais
        const windowFront = new THREE.Mesh(windowGeometry, windowMaterial);
        windowFront.position.set(i * 3, 5 + floor * 3, 4.51);
        apartmentGroup.add(windowFront);
        
        // Janelas traseiras
        const windowBack = new THREE.Mesh(windowGeometry, windowMaterial);
        windowBack.position.set(i * 3, 5 + floor * 3, -4.51);
        windowBack.rotation.y = Math.PI;
        apartmentGroup.add(windowBack);
        
        // Janelas laterais
        if (i !== 0 || floor % 2 === 0) { // Menos janelas nas laterais
          const windowLeft = new THREE.Mesh(windowGeometry, windowMaterial);
          windowLeft.position.set(-4.51, 5 + floor * 3, i * 3);
          windowLeft.rotation.y = -Math.PI / 2;
          apartmentGroup.add(windowLeft);
          
          const windowRight = new THREE.Mesh(windowGeometry, windowMaterial);
          windowRight.position.set(4.51, 5 + floor * 3, i * 3);
          windowRight.rotation.y = Math.PI / 2;
          apartmentGroup.add(windowRight);
        }
      }
    }
    
    // Porta
    const buildingDoorGeometry = new THREE.PlaneGeometry(3, 4);
    const buildingDoor = new THREE.Mesh(buildingDoorGeometry, doorMaterial);
    buildingDoor.position.set(0, 2, 4.51);
    apartmentGroup.add(buildingDoor);
    
    this.buildingModels[BuildingType.APARTMENT] = apartmentGroup;
    
    // Loja (prédio mais baixo e colorido)
    const shopGroup = new THREE.Group();
    
    // Base da loja
    const shopBaseGeometry = new THREE.BoxGeometry(10, 7, 8);
    const shopBaseMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
    const shopBase = new THREE.Mesh(shopBaseGeometry, shopBaseMaterial);
    shopBase.position.y = 3.5;
    shopGroup.add(shopBase);
    
    // Topo da loja
    const shopRoofGeometry = new THREE.BoxGeometry(11, 1, 9);
    const shopRoofMaterial = new THREE.MeshStandardMaterial({ color: 0xDDDDDD });
    const shopRoof = new THREE.Mesh(shopRoofGeometry, shopRoofMaterial);
    shopRoof.position.y = 7.5;
    shopGroup.add(shopRoof);
    
    // Vitrine
    const vitrineGeometry = new THREE.PlaneGeometry(8, 4);
    const vitrineMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xADD8E6,
      transparent: true,
      opacity: 0.9,
      metalness: 0.5,
      roughness: 0.1
    });
    const vitrine = new THREE.Mesh(vitrineGeometry, vitrineMaterial);
    vitrine.position.set(0, 3, 4.01);
    shopGroup.add(vitrine);
    
    // Letreiro
    const signGeometry = new THREE.BoxGeometry(8, 1.5, 0.5);
    const signMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 6.5, 4.3);
    shopGroup.add(sign);
    
    this.buildingModels[BuildingType.SHOP] = shopGroup;
    
    // Hotel (prédio alto com detalhes)
    const hotelGroup = new THREE.Group();
    
    // Base do hotel
    const hotelBaseGeometry = new THREE.BoxGeometry(12, 25, 12);
    const hotelBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x4682B4 });
    const hotelBase = new THREE.Mesh(hotelBaseGeometry, hotelBaseMaterial);
    hotelBase.position.y = 12.5;
    hotelGroup.add(hotelBase);
    
    // Topo do hotel
    const hotelTopGeometry = new THREE.BoxGeometry(8, 3, 8);
    const hotelTopMaterial = new THREE.MeshStandardMaterial({ color: 0x1E3F66 });
    const hotelTop = new THREE.Mesh(hotelTopGeometry, hotelTopMaterial);
    hotelTop.position.y = 26.5;
    hotelGroup.add(hotelTop);
    
    // Antena
    const antennaGeometry = new THREE.CylinderGeometry(0.2, 0.2, 5);
    const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.y = 30.5;
    hotelGroup.add(antenna);
    
    // Janelas (em grade)
    for (let floor = 0; floor < 8; floor++) {
      for (let i = -2; i <= 2; i++) {
        if (i !== 0 || floor % 3 !== 1) { // Padrão mais variado
          // Janelas frontais
          const windowFront = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 1.5),
            windowMaterial
          );
          windowFront.position.set(i * 2.2, 4 + floor * 3, 6.01);
          hotelGroup.add(windowFront);
          
          // Janelas traseiras
          const windowBack = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 1.5),
            windowMaterial
          );
          windowBack.position.set(i * 2.2, 4 + floor * 3, -6.01);
          windowBack.rotation.y = Math.PI;
          hotelGroup.add(windowBack);
        }
        
        // Janelas laterais
        if (floor % 2 === 0 || i % 2 === 0) {
          const windowLeft = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 1.5),
            windowMaterial
          );
          windowLeft.position.set(-6.01, 4 + floor * 3, i * 2.2);
          windowLeft.rotation.y = -Math.PI / 2;
          hotelGroup.add(windowLeft);
          
          const windowRight = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 1.5),
            windowMaterial
          );
          windowRight.position.set(6.01, 4 + floor * 3, i * 2.2);
          windowRight.rotation.y = Math.PI / 2;
          hotelGroup.add(windowRight);
        }
      }
    }
    
    // Entrada luxuosa
    const entranceGeometry = new THREE.BoxGeometry(6, 3, 1);
    const entranceMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
    const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
    entrance.position.set(0, 1.5, 6.5);
    hotelGroup.add(entrance);
    
    // Marquise
    const marqueeGeometry = new THREE.BoxGeometry(8, 0.5, 2);
    const marqueeMaterial = new THREE.MeshStandardMaterial({ color: 0xDDDDDD });
    const marquee = new THREE.Mesh(marqueeGeometry, marqueeMaterial);
    marquee.position.set(0, 3.2, 6.5);
    hotelGroup.add(marquee);
    
    this.buildingModels[BuildingType.HOTEL] = hotelGroup;

    console.log("Modelos de construções criados:");
    console.log("Casa:", this.buildingModels[BuildingType.HOUSE] ? "OK" : "FALHA");
    console.log("Apartamento:", this.buildingModels[BuildingType.APARTMENT] ? "OK" : "FALHA");
    console.log("Loja:", this.buildingModels[BuildingType.SHOP] ? "OK" : "FALHA");
    console.log("Hotel:", this.buildingModels[BuildingType.HOTEL] ? "OK" : "FALHA");
  }
  
  // Método para posicionar uma construção em uma posição específica
  public placeBuilding(x: number, y: number, type: BuildingType): void {
    // Ver qual é o tipo de tile em (x, y)
    const tile = this.roadSystem.getTileAt(x, y);
    console.log(`Tentando colocar construção do tipo ${type} em (${x}, ${y}). Tipo da tile: ${tile?.type}`);
    
    // COMENTAR ou REMOVER essa verificação temporariamente:
    /*
    if (!tile || (tile.type !== RoadTileType.EMPTY && tile.type !== RoadTileType.NONE)) {
      console.warn(`Não é possível colocar uma construção na posição (${x}, ${y}) - já existe uma estrada ou não é um espaço válido.`);
      return;
    }
    */
    
    // Sempre permitir a colocação, independentemente do estado do tile
    
    // Remover qualquer construção existente neste local
    this.removeBuilding(x, y);
    
    // Obter o modelo correspondente ao tipo
    const buildingModel = this.buildingModels[type];
    if (!buildingModel) {
      console.error(`Modelo não encontrado para o tipo: ${type}`);
      console.log(`Tipos disponíveis:`, Object.keys(this.buildingModels));
      return;
    }
    
    // Clonar o modelo
    const building = buildingModel.clone();
    
    // Posicionar a construção
    const tileSize = this.roadSystem.getTileSize();
    const worldX = x * tileSize;
    const worldZ = y * tileSize;
    
    // Ajustar a posição Y com base no tipo do edifício
    let heightOffset = 0;
    switch (type) {
      case BuildingType.HOUSE:
        heightOffset = 0;
        break;
      case BuildingType.APARTMENT:
        heightOffset = 0;
        break;
      case BuildingType.SHOP:
        heightOffset = 0;
        break;
      case BuildingType.HOTEL:
        heightOffset = 0;
        break;
      default:
        heightOffset = 0;
    }
    
    // Aplicar posição
    building.position.set(worldX, heightOffset, worldZ);
    
    // Rotação aleatória para variedade
    const rotations = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    building.rotation.y = rotations[Math.floor(Math.random() * rotations.length)];
    
    // Adicionar à cena
    this.scene.add(building);
    
    // Registrar no mapa
    const key = `${x},${y}`;
    this.buildings.set(key, building);
    
    console.log(`Construção do tipo ${type} adicionada com sucesso em (${x}, ${y})`);
  }
  
  // Remover uma construção
  public removeBuilding(x: number, y: number): void {
    const key = `${x},${y}`;
    const building = this.buildings.get(key);
    
    if (building) {
      this.scene.remove(building);
      this.buildings.delete(key);
      console.log(`Construção removida da posição (${x}, ${y})`);
    }
  }
  
  // Distribuir construções com base no mapa da cidade
  public placeBuildingsFromCityMap(cityMap: number[][]): void {
    console.log("Colocando construções com base no mapa da cidade...");
    
    for (let y = 0; y < cityMap.length; y++) {
      for (let x = 0; x < cityMap[y].length; x++) {
        const tileValue = cityMap[y][x];
        
        // Verificar explicitamente cada valor numérico
        if (tileValue === 5) {
          // Casa
          console.log(`Colocando CASA em (${x}, ${y})`);
          this.placeBuilding(x, y, BuildingType.HOUSE);
        } 
        else if (tileValue === 6) {
          // Prédio/Apartamento
          console.log(`Colocando APARTAMENTO em (${x}, ${y})`);
          this.placeBuilding(x, y, BuildingType.APARTMENT);
        }
        else if (tileValue === 7) {
          // Loja
          console.log(`Colocando LOJA em (${x}, ${y})`);
          this.placeBuilding(x, y, BuildingType.SHOP);
        }
        else if (tileValue === 8) {
          // Hotel
          console.log(`Colocando HOTEL em (${x}, ${y})`);
          this.placeBuilding(x, y, BuildingType.HOTEL);
        }
        else if (tileValue === 9) {
          // Se você quiser adicionar outro tipo
          console.log(`Colocando ESPECIAL em (${x}, ${y})`);
          this.placeBuilding(x, y, BuildingType.SPECIAL);
        }
        // Ignorar outros valores (1, 2, etc. que são estradas)
      }
    }
    
    console.log("Construções posicionadas com sucesso!");
  }
  
  // Método para substituir os modelos por GLB posteriormente
  public loadGLTFModel(type: BuildingType, path: string, scale: number = 1.0): void {
    const loader = new GLTFLoader();
    
    loader.load(
      path,
      (gltf) => {
        // Substituir o modelo existente pelo modelo GLTF
        const model = gltf.scene;
        
        // Aplicar escala
        model.scale.set(scale, scale, scale);
        
        // Substituir no dicionário
        this.buildingModels[type] = model as THREE.Group;
        
        console.log(`Modelo GLTF carregado com sucesso para o tipo ${type}`);
        
        // Atualizar todos os edifícios existentes deste tipo
        this.updateExistingBuildingModels(type);
      },
      (xhr) => {
        console.log(`${(xhr.loaded / xhr.total * 100)}% carregado`);
      },
      (error) => {
        console.error('Erro ao carregar modelo GLTF:', error);
      }
    );
  }
  
  // Atualizar modelos existentes após carregar um novo GLTF
  private updateExistingBuildingModels(type: BuildingType): void {
    const newModel = this.buildingModels[type];
    if (!newModel) return;
    
    for (const [key, building] of this.buildings.entries()) {
      // Verificar o tipo atual do edifício (difícil sem uma referência explícita)
      // Por enquanto, precisaremos manter um registro separado ou usar userData
      
      // Para simplificar, vamos recarregar todo o mapa da cidade
      const [x, y] = key.split(',').map(Number);
      this.removeBuilding(x, y);
      this.placeBuilding(x, y, type);
    }
  }
  
  // Método para carregar todos os modelos GLB de uma vez
  public loadAllGLTFModels(): void {
    // Quando tiver os arquivos GLB, carregar todos aqui
    // Exemplo:
    // this.loadGLTFModel(BuildingType.HOUSE, '/models/house.glb', 0.01);
    // this.loadGLTFModel(BuildingType.APARTMENT, '/models/apartment.glb', 0.01);
    // etc.
  }
  
  // Método auxiliar para obter um tipo de construção aleatório
  public getRandomBuildingType(): BuildingType {
    const types = [
      BuildingType.HOUSE, 
      BuildingType.APARTMENT, 
      BuildingType.SHOP, 
      BuildingType.HOTEL
    ];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  // Método para gerar construções aleatórias em todos os espaços vazios
  public generateRandomBuildings(): void {
    const width = this.roadSystem.getMapWidth();
    const height = this.roadSystem.getMapHeight();
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.roadSystem.getTileAt(x, y)?.type === RoadTileType.EMPTY && !this.buildings.has(`${x},${y}`)) {
          const type = this.getRandomBuildingType();
          this.placeBuilding(x, y, type);
        }
      }
    }
  }
}