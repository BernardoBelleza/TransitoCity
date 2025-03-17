import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export class ModelLoader {
  loadModel(url: string, onLoad: (model: THREE.Object3D) => void): void {
    const loader = new GLTFLoader();

    loader.load(
      url,
      (gltf) => {
        // Sucesso: modelo carregado
        const model = gltf.scene;
        onLoad(model);
      },
      (xhr) => {
        // Progresso: opcional
        console.log(`${(xhr.loaded / xhr.total) * 100}% carregado`);
      },
      (error: any) => {
        // Use 'any' para resolver o problema de tipo
        // Erro: correção do tipo
        console.error("Erro ao carregar o modelo:", error);
      },
    );
  }
}
