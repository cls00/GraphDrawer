var scene, renderer, camera, clock, texture;
var points;
var raycaster;
var quad;
var controls;
var mouse = { x: 0, y: 0 };

function vShader() {
    return `
    attribute float size;

    varying vec3 vColor;

    void main() {

        vColor = color;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        gl_PointSize = size * (300.0 / -mvPosition.z);

        gl_Position = projectionMatrix * mvPosition;

    }`
}


function fShader() {
    return `
    uniform sampler2D pointTexture;

    varying vec3 vColor;

    void main() {

        gl_FragColor = vec4( vColor, 1.0 );

        gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );

    }`
}

let setup_graph = async function () {
    loadJSON(function (response) {

        graph = JSON.parse(response);
        //console.log(typeof graph["nodes"]);
        init();
        animate();
    }, './gjson.json');
};
setup_graph();


function init() {
    clock = new THREE.Clock();
    renderer = new THREE.WebGLRenderer({ antialias: true });
    var width = window.innerWidth;
    var height = window.innerHeight;
    renderer.setSize(width, height);
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    // camera settings
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100000000);
    camera.position.x = 50;
    camera.position.y = 50;
    camera.position.z = 10000;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // control settings
    controls = new THREE.FlyControls(camera, renderer.domElement);
    controls.movementSpeed = 50;
    controls.rollSpeed = Math.PI / 12;

    //particles
    var particleNumber = 2000000;
    var geometry = new THREE.BufferGeometry();
    var vertices = [];
    var sizes = []
    texture = new THREE.TextureLoader().load("./img/ball.png");
    var colors = []
    const color = new THREE.Color();
    for (const property in graph["nodes"]) {
        coord = graph["nodes"][property];

        x = coord[0] * 200 - 100;
        y = coord[1] * 200 - 100;
        z = coord[2] * 200 - 100;
        vertices.push(x, y, z);

        color.setHSL(0.2, 1.0, 0.5);
        colors.push(color.r, color.g, color.b);
        sizes.push(200);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const shaderMaterial = new THREE.ShaderMaterial({

        uniforms: { pointTexture: { value: new THREE.TextureLoader().load("./img/ball.png") } },
        vertexShader: vShader(),
        fragmentShader: fShader(),

        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true

    });

    particles = new THREE.Points(geometry, shaderMaterial);

    scene.add(particles);

    // lines

    var lineGeometry = new THREE.BufferGeometry();
    var indices = [];
    for (var key in graph["edges"]) {
        var myedge = graph["edges"][key];

        indices.push(myedge[0]);
        indices.push(myedge[1]);
    }
    var linematerial = new THREE.LineBasicMaterial({ color: 0x999999 });
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    lineGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));

    var lines = new THREE.LineSegments(lineGeometry, linematerial);
    scene.add(lines);

    // interactor
    raycaster = new THREE.Raycaster();

    // selection



    //keyboard listener
    document.addEventListener("keydown", keyDownTextField, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
}

function onDocumentMouseDown(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    console.log("click");
    var intersects = raycaster.intersectObjects(particles);
    if (intersects.length > 0) {
        var hit = intersects[0].object;
        console.log("click and hit");
        var geometry = new THREE.PlaneGeometry();
        var highlight = new THREE.MeshBasicMaterial(shaderMaterial);
        highlight.position.set(hit.position);
        scene.add(highlight);

    }
}
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}


function animate() {
    controls.update(clock.getDelta());


    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function keyDownTextField(e) {
    var keyCode = e.keyCode;
    if (keyCode == 50) {
        controls.movementSpeed += 5;
        console.log("lala")
    }
    if (keyCode == 49) {
        controls.movementSpeed -= 5;
    }

}

function loadJSON(callback, jsonfile) {

    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', jsonfile, true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}
