const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Damped 2D wave equation with fixed edges; no fluid transport solver.
export class RippleGrid {
  constructor(width, height, coarse = false) {
    const cell = coarse ? 12 : 8;
    this.columns = clamp(Math.floor(width/cell)+1, 3, coarse ? 80 : 128);
    this.rows = clamp(Math.floor(height/cell)+1, 3, coarse ? 72 : 96);
    this.dx = Math.max(width, 1)/(this.columns-1);
    this.dy = Math.max(height, 1)/(this.rows-1);
    this.height = new Float32Array(this.columns*this.rows);
    this.velocity = new Float32Array(this.height.length);
    this.tempHeight = new Float32Array(this.height.length);
    this.tempVelocity = new Float32Array(this.height.length);
    this.slopeHeight = new Float32Array(this.height.length);
    this.slopeVelocity = new Float32Array(this.height.length);
    this.nextHeight = new Float32Array(this.height.length);
    this.nextVelocity = new Float32Array(this.height.length);
  }
  disturb(x, y, amplitude = 90) {
    const column = Math.round(clamp(x, 0, 1)*(this.columns-1));
    const row = Math.round(clamp(y, 0, 1)*(this.rows-1));
    for (let j = Math.max(1, row-3); j <= Math.min(this.rows-2, row+3); j++) {
      for (let i = Math.max(1, column-3); i <= Math.min(this.columns-2, column+3); i++) {
        const index = j*this.columns+i;
        const weight = Math.exp(-((i-column)**2+(j-row)**2)/3);
        this.velocity[index] = clamp(this.velocity[index]+amplitude*weight/180, -160/180, 160/180);
      }
    }
  }
  update(dt, speed, damping) {
    if (!(dt > 0)) return;
    dt = Math.min(dt, 1/15);
    speed = clamp(speed, 100, 300);
    damping = clamp(damping, .4, 4);
    // RK4 with a CFL bound; normalized velocity avoids energy injection on speed changes.
    const steps = Math.max(1, Math.ceil(dt*speed*Math.hypot(1/this.dx, 1/this.dy)/.9));
    const step = dt/steps;
    const xFactor = 1/(this.dx*this.dx), yFactor = 1/(this.dy*this.dy);
    const { columns, rows, height, velocity, tempHeight, tempVelocity, nextHeight, nextVelocity } = this;
    for (let n = 0; n < steps; n++) {
      nextHeight.set(height); nextVelocity.set(velocity);
      for (let stage = 0; stage < 4; stage++) {
        const h = stage ? tempHeight : height;
        const v = stage ? tempVelocity : velocity;
        const weight = stage === 0 || stage === 3 ? 1/6 : 1/3;
        const interval = stage < 2 ? .5 : 1;
        // Read the full stage before overwriting temporary values.
        for (let y = 1; y < rows-1; y++) {
          for (let x = 1; x < columns-1; x++) {
            const i = y*columns+x;
            const laplacian = (h[i-1]+h[i+1]-2*h[i])*xFactor
              +(h[i-columns]+h[i+columns]-2*h[i])*yFactor;
            this.slopeHeight[i] = speed*v[i];
            this.slopeVelocity[i] = speed*laplacian-damping*v[i];
            nextHeight[i] += this.slopeHeight[i]*step*weight;
            nextVelocity[i] += this.slopeVelocity[i]*step*weight;
          }
        }
        if (stage < 3) {
          for (let i = 0; i < height.length; i++) {
            tempHeight[i] = height[i]+this.slopeHeight[i]*step*interval;
            tempVelocity[i] = velocity[i]+this.slopeVelocity[i]*step*interval;
          }
        }
      }
      height.set(nextHeight); velocity.set(nextVelocity);
    }
  }

  destroy() {
    this.height = this.velocity = this.tempHeight = this.tempVelocity = this.nextHeight = this.nextVelocity
      = this.slopeHeight = this.slopeVelocity = new Float32Array(0);
  }
}
