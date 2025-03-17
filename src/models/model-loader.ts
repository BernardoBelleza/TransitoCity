import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelLoader {
  private loader: GLTFLoader;
  
  constructor() {
    this.loader = new GLTFLoader();
  }
  
  public loadModel(
    path: string, 
    onLoad: (model: THREE.Object3D) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: ErrorEvent) => void
  ): void {
    console.log(`Carregando modelo: ${path}`);
    
    this.loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        console.log('Modelo carregado com sucesso:', path);
        onLoad(model);
      },
      (xhr) => {
        const percentComplete = Math.round(xhr.loaded / xhr.total * 100);
        console.log(`${percentComplete}% carregado`);
        if (onProgress) onProgress(xhr);
      },
      (error) => {
        console.error('Erro ao carregar o modelo:', error);
        if (onError) onError(error);
      }
    );
  }
  
  public loadModel(url: string, onLoad: (model: THREE.Object3D) => void): void {
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
        console.log(`${(xhr.loaded / xhr.total * 100)}% carregado`);
      },
      (error) => {
        // Erro: correção do tipo
        console.error('Erro ao carregar o modelo:', error);
      }
    );
  }
}