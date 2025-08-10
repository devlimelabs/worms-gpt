import * as THREE from 'three';

import { EXPLOSION_DAMAGE_MAX, EXPLOSION_KNOCKBACK, POWER_MAX, WIND_MAX, WORLD_H, WORLD_W } from './const';
import { Projectile } from './entities/Projectile';
import { Worm } from './entities/Worm';
import { Controls } from './input/Controls';
import { Terrain } from './terrain/Terrain';
import { HUD } from './ui/HUD';
import { FixedStep } from './utils/FixedStep';

export class Game {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-WORLD_W/2, WORLD_W/2, WORLD_H/2, -WORLD_H/2, 0.1, 200);

  terrain: Terrain;
  left: Worm;
  right: Worm;
  worms: Worm[];

  controls = new Controls();
  hud = new HUD(this.renderer, this.camera);
  stepper = new FixedStep(1/120);

  wind = 0;
  currentTeam: 0 | 1 = 0;

  projectile: Projectile | null = null;
  chargingPower = 0;
  last = performance.now() / 1000;

  constructor() {
    this.renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.Fog(0x0c0f14, 60, 120);
    this.camera.position.set(0, 0, 50);
    this.scene.add(this.camera);

    // Background
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_W*2, WORLD_H*2),
      new THREE.MeshBasicMaterial({ color: 0x0a0e13 })
    );
    (bg.position as any).z = -1;
    this.scene.add(bg);

    // Terrain
    this.terrain = new Terrain(this.scene);

    // Worms
    this.left = new Worm(0, -24, 2.0, this.scene, 0xffef95);
    this.right = new Worm(1,  24, 2.0, this.scene, 0xa1f7ff);
    this.worms = [this.left, this.right];

    // Initial wind & HUD
    this.randomizeWind();
    this.hud.setTeamLabel(this.currentTeam);
    this.hud.setPower(0);

    // Events
    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));

    this.loop();
  }

  onResize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.updateProjectionMatrix();
  }

  onMouseMove(e: MouseEvent) {
    const nx = (e.clientX / innerWidth) * 2 - 1;
    const ny = -(e.clientY / innerHeight) * 2 + 1;
    const v = new THREE.Vector3(nx, ny, 0).unproject(this.camera);
    this.controls.mouse.x = v.x; this.controls.mouse.y = v.y;
  }

  randomizeWind() {
    this.wind = (Math.random() * 2 - 1) * WIND_MAX;
    this.hud.setWind(this.wind);
  }

  activeWorm(): Worm { return this.currentTeam === 0 ? this.left : this.right; }

  startShot() {
    const shooter = this.activeWorm();
    const dir = new THREE.Vector2(Math.cos(shooter.angle), Math.sin(shooter.angle));
    const muzzle = new THREE.Vector2(shooter.pos.x + dir.x * 1.0, shooter.pos.y + dir.y * 1.0);
    const speed = 10 + this.chargingPower;
    this.projectile = new Projectile(this.scene, muzzle.x, muzzle.y, dir.x * speed, dir.y * speed);
  }

  explode(x: number, y: number, r: number) {
    // Terrain
    this.terrain.crater(x, y, r);

    // Camera shake (cheap)
    const start = this.camera.position.clone();
    let t = 0; const dur = 0.25;
    const tick = () => {
      t += 1/60;
      this.camera.position.x = (Math.random() - 0.5) * 0.3;
      this.camera.position.y = (Math.random() - 0.5) * 0.3;
      if (t < dur) requestAnimationFrame(tick);
      else this.camera.position.copy(start);
    };
    tick();

    // Apply damage/knockback
    for (const w of this.worms) {
      if (!w.alive) continue;
      const dx = w.pos.x - x, dy = w.pos.y - y;
      const d = Math.hypot(dx, dy);
      if (d < r) {
        const frac = 1 - (d / r);
        const damage = EXPLOSION_DAMAGE_MAX * frac;
        w.applyDamage(damage);
        // knockback
        if (d > 0.001) {
          const k = (EXPLOSION_KNOCKBACK * frac) / d;
          w.applyImpulse(dx * k, dy * k);
        }
      }
    }

    // Next turn
    this.currentTeam = this.currentTeam === 0 ? 1 : 0;
    this.hud.setTeamLabel(this.currentTeam);
    this.randomizeWind();
    this.hud.toast("Boom! Next turn");
  }

  loop() {
    const now = performance.now() / 1000;
    const { steps } = this.stepper.tick(now, this.last);
    this.last = now;

    // Aim barrel to mouse
    const aw = this.activeWorm();
    aw.setAngleFromMouse(this.controls.mouse.x, this.controls.mouse.y);
    this.hud.setAngleDegrees(aw.angle * 180 / Math.PI);

    // Charging UI
    if (this.controls.charging) {
      this.chargingPower = Math.min(POWER_MAX, this.chargingPower + 60 * (1/60));
      this.hud.setPower(this.chargingPower);
    }
    if (this.controls.consumeFireReleased()) {
      this.startShot();
      this.chargingPower = 0; this.hud.setPower(0);
    }

    // Fixed updates
    for (let i = 0; i < steps; i++) {
      // Worm movement
      const dir = (this.controls.left ? -1 : 0) + (this.controls.right ? 1 : 0);
      this.left.update(this.stepper.dt, this.terrain, this.currentTeam === 0 ? dir : 0);
      this.right.update(this.stepper.dt, this.terrain, this.currentTeam === 1 ? dir : 0);

      // Projectile
      if (this.projectile) {
        const res = this.projectile.update(this.stepper.dt, this.wind, this.terrain);
        if (res.explode) {
          const { x, y, r } = res.explode;
          this.projectile.cleanup(this.scene);
          this.projectile = null;
          this.explode(x, y, r);
        }
      }
    }

    // HUD health bars
    this.hud.updateHealthBars(this.worms);

    // Check win
    const aAlive = this.left.alive;
    const bAlive = this.right.alive;
    if (!aAlive || !bAlive) {
      this.hud.toast(`${aAlive ? "Team A" : "Team B"} wins!`);
      // cheap: freeze input/projectiles
      this.projectile = null;
    }

    // Render
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.loop());
  }
}
