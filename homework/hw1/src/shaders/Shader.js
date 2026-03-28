class Shader {
  constructor(gl, vsSrc, fsSrc, shaderLocations) {
    this.gl = gl; // WebGL context
    const vs = this.compileShader(vsSrc, gl.VERTEX_SHADER);
    const fs = this.compileShader(fsSrc, gl.FRAGMENT_SHADER);

    this.program = this.addShaderLocations(
      { glShaderProgram: this.linkShader(vs, fs) },
      shaderLocations,
    );
  }

  compileShader(shaderSource, shaderType) {
    const gl = this.gl;
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(shaderSource);
      console.error("shader compiler error:\n" + gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  linkShader(vs, fs) {
    const gl = this.gl;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      abort("shader linker error:\n" + gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  // uniform is form CPU
  // attribs is from GPU mem buffer
  // This function: unfiform or attribs name → GPU slot (location)
  // 建立 CPU 侧代码与 GPU shader 变量之间的“映射表”
  // 把 shader 中的变量名映射成 GPU 内部位置（location），供后续设置数据时使用
  addShaderLocations(result, shaderLocations) {
    const gl = this.gl;
    result.uniforms = {};
    result.attribs = {};

    /// 1. 处理 Uniform
    if (
      // 防御性判断, 防止 undefined
      shaderLocations &&
      shaderLocations.uniforms &&
      shaderLocations.uniforms.length
    ) {
      for (let i = 0; i < shaderLocations.uniforms.length; ++i) {
        let name = shaderLocations.uniforms[i];
        let location = gl.getUniformLocation(
          result.glShaderProgram,
          shaderLocations.uniforms[i],
        );

        result.uniforms = Object.assign(result.uniforms, {
          [name]: location,
        });
      }
    }

    /// 2. 处理 Attribs
    if (
      shaderLocations &&
      shaderLocations.attribs &&
      shaderLocations.attribs.length
    ) {
      for (let i = 0; i < shaderLocations.attribs.length; ++i) {
        let name = shaderLocations.attribs[i];

        // 这里 GPU 做了什么?
        // 查 attribute 在 vertex shader 里的 binding slot, 比如是一个整数 (0, 1, 2)
        // 然后存入 map, 例如:
        // result.attribs = {
        //   aVertexPosititon: 0,
        //   aNormalPosition: 1,
        // }
        let location = gl.getAttribLocation(
          result.glShaderProgram,
          shaderLocations.attribs[i],
        );

        // assign 就是一个赋值 → Object.assign(target, source) 是把 source 的属性复制到 target (是浅拷贝)
        // 我觉得更好的写法是直接 → result.attribs[name] = location;
        result.attribs = Object.assign(result.attribs, {
          [name]: location,
        });
      }
    }

    return result;
  }
}
