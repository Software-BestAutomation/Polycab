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

// Keep your existing function, it still helps when collapsing sidebar
function closeAllSubMenus() {
  document.querySelectorAll("#sidebar .sub-menu.show").forEach((ul) => {
    ul.classList.remove("show");
    const btn = ul.previousElementSibling;
    if (btn && btn.classList.contains("dropdown-btn")) {
      btn.classList.remove("rotate");
    }
  });
}

function closeAllSubMenusExcept(keepId) {
  document.querySelectorAll("#sidebar .sub-menu.show").forEach((ul) => {
    if (ul.id !== keepId) {
      ul.classList.remove("show");
      const btn = ul.previousElementSibling;
      if (btn && btn.classList.contains("dropdown-btn")) {
        btn.classList.remove("rotate");
      }
    }
  });
}

// Specific handler for the Cameras submenu
// Update the toggleCameraMenu function in main.js
function toggleCameraMenu() {
  const btn = document.getElementById("camera-btn");
  const menu = document.getElementById("camera-submenu");

  // First close all other submenus
  closeAllSubMenusExcept("camera-submenu");

  // Then toggle this one
  menu.classList.toggle("show");
  btn.classList.toggle("rotate", menu.classList.contains("show"));

  // If sidebar is collapsed, open it so the submenu is visible
  if (sidebar.classList.contains("close")) {
    sidebar.classList.remove("close");
    toggleButton.classList.remove("rotate");
  }

  // Force a reflow to ensure the transition works
  void menu.offsetHeight;
}

// Optional: click outside the sidebar to close any open submenus
document.addEventListener("click", (e) => {
  const insideSidebar = e.target.closest("#sidebar");
  if (!insideSidebar) {
    closeAllSubMenus();
  }
});

// Update your CAMERA_META to include group information
const CAMERA_META = {
  1: { name: "Cam-EL-01", lab: "Electronics Lab", status: "online" },
  2: { name: "Cam-EL-02", lab: "Electronics Lab", status: "online" },
  3: { name: "Cam-ME-01", lab: "Mechanical Lab", status: "offline" },
  4: { name: "Cam-EL-03", lab: "Electronics Lab", status: "online" },
  // Add more cameras as needed
};

function statusClass(s) {
  if (!s) return "status-unknown";
  return s.toLowerCase() === "online"
    ? "status-online"
    : s.toLowerCase() === "offline"
    ? "status-offline"
    : "status-unknown";
}

function buildCameraList() {
  const list = document.getElementById("camera-list");
  if (!list) return;

  // Group cameras by lab
  const groups = {};
  Object.entries(CAMERA_META).forEach(([id, meta]) => {
    const lab = meta.lab || "Other";
    if (!groups[lab]) groups[lab] = [];
    groups[lab].push({ id, ...meta });
  });

  list.innerHTML = "";

  // Create a group for each lab
  Object.entries(groups).forEach(([labName, cameras]) => {
    const group = document.createElement("div");
    group.className = "camera-group";

    const header = document.createElement("div");
    header.className = "camera-group-header";
    header.innerHTML = `
      <h3>${labName}</h3>
      <span class="count">${cameras.length}</span>
      <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="#b0b3c1">
        <path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/>
      </svg>
    `;

    header.addEventListener("click", () => {
      group.classList.toggle("collapsed");
    });

    const content = document.createElement("div");
    content.className = "camera-group-content";

    cameras.forEach(({ id, name, lab, status }) => {
      const row = document.createElement("div");
      row.className = "camera-item camera-row";
      row.draggable = true;
      row.dataset.id = id;

      row.innerHTML = `
        <div class="camera-left">
          <div class="camera-title">${name || `Camera ${id}`}</div>
          <div class="camera-subtitle">${lab || ""}</div>
        </div>
        <div class="camera-right">
          <span class="status-dot ${statusClass(status)}"></span>
          <span class="status-text">
            ${
              status
                ? status.charAt(0).toUpperCase() + status.slice(1)
                : "Unknown"
            }
          </span>
        </div>
      `;

      // Bind dragstart to the new items
      row.addEventListener("dragstart", (e) =>
        e.dataTransfer.setData("id", row.dataset.id)
      );

      content.appendChild(row);
    });

    group.appendChild(header);
    group.appendChild(content);
    list.appendChild(group);
  });

  // Add search functionality
  const searchInput = document.getElementById("camera-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const searchTerm = searchInput.value.toLowerCase();

      document.querySelectorAll(".camera-group").forEach((group) => {
        let hasMatches = false;

        group.querySelectorAll(".camera-item").forEach((item) => {
          const text = item.textContent.toLowerCase();
          const matches = text.includes(searchTerm);
          item.style.display = matches ? "" : "none";
          if (matches) hasMatches = true;
        });

        // Show/hide entire group based on matches
        group.style.display = hasMatches ? "" : "none";

        // Expand groups that have matches
        if (hasMatches) {
          group.classList.remove("collapsed");
        }
      });
    });
  }
}

// ---------- Dashboard + Streams ----------
const dash = document.getElementById("dashboard");

// Drag & Drop

const container = dash;
let streams = []; // array of cam ids currently shown (max 4)
let activeStreamId = null; // cam id currently selected (affects PTZ/Zoom/Snapshot)

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

// --- PTZ Speed control ---
function getPTZSpeed() {
  const el = document.getElementById("ptz-speed");
  const v = parseInt(el?.value || "5", 10);
  return Number.isFinite(v) ? v : 5; // API expects 1..8
}

// Initialize speed UI
(function initSpeedUI() {
  const input = document.getElementById("ptz-speed");
  const badge = document.getElementById("ptz-speed-value");
  if (!input || !badge) return;

  const sync = () => {
    badge.textContent = input.value;
    // Add visual feedback when changing speed
    badge.style.transform = "scale(1.2)";
    setTimeout(() => {
      badge.style.transform = "scale(1)";
    }, 200);
  };

  input.addEventListener("input", sync);
  input.addEventListener("change", sync);
  sync();
})();

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
      speed: getPTZSpeed(),
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
      speed: getPTZSpeed(),
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
  buildCameraList();
  checkDeviceWidth();
  renderStreams();
  updateCameraName();
});
window.addEventListener("resize", checkDeviceWidth);

// --- Minimal SPA Router (Dashboard <-> Labs) ---
function showView(viewId) {
  // toggle page sections
  document.querySelectorAll(".view-container").forEach((sec) => {
    sec.classList.toggle("active", sec.id === viewId);
  });

  // highlight active tab
  // Sidebar active state (supports both <a data-view> and <li.nav-item data-view>)
  document
    .querySelectorAll("#sidebar li")
    .forEach((li) => li.classList.remove("active"));

  let activeLi = null;
  const linkMatch = document.querySelector(`#sidebar a[data-view="${viewId}"]`);
  if (linkMatch) activeLi = linkMatch.closest("li");

  if (!activeLi) {
    activeLi = document.querySelector(
      `#sidebar li.nav-item[data-view="${viewId}"]`
    );
  }

  if (activeLi) {
    activeLi.classList.add("active");
  } else {
    // fallback to dashboard
    const dashLi = document
      .querySelector(`#sidebar a[data-view="dashboard"]`)
      ?.closest("li");
    dashLi && dashLi.classList.add("active");
  }

  // (optional) hide the PTZ control panel on non-dashboard pages
  const panel = document.querySelector(".control-panel");
  if (panel) panel.classList.toggle("hidden", viewId !== "dashboard");

  // close any open submenus to keep things tidy
  closeAllSubMenus();
}

// handle sidebar clicks
document.getElementById("sidebar").addEventListener("click", (e) => {
  // 1) anchor-based tabs
  const link = e.target.closest("a[data-view]");
  if (link) {
    e.preventDefault();
    location.hash = link.dataset.view;
    return;
  }
  // 2) li.nav-item-based tabs
  const item = e.target.closest("li.nav-item[data-view]");
  if (item) {
    e.preventDefault();
    location.hash = item.dataset.view;
  }
});

// route from current hash
function routeFromHash() {
  const view = (location.hash || "#dashboard").slice(1);
  showView(view);
}

// boot router
window.addEventListener("hashchange", routeFromHash);
window.addEventListener("load", routeFromHash);
