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

  parentUL.querySelectorAll(":scope > li > .sub-menu.show").forEach((ul) => {
    if (ul !== submenu) {
      ul.classList.remove("show");
      ul.previousElementSibling.classList.remove("rotate");
    }
  });

  submenu.classList.toggle("show");
  button.classList.toggle("rotate");

  if (sidebar.classList.contains("close")) {
    sidebar.classList.remove("close");
    toggleButton.classList.remove("rotate");
  }
}

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

function toggleCameraMenu() {
  const btn = document.getElementById("camera-btn");
  const menu = document.getElementById("camera-submenu");
  closeAllSubMenusExcept("camera-submenu");
  menu.classList.toggle("show");
  btn.classList.toggle("rotate", menu.classList.contains("show"));
  if (sidebar.classList.contains("close")) {
    sidebar.classList.remove("close");
    toggleButton.classList.remove("rotate");
  }
  void menu.offsetHeight; // reflow
}

// Optional: click outside the sidebar to close any open submenus
document.addEventListener("click", (e) => {
  if (!e.target.closest("#sidebar")) {
    closeAllSubMenus();
  }
});

// ----- CAMERA LIST (sidebar) -----
const CAMERA_META = {
  1: { name: "Cam-EL-01", lab: "Electronics Lab", status: "online" },
  2: { name: "Cam-EL-02", lab: "Electronics Lab", status: "online" },
  3: { name: "Cam-ME-01", lab: "Mechanical Lab", status: "offline" },
  4: { name: "Cam-EL-03", lab: "Electronics Lab", status: "online" },
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
  const groups = {};
  Object.entries(CAMERA_META).forEach(([id, meta]) => {
    const lab = meta.lab || "Other";
    if (!groups[lab]) groups[lab] = [];
    groups[lab].push({ id, ...meta });
  });

  list.innerHTML = "";
  Object.entries(groups).forEach(([labName, cameras]) => {
    const group = document.createElement("div");
    group.className = "camera-group";

    const header = document.createElement("div");
    header.className = "camera-group-header";
    header.innerHTML = `<h3>${labName}</h3>
      <span class="count">${cameras.length}</span>
      <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>`;
    header.onclick = () => group.classList.toggle("collapsed");

    const content = document.createElement("div");
    content.className = "camera-group-content";

    cameras.forEach(({ id, name, lab, status }) => {
      const row = document.createElement("div");
      row.className = "camera-item camera-row";
      row.draggable = true;
      row.dataset.id = id;
      row.innerHTML = `
        <span class="material-symbols-outlined">videocam</span>
        <div class="camera-left">
          <div class="camera-title">${name}</div>
          <div class="camera-subtitle">${lab}</div>
        </div>
        <div class="camera-right">
          <span class="status-dot ${statusClass(status)}"></span>
          <span class="status-text">${status}</span>
        </div>`;
      row.addEventListener("dragstart", (e) =>
        e.dataTransfer.setData("id", row.dataset.id)
      );
      content.appendChild(row);
    });

    group.appendChild(header);
    group.appendChild(content);
    list.appendChild(group);
  });

  // Rest of the function remains the same...
  const searchInput = document.getElementById("camera-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const term = searchInput.value.toLowerCase();
      document.querySelectorAll(".camera-group").forEach((group) => {
        let hasMatches = false;
        group.querySelectorAll(".camera-item").forEach((item) => {
          const ok = item.textContent.toLowerCase().includes(term);
          item.style.display = ok ? "" : "none";
          if (ok) hasMatches = true;
        });
        group.style.display = hasMatches ? "" : "none";
        if (hasMatches) group.classList.remove("collapsed");
      });
    });
  }
}

// ---------- Responsive / Device Guard ----------
function checkDeviceWidth() {
  const msg = document.getElementById("unsupported-device-message");
  if (!msg) return;
  if (window.innerWidth < 1020) {
    msg.style.display = "flex";
    document.body.style.overflow = "hidden";
  } else {
    msg.style.display = "none";
    document.body.style.overflow = "";
  }
}

// ---------- SPA Router ----------
function showView(viewId) {
  document.querySelectorAll(".view-container").forEach((sec) => {
    sec.classList.toggle("active", sec.id === viewId);
  });

  document
    .querySelectorAll("#sidebar li")
    .forEach((li) => li.classList.remove("active"));

  let activeLi =
    document
      .querySelector(`#sidebar a[data-view="${viewId}"]`)
      ?.closest("li") ||
    document.querySelector(`#sidebar li.nav-item[data-view="${viewId}"]`);

  if (!activeLi) {
    activeLi = document
      .querySelector(`#sidebar a[data-view="dashboard"]`)
      ?.closest("li");
  }
  activeLi && activeLi.classList.add("active");

  const panel = document.querySelector(".control-panel");
  if (panel) panel.classList.toggle("hidden", viewId !== "dashboard");

  closeAllSubMenus();
  ensurePartialLoaded(viewId);
  ensureModuleLoaded(viewId);

  if (viewId === "settings") {
    import("/static/js/views/settings.js").then((m) => {
      if (m && m.loadSettings) m.loadSettings();
      if (m && m.initSpeedUI) m.initSpeedUI();
    });
  }
}

document.getElementById("sidebar").addEventListener("click", (e) => {
  const link = e.target.closest("a[data-view]");
  if (link) {
    e.preventDefault();
    location.hash = link.dataset.view;
    return;
  }
  const item = e.target.closest("li.nav-item[data-view]");
  if (item) {
    e.preventDefault();
    location.hash = item.dataset.view;
  }
});

function routeFromHash() {
  const view = (location.hash || "#dashboard").slice(1);
  showView(view);
}
window.addEventListener("hashchange", routeFromHash);
window.addEventListener("load", routeFromHash);

// ---------- SPA Partial / Module Loader ----------
const _loadedPartials = new Set();
const _loadedModules = new Set();

async function ensurePartialLoaded(viewId) {
  if (_loadedPartials.has(viewId)) return;
  const sec = document.getElementById(viewId);
  if (!sec) return;
  const wants = [
    "dashboard",
    "labs",
    "cameras",
    "requests",
    "sessions",
    "settings",
  ];
  if (!wants.includes(viewId)) return;
  try {
    const r = await fetch(`/partials/${viewId}.html`, { cache: "no-store" });
    if (r.ok) {
      const html = await r.text();
      if (viewId === "dashboard") {
        const wrap = document.createElement("div");
        wrap.innerHTML = html;
        sec.appendChild(wrap);
      } else {
        sec.innerHTML = html;
      }
      _loadedPartials.add(viewId);
    }
  } catch (e) {
    console.warn(`Failed to load partial for ${viewId}`, e);
  }
}

async function ensureModuleLoaded(viewId) {
  if (_loadedModules.has(viewId)) return;
  const wants = new Set([
    "dashboard",
    "labs",
    "cameras",
    "requests",
    "sessions",
    "settings",
  ]);
  if (!wants.has(viewId)) return;
  try {
    const mod = await import(`/static/js/views/${viewId}.js`);
    if (mod?.init) queueMicrotask(() => mod.init());
    _loadedModules.add(viewId);
  } catch (_) {}
}

// ---------- Init ----------
window.addEventListener("load", () => {
  buildCameraList();
  checkDeviceWidth();
});
window.addEventListener("resize", checkDeviceWidth);
