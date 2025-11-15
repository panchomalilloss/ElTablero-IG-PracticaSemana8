import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let scene, renderer, camera, camcontrols;
let objetos = [];
let markers = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

let minlon = -15.6144,
  maxlon = -15.59432;
let minlat = 27.76266,
  maxlat = 27.77547;
let mapa,
  mapsx,
  mapsy,
  scale = 15;
let t0;

const categoryColors = {
  sport: 0x1e90ff,
  park: 0x2ecc71,
  gas: 0xf1c40f,
  shopping: 0xe67e22,
  education: 0x9b59b6,
  health: 0xe74c3c,
  culture: 0x3498db,
  religion: 0xffffff,
  restaurant: 0xff00ff,
};

let selectedMarker = null;
let tooltipDiv = null;

// --- MOVIMIENTO CON TECLADO ---
const moveSpeed = 0.1;
const keysPressed = {};
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ].includes(key)
  ) {
    keysPressed[key] = true;
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase();
  if (keysPressed[key]) keysPressed[key] = false;
});
function actualizarMovimiento() {
  if (!camera) return;
  let dx = 0,
    dy = 0;
  if (keysPressed["w"] || keysPressed["arrowup"]) dy += moveSpeed;
  if (keysPressed["s"] || keysPressed["arrowdown"]) dy -= moveSpeed;
  if (keysPressed["a"] || keysPressed["arrowleft"]) dx -= moveSpeed;
  if (keysPressed["d"] || keysPressed["arrowright"]) dx += moveSpeed;
  if (dx !== 0 || dy !== 0) {
    camera.position.x += dx;
    camera.position.y += dy;
    camcontrols.target.x += dx;
    camcontrols.target.y += dy;
  }
}

// -------------------- INIT --------------------
init();
animationLoop();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    20,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  new THREE.TextureLoader().load("src/mapaTablero.png", function (texture) {
    const txaspectRatio = texture.image.width / texture.image.height;
    mapsy = scale;
    mapsx = mapsy * txaspectRatio;
    Plano(0, 0, 0, mapsx, mapsy);
    mapa.material.map = texture;
    mapa.material.needsUpdate = true;
    CargaOSM();
  });

  camcontrols = new OrbitControls(camera, renderer.domElement);
  camcontrols.enablePan = true;
  camcontrols.screenSpacePanning = true;
  camcontrols.target.set(0, 0, 0);

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);

  crearTooltipDiv();
  crearFiltros();
  crearLeyenda();

  window.addEventListener("resize", onWindowResize);
  t0 = new Date();
}

// -------------------- OSM --------------------
function CargaOSM() {
  const loader = new THREE.FileLoader();
  loader.load("src/mapaTablero.osm", function (text) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    const nodes = xmlDoc.getElementsByTagName("node");
    const ways = xmlDoc.getElementsByTagName("way");

    for (let i = 0; i < ways.length; i++) {
      let tags = ways[i].getElementsByTagName("tag");
      let interest = 0;
      for (let j = 0; j < tags.length; j++) {
        if (tags[j].getAttribute("k") == "highway") {
          interest = 1;
          break;
        }
        if (tags[j].getAttribute("k") == "building") {
          interest = 2;
          break;
        }
      }
      if (interest > 0) {
        const points = [];
        const nds = ways[i].getElementsByTagName("nd");
        for (let k = 0; k < nds.length; k++) {
          const ref = nds[k].getAttribute("ref");
          for (let nd = 0; nd < nodes.length; nd++) {
            if (nodes[nd].getAttribute("id") == ref) {
              const lat = Number(nodes[nd].getAttribute("lat"));
              const lon = Number(nodes[nd].getAttribute("lon"));
              const mlon = Map2Range(
                lon,
                minlon,
                maxlon,
                -mapsx / 2,
                mapsx / 2
              );
              const mlat = Map2Range(
                lat,
                minlat,
                maxlat,
                -mapsy / 2,
                mapsy / 2
              );
              Esfera(mlon, mlat, 0, 0.002, 10, 10, 0xffffff);
              points.push(new THREE.Vector3(mlon, mlat, 0));
              break;
            }
          }
        }

        if (interest == 1) {
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(
            geometry,
            new THREE.LineBasicMaterial({ color: 0x0000ff })
          );
          scene.add(line);
        } else if (interest == 2 && points.length > 2) {
          const shape = new THREE.Shape();
          for (let np = 0; np < points.length; np++) {
            if (np == 0) shape.moveTo(points[np].x, points[np].y);
            else shape.lineTo(points[np].x, points[np].y);
          }

          const extrudeSettings = {
            steps: 1,
            depth: 0.1,
            bevelThickness: 0,
            bevelSize: 0,
          };
          const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

          // Gris claro para edificios
          const material = new THREE.MeshBasicMaterial({ color: 0xd3d3d3 });
          const mesh = new THREE.Mesh(geometry, material);
          scene.add(mesh);

          // Bordes oscuros
          const edges = new THREE.EdgesGeometry(geometry);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x333333 })
          );
          scene.add(line);
        }
      }
    }

    console.log("OSM cargado");
    CargaCSV();
  });
}

// -------------------- CSV con esferas elevadas --------------------
function CargaCSV() {
  const loader = new THREE.FileLoader();
  loader.load("src/puntos_tablero.csv", function (text) {
    const lineas = text.split("\n").slice(1);
    const buildingHeight = 0.1;
    lineas.forEach((linea) => {
      if (!linea || linea.trim() === "") return;
      const parts = linea.split(",");
      if (parts.length < 4) return;
      const last = parts.length - 1;
      const categoriaRaw = parts[last].trim();
      const lon = Number(parts[last - 1]);
      const lat = Number(parts[last - 2]);
      const nombre = parts
        .slice(0, last - 2)
        .join(",")
        .trim();
      const latNum = lat,
        lonNum = lon;
      const x = Map2Range(lonNum, minlon, maxlon, -mapsx / 2, mapsx / 2);
      const y = Map2Range(latNum, minlat, maxlat, -mapsy / 2, mapsy / 2);
      const categoria = (categoriaRaw || "default").toLowerCase();
      const color = categoryColors[categoria] || categoryColors["default"];
      const z = buildingHeight + 0.02;
      const sphere = Esfera(x, y, z, 0.05, 16, 16, color);
      sphere.userData = { categoria, nombre, lat: latNum, lon: lonNum };
      markers.push({
        obj: sphere,
        nombre,
        categoria,
        lat: latNum,
        lon: lonNum,
        type: "sphere",
      });
    });
    console.log("CSV cargado - marcadores:", markers.length);
  });
}

// -------------------- INTERACTIVIDAD --------------------
function onPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const objects = markers.map((m) => m.obj);
  const intersects = raycaster.intersectObjects(objects, true);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const found = markers.find((m) => m.obj === hit || m.obj === hit.parent);
    if (found) {
      selectedMarker = found;
      mostrarTooltip(found);
      return;
    }
  }
  ocultarTooltip();
  selectedMarker = null;
}

function onPointerMove(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const objects = markers.map((m) => m.obj);
  const intersects = raycaster.intersectObjects(objects, true);

  markers.forEach((m) => {
    if (
      intersects.some((i) => i.object === m.obj || i.object === m.obj.parent)
    ) {
      m.obj.scale.set(1.5, 1.5, 1.5);
    } else {
      m.obj.scale.set(1, 1, 1);
    }
  });
}

// -------------------- TOOLTIP --------------------
function crearTooltipDiv() {
  tooltipDiv = document.createElement("div");
  tooltipDiv.style.position = "absolute";
  tooltipDiv.style.minWidth = "160px";
  tooltipDiv.style.padding = "8px";
  tooltipDiv.style.background = "rgba(0,0,0,0.75)";
  tooltipDiv.style.color = "#fff";
  tooltipDiv.style.borderRadius = "6px";
  tooltipDiv.style.pointerEvents = "auto";
  tooltipDiv.style.display = "none";
  tooltipDiv.style.zIndex = 9999;
  tooltipDiv.style.fontFamily = "Arial,sans-serif";
  tooltipDiv.style.fontSize = "13px";
  tooltipDiv.style.boxShadow = "0 2px 8px rgba(0,0,0,0.6)";
  tooltipDiv.innerHTML = `
    <div id="tt-title" style="font-weight:700; margin-bottom:6px;"></div>
    <div id="tt-cat" style="opacity:0.9; margin-bottom:6px;"></div>
    <div id="tt-coords" style="font-size:12px; opacity:0.85"></div>
    <div style="text-align:right; margin-top:6px;">
      <button id="tt-close" style="background:#fff;color:#000;border:none;padding:4px 6px;border-radius:4px;cursor:pointer">Cerrar</button>
    </div>
  `;
  document.body.appendChild(tooltipDiv);
  tooltipDiv.querySelector("#tt-close").addEventListener("click", () => {
    ocultarTooltip();
    selectedMarker = null;
  });
}

function mostrarTooltip(markerData) {
  if (!markerData) return;
  const pos = markerData.obj.position.clone();
  pos.project(camera);
  const rect = renderer.domElement.getBoundingClientRect();
  const x = (pos.x * 0.5 + 0.5) * rect.width + rect.left;
  const y = (-pos.y * 0.5 + 0.5) * rect.height + rect.top;
  tooltipDiv.style.left = `${x + 12}px`;
  tooltipDiv.style.top = `${y - 12}px`;
  tooltipDiv.style.display = "block";
  tooltipDiv.querySelector("#tt-title").textContent =
    markerData.nombre || "Sin nombre";
  tooltipDiv.querySelector("#tt-cat").textContent =
    "Categoría: " + (markerData.categoria || "desconocida");
  tooltipDiv.querySelector(
    "#tt-coords"
  ).textContent = `Lat: ${markerData.lat.toFixed(
    6
  )}  Lon: ${markerData.lon.toFixed(6)}`;
}

function ocultarTooltip() {
  if (tooltipDiv) tooltipDiv.style.display = "none";
  selectedMarker = null;
}

// -------------------- FILTROS --------------------
function crearFiltros() {
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.top = "10px";
  div.style.left = "10px";
  div.style.background = "rgba(0,0,0,0.5)";
  div.style.padding = "8px";
  div.style.borderRadius = "6px";
  div.style.fontFamily = "Arial,sans-serif";
  div.style.fontSize = "13px";
  document.body.appendChild(div);

  const allBtn = document.createElement("button");
  allBtn.innerText = "All";
  allBtn.style.margin = "2px";
  allBtn.style.padding = "2px 6px";
  allBtn.style.background = "#fff";
  allBtn.style.border = "none";
  allBtn.style.cursor = "pointer";
  allBtn.addEventListener("click", () => {
    markers.forEach((m) => (m.obj.visible = true));
  });
  div.appendChild(allBtn);

  Object.keys(categoryColors).forEach((cat) => {
    const btn = document.createElement("button");
    btn.innerText = cat;
    btn.style.margin = "2px";
    btn.style.padding = "2px 6px";
    btn.style.background = "#fff";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.addEventListener("click", () => {
      markers.forEach((m) => (m.obj.visible = m.categoria === cat));
    });
    div.appendChild(btn);
  });
}

// -------------------- LEYENDA --------------------
function crearLeyenda() {
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.top = "10px";
  div.style.right = "10px";
  div.style.background = "rgba(0,0,0,0.5)";
  div.style.padding = "8px";
  div.style.borderRadius = "6px";
  div.style.fontFamily = "Arial,sans-serif";
  div.style.fontSize = "13px";
  div.style.color = "#fff";

  const title = document.createElement("div");
  title.textContent = "Leyenda";
  title.style.fontWeight = "bold";
  title.style.marginBottom = "6px";
  div.appendChild(title);

  Object.keys(categoryColors).forEach((cat) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.marginBottom = "4px";

    const colorBox = document.createElement("div");
    colorBox.style.width = "16px";
    colorBox.style.height = "16px";
    colorBox.style.background =
      "#" + categoryColors[cat].toString(16).padStart(6, "0");
    colorBox.style.marginRight = "6px";
    colorBox.style.border = "1px solid #fff";

    const label = document.createElement("span");
    label.textContent = cat;

    row.appendChild(colorBox);
    row.appendChild(label);
    div.appendChild(row);
  });

  document.body.appendChild(div);
}

// -------------------- HELPERS --------------------
function Map2Range(val, vmin, vmax, dmin, dmax) {
  return dmin + (1 - (vmax - val) / (vmax - vmin)) * (dmax - dmin);
}
function Esfera(px, py, pz, radio, nx, ny, col) {
  let geometry = new THREE.SphereBufferGeometry(radio, nx, ny);
  let material = new THREE.MeshBasicMaterial({ color: col });
  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  objetos.push(mesh);
  return mesh;
}
function Plano(px, py, pz, sx, sy) {
  let geometry = new THREE.PlaneBufferGeometry(sx, sy);
  let material = new THREE.MeshBasicMaterial({});
  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  mapa = mesh;
}
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// -------------------- ANIMACIÓN / RENDER --------------------
function animationLoop() {
  requestAnimationFrame(animationLoop);
  actualizarMovimiento();
  if (camcontrols) camcontrols.update();
  if (tooltipDiv && tooltipDiv.style.display === "block" && selectedMarker)
    mostrarTooltip(selectedMarker);
  renderer.render(scene, camera);
}
