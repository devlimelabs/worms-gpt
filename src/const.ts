export const WORLD_W = 64;
export const WORLD_H = 36;

export const TEX_W = 1024;
export const TEX_H = 576;

export const GRAVITY = -25;
export const WIND_MAX = 12;

export const WORM_RADIUS = 0.6;
export const WORM_MOVE_ACCEL = 40;
export const WORM_MOVE_MAX = 6;
export const WORM_AIR_CTRL = 0.4;
export const WORM_FRICTION = 16;

// NEW: terrain + jump tuning
export const ALPHA_SOLID = 10;       // alpha threshold for "solid"
export const STEP_HEIGHT = 0.6;      // how high you can "step up"
export const GROUND_EPS = 0.02;      // tiny lift to avoid jitter
export const FOOT_OFFSET = 0.42;     // ~ WORM_RADIUS * 0.7
export const JUMP_SPEED = 10.5;      // initial jump velocity
export const MAX_SLOPE_DEG = 52;     // future: use to enable sliding

export const POWER_MAX = 42;
export const PROJECTILE_RADIUS = 0.15;
export const EXPLOSION_RADIUS = 3.0;
export const EXPLOSION_DAMAGE_MAX = 50;
export const EXPLOSION_KNOCKBACK = 14;
