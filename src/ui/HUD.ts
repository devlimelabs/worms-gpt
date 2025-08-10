import * as THREE from 'three';

import { POWER_MAX, WORLD_H } from '../const';
import { Worm } from '../entities/Worm';

export class HUD {
  private angleEl = document.getElementById("angle") as HTMLSpanElement;
  private teamEl = document.getElementById("team") as HTMLSpanElement;
  private windEl = document.getElementById("wind") as HTMLSpanElement;
  private windArrow = document.getElementById("windArrow") as HTMLElement;
  private powerFill = document.getElementById("powerFill") as HTMLDivElement;
  private screenHud = document.getElementById("screenHud") as HTMLDivElement;

  private healthMap = new Map<Worm, HTMLDivElement>();

  constructor(private renderer: THREE.WebGLRenderer, private camera: THREE.OrthographicCamera) {}

  setAngleDegrees(deg: number) { this.angleEl.textContent = String(Math.round(deg)); }
  setTeamLabel(team: 0 | 1) { this.teamEl.textContent = team === 0 ? "A" : "B"; }
  setWind(wind: number) {
    this.windEl.textContent = wind.toFixed(1);
    // Rotate the arrow a bit for flair
    this.windArrow.style.transform = `translateY(2px) rotate(${wind * 3}deg)`;
  }
  setPower(power: number) {
    const pct = Math.max(0, Math.min(1, power / POWER_MAX)) * 100;
    this.powerFill.style.width = `${pct}%`;
  }

  ensureHealthBar(worm: Worm) {
    if (this.healthMap.has(worm)) return;
    const bar = document.createElement("div");
    bar.className = "health";
    const hp = document.createElement("div");
    hp.className = "hp";
    bar.appendChild(hp);
    this.screenHud.appendChild(bar);
    this.healthMap.set(worm, bar);
  }

  updateHealthBars(worms: Worm[]) {
    for (const w of worms) {
      this.ensureHealthBar(w);
      const bar = this.healthMap.get(w)!;
      const hp = bar.firstElementChild as HTMLDivElement;
      // Position above worm in screen space
      const p = new THREE.Vector3(w.pos.x, w.pos.y + 1.1, 0).project(this.camera);
      const cw = this.renderer.domElement.clientWidth;
      const ch = this.renderer.domElement.clientHeight;
      const sx = (p.x * 0.5 + 0.5) * cw;
      const sy = (-p.y * 0.5 + 0.5) * ch;
      bar.style.left = `${sx}px`;
      bar.style.top = `${sy}px`;
      hp.style.width = `${w.hp}%`;
      bar.classList.toggle("dead", !w.alive);
      bar.style.opacity = w.pos.y < -WORLD_H/2 ? "0" : "1";
    }
  }

  toast(text: string, ms = 1200) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
}
