import { Plane as BasePlane, Program, Mesh, Texture } from "ogl";

import { Gl } from "./index";
import { demo1, demo2, demo3 } from "./Plane.shader";
import { clamp } from "@/math";

export type PlaneOptions = {
  domElement: HTMLElement;
  demoIndex: number;
};

const demos = [demo1, demo2, demo3];

export class Plane {
  gl: Gl;
  options: PlaneOptions;
  domElement: HTMLElement;

  geometry: BasePlane;
  uniforms: Record<string, { value: any }>;
  program: Program;
  mesh: Mesh;
  elementBounds: DOMRect;

  settings = {
    gridSize: 18,
    mouseSize: 0.2,
    strength: 0.1,
    relaxation: 0.9,
  };

  constructor(gl: Gl, options: PlaneOptions) {
    this.gl = gl;
    this.options = options;
    this.domElement = options.domElement;

    this.uniforms = {
      uTime: { value: 0 },
      uMouse: { value: [0, 0] },
      uTexture: { value: new Texture(this.gl.ctx) },
      uNormal: { value: new Texture(this.gl.ctx) },
      uDepth: { value: new Texture(this.gl.ctx) },
      uResolution: { value: [0, 0] },
      uSize: { value: [1, 1] },
    };

    this.geometry = new BasePlane(this.gl.ctx);
    this.program = new Program(this.gl.ctx, {
      uniforms: this.uniforms,
      ...demos[options.demoIndex],
    });

    this.mesh = new Mesh(this.gl.ctx, {
      geometry: this.geometry,
      program: this.program,
    });
    this.mesh.setParent(this.gl.scene);

    this.loadTextures();
    this.createDataTexture();
  }

  update() {
    // this.uniforms.uTime.value += 1 / 60;

    // if (this.gl.intersect.objectId === this.mesh.id) {
    this.uniforms.uMouse.value = this.gl.intersect.point;
    // } else {
    //   this.uniforms.uMouse.value = this.gl.mouse.current;
    // }

    if (this.options.demoIndex === 2) this.updateDataTexture();
  }

  updateDataTexture() {
    const data = this.uniforms.uDataTexture.value.image;

    for (let i = 0; i < data.length; i += 3) {
      data[i] *= this.settings.relaxation;
      data[i + 1] *= this.settings.relaxation;
    }

    let gridMouseX = this.settings.gridSize * (this.gl.mouse.current.x + 0.5);
    let gridMouseY = this.settings.gridSize * (1 - (this.gl.mouse.current.y + 0.5));
    let maxDist = this.settings.gridSize * this.settings.mouseSize;
    let aspect = this.gl.canvas.height / this.gl.canvas.width;

    for (let i = 0; i < this.settings.gridSize; i++) {
      for (let j = 0; j < this.settings.gridSize; j++) {
        let distance = (gridMouseX - i) ** 2 / aspect + (gridMouseY - j) ** 2;
        let maxDistSq = maxDist ** 2;

        if (distance < maxDistSq) {
          let index = 3 * (i + this.settings.gridSize * j);

          let power = maxDist / Math.sqrt(distance);
          power = clamp(power, 0, 10);

          data[index] += this.settings.strength * 100 * this.gl.mouse.velocity.x * power;
          data[index + 1] -= this.settings.strength * 100 * this.gl.mouse.velocity.y * power;
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
      img.src = this.domElement.getAttribute("data-normal-src")!;
      img.onload = () => {
        this.uniforms.uNormal.value.image = img;
      };
    }

    {
      const img = new Image();
      img.src = this.domElement.getAttribute("data-depth-src")!;
      img.onload = () => {
        this.uniforms.uDepth.value.image = img;
      };
    }
  }

  createDataTexture() {
    const width = this.settings.gridSize;
    const height = this.settings.gridSize;

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

  resize() {
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
      0
    );
  }
}
