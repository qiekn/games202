#ifdef GL_ES
precision mediump float;
#endif

// Phong related variables
uniform sampler2D uSampler;
uniform vec3 uKd;
uniform vec3 uKs;
uniform vec3 uLightPos;
uniform vec3 uCameraPos;
uniform vec3 uLightIntensity;

varying highp vec2 vTextureCoord;
varying highp vec3 vFragPos;
varying highp vec3 vNormal;

// Shadow map related variables
#define NUM_SAMPLES 50
#define BLOCKER_SEARCH_NUM_SAMPLES NUM_SAMPLES
#define PCF_NUM_SAMPLES NUM_SAMPLES
#define NUM_RINGS 10

#define EPS 1e-3
#define PI 3.141592653589793
#define PI2 6.283185307179586

#define SHADOW_MAP_SIZE 2048.0
#define TEXEL_SIZE (1.0 / SHADOW_MAP_SIZE)

uniform sampler2D uShadowMap;

varying vec4 vPositionFromLight;

highp float rand_1to1(highp float x ) { 
  // -1 -1
  return fract(sin(x)*10000.0);
}

highp float rand_2to1(vec2 uv ) { 
  // 0 - 1
  const highp float a = 12.9898, b = 78.233, c = 43758.5453;
  highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
  return fract(sin(sn) * c);
}

// 这里是因为框架把深度值编码到了 RGBA 四个通道中 (提高精度)
// unpack 把它还原为一个 float
float unpack(vec4 rgbaDepth) {
  const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
  return dot(rgbaDepth, bitShift);
}

vec2 poissonDisk[NUM_SAMPLES];

void poissonDiskSamples( const in vec2 randomSeed ) {

  float ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );
  float INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );

  float angle = rand_2to1( randomSeed ) * PI2;
  float radius = INV_NUM_SAMPLES;
  float radiusStep = radius;

  for( int i = 0; i < NUM_SAMPLES; i ++ ) {
    poissonDisk[i] = vec2( cos( angle ), sin( angle ) ) * pow( radius, 0.75 );
    radius += radiusStep;
    angle += ANGLE_STEP;
  }
}

void uniformDiskSamples( const in vec2 randomSeed ) {
  float randNum = rand_2to1(randomSeed);
  float sampleX = rand_1to1( randNum ) ;
  float sampleY = rand_1to1( sampleX ) ;

  float angle = sampleX * PI2;
  float radius = sqrt(sampleY);

  for( int i = 0; i < NUM_SAMPLES; i ++ ) {
    poissonDisk[i] = vec2( radius * cos(angle) , radius * sin(angle)  );

    sampleX = rand_1to1( sampleY ) ;
    sampleY = rand_1to1( sampleX ) ;

    angle = sampleX * PI2;
    radius = sqrt(sampleY);
  }
}

float findBlocker( sampler2D shadowMap,  vec2 uv, float zReceiver ) {
  return 1.0;
}

// PCF (Percentage Closer Filtering)
// 核心思想：不再只采样一个点来判断阴影，而是在当前片元周围采样多个点，
// 对每个点分别做深度比较，最后取平均值 → 阴影边缘从硬锯齿变成柔和渐变
//
// shadowMap   → 从光源视角渲染得到的深度纹理
// shadowCoord → 当前片元在光源裁剪空间下的坐标
// filterSize  → 滤波核半径 (在 shadow map UV 空间下的大小)
//               单位圆盘采样点 × filterSize = 实际 UV 偏移量
float PCF(sampler2D shadowMap, vec4 shadowCoord, float filterSize) {
  // 1. 坐标变换：裁剪空间 [-w, w] → NDC [-1, 1] → 纹理空间 [0, 1]
  vec3 shadowCoordNDC = shadowCoord.xyz / shadowCoord.w;
  vec3 shadowCoordUV = shadowCoordNDC * 0.5 + 0.5;
  float currentDepth = shadowCoordUV.z;

  // 2. 生成泊松圆盘采样点 (在单位圆盘内的随机分布)
  //    以当前 UV 作为随机种子，保证每个片元有不同但稳定的采样分布
  //    也可以替换为 uniformDiskSamples() 对比效果差异
  poissonDiskSamples(shadowCoordUV.xy);

  // 3. 遍历采样点，逐一做深度比较并累加 visibility
  float visibility = 0.0;
  for (int i = 0; i < PCF_NUM_SAMPLES; i++) {
    // 偏移 UV = 当前 UV + 单位圆盘采样点 × 滤波半径
    vec2 sampleUV = shadowCoordUV.xy + poissonDisk[i] * filterSize;
    // 从 shadow map 中取出该位置记录的最近深度
    float closestDepth = unpack(texture2D(shadowMap, sampleUV));
    // 深度比较：当前深度 > 最近深度 + bias → 在阴影中 (0.0)，否则被照亮 (1.0)
    visibility += (currentDepth - EPS > closestDepth) ? 0.0 : 1.0;
  }

  // 4. 返回平均 visibility：0.0 = 完全阴影，1.0 = 完全照亮，中间值 = 半影
  return visibility / float(PCF_NUM_SAMPLES);
}

float PCSS(sampler2D shadowMap, vec4 coords){

  // STEP 1: avgblocker depth

  // STEP 2: penumbra size

  // STEP 3: filtering
  
  return 1.0;

}



// 这个函数接受两个参数：
// shadowMap → 从光源视角渲染得到的深度纹理 (shadow map)
// shadowCoord → 当前片元在光源裁剪空间下的坐标 (vPositionFromLight, 即 LgihtMVP * position)
//
// 它要回答一个问题：当前片元是否在阴影中？返回 visibility (1.0 = 被照亮， 0.0 = 在阴影中)
float useShadowMap(sampler2D shadowMap, vec4 shadowCoord){
  // 1. 坐标变换 → 从裁剪空间到纹理空间
  // 经过 MVP 变换后， shadowCoord 是齐次裁剪坐标 (clip space)， 范围是 [-w, w]
  //   1. 透视除法：shadowCoord.xyz / shadowCoord.w，得到 NDC 坐标，范围 [-1, 1]
  //   2. 映射到 [0,1]：ndc * 0.5 + 0.5，因为纹理坐标 UV 的范围是 [0, 1]，深度值也需要在 [0, 1]
  //
  // 裁剪空间 [-w, w]  →  NDC [-1, 1]  →  纹理空间 [0, 1]
  vec3 shadowCoordNDC = shadowCoord.xyz / shadowCoord.w;
  vec3 shadowCoordUV = shadowCoordNDC * 0.5 + 0.5;

  // 2. 采样 shadow map，获取最近深度 (从光源看过去，这个方向上离光源最近的物体的深度)
  float closestDepth = unpack(texture2D(shadowMap, shadowCoordUV.xy));

  // 3. 比较深度，判断阴影
  float currentDepth = shadowCoordUV.z; // 当前片元在光源空间的深度
  float visibility = (currentDepth - EPS > closestDepth) ? 0.0 : 1.0; // EPS bias → shadow acne
  return visibility;
}

vec3 blinnPhong() {
  vec3 color = texture2D(uSampler, vTextureCoord).rgb;
  color = pow(color, vec3(2.2));

  vec3 ambient = 0.05 * color;

  vec3 lightDir = normalize(uLightPos);
  vec3 normal = normalize(vNormal);
  float diff = max(dot(lightDir, normal), 0.0);
  vec3 light_atten_coff =
      uLightIntensity / pow(length(uLightPos - vFragPos), 2.0);
  vec3 diffuse = diff * light_atten_coff * color;

  vec3 viewDir = normalize(uCameraPos - vFragPos);
  vec3 halfDir = normalize((lightDir + viewDir));
  float spec = pow(max(dot(halfDir, normal), 0.0), 32.0);
  vec3 specular = uKs * light_atten_coff * spec;

  vec3 radiance = (ambient + diffuse + specular);
  vec3 phongColor = pow(radiance, vec3(1.0 / 2.2));
  return phongColor;
}

void main(void) {

  float visibility;
  //visibility = useShadowMap(uShadowMap, vPositionFromLight);
  visibility = PCF(uShadowMap, vPositionFromLight, 5.0 * TEXEL_SIZE);
  //visibility = PCSS(uShadowMap, vPositionFromLight);

  vec3 phongColor = blinnPhong();

  gl_FragColor = vec4(phongColor * visibility, 1.0);
}
