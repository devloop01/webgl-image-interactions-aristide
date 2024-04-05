import { Gl } from "@/gl";
import { Plane } from "@/gl/Plane";

export class App {
  dom: Record<string, HTMLElement>;
  rafId: number;
  glObjects: any[];
  gl: Gl;

  constructor() {
    this.dom = {
      canvas: document.querySelector("canvas.gl")!,
      img: document.querySelector("figure > img")!,
    };
    this.rafId = 0;
    this.glObjects = [];

    this.init();

    //
    console.log(this.dom);
  }

  init() {
    this.gl = new Gl(this.dom.canvas as HTMLCanvasElement);

    this.addListeners();

    this.createGlObjects();
    this.onResize();
    this.update();
  }

  createGlObjects() {
    const plane = new Plane(this.gl, {
      domElement: this.dom.img,
    });
    this.glObjects.push(plane);
  }

  update() {
    this.glObjects.forEach((glObject) => {
      glObject.update();
    });

    this.gl.render();
    this.rafId = requestAnimationFrame(this.update.bind(this));
  }

  onMouseMove(e: MouseEvent) {
    this.gl.updateMouse(e.clientX, e.clientY);
  }

  onResize() {
    this.gl.resize(window.innerWidth, window.innerHeight);
    this.glObjects.forEach((glObject) => {
      glObject.resize();
    });
  }

  addListeners() {
    window.addEventListener("resize", this.onResize.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this));
  }
}
