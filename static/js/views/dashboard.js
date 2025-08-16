let dash;
let streams = [];
let activeStreamId = null;

export function init() {
  dash = document.getElementById("dashboard");

  dash.addEventListener("dragover", (e) => {
    e.preventDefault();
    dash.classList.add("dragover");
  });
  dash.addEventListener("dragleave", () => dash.classList.remove("dragover"));
  dash.addEventListener("drop", (e) => {
    e.preventDefault();
    dash.classList.remove("dragover");
    const id = Number(e.dataTransfer.getData("id"));
    if (id && !streams.includes(id)) {
      streams.push(id);
      if (streams.length > 4) streams.shift();
      if (activeStreamId === null) activeStreamId = id;
      renderStreams();
      updateCameraName();
    }
  });

  initSpeedUI();

  document.addEventListener("mouseup", ptzSafety);
  document.addEventListener("pointerup", ptzSafety);

  renderStreams();
  updateCameraName();
}

// Helpers
function videoFeedUrl(camId) {
  return `/video_feed?cam_id=${camId}`;
}

function renderStreams() {
  dash.innerHTML = "";
  dash.classList.remove("single-stream");

  if (streams.length === 0) {
    const hint = document.createElement("p");
    hint.textContent = "Drag camera icons here";
    hint.style.cssText = "grid-column:1/-1;text-align:center;color:#8a8b95;";
    dash.appendChild(hint);
    return;
  }
  if (streams.length === 1) {
    dash.classList.add("single-stream");
  } else {
    const cols = Math.ceil(Math.sqrt(streams.length));
    dash.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  }

  streams.forEach((id) => {
    const cell = document.createElement("div");
    cell.className = "stream";
    if (id === activeStreamId) cell.classList.add("active");

    const header = document.createElement("div");
    header.className = "stream-header";

    const title = document.createElement("span");
    title.textContent = `Camera ${id}`;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.className = "minimize-btn";
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      const idx = streams.indexOf(id);
      if (idx !== -1) streams.splice(idx, 1);
      if (activeStreamId === id) {
        activeStreamId = streams.length ? streams[streams.length - 1] : null;
      }
      renderStreams();
      updateCameraName();
    };

    const btnWrap = document.createElement("div");
    btnWrap.className = "btn-container";
    btnWrap.appendChild(removeBtn);

    header.appendChild(title);
    header.appendChild(btnWrap);
    cell.appendChild(header);

    const vc = document.createElement("div");
    vc.className = "video-container";
    const img = document.createElement("img");
    img.src = videoFeedUrl(id);
    img.className = "video-feed";
    img.draggable = false;
    vc.appendChild(img);
    cell.appendChild(vc);

    cell.onclick = () => {
      activeStreamId = id;
      renderStreams();
      updateCameraName();
    };

    dash.appendChild(cell);
  });
}

function updateCameraName() {
  const el = document.getElementById("camera-name");
  if (!el) return;
  el.style.opacity = 0;
  setTimeout(() => {
    el.textContent = activeStreamId ? `Camera ${activeStreamId}` : "";
    el.style.opacity = 1;
  }, 200);
}

// -------------- PTZ / Zoom / Snapshot ---------------
function ptzSafety() {
  if (!activeStreamId) return;
  stopPTZ("Up");
  stopPTZ("Down");
  stopPTZ("Left");
  stopPTZ("Right");
  stopZoom("ZoomTele");
  stopZoom("ZoomWide");
}

function getPTZSpeed() {
  const el = document.getElementById("ptz-speed");
  const v = parseInt(el?.value || "5", 10);
  return Number.isFinite(v) ? v : 5;
}

function initSpeedUI() {
  const input = document.getElementById("ptz-speed");
  const badge = document.getElementById("ptz-speed-value");
  if (!input || !badge) return;
  const sync = () => {
    badge.textContent = input.value;
    badge.style.transform = "scale(1.2)";
    setTimeout(() => (badge.style.transform = "scale(1)"), 200);
  };
  input.addEventListener("input", sync);
  input.addEventListener("change", sync);
  sync();
}

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

export async function startPTZ(dir) {
  if (!activeStreamId) return;
  await postJSON("/ptz_control", {
    cam_id: activeStreamId,
    action: "start",
    direction: dir,
    speed: getPTZSpeed(),
  }).catch(console.error);
}

export async function stopPTZ(dir) {
  if (!activeStreamId) return;
  await postJSON("/ptz_control", {
    cam_id: activeStreamId,
    action: "stop",
    direction: dir,
    speed: getPTZSpeed(),
  }).catch(console.error);
}

export async function startZoom(z) {
  if (!activeStreamId) return;
  await postJSON("/zoom_control", {
    cam_id: activeStreamId,
    action: "start",
    zoom: z,
  }).catch(console.error);
}

export async function stopZoom(z) {
  if (!activeStreamId) return;
  await postJSON("/zoom_control", {
    cam_id: activeStreamId,
    action: "stop",
    zoom: z,
  }).catch(console.error);
}

export function captureSnapshot() {
  if (!activeStreamId) return;
  window.location.href = `/snapshot?cam_id=${encodeURIComponent(
    activeStreamId
  )}`;
}
