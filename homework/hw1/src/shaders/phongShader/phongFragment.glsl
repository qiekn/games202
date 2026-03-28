#ifdef GL_ES
precision mediump float;
#endif

// --- Uniforms & Varyings ---
uniform sampler2D uSampler;
uniform sampler2D uShadowMap;
uniform vec3 uKd;
uniform vec3 uKs;
uniform vec3 uLightPos;
uniform vec3 uCameraPos;
uniform vec3 uLightIntensity;

varying highp vec2 vTextureCoord;
varying highp vec3 vFragPos;
varying highp vec3 vNormal;
varying vec4 vPositionFromLight;

// --- Constants & Macros ---
#define NUM_SAMPLES 100
#define BLOCKER_SEARCH_NUM_SAMPLES NUM_SAMPLES
#define PCF_NUM_SAMPLES NUM_SAMPLES
#define NUM_RINGS 10

#define EPS 0.005
#define PI 3.14159265359
#define PI2 6.28318530718

#define LIGHT_WIDTH 40.0
#define SHADOW_MAP_SIZE 2048.0
#define TEXEL_SIZE (1.0 / SHADOW_MAP_SIZE)

// --- Helper Functions ---
highp float rand_1to1(highp float x) {
  return fract(sin(x) * 10000.0);
}

highp float rand_2to1(vec2 uv) {
  const highp float a = 12.9898, b = 78.233, c = 43758.5453;
  highp float dt = dot(uv.xy, vec2(a, b)), sn = mod(dt, PI);
  return fract(sin(sn) * c);
}

// Unpack RGBA depth to float
float unpack(vec4 rgbaDepth) {
  const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
  return dot(rgbaDepth, bitShift);
}

// --- Sampling Generation ---
vec2 poissonDisk[NUM_SAMPLES];

void poissonDiskSamples(const in vec2 randomSeed) {
  float ANGLE_STEP = PI2 * float(NUM_RINGS) / float(NUM_SAMPLES);
  float INV_NUM_SAMPLES = 1.0 / float(NUM_SAMPLES);

  float angle = rand_2to1(randomSeed) * PI2;
  float radius = INV_NUM_SAMPLES;
  float radiusStep = radius;

  for(int i = 0; i < NUM_SAMPLES; i++) {
    poissonDisk[i] = vec2(cos(angle), sin(angle)) * pow(radius, 0.75);
    radius += radiusStep;
    angle += ANGLE_STEP;
  }
}

// --- Shadow Calculations ---

// Find average depth of blockers
float findBlocker(sampler2D shadowMap, vec2 uv, float zReceiver) {
  poissonDiskSamples(uv);

  float blockerSum = 0.0;
  int blockerCount = 0;
  float searchRange = LIGHT_WIDTH * TEXEL_SIZE;

  for (int i = 0; i < BLOCKER_SEARCH_NUM_SAMPLES; i++) {
    vec2 sampleUV = uv + poissonDisk[i] * searchRange;
    float shadowMapDepth = unpack(texture2D(shadowMap, sampleUV));

    if (shadowMapDepth < zReceiver - EPS) {
      blockerSum += shadowMapDepth;
      blockerCount++;
    }
  }

  return (blockerCount > 0) ? blockerSum / float(blockerCount) : zReceiver;
}

// Percentage Closer Filtering (PCF)
float PCF(sampler2D shadowMap, vec3 shadowCoord, float filterSize) {
  poissonDiskSamples(shadowCoord.xy);
  float currentDepth = shadowCoord.z;
  float visibility = 0.0;

  for (int i = 0; i < PCF_NUM_SAMPLES; i++) {
    vec2 sampleUV = shadowCoord.xy + poissonDisk[i] * filterSize;
    float closestDepth = unpack(texture2D(shadowMap, sampleUV));
    visibility += (currentDepth - EPS > closestDepth) ? 0.0 : 1.0;
  }

  return visibility / float(PCF_NUM_SAMPLES);
}

// Percentage Closer Soft Shadows (PCSS)
float PCSS(sampler2D shadowMap, vec3 shadowCoord) {
  float currentDepth = shadowCoord.z;

  // 1. Find average blocker depth
  float avgBlockerDepth = findBlocker(shadowMap, shadowCoord.xy, currentDepth);

  // 2. Calculate penumbra size
  float penumbraSize = LIGHT_WIDTH * (currentDepth - avgBlockerDepth) / avgBlockerDepth;

  // 3. Apply PCF filtering
  return PCF(shadowMap, shadowCoord, penumbraSize * TEXEL_SIZE);
}

// Hard Shadow
float useShadowMap(sampler2D shadowMap, vec3 shadowCoord) {
  float closestDepth = unpack(texture2D(shadowMap, shadowCoord.xy));
  return (shadowCoord.z - EPS > closestDepth) ? 0.0 : 1.0;
}

// --- Shading ---
vec3 blinnPhong(float visibility) {
  vec3 color = texture2D(uSampler, vTextureCoord).rgb;
  color = pow(color, vec3(2.2));

  vec3 ambient = 0.03 * color;

  vec3 lightDir = normalize(uLightPos);
  vec3 normal = normalize(vNormal);
  float diff = max(dot(lightDir, normal), 0.0);
  vec3 light_atten_coff = uLightIntensity / pow(length(uLightPos - vFragPos), 2.0);
  vec3 diffuse = diff * light_atten_coff * color;

  vec3 viewDir = normalize(uCameraPos - vFragPos);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(halfDir, normal), 0.0), 32.0);
  vec3 specular = uKs * light_atten_coff * spec;

  // Apply shadow visibility only to diffuse and specular
  vec3 radiance = ambient + (diffuse + specular) * visibility;
  return pow(radiance, vec3(1.0 / 2.2));
}

void main(void) {
  // Convert clip space to NDC [-1, 1], then to UV coordinates [0, 1]
  vec3 projCoords = vPositionFromLight.xyz / vPositionFromLight.w;
  vec3 shadowCoord = projCoords * 0.5 + 0.5;

  float visibility = PCSS(uShadowMap, shadowCoord);
  // visibility = PCF(uShadowMap, shadowCoord, 5.0 * TEXEL_SIZE);
  // visibility = useShadowMap(uShadowMap, shadowCoord);

  vec3 phongColor = blinnPhong(visibility);
  gl_FragColor = vec4(phongColor, 1.0);
}
