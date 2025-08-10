// main.js

// ---------- Sidebar + Menus ----------
const toggleButton = document.getElementById("toggle-btn");
const sidebar = document.getElementById("sidebar");

function toggleSidebar() {
  sidebar.classList.toggle("close");
  toggleButton.classList.toggle("rotate");
  closeAllSubMenus();
}

function toggleSubMenu(button) {
  const submenu = button.nextElementSibling;
  const parentUL = button.closest("ul");

  // close any other open sub-menu in this same UL
  parentUL.querySelectorAll(":scope > li > .sub-menu.show").forEach((ul) => {
    if (ul !== submenu) {
      ul.classList.remove("show");
      ul.previousElementSibling.classList.remove("rotate");
    }
  });

  // toggle current
  submenu.classList.toggle("show");
  button.classList.toggle("rotate");

  // if sidebar was collapsed, force it open
  if (sidebar.classList.contains("close")) {
    sidebar.classList.remove("close");
    toggleButton.classList.remove("rotate");
  }
}

function closeAllSubMenus() {
  Array.from(sidebar.getElementsByClassName("show")).forEach((ul) => {
    ul.classList.remove("show");
    ul.previousElementSibling.classList.remove("rotate");
  });
}

// ---------- Dashboard + Streams ----------
const dash = document.getElementById("dashboard");

// Drag & Drop
const icons = document.querySelectorAll(".camera-icon");
const container = dash;
let streams = []; // array of cam ids currently shown (max 4)
let activeStreamId = null; // cam id currently selected (affects PTZ/Zoom/Snapshot)

icons.forEach((icon) => {
  icon.addEventListener("dragstart", (e) =>
    e.dataTransfer.setData("id", icon.dataset.id)
  );
});

container.addEventListener("dragover", (e) => {
  e.preventDefault();
  container.classList.add("dragover");
});

container.addEventListener("dragleave", () =>
  container.classList.remove("dragover")
);

container.addEventListener("drop", (e) => {
  e.preventDefault();
  container.classList.remove("dragover");
  const idStr = e.dataTransfer.getData("id");
  const id = Number(idStr);
  if (id && !streams.includes(id)) {
    streams.push(id);
    if (streams.length > 4) streams.shift();
    // If nothing is active, select the just-added camera
    if (activeStreamId === null) activeStreamId = id;
    renderStreams();
    updateCameraName();
  }
});

// ---------- Helpers ----------
function videoFeedUrl(camId) {
  return `/video_feed?cam_id=${encodeURIComponent(camId)}`;
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ---------- Rendering ----------
function renderStreams() {
  dash.innerHTML = "";
  const count = streams.length;
  
  // Clear any existing classes
  dash.classList.remove("single-stream");
  
  if (count === 0) {
    const hint = document.createElement("p");
    hint.style.gridColumn = "1/-1";
    hint.style.textAlign = "center";
    hint.style.color = "#8a8b95";
    hint.textContent = "Drag camera icons here";
    dash.appendChild(hint);
    return;
  }

  // If only one stream, add special class
  if (count === 1) {
    dash.classList.add("single-stream");
  } else {
    // For multiple streams, use responsive grid
    const cols = Math.ceil(Math.sqrt(count)) || 1;
    dash.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  }

  streams.forEach((id) => {
    const cell = document.createElement("div");
    cell.classList.add("stream");
    cell.setAttribute("data-id", id);
    if (id === activeStreamId) cell.classList.add("active");

    // Header
    const header = document.createElement("div");
    header.classList.add("stream-header");

    const title = document.createElement("span");
    title.textContent = `Camera ${id}`;


    const minimizeBtn = document.createElement("button");
    minimizeBtn.textContent = "×";
    minimizeBtn.classList.add("minimize-btn");
    minimizeBtn.title = "Remove stream";

    const btn_container = document.createElement("div");
    btn_container.classList.add("btn-container");
    btn_container.appendChild(minimizeBtn);

    header.appendChild(title);
    header.appendChild(btn_container);
    cell.appendChild(header);

    // Video container
    const videoContainer = document.createElement("div");
    videoContainer.classList.add("video-container");
    
    const img = document.createElement("img");
    img.src = videoFeedUrl(id);
    img.alt = `Live ${id}`;
    img.classList.add("video-feed");
    img.draggable = false;
    
    videoContainer.appendChild(img);
    cell.appendChild(videoContainer);

    // Click to select this stream
    cell.addEventListener("click", () => {
      activeStreamId = id;
      renderStreams();
      updateCameraName();
    });

    // Remove stream on minimize
    minimizeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = streams.indexOf(id);
      if (index !== -1) {
        streams.splice(index, 1);
        if (activeStreamId === id) {
          activeStreamId = streams.length ? streams[streams.length - 1] : null;
          updateCameraName();
        }
        renderStreams();
      }
    });

    dash.appendChild(cell);
  });
}

function updateCameraName() {
  const nameEl = document.getElementById("camera-name");
  if (!nameEl) return;

  // Fade out
  nameEl.style.opacity = 0;

  setTimeout(() => {
    nameEl.textContent =
      activeStreamId !== null ? `Camera ${activeStreamId}` : "";
    // Fade in
    nameEl.style.opacity = 1;
  }, 200);
}

// ---------- Controls (PTZ / Zoom / Snapshot) ----------
function isActiveStreamAvailable() {
  return activeStreamId !== null;
}

async function startPTZ(direction) {
  if (!isActiveStreamAvailable()) return;
  try {
    await postJSON("/ptz_control", {
      cam_id: activeStreamId,
      action: "start",
      direction,
      speed: 5,
    });
  } catch (e) {
    console.error(e);
  }
}

async function stopPTZ(direction) {
  if (!isActiveStreamAvailable()) return;
  try {
    await postJSON("/ptz_control", {
      cam_id: activeStreamId,
      action: "stop",
      direction,
      speed: 5,
    });
  } catch (e) {
    console.error(e);
  }
}

async function startZoom(zoom) {
  if (!isActiveStreamAvailable()) return;
  try {
    await postJSON("/zoom_control", {
      cam_id: activeStreamId,
      action: "start",
      zoom, // "ZoomTele" or "ZoomWide"
    });
  } catch (e) {
    console.error(e);
  }
}

async function stopZoom(zoom) {
  if (!isActiveStreamAvailable()) return;
  try {
    await postJSON("/zoom_control", {
      cam_id: activeStreamId,
      action: "stop",
      zoom,
    });
  } catch (e) {
    console.error(e);
  }
}

function captureSnapshot() {
  if (!isActiveStreamAvailable()) return;
  window.location.href = `/snapshot?cam_id=${encodeURIComponent(
    activeStreamId
  )}`;
}

// Safety net: if mouse leaves a button while pressed, ensure we stop motors/zoom
document.addEventListener("mouseup", () => {
  if (!isActiveStreamAvailable()) return;
  stopPTZ("Up");
  stopPTZ("Down");
  stopPTZ("Left");
  stopPTZ("Right");
  stopZoom("ZoomTele");
  stopZoom("ZoomWide");
});

document.addEventListener("pointerup", () => {
  if (!isActiveStreamAvailable()) return;
  stopPTZ("Up");
  stopPTZ("Down");
  stopPTZ("Left");
  stopPTZ("Right");
  stopZoom("ZoomTele");
  stopZoom("ZoomWide");
});

// ---------- Device width guard ----------
function checkDeviceWidth() {
  const messageElement = document.getElementById("unsupported-device-message");
  if (!messageElement) return;

  if (window.innerWidth < 1020) {
    messageElement.style.display = "flex";
    document.body.style.overflow = "hidden";
  } else {
    messageElement.style.display = "none";
    document.body.style.overflow = "";
  }
}

window.addEventListener("load", () => {
  checkDeviceWidth();
  // Render any preset streams (if you want to preload some, push ids into `streams` here)
  renderStreams();
  updateCameraName();
});
window.addEventListener("resize", checkDeviceWidth);
