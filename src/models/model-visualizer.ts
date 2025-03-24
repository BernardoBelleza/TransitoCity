import * as THREE from 'three';
import { ModelManager } from './model-manager';
import { CHARACTER_MODELS } from '/character-models';

export class ModelVisualizer {
  private scene: THREE.Scene;
  private modelManager: ModelManager;
  private currentModel: THREE.Object3D | null = null;
  private currentMixer: THREE.AnimationMixer | null = null;
  private animations: THREE.AnimationClip[] = [];
  private clock = new THREE.Clock();
  private animationActions: THREE.AnimationAction[] = [];
  private activeAction: THREE.AnimationAction | null = null;
  private modelScale: number = 1.0;

  constructor(scene: THREE.Scene, modelManager: ModelManager) {
    this.scene = scene;
    this.modelManager = modelManager;
    this.setupAnimation();
  }

  private setupAnimation() {
    // Iniciar o loop de animação
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = this.clock.getDelta();

      if (this.currentMixer) {
        this.currentMixer.update(delta);
      }
    };
    animate();
  }

  public visualizeModel(modelId: string): void {
    console.log(`[ModelVisualizer] Visualizando modelo: ${modelId}`);
    
    // Limpar modelo anterior se existir
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
    }
    
    // Obter instância do modelo e animações
    const modelInstance = this.modelManager.getModelInstance(modelId);
    this.animations = this.modelManager.getModelAnimations(modelId) || [];
    
    if (!modelInstance) {
      console.error(`[ModelVisualizer] Modelo não encontrado: ${modelId}`);
      return;
    }
    
    // Configurar o modelo
    this.currentModel = modelInstance;
    
    // IMPORTANTE: Marcar o modelo e todos os seus filhos com a propriedade isVisualized
    this.currentModel.traverse((object) => {
      if (!object.userData) object.userData = {};
      object.userData.isVisualized = true;
    });
    
    // Posicionar o modelo no centro da cena, levemente elevado
    this.currentModel.position.set(0, 0.5, 0);
    
    // Definir a escala inicial do modelo
    this.modelScale = 1.5;
    this.currentModel.scale.set(this.modelScale, this.modelScale, this.modelScale);
    
    // Adicionar o modelo à cena
    this.scene.add(this.currentModel);
    
    // Configurar animações
    this.setupModelAnimations();
    
    // Começar a reproduzir animação padrão (se houver)
    if (this.animations.length > 0) {
      this.playAnimation(0);
    }
    
    // Mostrar estatísticas do modelo
    this.logModelStats();
    
    console.log(`[ModelVisualizer] Modelo ${modelId} visualizado na origem`);
  }
  
  private setupModelAnimations(): void {
    // Criar mixer de animação
    if (this.currentModel && this.animations.length > 0) {
      console.log(`[ModelVisualizer] Configurando ${this.animations.length} animações`);
      
      this.currentMixer = new THREE.AnimationMixer(this.currentModel);
      this.animationActions = [];
      
      // Criar actions para cada animação
      this.animations.forEach((clip, index) => {
        console.log(`[ModelVisualizer] Preparada animação ${index}: ${clip.name}`);
        const action = this.currentMixer.clipAction(clip);
        this.animationActions.push(action);
      });
    } else {
      console.warn("[ModelVisualizer] Nenhuma animação encontrada para o modelo");
    }
  }
  
  public playAnimation(index: number): void {
    if (!this.currentMixer || this.animationActions.length === 0) {
      console.warn('[ModelVisualizer] Não há animações disponíveis para reproduzir');
      return;
    }
    
    if (index >= 0 && index < this.animationActions.length) {
      // Parar animação atual
      if (this.activeAction) {
        this.activeAction.fadeOut(0.5);
      }
      
      // Iniciar nova animação
      const newAction = this.animationActions[index];
      newAction.reset()
               .setEffectiveTimeScale(1)
               .setEffectiveWeight(1)
               .fadeIn(0.5)
               .play();
      
      this.activeAction = newAction;
      console.log(`[ModelVisualizer] Reproduzindo animação: ${this.animations[index].name}`);
    }
  }
  
  public increaseScale(): void {
    if (this.currentModel) {
      this.modelScale *= 1.2; // Aumentar em 20%
      this.currentModel.scale.set(this.modelScale, this.modelScale, this.modelScale);
      console.log(`[ModelVisualizer] Escala aumentada para: ${this.modelScale.toFixed(2)}`);
    }
  }
  
  public decreaseScale(): void {
    if (this.currentModel) {
      this.modelScale *= 0.8; // Diminuir em 20%
      this.currentModel.scale.set(this.modelScale, this.modelScale, this.modelScale);
      console.log(`[ModelVisualizer] Escala diminuída para: ${this.modelScale.toFixed(2)}`);
    }
  }
  
  private logModelStats(): void {
    if (!this.currentModel) return;
    
    let meshCount = 0;
    let skinnedMeshCount = 0;
    let boneCount = 0;
    
    this.currentModel.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshCount++;
        if (object instanceof THREE.SkinnedMesh) {
          skinnedMeshCount++;
          if (object.skeleton) {
            boneCount += object.skeleton.bones.length;
          }
        }
      }
    });
    
    console.log('[ModelVisualizer] Estatísticas do modelo:');
    console.log(`- Meshes totais: ${meshCount}`);
    console.log(`- SkinnedMeshes: ${skinnedMeshCount}`);
    console.log(`- Ossos: ${boneCount}`);
  }
}