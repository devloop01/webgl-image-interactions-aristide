import { Plane as BasePlane, Program, Mesh, Texture, Flowmap, Vec2 } from "ogl";

import { Gl } from "./index";
import * as demos from "./Plane.shader";
import { clamp, lerp } from "@/math";

export type PlaneOptions = {
  domElement: HTMLElement;
  demoIndex: number;
};

export class Plane {
  gl: Gl;
  options: PlaneOptions;
  domElement: HTMLElement;
  mouse: { current: Vec2; previous: Vec2; velocity: Vec2 };
  lerpedMouse: { current: Vec2 };

  geometry: BasePlane;
  uniforms: Record<string, { value: any }>;
  program: Program;
  mesh: Mesh;
  elementBounds: DOMRect;

  flowmap: Flowmap;

  pixelDistortSettings = {
    gridSize: 18,
    mouseSize: 0.2,
    strength: 0.3,
    relaxation: 0.95,
  };

  constructor(gl: Gl, options: PlaneOptions) {
    this.gl = gl;
    this.options = options;
    this.domElement = options.domElement;

    this.mouse = {
      current: new Vec2(),
      previous: new Vec2(),
      velocity: new Vec2(),
    };
    this.lerpedMouse = {
      current: new Vec2(),
    };

    this.uniforms = {
      uTime: { value: 0 },
      uMouse: { value: [0, 0] },
      uLerpedMouse: { value: [0, 0] },
      uTexture: { value: new Texture(this.gl.ctx) },
      uTexture2: { value: new Texture(this.gl.ctx) },
      uNoiseTexture: {
        value: new Texture(this.gl.ctx, {
          wrapS: this.gl.ctx.REPEAT,
          wrapT: this.gl.ctx.REPEAT,
        }),
      },
      uResolution: { value: [0, 0] },
      uSize: { value: [1, 1] },
      uPeekRadius: { value: 1 },
      uHoverProgress: { value: 0 },
    };

    this.geometry = new BasePlane(this.gl.ctx);
    this.program = new Program(this.gl.ctx, {
      uniforms: this.uniforms,
      ...Object.values(demos)[options.demoIndex],
    });

    this.mesh = new Mesh(this.gl.ctx, {
      geometry: this.geometry,
      program: this.program,
    });
    this.mesh.setParent(this.gl.scene);

    this.loadTextures();
    this.createDataTexture();
    this.createFlowmap();
  }

  update() {
    this.lerpedMouse.current.lerp(this.gl.intersect.point, 0.05);

    this.uniforms.uTime.value += 0.01;

    if (this.gl.intersect.objectId === this.mesh.id) {
      const p = this.gl.intersect.point;

      this.mouse.current.copy(p);
      this.mouse.velocity.copy(this.mouse.current.clone().sub(this.mouse.previous));
      this.mouse.previous.copy(this.mouse.current);

      this.uniforms.uPeekRadius.value = lerp(this.uniforms.uPeekRadius.value, 0.1, 0.15);
      this.uniforms.uHoverProgress.value = lerp(this.uniforms.uHoverProgress.value, 1, 0.05);
    } else {
      this.mouse.current.set(-1);
      this.mouse.velocity.set(0);

      this.uniforms.uPeekRadius.value = lerp(this.uniforms.uPeekRadius.value, 10.0, 0.015);
      this.uniforms.uHoverProgress.value = lerp(this.uniforms.uHoverProgress.value, 0, 0.05);
    }

    this.uniforms.uMouse.value = this.gl.intersect.point;
    this.uniforms.uLerpedMouse.value = this.lerpedMouse.current;

    if (this.options.demoIndex === 2) this.updateDataTexture();

    if (this.options.demoIndex === 4) {
      this.flowmap.mouse.set(this.mouse.current.x + 0.5, this.mouse.current.y + 0.5);
      this.flowmap.velocity.lerp(
        this.mouse.velocity.multiply(50),
        this.mouse.velocity.len() ? 0.5 : 0.1,
      );
      this.flowmap.update();
    }
  }

  resize() {
    this.updateMeshSize();
  }

  updateMeshSize() {
    this.elementBounds = this.domElement.getBoundingClientRect();

    const dpr = this.gl.renderer.dpr;
    const w = this.elementBounds.width * dpr;
    const h = this.elementBounds.height * dpr;
    const left = this.elementBounds.left * dpr;
    const top = this.elementBounds.top * dpr;

    // scale the plane to match the element's size
    this.mesh.scale.set(w, h, 1);
    this.uniforms.uSize.value = [w, h];

    // position the plane to the element's center
    this.mesh.position.set(
      left + w * 0.5 - this.gl.canvas.width * 0.5,
      -top - h * 0.5 + this.gl.canvas.height * 0.5,
      0,
    );

    const aspect = w / h;
    this.flowmap.aspect = aspect;
  }

  updateDataTexture() {
    if (!this.uniforms.uDataTexture) return;

    const data = this.uniforms.uDataTexture.value.image;

    for (let i = 0; i < data.length; i += 3) {
      data[i] *= this.pixelDistortSettings.relaxation;
      data[i + 1] *= this.pixelDistortSettings.relaxation;
    }

    let gridMouseX = this.pixelDistortSettings.gridSize * (this.mouse.current.x + 0.5);
    let gridMouseY = this.pixelDistortSettings.gridSize * (1 - (this.mouse.current.y + 0.5));
    let maxDist = this.pixelDistortSettings.gridSize * this.pixelDistortSettings.mouseSize;
    let aspect = this.gl.canvas.height / this.gl.canvas.width;

    for (let i = 0; i < this.pixelDistortSettings.gridSize; i++) {
      for (let j = 0; j < this.pixelDistortSettings.gridSize; j++) {
        let distance = (gridMouseX - i) ** 2 / aspect + (gridMouseY - j) ** 2;
        let maxDistSq = maxDist ** 2;

        if (distance < maxDistSq) {
          let index = 3 * (i + this.pixelDistortSettings.gridSize * j);

          let power = maxDist / Math.sqrt(distance);
          power = clamp(power, 0, 10);

          data[index] += this.pixelDistortSettings.strength * 100 * this.mouse.velocity.x * power;
          data[index + 1] -=
            this.pixelDistortSettings.strength * 100 * this.mouse.velocity.y * power;
        }
      }
    }

    this.uniforms.uDataTexture.value.needsUpdate = true;
  }

  loadTextures() {
    {
      const img = new Image();
      img.src = this.domElement.getAttribute("src")!;
      img.onload = () => {
        this.uniforms.uTexture.value.image = img;
        this.uniforms.uResolution.value = [img.width, img.height];
      };
    }

    {
      const img = new Image();
      img.src = this.domElement.getAttribute("data-src2")!;
      img.onload = () => {
        this.uniforms.uTexture2.value.image = img;
      };
    }

    {
      const img = new Image();
      img.src = "/images/rgba-noise-64x64.png";
      img.onload = () => {
        this.uniforms.uNoiseTexture.value.image = img;
      };
    }
  }

  createDataTexture() {
    const width = this.pixelDistortSettings.gridSize;
    const height = this.pixelDistortSettings.gridSize;

    const size = width * height;
    const data = new Float32Array(3 * size);

    const texture = new Texture(this.gl.ctx, {
      image: data,
      width,
      height,
      // @ts-ignore
      internalFormat: this.gl.ctx.RGB16F,
      format: this.gl.ctx.RGB,
      type: this.gl.ctx.FLOAT,
      magFilter: this.gl.ctx.NEAREST,
      minFilter: this.gl.ctx.NEAREST,
      generateMipmaps: false,
    });

    this.uniforms["uDataTexture"] = { value: texture };
    this.uniforms["uDataTexture"].value.needsUpdate = true;
  }

  createFlowmap() {
    this.flowmap = new Flowmap(this.gl.ctx, {
      dissipation: 0.95,
      falloff: 0.25,
    });
    this.uniforms["uFlow"] = this.flowmap.uniform;
  }
}
