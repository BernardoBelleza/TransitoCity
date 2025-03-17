/**
 * Configurações globais do jogo
 * Este arquivo centraliza variáveis de configuração para fácil ajuste
 */

export class GameConfig {
  // Configurações de veículos
  static readonly VEHICLE_HEIGHT: number = 0.01; // Altura dos veículos acima da estrada
  static readonly VEHICLE_SCALE: number = 0.7; // Escala dos modelos de veículos
  static readonly VEHICLE_SPEED: number = 2; // Velocidade base dos veículos (unidades/segundo)
  static readonly VEHICLE_ROTATION_SPEED: number = 2.5; // Velocidade de rotação nas curvas
  static readonly VEHICLE_REVERSE_DIRECTION: boolean = true; // Inverter a direção do modelo (girar 180°)

  // Configurações de estradas
  static readonly TILE_SIZE: number = 10; // Tamanho de cada quarteirão
  static readonly LANE_WIDTH: number = 2; // Largura de cada pista
  static readonly LANE_OFFSET: number = 1; // Distância entre o centro da rua e o centro de cada pista

  // Configurações do mundo
  static readonly WORLD_BACKGROUND_COLOR: number = 0x1e293b; // Cor de fundo da cena
  static readonly GROUND_COLOR: number = 0x4caf50; // Cor do chão (grama)

  // Configurações da câmera
  static readonly CAMERA_INITIAL_POSITION: [number, number, number] = [
    30, 30, 30,
  ]; // Posição inicial [x, y, z]
  static readonly CAMERA_LOOK_AT: [number, number, number] = [0, 0, 0]; // Ponto para onde a câmera olha
}
