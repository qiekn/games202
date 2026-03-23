// 一套 shader + 输入数据（uniform / attribute）的描述
class Material {
  // # 表示私有字段，相当于 C++ private
  // flatten 意思是展开的，也就是字符串的格式
  // 这是因为 WebGL 要用字符串的形式 → gl.getUniformLocation(program, "uModelMatrx")
  #flatten_uniforms;
  #flatten_attribs;
  #vsSrc;
  #fsSrc;
  // Uniforms is a map, attribs is a Array
  constructor(uniforms, attribs, vsSrc, fsSrc, frameBuffer) {
    this.uniforms = uniforms;
    this.attribs = attribs;
    this.#vsSrc = vsSrc;
    this.#fsSrc = fsSrc;

    // 默认的全局 uniform (MVP + camera + light)
    this.#flatten_uniforms = [
      "uViewMatrix",
      "uModelMatrix",
      "uProjectionMatrix",
      "uCameraPos",
      "uLightPos",
    ];
    // 用户自定义的 uniform
    for (let k in uniforms) {
      this.#flatten_uniforms.push(k);
    }
    this.#flatten_attribs = attribs;
    this.frameBuffer = frameBuffer;
  }

  setMeshAttribs(extraAttribs) {
    for (let i = 0; i < extraAttribs.length; i++) {
      this.#flatten_attribs.push(extraAttribs[i]);
    }
  }

  compile(gl) {
    // 创建一个 Shader Program (GPU 对象), 底层流程是
    // → gl.createShader
    // → gl.shaderSource
    // → gl.compileShader
    // → gl.createProgram
    // → gl.attachShader
    // → gl.linkProgram
    return new Shader(gl, this.#vsSrc, this.#fsSrc, {
      uniforms: this.#flatten_uniforms,
      attribs: this.#flatten_attribs,
    });
  }
}
