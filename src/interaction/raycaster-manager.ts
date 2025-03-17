import * as THREE from "three";

export class RaycasterManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = camera;
  }

  public setFromMouseEvent(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  public checkIntersection(object: THREE.Object3D): THREE.Intersection[] {
    return this.raycaster.intersectObject(object, true);
  }
}
