/**
 * Configurações globais do jogo
 * Este arquivo centraliza variáveis de configuração para fácil ajuste
 */

export class GameConfig {
  // Configurações de veículos
  static readonly VEHICLE_HEIGHT: number = 0.01;       // Altura dos veículos acima da estrada
  static readonly VEHICLE_SCALE: number = 0.7;        // Escala dos modelos de veículos
  static readonly VEHICLE_SPEED: number = 0.8;        // Velocidade máxima (unidades por segundo)
  static readonly VEHICLE_ACCELERATION: number = 0.2; // Taxa de aceleração (unidades por segundo²)
  static readonly VEHICLE_DECELERATION: number = 0.5; // Taxa de desaceleração (unidades por segundo²)
  static readonly VEHICLE_ROTATION_SPEED: number = 2.5; // Velocidade de rotação nas curvas
  static readonly VEHICLE_REVERSE_DIRECTION: boolean = true; // Inverter a direção do modelo (girar 180°)
  static readonly VEHICLE_STOP_DISTANCE: number = 0.1; // Distância de parada antes da interseção (0-1)
  static readonly VEHICLE_STOP_POINT: number = 0.9; // Ponto onde o veículo para (90% do tile)
  
  // Configurações de estradas
  static readonly TILE_SIZE: number = 15;             // Tamanho de cada quarteirão
  static readonly LANE_WIDTH: number = 2;             // Largura de cada pista
  static readonly LANE_OFFSET: number = 1;            // Distância entre o centro da rua e o centro de cada pista
  
  // Configurações do mundo
  static readonly WORLD_BACKGROUND_COLOR: number = 0x1e293b;  // Cor de fundo da cena
  static readonly GROUND_COLOR: number = 0x4CAF50;            // Cor do chão (grama)
  
  // Configurações da câmera
  static readonly CAMERA_INITIAL_POSITION: [number, number, number] = [30, 30, 30];  // Posição inicial [x, y, z]
  static readonly CAMERA_LOOK_AT: [number, number, number] = [0, 0, 0];              // Ponto para onde a câmera olha
  
  // Configurações das sinaleiras
  static readonly TRAFFIC_LIGHT_ENABLED: boolean = true;         // Habilitar sistema de sinaleiras
  // Experimente aumentar o tamanho
  static readonly TRAFFIC_LIGHT_SIZE: number = 1.0; // Aumente de 0.5 para 1.0
  static readonly TRAFFIC_LIGHT_HEIGHT: number = 1.5;            // Altura das sinaleiras acima da estrada
  // Experimente reduzir a distância
  static readonly TRAFFIC_LIGHT_DISTANCE: number = 2.5; // Reduza de 4 para 2.5
  
  // Durações dos sinais (em segundos)
  static readonly TRAFFIC_LIGHT_GREEN_DURATION: number = 5;     // Duração do sinal verde
  static readonly TRAFFIC_LIGHT_YELLOW_DURATION: number = 5;     // Duração do sinal amarelo
  static readonly TRAFFIC_LIGHT_RED_DURATION: number = 6;       // Duração do sinal vermelho (verde + amarelo da direção oposta)
  
  // Cores das luzes
  static readonly TRAFFIC_LIGHT_GREEN_COLOR: number = 0x00FF00;  // Cor do sinal verde
  static readonly TRAFFIC_LIGHT_YELLOW_COLOR: number = 0xFFFF00; // Cor do sinal amarelo
  static readonly TRAFFIC_LIGHT_RED_COLOR: number = 0xFF0000;    // Cor do sinal vermelho
  static readonly TRAFFIC_LIGHT_OFF_COLOR: number = 0x111111;    // Cor quando a luz está apagada

  // Configurações de visualização
  static readonly GRID_OUTLINES_ENABLED: boolean = true;        // Mostrar contornos de grade
  static readonly GRID_OUTLINE_INTERSECTION_COLOR: number = 0xFF0000; // Cor para interseções
  static readonly GRID_OUTLINE_ROAD_COLOR: number = 0x00FFFF;   // Cor para ruas
  static readonly GRID_OUTLINE_EMPTY_COLOR: number = 0x444444;  // Cor para células vazias
}