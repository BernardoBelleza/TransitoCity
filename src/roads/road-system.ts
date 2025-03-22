import * as THREE from 'three';
import { GameConfig } from '../config/game-config';

// Tipos de quarteirões
export enum RoadTileType {
  EMPTY = 0,
  STRAIGHT = 1, // Rua reta de mão dupla
  INTERSECTION = 2, // Cruzamento de 4 vias
}

// Orientações possíveis para as ruas
export enum RoadOrientation {
  HORIZONTAL = 0, // Leste-Oeste
  VERTICAL = 1,   // Norte-Sul
}

// Interface para um pedaço de rua
export interface RoadTile {
  type: RoadTileType;
  orientation: RoadOrientation;
  position: THREE.Vector3;
  model: THREE.Object3D | null;
}

export class RoadSystem {
  private scene: THREE.Scene;
  private roadMap: RoadTile[][];
  private tileSize: number = GameConfig.TILE_SIZE;
  private laneWidth: number = GameConfig.LANE_WIDTH;
  private laneOffset: number = GameConfig.LANE_OFFSET;
  
  // Modelos base para cada tipo de estrada
  private roadModels: {
    [key in RoadTileType]?: THREE.Object3D;
  } = {};

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.roadMap = [];
    
    // Inicializa com um mapa vazio
    this.initializeEmptyMap(5, 5);
    
    // Cria os modelos básicos de ruas
    this.createRoadModels();
  }

  // Inicializa o mapa com espaços vazios
  private initializeEmptyMap(width: number, height: number): void {
    this.roadMap = [];
    for (let y = 0; y < height; y++) {
      const row: RoadTile[] = [];
      for (let x = 0; x < width; x++) {
        row.push({
          type: RoadTileType.EMPTY,
          orientation: RoadOrientation.HORIZONTAL,
          position: new THREE.Vector3(x * this.tileSize, 0, y * this.tileSize),
          model: null
        });
      }
      this.roadMap.push(row);
    }
  }

  // Cria os modelos 3D básicos para cada tipo de rua
  private createRoadModels(): void {
    // Modelo para rua reta de mão dupla
    const straightRoadModel = new THREE.Group();
    
    // Base da rua (asfalto)
    const roadBaseGeometry = new THREE.BoxGeometry(this.tileSize, 0.1, this.laneWidth * 2 + 0.2);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 }); // Asfalto cinza escuro
    const roadBase = new THREE.Mesh(roadBaseGeometry, roadMaterial);
    roadBase.position.y = 0;
    straightRoadModel.add(roadBase);
    
    // Material para linhas
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF }); // Linhas brancas
    
    // Linha contínua entre as pistas (meridiana)
    const dividerGeometry = new THREE.BoxGeometry(this.tileSize, 0.11, 0.2);
    const divider = new THREE.Mesh(dividerGeometry, lineMaterial);
    divider.position.y = 0.01;
    straightRoadModel.add(divider);
    
    // Linhas tracejadas nas bordas externas
    const edgeLineGeometry = new THREE.BoxGeometry(this.tileSize / 5, 0.11, 0.15);
    
    // Adicionar linhas tracejadas na borda externa (lado norte)
    for (let i = -2; i <= 2; i++) {
      const segment = new THREE.Mesh(edgeLineGeometry, lineMaterial);
      segment.position.set(i * this.tileSize / 4, 0.01, -(this.laneWidth + 0.1));
      straightRoadModel.add(segment);
    }
    
    // Adicionar linhas tracejadas na borda externa (lado sul)
    for (let i = -2; i <= 2; i++) {
      const segment = new THREE.Mesh(edgeLineGeometry, lineMaterial);
      segment.position.set(i * this.tileSize / 4, 0.01, this.laneWidth + 0.1);
      straightRoadModel.add(segment);
    }
    
    this.roadModels[RoadTileType.STRAIGHT] = straightRoadModel;
    
    // Modelo para interseção de 4 vias
    const intersectionModel = new THREE.Group();
    
    // Base do cruzamento (asfalto)
    const intersectionBaseGeometry = new THREE.BoxGeometry(
      this.laneWidth * 2 + 0.2, 
      0.1, 
      this.laneWidth * 2 + 0.2
    );
    const intersectionBase = new THREE.Mesh(intersectionBaseGeometry, roadMaterial);
    intersectionBase.position.y = 0;
    intersectionModel.add(intersectionBase);
    
    // Extensões horizontais (Leste-Oeste)
    const hExtGeometry = new THREE.BoxGeometry(
      (this.tileSize - (this.laneWidth * 2 + 0.2)) / 2,
      0.1,
      this.laneWidth * 2 + 0.2
    );
    
    // Extensão oeste
    const westExt = new THREE.Mesh(hExtGeometry, roadMaterial);
    westExt.position.set(
      -(this.tileSize / 2 - (this.laneWidth * 2 + 0.2) / 4),
      0,
      0
    );
    intersectionModel.add(westExt);
    
    // Extensão leste
    const eastExt = new THREE.Mesh(hExtGeometry, roadMaterial);
    eastExt.position.set(
      (this.tileSize / 2 - (this.laneWidth * 2 + 0.2) / 4),
      0,
      0
    );
    intersectionModel.add(eastExt);
    
    // Extensões verticais (Norte-Sul)
    const vExtGeometry = new THREE.BoxGeometry(
      this.laneWidth * 2 + 0.2,
      0.1,
      (this.tileSize - (this.laneWidth * 2 + 0.2)) / 2
    );
    
    // Extensão norte
    const northExt = new THREE.Mesh(vExtGeometry, roadMaterial);
    northExt.position.set(
      0,
      0,
      -(this.tileSize / 2 - (this.laneWidth * 2 + 0.2) / 4)
    );
    intersectionModel.add(northExt);
    
    // Extensão sul
    const southExt = new THREE.Mesh(vExtGeometry, roadMaterial);
    southExt.position.set(
      0,
      0,
      (this.tileSize / 2 - (this.laneWidth * 2 + 0.2) / 4)
    );
    intersectionModel.add(southExt);
    
    // Linhas para as bordas das ruas
    // Apenas adicione linhas tracejadas nas extremidades do quarteirão
    const intersectionLineGeometry = new THREE.BoxGeometry(0.15, 0.11, 0.15);
    
    // Linhas nas extremidades norte
    for (let i = -1; i <= 1; i += 2) {
      const line = new THREE.Mesh(intersectionLineGeometry, lineMaterial);
      line.position.set(
        i * (this.laneWidth + 0.1),
        0.01,
        -this.tileSize / 2
      );
      intersectionModel.add(line);
    }
    
    // Linhas nas extremidades sul
    for (let i = -1; i <= 1; i += 2) {
      const line = new THREE.Mesh(intersectionLineGeometry, lineMaterial);
      line.position.set(
        i * (this.laneWidth + 0.1),
        0.01,
        this.tileSize / 2
      );
      intersectionModel.add(line);
    }
    
    // Linhas nas extremidades leste
    for (let i = -1; i <= 1; i += 2) {
      const line = new THREE.Mesh(intersectionLineGeometry, lineMaterial);
      line.position.set(
        this.tileSize / 2,
        0.01,
        i * (this.laneWidth + 0.1)
      );
      intersectionModel.add(line);
    }
    
    // Linhas nas extremidades oeste
    for (let i = -1; i <= 1; i += 2) {
      const line = new THREE.Mesh(intersectionLineGeometry, lineMaterial);
      line.position.set(
        -this.tileSize / 2,
        0.01,
        i * (this.laneWidth + 0.1)
      );
      intersectionModel.add(line);
    }
    
    this.roadModels[RoadTileType.INTERSECTION] = intersectionModel;
  }

  // Configura um tile específico no mapa
  public setTile(x: number, y: number, type: RoadTileType, orientation: RoadOrientation = RoadOrientation.HORIZONTAL): void {
    if (y >= 0 && y < this.roadMap.length && x >= 0 && x < this.roadMap[y].length) {
      // Remove o modelo anterior, se existir
      const currentTile = this.roadMap[y][x];
      if (currentTile.model) {
        this.scene.remove(currentTile.model);
      }
      
      // Atualiza o tipo e orientação
      currentTile.type = type;
      currentTile.orientation = orientation;
      
      // Cria e adiciona o novo modelo
      if (type !== RoadTileType.EMPTY) {
        const model = this.createTileModel(type, orientation);
        model.position.copy(currentTile.position);
        this.scene.add(model);
        currentTile.model = model;
      } else {
        currentTile.model = null;
      }
    }
  }

  // Cria uma instância de um modelo para um tipo específico de rua
  private createTileModel(type: RoadTileType, orientation: RoadOrientation): THREE.Object3D {
    const baseModel = this.roadModels[type];
    if (!baseModel) {
      console.error(`Modelo não encontrado para o tipo: ${type}`);
      return new THREE.Object3D();
    }
    
    const model = baseModel.clone();
    
    // Aplica rotação baseada na orientação
    if (orientation === RoadOrientation.VERTICAL) {
      model.rotation.y = Math.PI / 2;
    }
    
    return model;
  }

  // Configura o mapa completo a partir de uma matriz
  public setRoadMap(mapData: number[][]): void {
    // Limpa o mapa atual
    this.clearRoadMap();
    
    // Cria um novo mapa com as dimensões desejadas
    const height = mapData.length;
    const width = height > 0 ? mapData[0].length : 0;
    this.initializeEmptyMap(width, height);
    
    // Primeiro passo: preenche o mapa com os tipos de ruas
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = mapData[y][x];
        // Os 2 bits menos significativos representam o tipo
        const type = value & 0b11;
        // O terceiro bit representa a orientação (0 = horizontal, 1 = vertical)
        const orientation = (value & 0b100) ? RoadOrientation.VERTICAL : RoadOrientation.HORIZONTAL;
        
        // Apenas define o tipo e orientação inicial, sem criar modelos ainda
        if (y < this.roadMap.length && x < this.roadMap[y].length) {
          this.roadMap[y][x].type = type;
          this.roadMap[y][x].orientation = orientation;
        }
      }
    }
    
    // Segundo passo: analisa o mapa para ajustar orientações
    this.optimizeRoadConnections();
    
    // Terceiro passo: cria e adiciona os modelos
    for (let y = 0; y < this.roadMap.length; y++) {
      for (let x = 0; x < this.roadMap[y].length; x++) {
        const tile = this.roadMap[y][x];
        
        // Cria e adiciona o modelo com base no tipo e orientação ajustada
        if (tile.type !== RoadTileType.EMPTY) {
          const model = this.createTileModel(tile.type, tile.orientation);
          model.position.copy(tile.position);
          this.scene.add(model);
          tile.model = model;
        }
      }
    }
  }

  // Novo método para otimizar as conexões de ruas
  private optimizeRoadConnections(): void {
    const height = this.roadMap.length;
    if (height === 0) return;
    const width = this.roadMap[0].length;
    
    // Analisar cada tile para determinar a melhor orientação
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = this.roadMap[y][x];
        
        // Se for uma rua reta, precisa verificar conexões
        if (tile.type === RoadTileType.STRAIGHT) {
          // Verificar se há interseções ao redor
          const hasIntersectionNorth = this.hasIntersectionAt(x, y - 1);
          const hasIntersectionSouth = this.hasIntersectionAt(x, y + 1);
          const hasIntersectionEast = this.hasIntersectionAt(x + 1, y);
          const hasIntersectionWest = this.hasIntersectionAt(x - 1, y);
          
          // Verificar se há ruas retas ao redor
          const hasStraightNorth = this.hasStraightRoadAt(x, y - 1);
          const hasStraightSouth = this.hasStraightRoadAt(x, y + 1);
          const hasStraightEast = this.hasStraightRoadAt(x + 1, y);
          const hasStraightWest = this.hasStraightRoadAt(x - 1, y);
          
          // Lógica de orientação:
          // 1. Se tiver interseções em lados opostos, manter a orientação atual
          if ((hasIntersectionNorth && hasIntersectionSouth) || 
              (hasIntersectionEast && hasIntersectionWest)) {
            // Mantém a orientação atual
            continue;
          }
          
          // 2. Se tiver interseções em lados adjacentes, ajustar a orientação
          if (hasIntersectionNorth || hasIntersectionSouth) {
            tile.orientation = RoadOrientation.VERTICAL;
          } else if (hasIntersectionEast || hasIntersectionWest) {
            tile.orientation = RoadOrientation.HORIZONTAL;
          }
          
          // 3. Se não tiver interseções, verificar ruas retas
          else if ((hasStraightNorth && hasStraightSouth) || 
                  (hasStraightNorth && tile.orientation === RoadOrientation.VERTICAL) ||
                  (hasStraightSouth && tile.orientation === RoadOrientation.VERTICAL)) {
            tile.orientation = RoadOrientation.VERTICAL;
          } else if ((hasStraightEast && hasStraightWest) || 
                    (hasStraightEast && tile.orientation === RoadOrientation.HORIZONTAL) ||
                    (hasStraightWest && tile.orientation === RoadOrientation.HORIZONTAL)) {
            tile.orientation = RoadOrientation.HORIZONTAL;
          }
          
          // 4. Caso especial: cantos e extremidades
          else if (hasStraightNorth || hasStraightSouth) {
            tile.orientation = RoadOrientation.VERTICAL;
          } else if (hasStraightEast || hasStraightWest) {
            tile.orientation = RoadOrientation.HORIZONTAL;
          }
        }
      }
    }
    
    // Segunda passagem: ajuste fino para garantir continuidade das ruas
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = this.roadMap[y][x];
        
        if (tile.type === RoadTileType.STRAIGHT) {
          // Verificar as ruas retas vizinhas e alinhar com elas
          const neighbors = this.getStraightRoadNeighbors(x, y);
          
          if (neighbors.length === 1) {
            // Se só tem um vizinho, alinhar com ele
            const neighbor = this.roadMap[neighbors[0].y][neighbors[0].x];
            tile.orientation = neighbor.orientation;
          } 
          else if (neighbors.length > 1) {
            // Se tem múltiplos vizinhos, verificar a maioria
            let verticalCount = 0;
            let horizontalCount = 0;
            
            for (const n of neighbors) {
              const neighbor = this.roadMap[n.y][n.x];
              if (neighbor.orientation === RoadOrientation.VERTICAL) {
                verticalCount++;
              } else {
                horizontalCount++;
              }
            }
            
            // Define a orientação baseada na maioria dos vizinhos
            if (verticalCount > horizontalCount) {
              tile.orientation = RoadOrientation.VERTICAL;
            } else if (horizontalCount > verticalCount) {
              tile.orientation = RoadOrientation.HORIZONTAL;
            }
          }
        }
      }
    }
  }

  // Verificar se há uma interseção em determinada posição
  private hasIntersectionAt(x: number, y: number): boolean {
    if (y < 0 || y >= this.roadMap.length || x < 0 || x >= this.roadMap[y].length) {
      return false;
    }
    return this.roadMap[y][x].type === RoadTileType.INTERSECTION;
  }

  // Verificar se há uma rua reta em determinada posição
  private hasStraightRoadAt(x: number, y: number): boolean {
    if (y < 0 || y >= this.roadMap.length || x < 0 || x >= this.roadMap[y].length) {
      return false;
    }
    return this.roadMap[y][x].type === RoadTileType.STRAIGHT;
  }

  // Obter todas as ruas retas vizinhas
  private getStraightRoadNeighbors(x: number, y: number): Array<{x: number, y: number}> {
    const neighbors: Array<{x: number, y: number}> = [];
    
    // Verificar nas quatro direções
    const directions = [
      {x: 0, y: -1},  // Norte
      {x: 1, y: 0},   // Leste
      {x: 0, y: 1},   // Sul
      {x: -1, y: 0}   // Oeste
    ];
    
    for (const dir of directions) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      
      if (this.hasStraightRoadAt(nx, ny)) {
        neighbors.push({x: nx, y: ny});
      }
    }
    
    return neighbors;
  }

  // Limpa o mapa atual, removendo todos os modelos da cena
  private clearRoadMap(): void {
    for (const row of this.roadMap) {
      for (const tile of row) {
        if (tile.model) {
          this.scene.remove(tile.model);
          tile.model = null;
        }
      }
    }
    this.roadMap = [];
  }
  
  // Obtém as coordenadas mundiais de um quarteirão específico
  public getTileWorldPosition(x: number, y: number): THREE.Vector3 | null {
    if (y >= 0 && y < this.roadMap.length && x >= 0 && x < this.roadMap[y].length) {
      return this.roadMap[y][x].position.clone();
    }
    return null;
  }
  
  // Obtém o tamanho de um quarteirão
  public getTileSize(): number {
    return this.tileSize;
  }

  // Novo método para obter a posição da pista com base na direção
  public getLanePosition(tileX: number, tileY: number, direction: number): THREE.Vector3 | null {
    const tilePosition = this.getTileWorldPosition(tileX, tileY);
    if (!tilePosition) return null;
    
    const tile = this.roadMap[tileY][tileX];
    
    // Calcula o offset baseado na direção e orientação da rua
    let offsetX = 0;
    let offsetZ = 0;
    
    if (tile.orientation === RoadOrientation.HORIZONTAL) {
      // Para ruas horizontais, a direção EAST (1) e WEST (3) determinam a pista
      if (direction === 1) { // EAST - pista sul
        offsetZ = this.laneOffset;
      } else if (direction === 3) { // WEST - pista norte
        offsetZ = -this.laneOffset;
      }
    } else {
      // Para ruas verticais, a direção NORTH (0) e SOUTH (2) determinam a pista
      if (direction === 0) { // NORTH - pista oeste
        offsetX = -this.laneOffset;
      } else if (direction === 2) { // SOUTH - pista leste
        offsetX = this.laneOffset;
      }
    }
    
    return new THREE.Vector3(
      tilePosition.x + offsetX,
      tilePosition.y,
      tilePosition.z + offsetZ
    );
  }

  // Obter a largura da pista
  public getLaneWidth(): number {
    return this.laneWidth;
  }

  // Obter o offset da pista em relação ao centro
  public getLaneOffset(): number {
    return this.laneOffset;
  }

  // Obter informações de um tile
  public getTileInfo(x: number, y: number): RoadTile | null {
    if (y >= 0 && y < this.roadMap.length && x >= 0 && x < this.roadMap[y].length) {
      return this.roadMap[y][x];
    }
    return null;
  }
}