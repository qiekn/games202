async function loadShaderFile(filename) {
  return new Promise((resolve) => {
    const loader = new THREE.FileLoader(); // 调用 three.js 的 FileLoader()

    // HTTP 请求 → 读取文件内容 → callback(data)
    loader.load(filename, (data) => {
      resolve(data);
      //console.log(data);
    });
  });
}

// 异步加载 shader 文件 (.glsl), 并返回字符串
async function getShaderString(filename) {
  let val = "";
  await this.loadShaderFile(filename).then((result) => {
    val = result;
  });
  //console.log(val);
  return val;
}
