class MeshRender {
  #vertexBuffer;
  #normalBuffer;
  #texcoordBuffer;
  #indicesBuffer;

  // 做了三件事
  // 1. 创建 GPU buffer
  // 2. 上传顶点数据
  // 3. 编译 Shader
  constructor(gl, mesh, material) {
    this.gl = gl;
    this.mesh = mesh;
    this.material = material;

    // VBO & EBO (IBO)
    this.#vertexBuffer = gl.createBuffer();
    this.#normalBuffer = gl.createBuffer();
    this.#texcoordBuffer = gl.createBuffer();
    this.#indicesBuffer = gl.createBuffer();

    let extraAttribs = [];
    // extraAttribs 就是一个了名字列表, 例如:
    // extraAttribs = [
    //   "aVertexPosition",
    //   "aNormalPosition",
    //   "aTextureCoord"
    // ]
    // 如何使用它, 见 Material 的 setMeshAttribs(extraAttribs)

    // vertexes
    if (mesh.hasVertices) {
      extraAttribs.push(mesh.verticesName);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
      // Upload vertexes data (CPU → GPU Memory)
      gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    // 同理, normal
    if (mesh.hasNormals) {
      extraAttribs.push(mesh.normalsName);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    // 同理, uv
    if (mesh.hasTexcoords) {
      extraAttribs.push(mesh.texcoordsName);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#texcoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.texcoords, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    // 同理, EBO
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#indicesBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(mesh.indices),
      gl.STATIC_DRAW,
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    this.material.setMeshAttribs(extraAttribs);
    this.shader = this.material.compile(gl);
  }

  // 数据在哪 → 顶点数据的内存布局 (memory layout)
  bindGeometryInfo() {
    const gl = this.gl;

    // 下面还是 4 部分: vertices, normal, uv, ebo

    if (this.mesh.hasVertices) {
      const numComponents = 3; // 每个顶点 3 个 float (vec3)
      const type = gl.FLOAT;
      const normalize = false; // 不进行归一化
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
      gl.vertexAttribPointer(
        this.shader.program.attribs[this.mesh.verticesName],
        numComponents,
        type,
        normalize,
        stride,
        offset,
      );
      gl.enableVertexAttribArray(
        this.shader.program.attribs[this.mesh.verticesName],
      );
    }

    if (this.mesh.hasNormals) {
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#normalBuffer);
      gl.vertexAttribPointer(
        this.shader.program.attribs[this.mesh.normalsName],
        numComponents,
        type,
        normalize,
        stride,
        offset,
      );
      gl.enableVertexAttribArray(
        this.shader.program.attribs[this.mesh.normalsName],
      );
    }

    if (this.mesh.hasTexcoords) {
      const numComponents = 2;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#texcoordBuffer);
      gl.vertexAttribPointer(
        this.shader.program.attribs[this.mesh.texcoordsName],
        numComponents,
        type,
        normalize,
        stride,
        offset,
      );
      gl.enableVertexAttribArray(
        this.shader.program.attribs[this.mesh.texcoordsName],
      );
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#indicesBuffer);
  }

  // 怎么变换 → 相机和 MVP
  bindCameraParameters(camera) {
    const gl = this.gl;

    // 1. 创建矩阵
    // 2. 计算 Model / View / Projection
    // 3. 上传到 GPU

    let modelMatrix = mat4.create();
    let viewMatrix = mat4.create();
    let projectionMatrix = mat4.create();

    // Model transform
    mat4.identity(modelMatrix);
    mat4.translate(modelMatrix, modelMatrix, this.mesh.transform.translate);
    mat4.scale(modelMatrix, modelMatrix, this.mesh.transform.scale);

    // View transform (把模型从自身相对坐标 → 世界坐标)
    camera.updateMatrixWorld();
    mat4.invert(viewMatrix, camera.matrixWorld.elements); // 相机不动, 让世界反方向移动
    // mat4.lookAt(viewMatrix, cameraPosition, [0,0,0], [0,1,0]);

    // Projection transform
    mat4.copy(projectionMatrix, camera.projectionMatrix.elements);

    gl.uniformMatrix4fv(
      this.shader.program.uniforms.uProjectionMatrix,
      false,
      projectionMatrix,
    );
    gl.uniformMatrix4fv(
      this.shader.program.uniforms.uModelMatrix,
      false,
      modelMatrix,
    );
    gl.uniformMatrix4fv(
      this.shader.program.uniforms.uViewMatrix,
      false,
      viewMatrix,
    );
    // 额外的还传了相机位置,用来 Phong specular (高光)
    gl.uniform3fv(this.shader.program.uniforms.uCameraPos, [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ]);
  }

  // 怎么着色 → 材质/光照/纹理
  bindMaterialParameters() {
    const gl = this.gl;

    let textureNum = 0;
    for (let k in this.material.uniforms) {
      if (this.material.uniforms[k].type == "matrix4fv") {
        gl.uniformMatrix4fv(
          this.shader.program.uniforms[k],
          false,
          this.material.uniforms[k].value,
        );
      } else if (this.material.uniforms[k].type == "3fv") {
        gl.uniform3fv(
          this.shader.program.uniforms[k],
          this.material.uniforms[k].value,
        );
      } else if (this.material.uniforms[k].type == "1f") {
        gl.uniform1f(
          this.shader.program.uniforms[k],
          this.material.uniforms[k].value,
        );
      } else if (this.material.uniforms[k].type == "1i") {
        gl.uniform1i(
          this.shader.program.uniforms[k],
          this.material.uniforms[k].value,
        );
      } else if (this.material.uniforms[k].type == "texture") {
        gl.activeTexture(gl.TEXTURE0 + textureNum);
        gl.bindTexture(gl.TEXTURE_2D, this.material.uniforms[k].value.texture);
        gl.uniform1i(this.shader.program.uniforms[k], textureNum);
        textureNum += 1;
      }
    }
  }

  // 何时执行 → 具体的 DrawCall
  draw(camera) {
    const gl = this.gl;

    // 设置渲染目标 (决定画到哪里)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.material.frameBuffer);
    if (this.material.frameBuffer != null) {
      // Shadow map
      gl.viewport(0.0, 0.0, resolution, resolution);
    } else {
      gl.viewport(0.0, 0.0, window.screen.width, window.screen.height);
    }

    gl.useProgram(this.shader.program.glShaderProgram);

    // Bind geometry information
    this.bindGeometryInfo();

    // Bind Camera parameters
    this.bindCameraParameters(camera);

    // Bind material parameters
    this.bindMaterialParameters();

    // Draw
    {
      const vertexCount = this.mesh.count;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
  }
}
