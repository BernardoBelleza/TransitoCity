import * as THREE from 'three';
import { RoadSystem, RoadTileType } from '../roads/road-system';
import { LightingManager, TimeOfDay } from './lighting-manager';

export class StreetLights {
  private scene: THREE.Scene;
  private roadSystem: RoadSystem;
  private lightingManager: LightingManager;
  private streetLights: THREE.Object3D[] = [];
  private lightSources: THREE.PointLight[] = [];
  
  constructor(scene: THREE.Scene, roadSystem: RoadSystem, lightingManager: LightingManager) {
    this.scene = scene;
    this.roadSystem = roadSystem;
    this.lightingManager = lightingManager;
    
    this.setupStreetLights();
  }
  
  private setupStreetLights(): void {
    const roadMap = this.roadSystem.getRoadMap();
    if (!roadMap) return;
    
    // Para cada rua, adicionar postes de luz
    for (let y = 0; y < roadMap.length; y++) {
      for (let x = 0; x < roadMap[y].length; x++) {
        const tile = roadMap[y][x];
        
        // Verificar se é uma estrada (não interseção)
        if (tile && tile.type === RoadTileType.ROAD) {
          // Colocar postes nas estradas
          this.createStreetLight(x, y);
        }
      }
    }
  }
  
  private createStreetLight(x: number, y: number): void {
    const tilePosition = this.roadSystem.getTileWorldPosition(x, y);
    if (!tilePosition) return;
    
    const tileSize = this.roadSystem.getTileSize();
    
    // Criar poste de luz
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.15, 4, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.5
    });
    
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(tilePosition.x + 1.5, 2, tilePosition.z - 1.5);
    pole.castShadow = true;
    pole.receiveShadow = true;
    
    // Criar a luminária
    const lampGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
    const lampMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.5,
      metalness: 0.8
    });
    
    const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
    lamp.position.y = 2;
    pole.add(lamp);
    
    // Criar fonte de luz
    const light = new THREE.PointLight(0xffffaa, 0, 8); // Começa desligada
    light.position.y = 1.9;
    light.castShadow = true;
    lamp.add(light);
    
    // Adicionar à cena
    this.scene.add(pole);
    this.streetLights.push(pole);
    this.lightSources.push(light);
    
    // Também adicionar no lado oposto da rua, se necessário
    if (Math.random() > 0.5) {
      const pole2 = pole.clone();
      pole2.position.set(tilePosition.x - 1.5, 2, tilePosition.z + 1.5);
      this.scene.add(pole2);
      this.streetLights.push(pole2);
      
      // Obter a luz do poste clonado
      const lamp2 = pole2.children[0];
      const light2 = lamp2.children[0] as THREE.PointLight;
      this.lightSources.push(light2);
    }
  }
  
  public update(): void {
    const timeOfDay = this.lightingManager.getTimeOfDay();
    const isDark = timeOfDay === TimeOfDay.EVENING || 
                  timeOfDay === TimeOfDay.NIGHT || 
                  timeOfDay === TimeOfDay.DAWN;
    
    // Intensidade das luzes com base no horário
    let intensity = 0;
    
    if (timeOfDay === TimeOfDay.NIGHT) {
      intensity = 1.0;
    } else if (timeOfDay === TimeOfDay.EVENING) {
      intensity = 0.8;
    } else if (timeOfDay === TimeOfDay.DAWN) {
      intensity = 0.6;
    }
    
    // Atualizar todas as luzes
    for (const light of this.lightSources) {
      light.intensity = intensity;
    }
  }
}