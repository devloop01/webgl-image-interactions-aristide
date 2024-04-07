import { Gl } from "@/gl";
import { Plane } from "@/gl/Plane";

export class App {
  demoIndex: number;
  dom: Record<string, HTMLElement>;
  rafId: number;
  glObjects: any[];
  gl: Gl;

  constructor() {
    this.demoIndex = parseInt(document.documentElement.getAttribute("data-demoIndex") || "0");
    this.dom = {
      canvas: document.querySelector("canvas.gl")!,
      img: document.querySelector("figure > img")!,
    };
    this.rafId = 0;
    this.glObjects = [];

    this.init();
  }

  init() {
    this.gl = new Gl(this.dom.canvas as HTMLCanvasElement);

    this.addListeners();

    this.createGlObjects();
    this.handleResize();
    this.update();
  }

  createGlObjects() {
    const plane = new Plane(this.gl, {
      domElement: this.dom.img,
      demoIndex: this.demoIndex,
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

  handleTouchMove(event: PointerEvent | TouchEvent) {
    event.preventDefault();

    let x = 0,
      y = 0;

    if (event.type === "pointermove") {
      const mouseEvent = event as PointerEvent;
      x = mouseEvent.clientX;
      y = mouseEvent.clientY;
    } else if (event.type === "touchmove") {
      const touchEvent = event as TouchEvent;
      x = touchEvent.touches[0].clientX;
      y = touchEvent.touches[0].clientY;
    }

    this.gl.updateMouse(x, y);
  }

  handleResize() {
    this.gl.resize(window.innerWidth, window.innerHeight);
    this.glObjects.forEach((glObject) => {
      glObject.resize();
    });
  }

  addListeners() {
    window.addEventListener("resize", this.handleResize.bind(this));
    window.addEventListener("pointermove", this.handleTouchMove.bind(this));
    window.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false });
  }
}
