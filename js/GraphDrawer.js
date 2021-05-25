var scene, renderer, labelRenderer, camera, clock, texture;
var points, geometry, particles, shaderMaterial;
var raycaster;
var quad;
var controls;
var mouse = { x: 0, y: 0 };

var shapes, geom, mat, mesh;

//selector
var selected, geoSphere, smaterial, sphere, textmesh1;

let pointer, tooltipTexture;

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

    //renderer
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
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.movementSpeed = 50;
    controls.rollSpeed = Math.PI / 12;

    //particles
    //var particleNumber = 2000000;
    geometry = new THREE.BufferGeometry();
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

        color.setHSL(1, 1, 1);
        colors.push(color.r, color.g, color.b);
        sizes.push(150);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    shaderMaterial = new THREE.ShaderMaterial({
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
    raycaster.params.Points.threshold = 80;
    pointer = new THREE.Vector2();

    // selection 
    geoSphere = new THREE.SphereGeometry(22, 32, 32);
    smaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    sphere = new THREE.Mesh(geoSphere, smaterial);
    scene.add(sphere);
    selected = -1;

    //keyboard+mouse listeners
    document.addEventListener("keydown", keyDownTextField, false);
    //document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('pointermove', onPointerMove);

    //text tooltip
    var text = "Place Holder Title Text ";


    var canvas1 = document.createElement('canvas');

    canvas1.setAttribute('width', '800');
    canvas1.setAttribute('height', '600');
    var context1 = canvas1.getContext('2d');
    context1.font = "Bold 40px Arial";
    context1.fillStyle = "rgba(255,255,0,0.95)";
    //context1.fillText(text, 3, 50);
    printAtWordWrap(context1, text, 420, 300, 35, 400);


    var tooltipTexture = new THREE.Texture(canvas1);
    tooltipTexture.needsUpdate = true;

    var material1 = new THREE.MeshBasicMaterial({ map: tooltipTexture });

    material1.transparent = true;

    textmesh1 = new THREE.Mesh(
        new THREE.PlaneGeometry(canvas1.width, canvas1.height),
        material1
    );

    textmesh1.position.set(0, 0, 0);

    scene.add(textmesh1);
}

// interaction event (used by orbitcontrols)
function pick(event) {
    //event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    //console.log(mouse);


    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObject(particles);
    //console.log(intersects);
    if (intersects.length > 0) {
        //var hit = new THREE.Vector3();
        selected = intersects[0].index;
        console.log("click and hit at: " + selected);
        //var geometry = new THREE.PlaneGeometry(); 
        x = geometry.attributes.position.array[selected * 3];
        y = geometry.attributes.position.array[selected * 3 + 1]
        z = geometry.attributes.position.array[selected * 3 + 2];
        sphere.position.set(x, y, z);
        controls.target.set(x, y, z);
        textmesh1.material.map = tooltipUpdate("lala" + Math.random());
        textmesh1.material.needsUpdate = true;

        textmesh1.position.set(x, y, z);
    }

    //scene.add(new THREE.ArrowHelper(raycaster.ray.direction, raycaster.ray.origin, 30000, 0xff0000));

}
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}
function onPointerMove(event) {

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

}


function animate() {
    controls.update(clock.getDelta());

    raycaster.setFromCamera(pointer, camera);
    var intersects = raycaster.intersectObject(particles);

    //highlight with mouseover
    if (intersects.length > 0) {
        var hit = new THREE.Vector3();
        hit = intersects[0].index;
        //console.log("click and hit at" + hit);
        //var geometry = new THREE.PlaneGeometry();        
        sphere.position.set(
            geometry.attributes.position.array[hit * 3],
            geometry.attributes.position.array[hit * 3 + 1],
            geometry.attributes.position.array[hit * 3 + 2]);

    }

    textmesh1.lookAt(camera.position);
    requestAnimationFrame(animate);

    renderer.render(scene, camera);
}

function keyDownTextField(e) {
    var keyCode = e.keyCode;
    if (keyCode == 50) {
        controls.movementSpeed += 5;
    }
    if (keyCode == 49) {
        controls.movementSpeed -= 5;
    }
    if (keyCode == 48) {
        //console.log("lala");
        camera.lookAt(sphere.position);
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

function printAtWordWrap(context, text, x, y, lineHeight, fitWidth) {
    fitWidth = fitWidth || 0;

    if (fitWidth <= 0) {
        context.fillText(text, x, y);
        return;
    }
    var words = text.split(' ');
    var currentLine = 0;
    var idx = 1;
    while (words.length > 0 && idx <= words.length) {
        var str = words.slice(0, idx).join(' ');
        var w = context.measureText(str).width;
        if (w > fitWidth) {
            if (idx == 1) {
                idx = 2;
            }
            context.fillText(words.slice(0, idx - 1).join(' '), x, y + (lineHeight * currentLine));
            currentLine++;
            words = words.splice(idx - 1);
            idx = 1;
        }
        else { idx++; }
    }
    if (idx > 0)
        context.fillText(words.join(' '), x, y + (lineHeight * currentLine));
}

function tooltipUpdate(tooltipText) {
    var canvas1 = document.createElement('canvas');

    canvas1.setAttribute('width', '800');
    canvas1.setAttribute('height', '600');
    var context1 = canvas1.getContext('2d');

    context1.font = "Bold 40px Arial";
    context1.fillStyle = "rgba(255,255,0,0.95)";
    //context1.fillText(text, 3, 50);
    printAtWordWrap(context1, tooltipText, 420, 300, 35, 400);

    tooltipTexture = new THREE.Texture(canvas1);
    tooltipTexture.needsUpdate = true;
    /*
    var material1 = new THREE.MeshBasicMaterial({ map: texture1 });

    material1.transparent = true;

    textmesh1 = new THREE.Mesh(
        new THREE.PlaneGeometry(canvas1.width, canvas1.height),
        material1
    );*/
    return tooltipTexture;

}