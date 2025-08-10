import * as THREE from 'three';

import { TEX_H, TEX_W, WORLD_H, WORLD_W } from '../const';

export class Terrain {
  readonly canvas = document.createElement("canvas");
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
  readonly mesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.canvas.width = TEX_W; this.canvas.height = TEX_H;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D ctx failed");
    this.ctx = ctx;

    this.drawInitial();

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearMipMapLinearFilter;
    this.texture.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
    const geo = new THREE.PlaneGeometry(WORLD_W, WORLD_H, 1, 1);
    this.mesh = new THREE.Mesh(geo, mat);
    scene.add(this.mesh);
  }

  private drawInitial() {
    const { ctx } = this;
    ctx.clearRect(0, 0, TEX_W, TEX_H);
    ctx.fillStyle = "#fff";
    const baseY = TEX_H * 0.68;
    ctx.fillRect(0, baseY, TEX_W, TEX_H - baseY);
    for (let i = 0; i < 12; i++) {
      const x = (i + 0.5) * (TEX_W / 12) + (Math.random() - 0.5) * 40;
      const r = 80 + Math.random() * 120;
      const y = baseY - 40 - Math.random() * 120;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  worldToPixel(x: number, y: number) {
    const px = Math.floor(((x + WORLD_W / 2) / WORLD_W) * TEX_W);
    const py = Math.floor(((WORLD_H / 2 - y) / WORLD_H) * TEX_H); // invert y
    return { px, py };
  }

  pixelInBounds(px: number, py: number) {
    return px >= 0 && px < TEX_W && py >= 0 && py < TEX_H;
  }

  sampleAlpha(x: number, y: number): number {
    const { px, py } = this.worldToPixel(x, y);
    if (!this.pixelInBounds(px, py)) return 0;
    const d = this.ctx.getImageData(px, py, 1, 1).data[3];
    return d; // 0..255
  }

  crater(x: number, y: number, radiusWorld: number) {
    const { px, py } = this.worldToPixel(x, y);
    const r = radiusWorld * (TEX_W / WORLD_W);
    this.ctx.save();
    this.ctx.globalCompositeOperation = "destination-out";
    const g = this.ctx.createRadialGradient(px, py, r * 0.3, px, py, r);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    this.ctx.fillStyle = g;
    this.ctx.beginPath(); this.ctx.arc(px, py, r, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.restore();
    this.texture.needsUpdate = true;
  }
}
