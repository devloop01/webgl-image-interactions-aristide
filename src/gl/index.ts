import { type OGLRenderingContext, Renderer, Camera, Transform, Vec2, Raycast } from "ogl";

export class Gl {
  canvas: HTMLCanvasElement;

  renderer: Renderer;
  ctx: OGLRenderingContext;
  camera: Camera;
  scene: Transform;
  mouse: Vec2;
  mouseTarget: Vec2;
  raycaster: Raycast;
  intersect: { objectId: number | null; point: Vec2 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.renderer = new Renderer({
      canvas,
      antialias: true,
      alpha: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });

    this.ctx = this.renderer.gl;
    this.ctx.clearColor(0, 0, 0, 0);

    this.camera = new Camera(this.renderer.gl, {
      fov: 75,
      aspect: this.ctx.canvas.width / this.ctx.canvas.height,
      near: 1,
      far: 2000,
    });

    this.scene = new Transform();

    this.mouse = new Vec2();
    this.mouseTarget = new Vec2();
    this.raycaster = new Raycast();
    this.intersect = {
      objectId: null,
      point: new Vec2(),
    };
  }

  updateMouse(x: number, y: number) {
    this.mouseTarget.set(
      2.0 * (x / this.renderer.width) - 1.0,
      2.0 * (1.0 - y / this.renderer.height) - 1.0
    );
  }

  resize(w: number, h: number) {
    this.renderer.dpr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setSize(w, h);
    this.camera.perspective({ aspect: w / h });

    const z = (this.ctx.canvas.height / Math.tan((this.camera.fov * Math.PI) / 360)) * 0.5;
    this.camera.position.z = z;
  }

  render() {
    this.mouse.lerp(this.mouseTarget, 0.1);

    this.raycaster.castMouse(this.camera, this.mouse);
    const hits = this.raycaster.intersectBounds(this.scene.children as any[]);
    if (hits.length) {
      const object = hits[0];
      const point = object.hit?.localPoint;
      if (point) {
        const [x, y] = point;
        this.intersect.objectId = object.id;
        this.intersect.point.set(x, y);
      }
    }

    this.renderer.render({ scene: this.scene, camera: this.camera });
  }
}
