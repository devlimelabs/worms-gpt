export class Controls {
  left = false;
  right = false;
  charging = false;
  fireReleased = false;

  // NEW: jumping (one-shot press)
  private jumpHeld = false;
  private jumpPressed = false;

  mouse = { x: 0, y: 0 };

  constructor() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.right = true;

      if ((e.code === "ArrowUp" || e.code === "KeyW") && !this.jumpHeld) {
        this.jumpHeld = true;
        this.jumpPressed = true; // one-shot
      }

      if (e.code === "Space") this.charging = true;
      if (e.code === "KeyR") location.reload();
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.right = false;

      if (e.code === "ArrowUp" || e.code === "KeyW") this.jumpHeld = false;

      if (e.code === "Space") { this.fireReleased = this.charging; this.charging = false; }
    });
  }

  consumeFireReleased(): boolean {
    const v = this.fireReleased; this.fireReleased = false; return v;
  }

  consumeJumpPressed(): boolean {
    const v = this.jumpPressed; this.jumpPressed = false; return v;
  }
}
