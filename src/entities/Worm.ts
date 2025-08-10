import * as THREE from "three";
import {
  ALPHA_SOLID, GROUND_EPS, JUMP_SPEED, STEP_HEIGHT, FOOT_OFFSET,
  GRAVITY, WORM_AIR_CTRL, WORM_FRICTION, WORM_MOVE_ACCEL,
  WORM_MOVE_MAX, WORM_RADIUS, WORLD_H, WORLD_W
} from "../const";
import { Terrain } from "../terrain/Terrain";

export class Worm {
  group = new THREE.Group();
  body: THREE.Mesh;
  barrel: THREE.Mesh;
  pos = new THREE.Vector2();
  vel = new THREE.Vector2();
  angle = 30 * Math.PI / 180;
  team: 0 | 1;
  hp = 100;
  alive = true;
  onGround = false;

  constructor(team: 0 | 1, x: number, y: number, scene: THREE.Scene, color: number) {
    this.team = team;
    this.body = new THREE.Mesh(new THREE.CircleGeometry(WORM_RADIUS, 24),
      new THREE.MeshBasicMaterial({ color }));
    this.barrel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x222f44 })
    );
    this.barrel.position.x = 0.6;

    this.group.add(this.body, this.barrel);
    this.pos.set(x, y);
    this.group.position.set(x, y, 0);
    scene.add(this.group);
  }

  setAngleFromMouse(mx: number, my: number) {
    this.angle = Math.atan2(my - this.pos.y, mx - this.pos.x);
    this.barrel.rotation.z = this.angle;
  }

  private isSolid(terrain: Terrain, x: number, y: number) {
    return terrain.sampleAlpha(x, y) > ALPHA_SOLID;
  }

  private findGroundAt(terrain: Terrain, x: number, startY: number, maxDepth = STEP_HEIGHT): number | null {
    // scan downward from startY to find first solid pixel
    const step = 0.02;
    for (let t = 0; t <= maxDepth; t += step) {
      const y = startY - t;
      if (this.isSolid(terrain, x, y)) return y;
    }
    return null;
  }

  private resolveHeadCollision(terrain: Terrain) {
    // If we moved up into terrain, nudge down and zero vertical velocity
    let tries = 0;
    while (tries++ < 12 && this.isSolid(terrain, this.pos.x, this.pos.y + WORM_RADIUS + GROUND_EPS)) {
      this.pos.y -= 0.02;
      this.vel.y = Math.min(0, this.vel.y);
    }
  }

  private resolveSideCollision(terrain: Terrain) {
    const sx = Math.sign(this.vel.x);
    if (sx === 0) return;

    const offX = sx * (WORM_RADIUS + 0.02);
    const checks = (ox: number, oy: number) => this.isSolid(terrain, this.pos.x + ox, this.pos.y + oy);

    if (checks(offX, 0) || checks(offX, WORM_RADIUS * 0.6) || checks(offX, -WORM_RADIUS * 0.6)) {
      let tries = 0;
      while (tries++ < 12 && (checks(offX, 0) || checks(offX, WORM_RADIUS * 0.6) || checks(offX, -WORM_RADIUS * 0.6))) {
        this.pos.x -= sx * 0.02;
      }
      this.vel.x = 0;
    }
  }

  update(dt: number, terrain: Terrain, inputDir: number, jumpPressed: boolean) {
    if (!this.alive) return;

    // Horizontal control
    const accel = this.onGround ? WORM_MOVE_ACCEL : WORM_MOVE_ACCEL * WORM_AIR_CTRL;
    this.vel.x += inputDir * accel * dt;

    // Clamp speed
    if (Math.abs(this.vel.x) > WORM_MOVE_MAX) {
      this.vel.x = Math.sign(this.vel.x) * WORM_MOVE_MAX;
    }

    // Jump
    if (jumpPressed && this.onGround) {
      this.vel.y = JUMP_SPEED;
      this.onGround = false;
    }

    // Gravity
    this.vel.y += GRAVITY * dt;

    // Integrate
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    // Keep in world horizontally
    this.pos.x = Math.max(-WORLD_W/2 + WORM_RADIUS, Math.min(WORLD_W/2 - WORM_RADIUS, this.pos.x));

    // Collisions: head & side walls
    if (this.vel.y > 0) this.resolveHeadCollision(terrain);
    this.resolveSideCollision(terrain);

    // Ground snap (slope-aware) only when falling / not rising
    if (this.vel.y <= 0) {
      const footY = this.pos.y - WORM_RADIUS - GROUND_EPS;
      const leftG  = this.findGroundAt(terrain, this.pos.x - FOOT_OFFSET, footY);
      const rightG = this.findGroundAt(terrain, this.pos.x + FOOT_OFFSET, footY);

      if (leftG !== null || rightG !== null) {
        this.onGround = true;
        // Stand on the higher of the two feet to avoid clipping into edges
        const gy = Math.max(leftG ?? -Infinity, rightG ?? -Infinity);
        this.pos.y = gy + WORM_RADIUS + GROUND_EPS;
        this.vel.y = 0;

        // Friction when grounded and no input
        if (inputDir === 0) {
          const decel = WORM_FRICTION * dt;
          const mag = Math.abs(this.vel.x);
          this.vel.x = Math.sign(this.vel.x) * Math.max(0, mag - decel);
        }
      } else {
        this.onGround = false;
      }
    } else {
      this.onGround = false; // rising -> not grounded
    }

    // Death by falling out of world
    if (this.pos.y < -WORLD_H / 2 - 5) {
      this.hp = 0; this.alive = false;
    }

    // Push to render
    this.group.position.set(this.pos.x, this.pos.y, 0);

    if (!this.alive) {
      this.group.traverse((o) => {
        const m = (o as any).material;
        if (m && m.color && m.color.offsetHSL) m.color.offsetHSL(0, -1, -0.5);
      });
      (this.group as any).userData.dead = true;
    }
  }

  applyDamage(amount: number) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - Math.round(amount));
    if (this.hp === 0) this.alive = false;
  }

  applyImpulse(ix: number, iy: number) {
    this.vel.x += ix; this.vel.y += iy; this.onGround = false;
  }
}
