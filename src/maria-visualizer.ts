import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class MariaVisualizer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private mixer: THREE.AnimationMixer | null = null;
  private clock = new THREE.Clock();
  private model: THREE.Object3D | null = null;
  private animations: THREE.AnimationClip[] = [];

  constructor(containerId: string = 'maria-container') {
    // Criar container se não existir
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'absolute';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.top = '0';
      container.style.left = '0';
      container.style.zIndex = '1000';
      document.body.appendChild(container);
    }

    // Configurar cena, câmera e renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x333333);
    
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1, 2);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    
    // Adicionar controles
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.8, 0);
    this.controls.update();
    
    // Adicionar iluminação
    this.setupLights();
    
    // Adicionar grid para referência
    this.addGrid();
    
    // Redimensionar quando a janela mudar
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Iniciar animação
    this.animate();
    
    // Carregar o modelo Maria
    this.loadMaria();
    
    // Adicionar botões de controle
    this.addControlButtons();
  }
  
  private setupLights(): void {
    // Luz ambiente
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Luz direcional principal (simula o sol)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);
    
    // Luz de preenchimento (fill light) para reduzir sombras duras
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);
  }
  
  private addGrid(): void {
    const grid = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    this.scene.add(grid);
  }
  
  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    const delta = this.clock.getDelta();
    
    // Atualizar mixer de animação se existir
    if (this.mixer) {
      this.mixer.update(delta);
    }
    
    // Atualizar controles e renderizar
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  private loadMaria(): void {
    const loader = new GLTFLoader();
    
    // Tentar carregar de diferentes caminhos
    const paths = [
      './models/maria.glb',
      '../models/maria.glb',
      '/models/maria.glb',
      'models/maria.glb'
    ];
    
    let loaded = false;
    
    // Tentar cada caminho até que um funcione
    for (let i = 0; i < paths.length && !loaded; i++) {
      const path = paths[i];
      console.log(`Tentando carregar Maria de: ${path}`);
      
      loader.load(
        path,
        (gltf) => {
          loaded = true;
          console.log("Modelo Maria carregado com sucesso!");
          
          // IMPORTANTE: Limpar cena antes de adicionar o novo modelo
          // Isso evita duplicações
          if (this.model) {
            this.scene.remove(this.model);
            this.model = null;
          }
          
          // Primeiro, vamos fazer a limpeza de qualquer objeto indesejado
          this.cleanupModelScene(gltf.scene);
          
          // Corrija o problema NODE_SKINNED_MESH_NON_ROOT
          this.fixSkinnedMeshHierarchy(gltf.scene);
          
          // Configurar o modelo
          this.model = gltf.scene;
          this.animations = gltf.animations;
          
          // Verificar quais nós estão na cena
          console.log("Estrutura do modelo:");
          this.logModelHierarchy(this.model);
          
          // Posicionar no centro (0,0,0)
          this.model.position.set(0, 0, 0);
          
          // Escalar para tamanho apropriado
          this.model.scale.set(1, 1, 1);
          
          // Adicionar à cena
          this.scene.add(this.model);
          
          // Criar mixer e iniciar animação inicial
          if (this.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.model);
            const action = this.mixer.clipAction(this.animations[0]);
            action.play();
            
            console.log(`Animações disponíveis: ${this.animations.length}`);
            this.animations.forEach((anim, i) => {
              console.log(`Animação ${i}: ${anim.name}, duração: ${anim.duration}s`);
            });
          }
          
          // Ajustar câmera para melhor visualização
          this.focusCamera();
        },
        (progress) => {
          console.log(`Carregando: ${Math.round(progress.loaded / progress.total * 100)}%`);
        },
        (error) => {
          console.error(`Erro ao carregar de ${path}:`, error);
          // Continue tentando o próximo caminho
        }
      );
    }
  }
  
  /**
   * Limpa a cena do modelo, removendo objetos extras/duplicados
   * Isso resolverá o problema dos 3 frames congelados do modelo
   */
  private cleanupModelScene(modelScene: THREE.Object3D): void {
    console.log("Limpando a cena do modelo...");
    
    // Lista para armazenar malhas skinned válidas (queremos manter apenas uma)
    const skinnedMeshes: THREE.SkinnedMesh[] = [];
    const duplicateNodes: THREE.Object3D[] = [];
    
    // Primeiro, vamos identificar todos os skinned meshes
    modelScene.traverse((node) => {
      if (node instanceof THREE.SkinnedMesh) {
        skinnedMeshes.push(node);
      }
    });
    
    console.log(`Encontradas ${skinnedMeshes.length} malhas skinned no modelo`);
    
    // Se houver mais de um SkinnedMesh, provavelmente são duplicações
    // Em modelos bem estruturados, geralmente há apenas um SkinnedMesh principal
    if (skinnedMeshes.length > 1) {
      // Vamos identificar qual é o principal - geralmente é o que tem animações associadas
      const mainMesh = skinnedMeshes[0]; // Por padrão, considere o primeiro
      
      // Remove todos os outros do seus pais
      for (let i = 1; i < skinnedMeshes.length; i++) {
        const mesh = skinnedMeshes[i];
        console.log(`Removendo mesh duplicada: ${mesh.name || 'sem nome'}`);
        if (mesh.parent) {
          mesh.parent.remove(mesh);
        }
      }
    }
    
    // Agora vamos procurar por nós duplicados ou extras que não são mesh
    // Identifique nós que parecem ser duplicações
    const nodeNames = new Set<string>();
    const nodesToInspect: THREE.Object3D[] = [];
    
    modelScene.traverse((node) => {
      // Pular nós que são SkinnedMesh, já lidamos com eles
      if (node instanceof THREE.SkinnedMesh) return;
      
      // Se o nome do nó contiver "frame" ou "pose" ou "static", pode ser um frame estático
      if (node.name && (
          node.name.toLowerCase().includes('frame') ||
          node.name.toLowerCase().includes('pose') ||
          node.name.toLowerCase().includes('static')
      )) {
        duplicateNodes.push(node);
        return;
      }
      
      // Se encontrarmos o mesmo nome mais de uma vez (exceto nomes vazios), 
      // é uma duplicação potencial
      if (node.name && node.name !== '') {
        if (nodeNames.has(node.name)) {
          nodesToInspect.push(node);
        } else {
          nodeNames.add(node.name);
        }
      }
    });
    
    // Verificar os nós potencialmente duplicados
    for (const node of nodesToInspect) {
      // Se o nó for uma malha mas não é skinned, e tem o mesmo nome que outra,
      // provavelmente é um quadro duplicado
      if (node instanceof THREE.Mesh && !(node instanceof THREE.SkinnedMesh)) {
        duplicateNodes.push(node);
      }
    }
    
    // Remover todos os nós identificados como duplicados
    for (const node of duplicateNodes) {
      console.log(`Removendo nó duplicado/estático: ${node.name || 'sem nome'}`);
      if (node.parent) {
        node.parent.remove(node);
      }
    }
    
    console.log(`Removidos ${duplicateNodes.length} nós duplicados/estáticos`);
  }
  
  /**
   * Registra a hierarquia do modelo para depuração
   */
  private logModelHierarchy(model: THREE.Object3D, indent: string = ''): void {
    console.log(`${indent}${model.name || 'sem nome'} (${model.type})`);
    model.children.forEach(child => {
      this.logModelHierarchy(child, indent + '  ');
    });
  }
  
  /**
   * Corrige o problema NODE_SKINNED_MESH_NON_ROOT
   * Este warning ocorre quando uma malha com skinning não está na raiz do modelo
   */
  private fixSkinnedMeshHierarchy(model: THREE.Object3D): void {
    console.log("Corrigindo hierarquia de meshes skinned...");
    
    const skinnedMeshes: THREE.SkinnedMesh[] = [];
    
    // Encontrar todas as malhas skinned
    model.traverse((node) => {
      if (node instanceof THREE.SkinnedMesh) {
        skinnedMeshes.push(node);
      }
    });
    
    console.log(`Encontradas ${skinnedMeshes.length} meshes skinned`);
    
    // Corrigir cada malha skinned movendo-a para a raiz
    skinnedMeshes.forEach((mesh) => {
      if (mesh.parent !== model) {
        // Salvar transformações mundiais para preservar posição/orientação
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        
        mesh.updateMatrixWorld(true);
        mesh.matrixWorld.decompose(worldPos, worldQuat, worldScale);
        
        // Remover do pai atual
        if (mesh.parent) {
          mesh.parent.remove(mesh);
        }
        
        // Adicionar à raiz do modelo
        model.add(mesh);
        
        // Restaurar transformações mundiais
        mesh.position.copy(worldPos);
        mesh.quaternion.copy(worldQuat);
        mesh.scale.copy(worldScale);
        
        console.log(`Mesh skinned movida para a raiz: ${mesh.name || "sem nome"}`);
      }
    });
  }
  
  private focusCamera(): void {
    if (!this.model) return;
    
    // Calcular bounding box do modelo
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Ajustar posição da câmera e controles
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraDistance = maxDim / (2 * Math.tan(fov / 2));
    
    this.camera.position.set(center.x, center.y + size.y/2, center.z + cameraDistance * 1.5);
    this.controls.target.copy(center);
    this.controls.update();
  }
  
  private addControlButtons(): void {
    // Container para botões
    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.bottom = '20px';
    buttonContainer.style.left = '50%';
    buttonContainer.style.transform = 'translateX(-50%)';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    document.body.appendChild(buttonContainer);
    
    // Botão para aumentar escala
    const increaseScaleBtn = document.createElement('button');
    increaseScaleBtn.textContent = 'Aumentar Escala';
    increaseScaleBtn.style.padding = '10px';
    increaseScaleBtn.style.cursor = 'pointer';
    increaseScaleBtn.addEventListener('click', () => {
      if (this.model) {
        this.model.scale.multiplyScalar(1.2);
      }
    });
    buttonContainer.appendChild(increaseScaleBtn);
    
    // Botão para diminuir escala
    const decreaseScaleBtn = document.createElement('button');
    decreaseScaleBtn.textContent = 'Diminuir Escala';
    decreaseScaleBtn.style.padding = '10px';
    decreaseScaleBtn.style.cursor = 'pointer';
    decreaseScaleBtn.addEventListener('click', () => {
      if (this.model) {
        this.model.scale.multiplyScalar(0.8);
      }
    });
    buttonContainer.appendChild(decreaseScaleBtn);
    
    // Botão para reproduzir animação (se houver)
    const playAnimBtn = document.createElement('button');
    playAnimBtn.textContent = 'Reproduzir Animação';
    playAnimBtn.style.padding = '10px';
    playAnimBtn.style.cursor = 'pointer';
    playAnimBtn.addEventListener('click', () => {
      if (this.mixer && this.animations.length > 0) {
        // Parar todas as animações antes de iniciar uma nova
        this.mixer.stopAllAction();
        
        // Reproduzir a primeira animação
        const action = this.mixer.clipAction(this.animations[0]);
        action.reset().play();
      }
    });
    buttonContainer.appendChild(playAnimBtn);
    
    // Botão para alternar entre animações (se houver várias)
    if (this.animations && this.animations.length > 1) {
      const nextAnimBtn = document.createElement('button');
      nextAnimBtn.textContent = 'Próxima Animação';
      nextAnimBtn.style.padding = '10px';
      nextAnimBtn.style.cursor = 'pointer';
      
      let currentAnimIndex = 0;
      
      nextAnimBtn.addEventListener('click', () => {
        if (this.mixer && this.animations.length > 0) {
          // Avançar para a próxima animação
          currentAnimIndex = (currentAnimIndex + 1) % this.animations.length;
          
          // Parar todas as animações antes de iniciar uma nova
          this.mixer.stopAllAction();
          
          const action = this.mixer.clipAction(this.animations[currentAnimIndex]);
          action.reset().play();
          console.log(`Reproduzindo animação: ${this.animations[currentAnimIndex].name}`);
        }
      });
      
      buttonContainer.appendChild(nextAnimBtn);
    }
    
    // Botão para recarregar o modelo (útil para testar a limpeza)
    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Recarregar Modelo';
    reloadBtn.style.padding = '10px';
    reloadBtn.style.cursor = 'pointer';
    reloadBtn.addEventListener('click', () => {
      this.loadMaria();
    });
    buttonContainer.appendChild(reloadBtn);
    
    // Botão para voltar (remover visualizador)
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Fechar';
    backBtn.style.padding = '10px';
    backBtn.style.cursor = 'pointer';
    backBtn.addEventListener('click', () => {
      this.dispose();
    });
    buttonContainer.appendChild(backBtn);
  }
  
  public dispose(): void {
    // Limpar recursos
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
    }
    
    // Remover elementos do DOM
    this.renderer.domElement.remove();
    document.getElementById('maria-container')?.remove();
    
    // Remover listeners
    window.removeEventListener('resize', this.onResize.bind(this));
    
    // Limpar controles
    this.controls.dispose();
  }
}

// Função para iniciar facilmente o visualizador
export function showMariaModel(): MariaVisualizer {
  return new MariaVisualizer();
}