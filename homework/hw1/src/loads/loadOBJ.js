// OBJ/MTL
// → three.js loader & parser
// → our own Mesh
// → create material (shader)
// → MeshRender
// → add to renderer
function loadOBJ(renderer, path, name, objMaterial, transform) {
  const manager = new THREE.LoadingManager(); // 用来统一管理资源加载
  // JS 的语法：给 manager 的 onProgress 属性赋值一个函数
  // 其实就是注册一个回调函数， Three.js 的 LoadManager 会调用 this.onProgress
  manager.onProgress = function (item, loaded, total) {
    console.log(item, loaded, total); // 打印加载进度
  };

  function onProgress(xhr) {
    if (xhr.lengthComputable) {
      const percentComplete = (xhr.loaded / xhr.total) * 100;
      console.log("model " + Math.round(percentComplete, 2) + "% downloaded");
    }
  }
  function onError() {
    console.error("An error happeden:", err);
  }

  // 暂存 OBJ 解析结果，等所有资源加载完再构建 mesh
  let loadedObject = null;

  // 当 manager 下所有资源（mtl + obj + 纹理图片）全部就绪后触发
  manager.onLoad = function () {
    if (!loadedObject) return;

    loadedObject.traverse(function (child) {
      if (child.isMesh) {
        let geo = child.geometry;
        let mat;
        if (Array.isArray(child.material)) mat = child.material[0];
        else mat = child.material;

        var indices = Array.from(
          { length: geo.attributes.position.count },
          (v, k) => k,
        );
        // prettier-ignore
        // 转换为自己的纹理 (three.js 的数据 → 自己的数据结构, 后面 three.js 就不再参与渲染了)
        let mesh = new Mesh(
          { name: "aVertexPosition", array: geo.attributes.position.array, },
          { name: "aNormalPosition", array: geo.attributes.normal.array, },
          { name: "aTextureCoord", array: geo.attributes.uv.array },
          indices,
          transform,
        );

        // 有贴图用贴图，没有就用一个纯色
        let colorMap = new Texture();
        if (mat.map != null) {
          colorMap.CreateImageTexture(renderer.gl, mat.map.image);
        } else {
          colorMap.CreateConstantTexture(renderer.gl, mat.color.toArray());
        }

        let material, shadowMaterial;
        let Translation = [
          transform.modelTransX,
          transform.modelTransY,
          transform.modelTransZ,
        ];
        let Scale = [
          transform.modelScaleX,
          transform.modelScaleY,
          transform.modelScaleZ,
        ];

        // 构建材质 (☆☆☆☆☆)
        let light = renderer.lights[0].entity;
        switch (objMaterial) {
          case "PhongMaterial":
            material = buildPhongMaterial(
              colorMap,
              mat.specular.toArray(),
              light,
              Translation,
              Scale,
              "./src/shaders/phongShader/phongVertex.glsl",
              "./src/shaders/phongShader/phongFragment.glsl",
            );
            shadowMaterial = buildShadowMaterial(
              light,
              Translation,
              Scale,
              "./src/shaders/shadowShader/shadowVertex.glsl",
              "./src/shaders/shadowShader/shadowFragment.glsl",
            );
            break;
        }

        // 因为 buildMaterial 是异步的
        material.then((data) => {
          let meshRender = new MeshRender(renderer.gl, mesh, data);
          renderer.addMeshRender(meshRender);
        });
        shadowMaterial.then((data) => {
          let shadowMeshRender = new MeshRender(renderer.gl, mesh, data);
          renderer.addShadowMeshRender(shadowMeshRender);
        });
      }
    });
  };

  // 加载 MTL (材质)
  new THREE.MTLLoader(manager)
    .setPath(path)
    .load(name + ".mtl", function (materials) {
      materials.preload();
      // 加载 OBJ (几何)
      new THREE.OBJLoader(manager)
        .setMaterials(materials)
        .setPath(path)
        .load(
          name + ".obj",
          function (object) {
            // 仅暂存，不在此处构建 mesh；等 manager.onLoad 确保纹理就绪
            loadedObject = object;
          },
          onProgress,
          onError,
        );
    });
}
