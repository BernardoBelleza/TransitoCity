import * as THREE from "three";
import { ModelLoader } from "./model-loader";

export interface VehicleModelConfig {
  path: string; // Caminho para o arquivo GLTF/GLB
  scale: number; // Escala do modelo
  flipDirection: boolean; // Se deve inverter a direção
  color?: number; // Cor opcional para alterar o modelo
}

export class VehicleModelManager {
  private modelLoader: ModelLoader;
  private modelConfigs: Map<string, VehicleModelConfig> = new Map();

  constructor(modelLoader: ModelLoader) {
    this.modelLoader = modelLoader;

    // Registrar configurações de modelos padrão
    this.registerModel("rally", {
      path: "/models/Rally.glb",
      scale: 0.7,
      flipDirection: true, // Este modelo precisa de inversão
    });

    // Você pode registrar mais modelos aqui
  }

  // Registra um novo modelo
  public registerModel(id: string, config: VehicleModelConfig): void {
    this.modelConfigs.set(id, config);
  }

  // Carrega e configura um modelo
  public loadModel(
    id: string,
    onLoaded: (model: THREE.Object3D) => void,
  ): void {
    const config = this.modelConfigs.get(id);

    if (!config) {
      console.error(`Modelo "${id}" não encontrado`);
      return;
    }

    this.modelLoader.loadModel(config.path, (model) => {
      // Aplicar escala
      model.scale.set(config.scale, config.scale, config.scale);

      // Aplicar rotação base se necessário
      if (config.flipDirection) {
        model.rotation.y = Math.PI;
      }

      // Aplicar cor personalizada, se definida
      if (config.color !== undefined) {
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material = child.material.map((m) => {
                const newMat = m.clone();
                newMat.color.setHex(config.color!);
                return newMat;
              });
            } else {
              const newMat = child.material.clone();
              newMat.color.setHex(config.color!);
              child.material = newMat;
            }
          }
        });
      }

      onLoaded(model);
    });
  }
}
