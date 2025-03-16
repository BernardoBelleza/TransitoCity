import * as THREE from 'three';
import { RoadSystem, RoadTileType, RoadOrientation } from '../roads/road-system';
import { GameConfig } from '../config/game-config';

// Possíveis direções para o veículo
export enum VehicleDirection {
  NORTH = 0,
  EAST = 1,
  SOUTH = 2,
  WEST = 3
}

export class VehicleController {
  private vehicle: THREE.Object3D;
  private roadSystem: RoadSystem;
  private speed: number = GameConfig.VEHICLE_SPEED;
  private currentDirection: VehicleDirection = VehicleDirection.EAST;
  
  // Coordenadas atuais na grade de estradas
  private currentTileX: number = 0;
  private currentTileY: number = 0;
  
  // Posição dentro do quarteirão atual (0-1)
  private tileProgress: number = 0;
  
  // Para transições suaves nas curvas
  private transitioning: boolean = false;
  private targetRotation: number = 0;
  private rotationSpeed: number = GameConfig.VEHICLE_ROTATION_SPEED;

  constructor(vehicle: THREE.Object3D, roadSystem: RoadSystem, startX: number, startY: number, direction: VehicleDirection = VehicleDirection.EAST) {
    this.vehicle = vehicle;
    this.roadSystem = roadSystem;
    this.currentTileX = startX;
    this.currentTileY = startY;
    this.currentDirection = direction;
    
    // Posicionar o veículo no início da estrada
    this.updateVehiclePosition();
    
    // Alinhar o veículo com a direção inicial
    this.updateVehicleRotation();
  }

  // Atualiza a posição e rotação do veículo com base no tempo
  public update(deltaTime: number): void {
    // Atualiza a rotação se estiver em transição
    if (this.transitioning) {
      this.updateRotationTransition(deltaTime);
    }
    
    // Avança o veículo
    this.tileProgress += (this.speed * deltaTime) / this.roadSystem.getTileSize();
    
    // Se terminou de percorrer o quarteirão atual
    if (this.tileProgress >= 1) {
      this.tileProgress = 0;
      this.moveToNextTile();
    }
    
    // Atualiza a posição do veículo
    this.updateVehiclePosition();
  }

  // Atualiza a posição do veículo com base no quarteirão atual e progresso
  private updateVehiclePosition(): void {
    const tileSize = this.roadSystem.getTileSize();
    // Usando o novo método que considera a direção para determinar a pista
    const lanePosition = this.roadSystem.getLanePosition(
      this.currentTileX, 
      this.currentTileY, 
      this.currentDirection
    );
    
    if (lanePosition) {
      // Calcular a posição com base na direção e progresso
      let x = lanePosition.x;
      let z = lanePosition.z;
      
      switch (this.currentDirection) {
        case VehicleDirection.NORTH:
          z -= tileSize * this.tileProgress;
          break;
        case VehicleDirection.SOUTH:
          z += tileSize * this.tileProgress;
          break;
        case VehicleDirection.EAST:
          x += tileSize * this.tileProgress;
          break;
        case VehicleDirection.WEST:
          x -= tileSize * this.tileProgress;
          break;
      }
      
      // Aplicar a posição ao veículo usando a altura global
      this.vehicle.position.set(x, GameConfig.VEHICLE_HEIGHT, z);
    }
  }

  // Atualiza a rotação do veículo com base na direção
  private updateVehicleRotation(): void {
    // Rotação base para cada direção
    let baseRotation = 0;
    
    switch (this.currentDirection) {
      case VehicleDirection.NORTH:
        baseRotation = Math.PI;
        break;
      case VehicleDirection.SOUTH:
        baseRotation = 0;
        break;
      case VehicleDirection.EAST:
        baseRotation = Math.PI / 2;
        break;
      case VehicleDirection.WEST:
        baseRotation = -Math.PI / 2;
        break;
    }
    
    // Adicionar 180 graus se a configuração de inverter direção estiver ativada
    if (GameConfig.VEHICLE_REVERSE_DIRECTION) {
      baseRotation += Math.PI;
    }
    
    // Normalizar a rotação para estar entre -PI e PI
    if (baseRotation > Math.PI) baseRotation -= Math.PI * 2;
    if (baseRotation < -Math.PI) baseRotation += Math.PI * 2;
    
    this.targetRotation = baseRotation;
    
    // Iniciar transição suave para a rotação alvo
    this.transitioning = true;
  }

  // Atualiza gradualmente a rotação para criar uma curva suave
  private updateRotationTransition(deltaTime: number): void {
    const step = this.rotationSpeed * deltaTime;
    const currentRotation = this.vehicle.rotation.y;
    
    // Calculando a diferença, levando em conta a volta completa
    let diff = this.targetRotation - currentRotation;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    
    if (Math.abs(diff) < step) {
      // Chegou suficientemente perto do alvo
      this.vehicle.rotation.y = this.targetRotation;
      this.transitioning = false;
    } else {
      // Continua a transição
      this.vehicle.rotation.y += Math.sign(diff) * step;
    }
  }

  // Determina o próximo quarteirão com base na direção atual
  private moveToNextTile(): void {
    // Guarda a posição atual para o caso de precisar reverter
    const oldX = this.currentTileX;
    const oldY = this.currentTileY;
    const oldDirection = this.currentDirection;
    
    // Move para o próximo quarteirão com base na direção
    switch (this.currentDirection) {
      case VehicleDirection.NORTH:
        this.currentTileY--;
        break;
      case VehicleDirection.SOUTH:
        this.currentTileY++;
        break;
      case VehicleDirection.EAST:
        this.currentTileX++;
        break;
      case VehicleDirection.WEST:
        this.currentTileX--;
        break;
    }
    
    // Verificar se a nova posição é válida
    const nextPosition = this.roadSystem.getTileWorldPosition(this.currentTileX, this.currentTileY);
    if (!nextPosition) {
      // Se não encontrou uma posição válida, reverte para a posição anterior
      this.currentTileX = oldX;
      this.currentTileY = oldY;
      this.currentDirection = this.getOppositeDirection(oldDirection);
      this.updateVehicleRotation();
      return;
    }
    
    // Obter informações sobre o próximo tile
    const nextTile = this.roadSystem.getTileInfo(this.currentTileX, this.currentTileY);
    if (!nextTile || nextTile.type === RoadTileType.EMPTY) {
      // Se o próximo tile não existe ou é vazio, reverte
      this.currentTileX = oldX;
      this.currentTileY = oldY;
      this.currentDirection = this.getOppositeDirection(oldDirection);
      this.updateVehicleRotation();
      return;
    }
    
    // Se o próximo tile é uma interseção, decide para onde ir
    if (nextTile.type === RoadTileType.INTERSECTION) {
      this.decideDirectionAtIntersection(nextTile);
    } 
    // Se o próximo tile é uma rua reta, ajusta a direção conforme a orientação da rua
    else if (nextTile.type === RoadTileType.STRAIGHT) {
      this.adjustDirectionForStraightRoad(nextTile);
    }
    
    // Atualiza a rotação do veículo para a nova direção
    this.updateVehicleRotation();
  }

  // Decide qual direção tomar em uma interseção
  private decideDirectionAtIntersection(intersectionTile: RoadTile): void {
    // Em uma interseção, temos 3 opções: seguir em frente, virar à esquerda ou à direita
    // Evitar fazer um retorno (girar 180 graus)
    
    // Obter as direções possíveis exceto a oposta à atual
    const possibleDirections: VehicleDirection[] = [];
    const oppositeDirection = this.getOppositeDirection(this.currentDirection);
    
    // Verificar todas as quatro direções possíveis
    for (let dir = 0; dir < 4; dir++) {
      if (dir !== oppositeDirection) {
        // Verificar se há uma estrada na direção
        const nextX = this.currentTileX + this.getOffsetXForDirection(dir as VehicleDirection);
        const nextY = this.currentTileY + this.getOffsetYForDirection(dir as VehicleDirection);
        
        const nextTile = this.roadSystem.getTileInfo(nextX, nextY);
        
        // Adicionar a direção se houver uma estrada válida
        if (nextTile && nextTile.type !== RoadTileType.EMPTY) {
          // Verificar compatibilidade de orientação para ruas retas
          if (nextTile.type === RoadTileType.STRAIGHT) {
            const isCompatible = this.isDirectionCompatibleWithRoad(dir as VehicleDirection, nextTile);
            if (isCompatible) {
              possibleDirections.push(dir as VehicleDirection);
            }
          } else {
            // Para interseções, todas as direções são válidas
            possibleDirections.push(dir as VehicleDirection);
          }
        }
      }
    }
    
    // Se não há direções possíveis, fazer um retorno
    if (possibleDirections.length === 0) {
      this.currentDirection = oppositeDirection;
      return;
    }
    
    // Preferência de direção: seguir em frente > virar à direita > virar à esquerda
    // Calcular preferências
    let bestDirection = possibleDirections[0];
    let bestScore = -1;
    
    for (const dir of possibleDirections) {
      let score = 0;
      
      // Seguir em frente tem maior prioridade
      if (dir === this.currentDirection) {
        score += 3;
      }
      // Virar à direita tem prioridade média
      else if (this.isRightTurn(this.currentDirection, dir)) {
        score += 2;
      }
      // Virar à esquerda tem prioridade baixa
      else {
        score += 1;
      }
      
      // Adicionar um pouco de aleatoriedade para evitar padrões previsíveis
      score += Math.random() * 0.5;
      
      if (score > bestScore) {
        bestScore = score;
        bestDirection = dir;
      }
    }
    
    this.currentDirection = bestDirection;
  }

  // Verifica se uma direção é compatível com a orientação de uma rua reta
  private isDirectionCompatibleWithRoad(direction: VehicleDirection, roadTile: RoadTile): boolean {
    // Direções Norte/Sul são compatíveis com orientação vertical
    if ((direction === VehicleDirection.NORTH || direction === VehicleDirection.SOUTH) && 
        roadTile.orientation === RoadOrientation.VERTICAL) {
      return true;
    }
    // Direções Leste/Oeste são compatíveis com orientação horizontal
    else if ((direction === VehicleDirection.EAST || direction === VehicleDirection.WEST) && 
             roadTile.orientation === RoadOrientation.HORIZONTAL) {
      return true;
    }
    
    return false;
  }

  // Ajusta a direção do veículo para seguir a orientação de uma rua reta
  private adjustDirectionForStraightRoad(roadTile: RoadTile): void {
    // Para ruas verticais, a direção deve ser Norte ou Sul
    if (roadTile.orientation === RoadOrientation.VERTICAL) {
      // Manter a direção Norte/Sul, ou escolher baseado na posição do tile
      if (this.currentDirection === VehicleDirection.NORTH || this.currentDirection === VehicleDirection.SOUTH) {
        // Manter a direção atual
      } else {
        // Escolher Norte ou Sul baseado na posição no mapa (para evitar sair da estrada)
        const northTile = this.roadSystem.getTileInfo(this.currentTileX, this.currentTileY - 1);
        const southTile = this.roadSystem.getTileInfo(this.currentTileX, this.currentTileY + 1);
        
        if (northTile && northTile.type !== RoadTileType.EMPTY) {
          this.currentDirection = VehicleDirection.NORTH;
        } else if (southTile && southTile.type !== RoadTileType.EMPTY) {
          this.currentDirection = VehicleDirection.SOUTH;
        } else {
          // Se não encontrou direção válida, inverte a atual
          this.currentDirection = this.getOppositeDirection(this.currentDirection);
        }
      }
    }
    // Para ruas horizontais, a direção deve ser Leste ou Oeste
    else {
      // Manter a direção Leste/Oeste, ou escolher baseado na posição do tile
      if (this.currentDirection === VehicleDirection.EAST || this.currentDirection === VehicleDirection.WEST) {
        // Manter a direção atual
      } else {
        // Escolher Leste ou Oeste baseado na posição no mapa
        const eastTile = this.roadSystem.getTileInfo(this.currentTileX + 1, this.currentTileY);
        const westTile = this.roadSystem.getTileInfo(this.currentTileX - 1, this.currentTileY);
        
        if (eastTile && eastTile.type !== RoadTileType.EMPTY) {
          this.currentDirection = VehicleDirection.EAST;
        } else if (westTile && westTile.type !== RoadTileType.EMPTY) {
          this.currentDirection = VehicleDirection.WEST;
        } else {
          // Se não encontrou direção válida, inverte a atual
          this.currentDirection = this.getOppositeDirection(this.currentDirection);
        }
      }
    }
  }

  // Obtém a direção oposta
  private getOppositeDirection(direction: VehicleDirection): VehicleDirection {
    switch (direction) {
      case VehicleDirection.NORTH: return VehicleDirection.SOUTH;
      case VehicleDirection.SOUTH: return VehicleDirection.NORTH;
      case VehicleDirection.EAST: return VehicleDirection.WEST;
      case VehicleDirection.WEST: return VehicleDirection.EAST;
    }
  }

  // Verifica se é uma curva à direita
  private isRightTurn(fromDirection: VehicleDirection, toDirection: VehicleDirection): boolean {
    return (
      (fromDirection === VehicleDirection.NORTH && toDirection === VehicleDirection.EAST) ||
      (fromDirection === VehicleDirection.EAST && toDirection === VehicleDirection.SOUTH) ||
      (fromDirection === VehicleDirection.SOUTH && toDirection === VehicleDirection.WEST) ||
      (fromDirection === VehicleDirection.WEST && toDirection === VehicleDirection.NORTH)
    );
  }

  // Obtém o offset X para uma direção
  private getOffsetXForDirection(direction: VehicleDirection): number {
    switch (direction) {
      case VehicleDirection.EAST: return 1;
      case VehicleDirection.WEST: return -1;
      default: return 0;
    }
  }

  // Obtém o offset Y para uma direção
  private getOffsetYForDirection(direction: VehicleDirection): number {
    switch (direction) {
      case VehicleDirection.NORTH: return -1;
      case VehicleDirection.SOUTH: return 1;
      default: return 0;
    }
  }
  
  // Define uma nova velocidade para o veículo
  public setSpeed(speed: number): void {
    this.speed = Math.max(0, speed);
  }
  
  // Força uma mudança de direção (usado para testar ou controle manual)
  public setDirection(direction: VehicleDirection): void {
    if (direction !== this.currentDirection) {
      this.currentDirection = direction;
      this.updateVehicleRotation();
    }
  }
}