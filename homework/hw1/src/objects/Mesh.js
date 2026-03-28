// TRS means what?
// T: Transfrom (Position)
// R: Rotation
// S: Scale
class TRSTransform {
  constructor(translate = [0, 0, 0], scale = [1, 1, 1]) {
    this.translate = translate;
    this.scale = scale;
  }
}

// prettier-ignore
class Mesh {
  constructor(
    verticesAttrib,  // 顶点坐标
    normalsAttrib,   // 法线
    texcoordsAttrib, // 纹理 uv
    indices,         // 顶点索引
    transform,       // 变换
  ) {
    this.indices = indices;
    this.count = indices.length;
    this.hasVertices = false;
    this.hasNormals = false;
    this.hasTexcoords = false;

    const modelTranslation = [
      transform.modelTransX,
      transform.modelTransY,
      transform.modelTransZ,
    ];
    const modelScale = [
      transform.modelScaleX,
      transform.modelScaleY,
      transform.modelScaleZ,
    ];
    let meshTrans = new TRSTransform(modelTranslation, modelScale);
    this.transform = meshTrans;

    let extraAttribs = [];

    if (verticesAttrib != null) {
      this.hasVertices = true;
      this.vertices = verticesAttrib.array;
      this.verticesName = verticesAttrib.name;
    }
    if (normalsAttrib != null) {
      this.hasNormals = true;
      this.normals = normalsAttrib.array;
      this.normalsName = normalsAttrib.name;
    }
    if (texcoordsAttrib != null) {
      this.hasTexcoords = true;
      this.texcoords = texcoordsAttrib.array;
      this.texcoordsName = texcoordsAttrib.name;
    }
  }

  // 静态函数，几何体生成器
  static cube(transform) {
    // 4 x 6 = 24 vertexes
    const positions = [
      // Front face
      -1.0, -1.0, 1.0,
      1.0, -1.0, 1.0,
      1.0, 1.0, 1.0,
      -1.0, 1.0, 1.0,

      // Back face
      -1.0, -1.0, -1.0,
      -1.0, 1.0, -1.0,
      1.0, 1.0, -1.0,
      1.0, -1.0, -1.0,

      // Top face
      -1.0, 1.0, -1.0,
      -1.0, 1.0, 1.0,
      1.0, 1.0, 1.0,
      1.0, 1.0, -1.0,

      // Bottom face
      -1.0, -1.0, -1.0,
      1.0, -1.0, -1.0,
      1.0, -1.0, 1.0,
      -1.0, -1.0, 1.0,

      // Right face
      1.0, -1.0, -1.0,
      1.0, 1.0, -1.0,
      1.0, 1.0, 1.0,
      1.0, -1.0, 1.0,

      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0, 1.0,
      -1.0, 1.0, 1.0,
      -1.0, 1.0, -1.0,
    ];
    const indices = [
      0, 1, 2, 0, 2, 3,         // front
      4, 5, 6, 4, 6, 7,         // back
      8, 9, 10, 8, 10, 11,      // top
      12, 13, 14, 12, 14, 15,   // bottom
      16, 17, 18, 16, 18, 19,   // right
      20, 21, 22, 20, 22, 23,   // left
    ];

    return new Mesh({ name: 'aVertexPosition', array: new Float32Array(positions) }, null, null, indices, transform);
  }
}
