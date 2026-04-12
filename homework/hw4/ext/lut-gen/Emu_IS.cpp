#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>
#include <sstream>
#include <fstream>
#include <random>
#include "vec.h"

#define STB_IMAGE_WRITE_IMPLEMENTATION

#include "stb_image_write.h"

const int resolution = 128;

Vec2f Hammersley(uint32_t i, uint32_t N) { // 0-1
  uint32_t bits = (i << 16u) | (i >> 16u);
  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
  float rdi = float(bits) * 2.3283064365386963e-10;
  return {float(i) / float(N), rdi};
}

Vec3f ImportanceSampleGGX(Vec2f Xi, Vec3f N, float roughness) {
  float a = roughness * roughness;

  float phi = 2.0f * PI * Xi.y;
  float cosTheta = std::sqrt((1.0f - Xi.x) / (1.0f + (a * a - 1.0f) * Xi.x));
  float sinTheta = std::sqrt(std::max(1.0f - cosTheta * cosTheta, 0.0f));

  Vec3f H = Vec3f(std::cos(phi) * sinTheta, std::sin(phi) * sinTheta, cosTheta);

  Vec3f up = std::abs(N.z) < 0.999f ? Vec3f(0.0f, 0.0f, 1.0f) : Vec3f(1.0f, 0.0f, 0.0f);
  Vec3f tangent = normalize(cross(up, N));
  Vec3f bitangent = cross(N, tangent);

  Vec3f sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
  return normalize(sampleVec);
}

float GeometrySchlickGGX(float NdotV, float roughness) {
  float a = roughness;
  float k = (a * a) / 2.0f;

  return NdotV / (NdotV * (1.0f - k) + k);
}

float GeometrySmith(float roughness, float NoV, float NoL) {
  float ggx2 = GeometrySchlickGGX(NoV, roughness);
  float ggx1 = GeometrySchlickGGX(NoL, roughness);

  return ggx1 * ggx2;
}

Vec3f IntegrateBRDF(Vec3f V, float roughness) {
  Vec3f E = Vec3f(0.0f);
  const int sample_count = 1024;
  Vec3f N = Vec3f(0.0, 0.0, 1.0);
  for (int i = 0; i < sample_count; i++) {
    Vec2f Xi = Hammersley(i, sample_count);
    Vec3f H = ImportanceSampleGGX(Xi, N, roughness);
    Vec3f L = normalize(H * 2.0f * dot(V, H) - V);

    float NoL = std::max(L.z, 0.0f);
    float NoH = std::max(H.z, 0.0f);
    float VoH = std::max(dot(V, H), 0.0f);
    float NoV = std::max(dot(N, V), 0.0f);

    if (NoL > 0.0f && NoH > 0.0f && VoH > 0.0f && NoV > 0.0f) {
      float G = GeometrySmith(roughness, NoV, NoL);
      float weight = (VoH * G) / std::max(NoV * NoH, 1e-6f);
      E += Vec3f(weight);
    }
  }

  return E / sample_count;
}

int main() {
  uint8_t data[resolution * resolution * 3];
  float step = 1.0 / resolution;
  for (int i = 0; i < resolution; i++) {
    for (int j = 0; j < resolution; j++) {
      float roughness = step * (static_cast<float>(i) + 0.5f);
      float NdotV = step * (static_cast<float>(j) + 0.5f);
      Vec3f V = Vec3f(std::sqrt(1.f - NdotV * NdotV), 0.f, NdotV);

      Vec3f irr = IntegrateBRDF(V, roughness);

      data[(i * resolution + j) * 3 + 0] = uint8_t(irr.x * 255.0);
      data[(i * resolution + j) * 3 + 1] = uint8_t(irr.y * 255.0);
      data[(i * resolution + j) * 3 + 2] = uint8_t(irr.z * 255.0);
    }
  }
  stbi_flip_vertically_on_write(true);
  stbi_write_png("GGX_E_LUT.png", resolution, resolution, 3, data, resolution * 3);

  std::cout << "Finished precomputed!" << std::endl;
  return 0;
}
