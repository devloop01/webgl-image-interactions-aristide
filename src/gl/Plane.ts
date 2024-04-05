import { Plane as BasePlane, Program, Mesh, Texture } from "ogl";

import { Gl } from "./index";

export type PlaneOptions = {
  domElement: HTMLElement;
};

export class Plane {
  gl: Gl;
  options: PlaneOptions;
  domElement: HTMLElement;

  geometry: BasePlane;
  uniforms: Record<string, { value: any }>;
  program: Program;
  mesh: Mesh;
  elementBounds: DOMRect;

  constructor(gl: Gl, options: PlaneOptions) {
    this.gl = gl;
    this.options = options;
    this.domElement = options.domElement;

    this.uniforms = {
      uTime: { value: 0 },
      uMouse: { value: [0, 0] },
      uTexture: { value: new Texture(this.gl.ctx) },
      uNormal: { value: new Texture(this.gl.ctx) },
      uResolution: { value: [0, 0] },
      uSize: { value: [1, 1] },
    };

    this.geometry = new BasePlane(this.gl.ctx);
    this.program = new Program(this.gl.ctx, {
      uniforms: this.uniforms,
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;

        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;

        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;

        uniform sampler2D uTexture;
        uniform sampler2D uNormal;
        uniform vec2 uMouse;
        uniform vec2 uResolution;

        varying vec2 vUv;

        void main() {
            vec3 tex = texture2D(uTexture, vUv).rgb;
            vec3 normal = texture2D(uNormal, vUv).rgb * 2.0 - 1.0;
            normal = normalize(normal);

            vec2 aspect = uResolution / max(uResolution.x, uResolution.y);
            vec2 uv = (vUv - 0.5) * aspect;
            vec2 mouse = uMouse * aspect;

            vec3 lightPosition = vec3(uv-mouse, 0.0);
            vec3 lightDirection = normalize(vec3(lightPosition.xy, .5));

            float intensity = max(dot(normal, lightDirection), 0.0);
            intensity = pow(intensity, 3.0);

            vec3 diffuse = tex.rgb*intensity;
            vec3 ambientColor = vec3(.2);
            vec3 diffuseAmbient = tex.rgb*ambientColor;
            vec3 finalDiffuse = diffuse+diffuseAmbient;

            gl_FragColor = vec4(finalDiffuse, 1.0);

        }
      `,
    });

    this.mesh = new Mesh(this.gl.ctx, {
      geometry: this.geometry,
      program: this.program,
    });
    this.mesh.setParent(this.gl.scene);

    this.loadTextures();
  }

  update() {
    // this.uniforms.uTime.value += 1 / 60;
    this.uniforms.uMouse.value = this.gl.intersect.point;
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
