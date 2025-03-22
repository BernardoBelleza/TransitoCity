import * as THREE from 'three';
import { RoadSystem, RoadTileType, RoadOrientation, RoadTile } from '../roads/road-system';
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

  // Adicionar uma nova propriedade para referência ao sistema de sinaleiras
  private trafficLightSystem: TrafficLightSystem | null = null;
  private isStopped: boolean = false;
  private isDecelerating: boolean = false;
  private nextIntersectionTileX: number = -1;
  private nextIntersectionTileY: number = -1;

  // Adicione estas propriedades à classe VehicleController
  private currentSpeed: number = 0;                        // Velocidade atual
  private maxSpeed: number = GameConfig.VEHICLE_SPEED;     // Velocidade máxima
  private acceleration: number = 0.5;                      // Taxa de aceleração
  private deceleration: number = 1.5;                      // Taxa de desaceleração (mais rápida que a aceleração)
  private isAccelerating: boolean = false;                 // Estado de aceleração

  // Modificar o construtor para aceitar o parâmetro opcional do sistema de sinaleiras
  constructor(vehicle: THREE.Object3D, roadSystem: RoadSystem, startX: number, startY: number, 
             direction: VehicleDirection = VehicleDirection.EAST, 
             trafficLightSystem: TrafficLightSystem | null = null) {
    this.vehicle = vehicle;
    this.roadSystem = roadSystem;
    this.currentTileX = startX;
    this.currentTileY = startY;
    this.currentDirection = direction;
    this.trafficLightSystem = trafficLightSystem;
    
    // Posicionar o veículo no início da estrada
    this.updateVehiclePosition();
    
    // Alinhar o veículo com a direção inicial
    this.updateVehicleRotation();
  }

  // Modificar o método update para usar aceleração gradual
  public update(deltaTime: number): void {
    // Se o veículo está parado em um sinal vermelho, verificar se já pode continuar
    if (this.isStopped && this.trafficLightSystem) {
      // Verificar se o sinal já mudou para verde
      if (this.trafficLightSystem.canCrossIntersection(
          this.nextIntersectionTileX, this.nextIntersectionTileY, this.currentDirection)) {
        console.log("Sinal verde, iniciando aceleração");
        this.isStopped = false;
        this.isDecelerating = false;
        this.isAccelerating = true;   // Inicia aceleração
        this.currentSpeed = 0;        // Começa do zero
      } else {
        // Ainda está vermelho, manter parado
        return;
      }
    }
    
    // Gerenciar a aceleração
    if (this.isAccelerating) {
      // Acelerar gradualmente
      this.currentSpeed += GameConfig.VEHICLE_ACCELERATION * deltaTime;
      
      // Limitar à velocidade máxima
      if (this.currentSpeed >= GameConfig.VEHICLE_SPEED) {
        this.currentSpeed = GameConfig.VEHICLE_SPEED;
        this.isAccelerating = false;  // Atingiu velocidade máxima
      }
    }
    
    // Se o veículo está desacelerando para um sinal vermelho
    if (this.isDecelerating) {
      // Calcular o progresso atual no tile
      const progress = this.tileProgress;
      
      // Usar o ponto de parada definido em GameConfig
      const stopPoint = GameConfig.VEHICLE_STOP_POINT;
      
      if (progress >= stopPoint) {
        // Chegou ao ponto de parada, parando completamente
        console.log(`Veículo parou em ${this.currentTileX},${this.currentTileY} com progresso ${stopPoint}`);
        this.isStopped = true;
        this.isDecelerating = false;
        this.currentSpeed = 0;  // Velocidade zero
        this.tileProgress = stopPoint;
        this.updateVehiclePosition();
        return;
      } else {
        // Continuar desacelerando suavemente
        const distanceToStop = stopPoint - progress;
        
        // Desaceleração mais intensa quanto mais próximo do ponto de parada
        this.currentSpeed -= GameConfig.VEHICLE_DECELERATION * deltaTime;
        
        // Garantir que a velocidade não fique negativa
        if (this.currentSpeed < 0.05) {
          this.currentSpeed = 0.05;  // Velocidade mínima muito baixa
        }
        
        // Calcular o movimento com a velocidade atual
        this.tileProgress += this.currentSpeed * deltaTime;
        
        // Garantir que não ultrapasse o ponto de parada
        if (this.tileProgress >= stopPoint) {
          this.tileProgress = stopPoint;
          this.isStopped = true;
          this.isDecelerating = false;
          this.currentSpeed = 0;
        }
        
        // Atualizar a posição com a desaceleração
        this.updateVehiclePosition();
        return;
      }
    }
    
    // Movimento normal (sem desaceleração)
    // Usar a velocidade atual em vez de uma constante
    this.tileProgress += this.currentSpeed * deltaTime;
    
    // Verificar se precisamos começar a desacelerar para um sinal vermelho
    this.checkForUpcomingRedLight();
    
    // Atualizar a posição do veículo
    this.updateVehiclePosition();
    
    // Se chegou ao fim do quarteirão atual
    if (this.tileProgress >= 1.0) {
      this.moveToNextTile();
    }

    // Verificar se o veículo está preso
    this.checkIfStuck();
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
    
    // Visualização de frenagem (versão simplificada)
    if (this.isDecelerating || this.isStopped) {
      // Verificar se já existe um efeito de frenagem
      if (!this.vehicle.userData.brakeLight) {
        // Criar uma luz vermelha pequena para simular luz de freio
        const brakeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const brakeMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xFF0000, // Vermelho brilhante
          transparent: true,
          opacity: 0.9
        });
        
        const brakeLight = new THREE.Mesh(brakeGeometry, brakeMaterial);
        brakeLight.position.set(0, 0.2, -0.5); // Posicionar na traseira do veículo
        
        this.vehicle.add(brakeLight);
        this.vehicle.userData.brakeLight = brakeLight;
      }
    } else {
      // Remover luz de freio se existir e não estiver freando
      if (this.vehicle.userData.brakeLight) {
        this.vehicle.remove(this.vehicle.userData.brakeLight);
        this.vehicle.userData.brakeLight = null;
      }
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

  // Modificar o método moveToNextTile para verificar sinaleiras
  private moveToNextTile(): void {
    // Calcular as coordenadas do próximo quarteirão
    const nextTileX = this.currentTileX + this.getOffsetXForDirection(this.currentDirection);
    const nextTileY = this.currentTileY + this.getOffsetYForDirection(this.currentDirection);
    
    // Verificar o próximo quarteirão
    const nextTile = this.roadSystem.getTileInfo(nextTileX, nextTileY);
    
    // Verificar se o próximo quarteirão é uma interseção com sinal vermelho
    if (nextTile && nextTile.type === RoadTileType.INTERSECTION && 
        this.trafficLightSystem && 
        !this.trafficLightSystem.canCrossIntersection(nextTileX, nextTileY, this.currentDirection)) {
      // Sinal vermelho, não avançar para o próximo quarteirão
      console.log(`[moveToNextTile] Não avançando para interseção [${nextTileX},${nextTileY}] com sinal vermelho`);
      
      // Forçar parada no fim do quarteirão atual
      this.tileProgress = GameConfig.VEHICLE_STOP_POINT;
      this.isStopped = true;
      this.isDecelerating = false;
      this.nextIntersectionTileX = nextTileX;
      this.nextIntersectionTileY = nextTileY;
      this.updateVehiclePosition();
      return;
    }
    
    // Se chegou aqui, pode prosseguir normalmente
    this.nextTileX = nextTileX;
    this.nextTileY = nextTileY;
    
    // Resetar o progresso para o novo quarteirão
    this.tileProgress = 0;
    
    if (nextTile) {
      // Avançar para o próximo quarteirão
      this.currentTileX = this.nextTileX;
      this.currentTileY = this.nextTileY;
      
      // Se for uma interseção, decidir qual direção tomar
      if (nextTile.type === RoadTileType.INTERSECTION) {
        this.decideDirectionAtIntersection(nextTile);
      }
      // Se for uma rua reta com orientação diferente, ajustar a direção
      else if (nextTile.type === RoadTileType.STRAIGHT) {
        this.adjustDirectionForStraightRoad(nextTile);
      }
    } else {
      // Se não há quarteirão válido à frente, fazer retorno
      this.currentDirection = this.getOppositeDirection();
    }
    
    // Atualiza a rotação do veículo para a nova direção
    this.updateVehicleRotation();
  }

  // Decide qual direção tomar em uma interseção
  private decideDirectionAtIntersection(): void {
    // Em uma interseção, queremos escolher uma direção aleatória dentre as disponíveis
    // Evitar fazer um retorno (girar 180 graus)
    
    // Obter as direções possíveis exceto a oposta à atual
    const possibleDirections: VehicleDirection[] = [];
    const oppositeDirection = this.getOppositeDirection();
    
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
    
    // Escolha aleatória entre as direções disponíveis
    const randomIndex = Math.floor(Math.random() * possibleDirections.length);
    this.currentDirection = possibleDirections[randomIndex];
    
    // Nesse ponto, a direção foi escolhida aleatoriamente
    // O RoadSystem.getLanePosition já garante que o veículo seguirá 
    // pela via da direita baseado na direção escolhida
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
          this.currentDirection = this.getOppositeDirection();
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
          this.currentDirection = this.getOppositeDirection();
        }
      }
    }
  }

  // Obtém a direção oposta
  private getOppositeDirection(): VehicleDirection {
    switch (this.currentDirection) {
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

  // Modificar o método checkForUpcomingRedLight para melhorar a detecção antecipada
  private checkForUpcomingRedLight(): void {
    // Se não temos sistema de sinaleiras, ignorar
    if (!this.trafficLightSystem) return;
    
    // Se já estamos parando, acelerando ou parados, não precisamos verificar
    if (this.isDecelerating || this.isStopped || this.isAccelerating) return;
    
    // Verificar se já estamos em uma interseção - se estiver, não parar
    const currentTile = this.roadSystem.getTileInfo(this.currentTileX, this.currentTileY);
    if (currentTile && currentTile.type === RoadTileType.INTERSECTION) {
      return; // Já está em uma interseção, continuar movendo
    }
    
    // Verificar se o próximo quarteirão é uma interseção
    const nextTileX = this.currentTileX + this.getOffsetXForDirection(this.currentDirection);
    const nextTileY = this.currentTileY + this.getOffsetYForDirection(this.currentDirection);
    
    const nextTile = this.roadSystem.getTileInfo(nextTileX, nextTileY);
    
    if (nextTile && nextTile.type === RoadTileType.INTERSECTION) {
      // Encontrou uma interseção logo à frente, verificar o sinal
      if (!this.trafficLightSystem.canCrossIntersection(nextTileX, nextTileY, this.currentDirection)) {
        // Sinal vermelho, começar a desacelerar
        console.log(`Veículo em [${this.currentTileX},${this.currentTileY}] encontrou sinal vermelho em [${nextTileX},${nextTileY}], direção: ${this.currentDirection}`);
        this.isDecelerating = true;
        this.isAccelerating = false;
        this.nextIntersectionTileX = nextTileX;
        this.nextIntersectionTileY = nextTileY;
        
        // Se o veículo já está muito próximo da interseção, forçar a parada imediata
        if (this.tileProgress > 0.8) {
          this.tileProgress = GameConfig.VEHICLE_STOP_POINT;
          this.isStopped = true;
          this.isDecelerating = false;
          this.isAccelerating = false;
          this.currentSpeed = 0;
          this.updateVehiclePosition();
        }
      }
    }
  }

  // Método para resetar um veículo que pode estar preso - versão melhorada
  public resetVehicle(newX: number, newY: number, newDirection: VehicleDirection): void {
    // Atualizar posição e direção
    this.currentTileX = newX;
    this.currentTileY = newY;
    this.currentDirection = newDirection;
    
    // Resetar progresso e estados
    this.tileProgress = 0;
    this.isStopped = false;
    this.isDecelerating = false;
    
    // Importante: reiniciar a velocidade e estado de aceleração
    this.currentSpeed = 0.1; // Começar com uma velocidade mínima
    this.isAccelerating = true; // Iniciar em modo aceleração
    
    // Limpar qualquer referência a semáforos
    this.nextIntersectionTileX = -1;
    this.nextIntersectionTileY = -1;
    
    // Determinar a direção correta baseada no tipo de via
    const currentTile = this.roadSystem.getTileInfo(newX, newY);
    if (currentTile && currentTile.type === RoadTileType.STRAIGHT) {
      // Ajustar a direção de acordo com a orientação da rua
      this.adjustDirectionForStraightRoad(currentTile);
    }
    
    // Verificar se há uma via válida para seguir na direção atual
    const nextX = newX + this.getOffsetXForDirection(this.currentDirection);
    const nextY = newY + this.getOffsetYForDirection(this.currentDirection);
    const nextTile = this.roadSystem.getTileInfo(nextX, nextY);
    
    // Se não há via válida na direção atual, inverter a direção
    if (!nextTile || nextTile.type === RoadTileType.EMPTY) {
      this.currentDirection = this.getOppositeDirection();
      console.log(`Sem saída na direção atual, invertendo para ${this.currentDirection}`);
    }
    
    // Atualizar a posição e rotação físicas do veículo
    this.updateVehiclePosition();
    this.updateVehicleRotation();
    
    // Atualizando tempo da última movimentação para evitar nova detecção de "preso" imediata
    this.lastMoveTime = Date.now();
    this.lastProgress = 0;
    
    console.log(`Veículo redefinido para [${newX},${newY}] com direção ${this.currentDirection} e iniciando movimento`);
  }

  // Método para verificar se o veículo está preso
  public checkIfStuck(timeout: number = 10): void {
    if (!this.lastMoveTime) {
      this.lastMoveTime = Date.now();
      return;
    }
    
    const currentTime = Date.now();
    const timeSinceLastMove = (currentTime - this.lastMoveTime) / 1000;
    
    // Se o veículo está parado por muito tempo e dentro de uma interseção
    const currentTile = this.roadSystem.getTileInfo(this.currentTileX, this.currentTileY);
    if (timeSinceLastMove > timeout && currentTile && currentTile.type === RoadTileType.INTERSECTION) {
      console.log(`Veículo está preso na interseção [${this.currentTileX},${this.currentTileY}] por ${timeSinceLastMove} segundos. Resetando...`);
      
      // Encontrar um tile de rua próximo para reposicionar
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const nearbyTile = this.roadSystem.getTileInfo(this.currentTileX + dx, this.currentTileY + dy);
          if (nearbyTile && nearbyTile.type === RoadTileType.STRAIGHT) {
            // Encontrou uma rua próxima, resetar para ela
            this.resetVehicle(this.currentTileX + dx, this.currentTileY + dy, this.currentDirection);
            return;
          }
        }
      }
      
      // Se não encontrou rua próxima, apenas tentar sair da interseção
      this.isStopped = false;
      this.isDecelerating = false;
      this.tileProgress = 0.5; // Meio do tile
    }
    
    // Atualizar o tempo da última movimentação se o carro está se movendo
    if (!this.isStopped && this.tileProgress !== this.lastProgress) {
      this.lastMoveTime = currentTime;
      this.lastProgress = this.tileProgress;
    }
  }

  // Adicione este método à classe VehicleController

  /**
   * Retorna informações de depuração do veículo para exibição
   */
  public getVehicleDebugInfo(): any {
    const currentTile = this.roadSystem.getTileInfo(this.currentTileX, this.currentTileY);
    
    return {
      // Informações lógicas
      tileX: this.currentTileX,
      tileY: this.currentTileY,
      tileType: currentTile ? currentTile.type : 'unknown',
      direction: this.currentDirection,
      progress: this.tileProgress,
      speed: this.currentSpeed || 0, // Usar 0 se currentSpeed não existir
      
      // Informações físicas
      worldPosition: this.vehicle.position.clone(),
      
      // Estado atual
      isStopped: this.isStopped || false,
      isDecelerating: this.isDecelerating || false,
      isAccelerating: this.isAccelerating || false
    };
  }
}