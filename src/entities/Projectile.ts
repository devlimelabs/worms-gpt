import * as THREE from 'three';

import { EXPLOSION_RADIUS, GRAVITY, PROJECTILE_RADIUS } from '../const';
import { Terrain } from '../terrain/Terrain';

export class Projectile {
  mesh: THREE.Mesh;
  pos = new THREE.Vector2();
  vel = new THREE.Vector2();
  alive = true;

  constructor(scene: THREE.Scene, x: number, y: number, vx: number, vy: number) {
    this.pos.set(x, y); this.vel.set(vx, vy);
    this.mesh = new THREE.Mesh(
      new THREE.CircleGeometry(PROJECTILE_RADIUS, 12),
      new THREE.MeshBasicMaterial({ color: 0xff795e })
    );
    this.mesh.position.set(x, y, 0.1);
    scene.add(this.mesh);
  }

  update(dt: number, wind: number, terrain: Terrain): { explode?: { x: number, y: number, r: number } } {
    if (!this.alive) return {};
    // physics
    this.vel.y += GRAVITY * dt;
    this.vel.x += wind * dt;
    const steps = 2;
    for (let i = 0; i < steps; i++) {
      this.pos.x += this.vel.x * (dt / steps);
      this.pos.y += this.vel.y * (dt / steps);
      if (terrain.sampleAlpha(this.pos.x, this.pos.y) > 10) {
        this.alive = false;
        return { explode: { x: this.pos.x, y: this.pos.y, r: EXPLOSION_RADIUS } };
      }
    }
    this.mesh.position.set(this.pos.x, this.pos.y, 0.1);
    return {};
  }

  cleanup(scene: THREE.Scene) {
    scene.remove(this.mesh);
  }
}
