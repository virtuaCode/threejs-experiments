"strict";

document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
}, false);

var picker = new CP(document.querySelector('input[type="text"]'));
picker.on("change", function (color) {
  this.source.value = '#' + color;

  if (selectedMaterial) {
    selectedMaterial.color.setHex(Number.parseInt(color, 16));
    if (["MG", "MC", "MR"].includes(selectedMaterial.name)) {
      selectedMaterial.specular.setHex(Number.parseInt(color, 16));
    }
  }
});

picker.on("exit", function(color) {
  controls.enabled = true;
  selectedMaterial = null;
});

picker.on("enter", function(color) {
  controls.enabled = false;
});

var controls, camera, scene, renderer;
var cameraCube, sceneCube;
var textureEquirec;
var cubeMesh;
var sword;
var mouseX = 0;
var isMoving = true;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var colors = [
  'e6194b', '3cb44b',
  'ffe119', '4363d8',
  'f58231', '911eb4',
  '46f0f0', 'f032e6',
  'bcf60c', 'fabebe',
  '008080', 'e6beff',
  '9a6324', 'fffac8',
  '800000', 'aaffc3',
  '808000', 'ffd8b1',
  '000075', '808080',
  'ffffff', '000000'
].map(c => Number.parseInt(c, 16));

var selectedMaterial;

init();
animate();
function init() {
  // CAMERAS
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 100000);
  camera.position.set(0, 0, 3);
  cameraCube = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 100000);

  // CONTROLS
  controls = new THREE.OrbitControls(camera);
  controls.minDistance = 3;
  controls.maxDistance = 10;
  controls.enablePan = false;

  // SCENE
  scene = new THREE.Scene();
  sceneCube = new THREE.Scene();

  // LIGHTS
  var ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  var sunlight = new THREE.DirectionalLight( 0xFFFFFF, 1 );
  scene.add( sunlight );

  // SKYBOX TEXTURES
  var textureLoader = new THREE.TextureLoader();
  textureEquirec = textureLoader.load("https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg");
  textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
  textureEquirec.magFilter = THREE.LinearFilter;
  textureEquirec.minFilter = THREE.LinearMipMapLinearFilter;
  textureEquirec.encoding = THREE.sRGBEncoding;

  // SKYBOX MATERIALS
  var equirectShader = THREE.ShaderLib["equirect"];
  var equirectMaterial = new THREE.ShaderMaterial({
    fragmentShader: equirectShader.fragmentShader,
    vertexShader: equirectShader.vertexShader,
    uniforms: equirectShader.uniforms,
    depthWrite: false,
    side: THREE.BackSide
  });
  equirectMaterial.uniforms["tEquirect"].value = textureEquirec;
  // enable code injection for non-built-in material
  Object.defineProperty(equirectMaterial, 'map', {
    get: function () {
      return this.uniforms.tEquirect.value;
    }
  });

  // SKYBOX
  cubeMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(100, 100, 100), equirectMaterial);
  cubeMesh.material = equirectMaterial;
  cubeMesh.visible = true;
  sceneCube.add(cubeMesh);

  // MODEL LOADER
  var onProgress = function (xhr) {
    if (xhr.lengthComputable) {
      var percentComplete = xhr.loaded / xhr.total * 100;
      console.log(Math.round(percentComplete, 2) + '% downloaded');
    }
  };

  var onError = function (err) {
    console.error(err);
  };

  new THREE.MTLLoader()
    .setPath('res/')
    .load('sword_final.mtl', function (materials) {
      materials.preload();
      new THREE.OBJLoader()
        .setMaterials(materials)
        .setPath('res/')
        .load('sword_final.obj', function (object) {
          object.position.y = 0; //-95;
          scene.add(object);
          sword = object;

          // Apply env map to all materials
          sword.children[0].material.forEach((material,i) => {
            
            material.envMap = textureEquirec;

            // Set individual reflectivity
            if (material.name === "MG")
              material.reflectivity = 0.95;

            if (material.name === "MR")
              material.reflectivity = 0.95;

            if (material.name === "W") 
              material.reflectivity = 0.0;
         
            addColor(material.color.getHex());
          });
        }, onProgress, onError);
    });


  // RENDERER SETUP
  renderer = new THREE.WebGLRenderer();
  renderer.autoClear = false;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.gammaOutput = true;

  // EVENTLISTENER SETUP
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('keydown', onKeyDown, false);
  window.addEventListener('click', onMouseClick);
}

function onMouseClick(event) {

  var mouse = { x: 0, y: 0 };
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  raycaster = new THREE.Raycaster();

  raycaster.setFromCamera(mouse, camera);

  var intersects = raycaster.intersectObjects(scene.children[2].children);

  if (intersects.length > 0) {
    console.log(intersects);

    var object = intersects[0].object;
    var index = intersects[0].face.materialIndex;

    if (event.which === 1) { 
      // LEFT CLICK
      var material = object.material[index];
      var currentColor = material.color.getHex();
      material.color.setHex(nextColor(currentColor));
      if (isMetallic(material)) {
        material.specular.setHex(nextColor(currentColor));
      }

    } else if (event.which === 3) { 
      // RIGHT CLICK
      var cc = object.material[index].color.getHex();
      selectedMaterial = object.material[index];
      picker.enter();
      picker.set("#" + cc.toString(16));
    }
  }
}

function onKeyDown(event) {
  if (event.keyCode === 32) {
    isMoving = !isMoving;
  }
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  cameraCube.aspect = window.innerWidth / window.innerHeight;
  cameraCube.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  if (sword && isMoving) {
    sword.rotation.x += 0.01;
    sword.rotation.y += 0.01;
  }

  camera.lookAt(scene.position);
  cameraCube.rotation.copy(camera.rotation);
  renderer.render(sceneCube, cameraCube);
  renderer.render(scene, camera);
}

// HELPER FUNCTIONS
function addColor(color) {
  const inside = colors.some(c => c === color);

  if (!inside) {
    colors.unshift(color);
  }
}

function isMetallic(material) {
  return ["MG", "MC", "MR"].includes(material.name);
}

function nextColor(color) {
  var i = colors.indexOf(color);
  return i < 0 ? colors[0] : colors[(i + 1) % colors.length]
}