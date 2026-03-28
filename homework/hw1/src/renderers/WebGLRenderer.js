// 组织所有的 DrawCall (光源 + 阴影 + 场景), WebGLRender 和 MeshRender class 的关系:
//  - MeshRender 是真正执行 draw 的
//  - WebGLRenderer 只是调度
class WebGLRenderer {
  meshes = [];
  shadowMeshes = [];
  lights = [];

  constructor(gl, camera) {
    this.gl = gl;
    this.camera = camera;
  }

  addLight(light) {
    this.lights.push({
      entity: light,
      // 这里我们给光源添加了一个 Mesh, 让我们能够看到光源在哪.
      // 详情见:
      // → engine.js: renderer.addLight(directionLight);
      // → DirectionalLight.js: this.mesh = Mesh.cube(...);
      meshRender: new MeshRender(this.gl, light.mesh, light.mat),
    });
  }
  addMeshRender(mesh) {
    this.meshes.push(mesh);
  }
  addShadowMeshRender(mesh) {
    this.shadowMeshes.push(mesh);
  }

  render() {
    const gl = this.gl;

    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    console.assert(this.lights.length != 0, "No light");
    console.assert(this.lights.length == 1, "Multiple lights");

    for (let l = 0; l < this.lights.length; l++) {
      // Draw light
      // TODO: Support all kinds of transform
      this.lights[l].meshRender.mesh.transform.translate =
        this.lights[l].entity.lightPos;
      this.lights[l].meshRender.draw(this.camera);

      // Shadow pass (1 pass: generate sm)
      if (this.lights[l].entity.hasShadowMap == true) {
        for (let i = 0; i < this.shadowMeshes.length; i++) {
          this.shadowMeshes[i].draw(this.camera);
        }
      }

      // Camera pass
      for (let i = 0; i < this.meshes.length; i++) {
        this.gl.useProgram(this.meshes[i].shader.program.glShaderProgram);
        this.gl.uniform3fv(
          this.meshes[i].shader.program.uniforms.uLightPos,
          this.lights[l].entity.lightPos,
        );
        this.meshes[i].draw(this.camera);
      }
    }
  }
}
