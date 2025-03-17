import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class CameraControls {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private keysPressed: Record<string, boolean> = {};
  private moveSpeed: number = 2.0;

  // Vetores temporários para cálculos
  private direction: THREE.Vector3 = new THREE.Vector3();
  private right: THREE.Vector3 = new THREE.Vector3();
  private up: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;

    // Configurar OrbitControls
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2;

    // Configurar eventos de teclado
    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keysPressed[event.key.toLowerCase()] = true;
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keysPressed[event.key.toLowerCase()] = false;
  }

  public update(deltaTime: number): void {
    // Atualizar controles primeiro para aplicar qualquer alteração de rotação
    this.controls.update();

    // Processar movimento WASD orientado para onde a câmera está olhando
    const actualMoveSpeed = this.moveSpeed * deltaTime;

    // Calculando a direção para onde a câmera está olhando (frente/trás)
    this.direction
      .set(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
      .normalize();

    // Calculando a direção para os lados (direita/esquerda)
    this.right.crossVectors(this.up, this.direction).normalize();

    // Movimento para frente (W)
    if (this.keysPressed["w"]) {
      this.moveCamera(this.direction, actualMoveSpeed);
    }

    // Movimento para trás (S)
    if (this.keysPressed["s"]) {
      this.moveCamera(this.direction, -actualMoveSpeed);
    }

    // Movimento para a esquerda (A)
    if (this.keysPressed["a"]) {
      this.moveCamera(this.right, actualMoveSpeed);
    }

    // Movimento para a direita (D)
    if (this.keysPressed["d"]) {
      this.moveCamera(this.right, -actualMoveSpeed);
    }
  }

  // Método para mover a câmera em uma direção específica
  private moveCamera(direction: THREE.Vector3, distance: number): void {
    // Criar um vetor temporário para o movimento
    const moveVector = direction.clone().multiplyScalar(distance);

    // Aplicar o movimento à posição da câmera
    this.camera.position.add(moveVector);

    // Atualizar o alvo dos controles para acompanhar o movimento da câmera
    this.controls.target.add(moveVector);
  }

  public dispose(): void {
    this.controls.dispose();
    document.removeEventListener("keydown", this.onKeyDown.bind(this));
    document.removeEventListener("keyup", this.onKeyUp.bind(this));
  }
}
