var cameraPosition = [30, 30, 30];

//生成的纹理的分辨率，纹理必须是标准的尺寸 256*256 1024*1024  2048*2048
var resolution = 2048;
var fbo;

GAMES202Main();

// 做 5 件事情
// 1. 创建 WebGL 上下文
// 2. 创建相机
// 3. 创建渲染器
// 4. 创建灯光
// 5. 加载模型
//
// 然后进入主循环，每一帧调用 reanderer.render()

function GAMES202Main() {
  // Init canvas and gl
  const canvas = document.querySelector("#glcanvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const gl = canvas.getContext("webgl");
  if (!gl) {
    alert(
      "Unable to initialize WebGL. Your browser or machine may not support it.",
    );
    return;
  }

  // Add camera
  const camera = new THREE.PerspectiveCamera( // fov, aspect, near, far
    75,
    gl.canvas.clientWidth / gl.canvas.clientHeight,
    1e-2,
    1000,
  );
  camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);

  // Add resize listener
  function setSize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  setSize(canvas.clientWidth, canvas.clientHeight);
  window.addEventListener("resize", () =>
    setSize(canvas.clientWidth, canvas.clientHeight),
  );

  // Add camera control
  const cameraControls = new THREE.OrbitControls(camera, canvas);
  cameraControls.enableZoom = true;
  cameraControls.enableRotate = true;
  cameraControls.enablePan = true;
  cameraControls.rotateSpeed = 0.3;
  cameraControls.zoomSpeed = 1.0;
  cameraControls.panSpeed = 0.8;
  cameraControls.target.set(0, 0, 0);

  // Add renderer
  const renderer = new WebGLRenderer(gl, camera);

  // Add lights
  // light - is open shadow map == true
  let lightPos = [0, 80, 80];
  let focalPoint = [0, 0, 0];
  let lightUp = [0, 1, 0];
  const directionLight = new DirectionalLight(
    5000,
    [1, 1, 1],
    lightPos,
    focalPoint,
    lightUp,
    true,
    renderer.gl,
  );
  renderer.addLight(directionLight);

  // Add shapes

  let floorTransform = setTransform(0, 0, -30, 4, 4, 4);
  let obj1Transform = setTransform(0, 0, 0, 20, 20, 20);
  let obj2Transform = setTransform(40, 0, -40, 10, 10, 10);

  loadOBJ(renderer, "assets/mary/", "Marry", "PhongMaterial", obj1Transform);
  loadOBJ(renderer, "assets/mary/", "Marry", "PhongMaterial", obj2Transform);
  loadOBJ(renderer, "assets/floor/", "floor", "PhongMaterial", floorTransform);

  // let floorTransform = setTransform(0, 0, 0, 100, 100, 100);
  // let cubeTransform = setTransform(0, 50, 0, 10, 50, 10);
  // let sphereTransform = setTransform(30, 10, 0, 10, 10, 10);

  //loadOBJ(renderer, 'assets/basic/', 'cube', 'PhongMaterial', cubeTransform);
  //loadOBJ(renderer, 'assets/basic/', 'sphere', 'PhongMaterial', sphereTransform);
  //loadOBJ(renderer, 'assets/basic/', 'plane', 'PhongMaterial', floorTransform);

  function createGUI() {
    const gui = new dat.gui.GUI();
    // const panelModel = gui.addFolder('Model properties');
    // panelModelTrans.add(GUIParams, 'x').name('X');
    // panelModel.open();
  }
  createGUI();

  function mainLoop(now) {
    cameraControls.update();

    renderer.render();
    // 浏览器版 game loop, 直译是 “请浏览器在下一帧绘制之前调用 mainLoop"
    // 帧率是由浏览器控制的
    requestAnimationFrame(mainLoop);
  }
  requestAnimationFrame(mainLoop);
}

// 把传入的参数打包为一个对象
function setTransform(t_x, t_y, t_z, s_x, s_y, s_z) {
  return {
    modelTransX: t_x,
    modelTransY: t_y,
    modelTransZ: t_z,
    modelScaleX: s_x,
    modelScaleY: s_y,
    modelScaleZ: s_z,
  };
}
