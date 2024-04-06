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

    uniform float uTime;
    uniform vec2 uMouse;
    uniform sampler2D uTexture;
    uniform sampler2D uNormal;
    uniform sampler2D uDepth;
    uniform vec2 uResolution;
    uniform vec2 uSize;

    vec2 backgroundCoverUv(vec2 screenSize, vec2 imageSize, vec2 uv) {
      float screenRatio = screenSize.x / screenSize.y;
      float imageRatio = imageSize.x / imageSize.y;
      vec2 newSize = screenRatio < imageRatio ? vec2(imageSize.x * screenSize.y / imageSize.y, screenSize.y) : vec2(screenSize.x, imageSize.y * screenSize.x / imageSize.x);
      vec2 newOffset = (screenRatio < imageRatio ? vec2((newSize.x - screenSize.x) / 2.0, 0.0) : vec2(0.0, (newSize.y - screenSize.y) / 2.0)) / newSize;
      return uv * screenSize / newSize + newOffset;
    }
`;

export const demo1 = {
  vertex,
  fragment: /*glsl*/ `
        ${fragmentHead}

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

export const demo3 = {
  vertex,
  fragment: /*glsl*/ `
          ${fragmentHead}

          void main() {
              vec2 aspect = uResolution / max(uResolution.x, uResolution.y);
              vec2 uv = (vUv - 0.5) * aspect;
              vec2 mouse = uMouse * aspect;
              vec3 tex = texture2D(uTexture, backgroundCoverUv(uSize, uResolution, vUv)).rgb;
              gl_FragColor = vec4(tex, 1.0);
          }
        `,
};
