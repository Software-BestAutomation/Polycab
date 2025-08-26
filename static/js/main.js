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

// ---------- Global state ----------
window.__state = window.__state || { streams: [], activeStreamId: null };

// Utility: Update camera name text
function updateCameraName() {
    const nameEl = document.getElementById("camera-name");
    const panel = document.querySelector(".control-panel");
    if (!nameEl) return;

    nameEl.style.opacity = 0;
    setTimeout(() => {
        if (window.__state.activeStreamId !== null) {
            nameEl.textContent = `Camera ${window.__state.activeStreamId}`;
            if (panel) panel.classList.add("panel-visible");
        } else {
            nameEl.textContent = "";
            if (panel) panel.classList.remove("panel-visible");
        }
        nameEl.style.opacity = 1;
    }, 200);
}

// ---------- Drag & Drop + stream rendering (Dashboard only) ----------
function attachCameraDrag() {
    const cameraItems = document.querySelectorAll(".camera-item");
    cameraItems.forEach((item) => {
        item.draggable = true;
        item.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("id", item.dataset.id);
        });
    });
}

function renderStreams(dash) {
    if (!dash) return;

    dash.innerHTML = "";
    const streams = window.__state.streams;
    const activeStreamId = window.__state.activeStreamId;
    const count = streams.length;
    const cols = Math.ceil(Math.sqrt(count)) || 1;
    dash.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    if (count === 0) {
        const hint = document.createElement("p");
        hint.style.gridColumn = "1/-1";
        hint.style.textAlign = "center";
        hint.style.color = "#8a8b95";
        hint.style.paddingTop = "1rem";
        hint.textContent = "Drag camera icons here";
        dash.appendChild(hint);

        const panel = document.querySelector(".control-panel");
        if (panel) panel.classList.remove("panel-visible");
        return;
    }

    streams.forEach((id) => {
        const cell = document.createElement("div");
        cell.classList.add("stream");
        cell.setAttribute("data-id", id);
        if (String(id) === String(activeStreamId)) {
            cell.classList.add("active");
        }

        const header = document.createElement("div");
        header.classList.add("stream-header");

        const title = document.createElement("span");
        title.textContent = `Camera ${id}`;

        const minimizeBtn = document.createElement("button");
        minimizeBtn.textContent = "—";
        minimizeBtn.classList.add("minimize-btn");

        const btn_container = document.createElement("div");
        btn_container.classList.add("btn-container");
        btn_container.appendChild(minimizeBtn);

        header.appendChild(title);
        header.appendChild(btn_container);
        cell.appendChild(header);

        cell.addEventListener("click", () => {
            window.__state.activeStreamId = id;
            renderStreams(dash);
            updateCameraName();
        });

        minimizeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const idx = window.__state.streams.indexOf(id);
            if (idx !== -1) {
                window.__state.streams.splice(idx, 1);
                if (String(window.__state.activeStreamId) === String(id)) {
                    window.__state.activeStreamId = null;
                    updateCameraName();
                }
                renderStreams(dash);
            }
        });

        dash.appendChild(cell);
    });

    const panel = document.querySelector(".control-panel");
    if (panel && window.__state.activeStreamId) {
        panel.classList.add("panel-visible");
    }
}

function initDragAndDrop(dash) {
    if (!dash) return;

    dash.addEventListener("dragover", (e) => {
        e.preventDefault();
        dash.classList.add("dragover");
    });

    dash.addEventListener("dragleave", () => {
        dash.classList.remove("dragover");
    });

    dash.addEventListener("drop", (e) => {
        e.preventDefault();
        dash.classList.remove("dragover");
        const id = e.dataTransfer.getData("id");
        if (id && !window.__state.streams.includes(id)) {
            window.__state.streams.push(id);
            if (window.__state.streams.length > 4) window.__state.streams.shift();
            renderStreams(dash);
        }
    });

    attachCameraDrag();
    renderStreams(dash);
}

// Expose a hook so the dashboard partial can call it
window.__attachDashboard = function () {
    const dash = document.getElementById("dashboard");
    if (!dash) return;
    initDragAndDrop(dash);
};

// ---------- PTZ control functions (stubbed to console) ----------
function isActiveStreamAvailable() {
    return window.__state.activeStreamId !== null;
}

function startPTZ(action) {
    if (!isActiveStreamAvailable()) return;
    console.log(`Start PTZ ${action} on camera ${window.__state.activeStreamId}`);
}
function stopPTZ(action) {
    if (!isActiveStreamAvailable()) return;
    console.log(`Stop PTZ ${action} on camera ${window.__state.activeStreamId}`);
}
function startZoom(action) {
    if (!isActiveStreamAvailable()) return;
    console.log(`Start Zoom ${action} on camera ${window.__state.activeStreamId}`);
}
function stopZoom(action) {
    if (!isActiveStreamAvailable()) return;
    console.log(`Stop Zoom ${action} on camera ${window.__state.activeStreamId}`);
}
function captureSnapshot() {
    if (!isActiveStreamAvailable()) return;
    console.log(`Capture snapshot on camera ${window.__state.activeStreamId}`);
}

// ---------- Responsive / Device Guard ----------
function checkDeviceWidth() {
    const messageElement = document.getElementById("unsupported-device-message");
    if (window.innerWidth < 1020) {
        messageElement.style.display = "flex";
        document.body.style.overflow = "hidden";
    } else {
        messageElement.style.display = "none";
        document.body.style.overflow = "";
    }
}

// Re-init on each view load (SPA)
window.addEventListener("spa:view-loaded", (e) => {
    // When dashboard view loads, attach handlers
    if (e.detail?.route === "/dashboard") {
        window.__attachDashboard();
    }
    // Re-bind camera drag from sidebar (always safe)
    attachCameraDrag();
});

// First load
window.addEventListener("load", () => {
    checkDeviceWidth();
    attachCameraDrag();
    updateCameraName();
});
window.addEventListener("resize", checkDeviceWidth);

// Make a few globals accessible from inline HTML handlers
window.startPTZ = startPTZ;
window.stopPTZ = stopPTZ;
window.startZoom = startZoom;
window.stopZoom = stopZoom;
window.captureSnapshot = captureSnapshot;
window.toggleSidebar = toggleSidebar;
window.toggleSubMenu = toggleSubMenu;
