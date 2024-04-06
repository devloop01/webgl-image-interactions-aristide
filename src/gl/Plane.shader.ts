export const demo1 = {
  vertex: /*glsl*/ `
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

  fragment: /*glsl*/ `
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
};

// ---------------------------------------------

export const demo2 = {
  vertex: /*glsl*/ `
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

  fragment: /*glsl*/ `
          precision highp float;
  
          uniform sampler2D uTexture;
          uniform sampler2D uDepth;
          uniform vec2 uMouse;
          uniform vec2 uResolution;
  
          varying vec2 vUv;
  
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
