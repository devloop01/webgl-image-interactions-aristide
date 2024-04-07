const simplex3d = /*glsl*/ `
  //
  // Description : Array and textureless GLSL 2D/3D/4D simplex
  //               noise functions.
  //      Author : Ian McEwan, Ashima Arts.
  //  Maintainer : ijm
  //     Lastmod : 20110822 (ijm)
  //     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
  //               Distributed under the MIT License. See LICENSE file.
  //               https://github.com/ashima/webgl-noise
  //

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
       return mod289(((x*34.0)+1.0)*x);
  }

  vec4 taylorInvSqrt(vec4 r)
  {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v)
    {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );

      //   x0 = x0 - 0.0 + 0.0 * C.xxx;
      //   x1 = x0 - i1  + 1.0 * C.xxx;
      //   x2 = x0 - i2  + 2.0 * C.xxx;
      //   x3 = x0 - 1.0 + 3.0 * C.xxx;
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
      vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
      float n_ = 0.142857142857; // 1.0/7.0
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );

      //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
      //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

    // Mix final noise value
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }

`;

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
    uniform sampler2D uTexture2;
    uniform sampler2D uNoiseTexture;
    uniform sampler2D uDataTexture;
    uniform sampler2D uFlow;

    uniform vec2 uResolution;
    uniform vec2 uSize;
    uniform vec2 uMouse;
    uniform vec2 uLerpedMouse;

    uniform float uTime;
    uniform float uPeekRadius;
    uniform float uHoverProgress;

    vec2 backgroundCoverUv(vec2 screenSize, vec2 imageSize, vec2 uv) {
      float screenRatio = screenSize.x / screenSize.y;
      float imageRatio = imageSize.x / imageSize.y;
      vec2 newSize = screenRatio < imageRatio ? vec2(imageSize.x * screenSize.y / imageSize.y, screenSize.y) : vec2(screenSize.x, imageSize.y * screenSize.x / imageSize.x);
      vec2 newOffset = (screenRatio < imageRatio ? vec2((newSize.x - screenSize.x) / 2.0, 0.0) : vec2(0.0, (newSize.y - screenSize.y) / 2.0)) / newSize;
      return uv * screenSize / newSize + newOffset;
    }

    float luminance(vec3 rgb) {
      const vec3 W = vec3(0.2125, 0.7154, 0.0721);
      return dot(rgb, W);
    }

    float circle(vec2 _st, float r, float b){
     	return 1.-smoothstep(r-(r*b), r+(r*b), dot(_st,_st)*4.0);
    }

    ${simplex3d}

`;

export const demo0 = {
  vertex,
  fragment: /*glsl*/ `
        ${fragmentHead}

        void main() {
            vec3 tex = texture2D(uTexture, vUv).rgb;
            vec3 normal = texture2D(uTexture2, vUv).rgb * 2.0 - 1.0;
            normal = normalize(normal);

            vec2 aspect = uResolution / max(uResolution.x, uResolution.y);
            vec2 uv = (vUv - 0.5) * aspect;
            vec2 mouse = uLerpedMouse * aspect;

            vec3 lightPos = vec3(uv-mouse, 0.0);
            vec3 lightDir = normalize(vec3(lightPos.xy, .5));

            float intensity = max(dot(normal, lightDir), 0.0);
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

              const float zoom = 0.9;
              vec2 uv = ((vUv-0.5)*zoom)+0.5;
              vec2 mouse = uLerpedMouse * aspect;
              vec2 offset = (mouse*0.08);

              vec3 depth = texture2D(uTexture2, uv).rgb;
              vec3 tex = texture2D(uTexture, uv+offset*depth.r).rgb;

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

              float c = circle(uv - mouse, uPeekRadius, 0.08);

              vec2 coverUV = backgroundCoverUv(uSize, uResolution, vUv);
              vec3 tex = texture2D(uTexture, coverUV).rgb;

              vec3 final = mix(vec3(0.0), tex, c);
              gl_FragColor = vec4(final, 1.0);
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

// ---------------------------------------------

export const demo5 = {
  vertex,
  fragment: /*glsl*/ `
          ${fragmentHead}

          void main() {
              vec2 aspect = uResolution / max(uResolution.x, uResolution.y);
              vec2 uv = (vUv - 0.5) * aspect;
              vec2 mouse = uLerpedMouse * aspect;

              vec2 coverUV = backgroundCoverUv(uSize, uResolution, vUv);
              vec3 tex = texture2D(uTexture, coverUV).rgb;
              vec3 blr = texture2D(uTexture2, coverUV).rgb;
              vec3 gs = vec3(pow(luminance(blr), 2.25));

              float c = circle(uv - mouse, uPeekRadius, 2.0);

              float time = uTime * 0.05;
              float offX = uv.x + sin(uv.y + time * 2.);
              float offY = uv.y - time * .5 - cos(time * 2.) * .5;
              float n = (snoise(vec3(offX, offY, time * .5) * 15.));

              float mask = smoothstep(.98, 1., pow(c, 2.) * 4. + n);
              vec3 final = mix(gs, tex, mask);

              gl_FragColor = vec4(final, 1.0);
          }
        `,
};

// ---------------------------------------------

export const demo6 = {
  vertex,
  fragment: /*glsl*/ `
          ${fragmentHead}

          void main() {
              vec2 aspect = uResolution / max(uResolution.x, uResolution.y);
              vec2 uv = (vUv - 0.5) * aspect;
              vec2 mouse = uLerpedMouse * aspect;
              vec2 coverUV = backgroundCoverUv(uSize, uResolution, vUv);

              float c = length(uv-mouse)+(1.-uHoverProgress);
              c = clamp(c, 0., 1.);
              vec2 noise = texture2D(uNoiseTexture, uv * 10.0).xy * mix(0.02, 0.04, uHoverProgress);
              vec2 glassyUV = coverUV + noise * c;
              vec3 tex = texture2D(uTexture, glassyUV).rgb;

              gl_FragColor = vec4(tex, 1.0);
            }
        `,
};
