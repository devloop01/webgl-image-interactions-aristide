const vertex = /*glsl*/ `
    attribute vec3 position;
    attribute vec2 uv;

    varying vec2 vUv;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentHead = /*glsl*/ `
    precision highp float;

    varying vec2 vUv;

    uniform sampler2D uTexture;
    uniform sampler2D uDataTexture;
    uniform sampler2D uNormal;
    uniform sampler2D uDepth;
    uniform sampler2D uFlow;

    uniform vec2 uResolution;
    uniform vec2 uSize;
    uniform vec2 uMouse;
    uniform vec2 uLerpedMouse;

    uniform float uTime;
    uniform float uPeekRadius;

    vec2 backgroundCoverUv(vec2 screenSize, vec2 imageSize, vec2 uv) {
      float screenRatio = screenSize.x / screenSize.y;
      float imageRatio = imageSize.x / imageSize.y;
      vec2 newSize = screenRatio < imageRatio ? vec2(imageSize.x * screenSize.y / imageSize.y, screenSize.y) : vec2(screenSize.x, imageSize.y * screenSize.x / imageSize.x);
      vec2 newOffset = (screenRatio < imageRatio ? vec2((newSize.x - screenSize.x) / 2.0, 0.0) : vec2(0.0, (newSize.y - screenSize.y) / 2.0)) / newSize;
      return uv * screenSize / newSize + newOffset;
    }
`;

export const demo0 = {
  vertex,
  fragment: /*glsl*/ `
        ${fragmentHead}

        void main() {
            vec3 tex = texture2D(uTexture, vUv).rgb;
            vec3 normal = texture2D(uNormal, vUv).rgb * 2.0 - 1.0;
            normal = normalize(normal);

            vec2 aspect = uResolution / max(uResolution.x, uResolution.y);
            vec2 uv = (vUv - 0.5) * aspect;
            vec2 mouse = uLerpedMouse * aspect;

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
};

// ---------------------------------------------

export const demo1 = {
  vertex,
  fragment: /*glsl*/ `
          ${fragmentHead}

          void main() {
              vec2 aspect = uResolution / max(uResolution.x, uResolution.y);
              vec2 uv = (vUv - 0.5) * aspect;
              vec2 mouse = uLerpedMouse * aspect;

              float zoom = 0.9;
              vec2 uv0 = ((vUv-0.5)*zoom)+0.5;

              vec2 offset = (mouse*0.08);

              vec3 depth = texture2D(uDepth, uv0).rgb;
              vec3 tex = texture2D(uTexture, uv0+offset*depth.r).rgb;

              vec3 final = mix(tex, vec3(depth), 0.5);
              // final = depth;
              final = tex;

              gl_FragColor = vec4(final, 1.0);
          }
        `,
};

// ---------------------------------------------

export const demo2 = {
  vertex,
  fragment: /*glsl*/ `
          ${fragmentHead}

          void main() {
              vec2 aspect = uResolution / max(uResolution.x, uResolution.y);
              vec2 uv = (vUv - 0.5) * aspect;
              vec2 mouse = uMouse * aspect;

              vec2 coverUV = backgroundCoverUv(uSize, uResolution, vUv);
              vec3 offset = texture2D(uDataTexture, coverUV).rgb;
              vec3 tex = texture2D(uTexture, coverUV - 0.02 * offset.rg).rgb;

              gl_FragColor = vec4(tex, 1.0);
          }
        `,
};

// ---------------------------------------------

export const demo3 = {
  vertex,
  fragment: /*glsl*/ `
          ${fragmentHead}

          void main() {
              vec2 aspect = uResolution / max(uResolution.x, uResolution.y);
              vec2 uv = (vUv - 0.5) * aspect;
              vec2 mouse = uLerpedMouse * aspect;

              float r = uPeekRadius;
              float d = length(uv - mouse);
              d = smoothstep(r, r*1.2, d);

              vec2 coverUV = backgroundCoverUv(uSize, uResolution, vUv);
              vec3 tex = texture2D(uTexture, coverUV).rgb;

              vec3 color = vec3(0.0);
              color = tex;
              color = mix(color, vec3(0.0), d);

              gl_FragColor = vec4(color, 1.0);
          }
        `,
};

// ---------------------------------------------

export const demo4 = {
  vertex,
  fragment: /*glsl*/ `
          ${fragmentHead}

          void main() {
              vec2 aspect = uResolution / max(uResolution.x, uResolution.y);
              vec2 uv = (vUv) * aspect;
              vec2 mouse = uMouse * aspect;

              vec3 flow = texture2D(uFlow, vUv).rgb;
              vec2 coverUV = backgroundCoverUv(uSize, uResolution, vUv);
              coverUV += flow.rg * 0.05;
              vec3 tex = texture2D(uTexture, coverUV).rgb;
              // tex = flow * 0.5 + 0.5;
              gl_FragColor = vec4(tex, 1.0);
          }
        `,
};
