let cameras = [];
let labs = []; // <--- store labs to populate dropdowns

function renderCamerasTable() {
  const camerasTableBody = document.getElementById("cameras-table-body");
  if (!camerasTableBody) return;

  if (cameras.length === 0) {
    camerasTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No cameras found</td></tr>`;
    return;
  }

  camerasTableBody.innerHTML = cameras
    .map(
      (c) => `
    <tr>
      <td>${c.name}</td>
      <td>${c.ipAddress}</td>
      <td>${c.lab || "-"}</td>
      <td><span class="status-indicator ${c.status}">${c.status}</span></td>
      <td>${c.ptzSupport ? "Yes" : "No"}</td>
      <td>
        <button class="action-btn edit" onclick="window.cameraEdit(${c.id
        })"><span class="material-symbols-outlined">edit</span></button>
        <button class="action-btn delete" onclick="window.cameraDelete(${c.id
        })"><span class="material-symbols-outlined">delete</span></button>
      </td>
    </tr>`
    )
    .join("");
}

async function fetchCameras() {
  const resp = await fetch("/api/cameras");
  cameras = await resp.json();
  renderCamerasTable();
}

async function fetchLabs() {
  const resp = await fetch("/api/labs");
  labs = await resp.json();
  // fill both dropdowns
  const addSelect = document.getElementById("camera-lab");
  const editSelect = document.getElementById("edit-camera-lab");

  const optionsHtml =
    `<option value="">Select Lab</option>` +
    labs.map((l) => `<option value="${l.name}">${l.name}</option>`).join("");

  if (addSelect) addSelect.innerHTML = optionsHtml;
  if (editSelect) editSelect.innerHTML = optionsHtml;
}

async function addCameraToServer(payload) {
  await fetch("/api/cameras", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await fetchCameras();
  window.buildCameraList();
}

async function updateCameraOnServer(id, payload) {
  await fetch(`/api/cameras/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await fetchCameras();
  window.buildCameraList();
}

async function deleteCameraOnServer(id) {
  await fetch(`/api/cameras/${id}`, { method: "DELETE" });
  await fetchCameras();
  window.buildCameraList();
}

export async function pingAndRefresh() {
  await fetch("/api/cameras/ping");
  await fetchCameras();
  window.buildCameraList();
}

export function init() {
  const addCameraBtn = document.getElementById("add-camera-btn");
  const addCameraModal = document.getElementById("add-camera-modal");
  const closeModalBtn = document.getElementById("close-add-camera-modal");
  const cancelBtn = document.getElementById("cancel-add-camera");
  const addCameraForm = document.getElementById("add-camera-form");

  const editCameraModal = document.getElementById("edit-camera-modal");
  const closeEditModalBtn = document.getElementById("close-edit-camera-modal");
  const cancelEditBtn = document.getElementById("cancel-edit-camera");
  const editCameraForm = document.getElementById("edit-camera-form");

  fetchLabs(); // <--- load labs dropdown
  fetchCameras();
  setInterval(pingAndRefresh, 5000);

  if (addCameraBtn) {
    addCameraBtn.addEventListener("click", async () => {
      await fetchLabs();                // <--- ensure fresh
      addCameraModal.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  }

  // === OPEN ADD ===
  if (addCameraBtn) {
    addCameraBtn.addEventListener("click", () => {
      addCameraModal.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  }

  function closeAddModal() {
    addCameraModal.classList.remove("active");
    document.body.style.overflow = "";
    addCameraForm.reset();
  }

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeAddModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeAddModal);

  addCameraModal.addEventListener("click", (e) => {
    if (
      e.target === addCameraModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeAddModal();
    }
  });

  // === ADD FORM ===
  if (addCameraForm) {
    addCameraForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        name: document.getElementById("camera-name").value,
        ipAddress: document.getElementById("ip-address").value,
        lab: document.getElementById("camera-lab").value,
        ptzSupport:
          document.querySelector("input[name='ptz-support']:checked").value ===
          "yes",
        status: "offline",
      };

      await addCameraToServer(payload);
      closeAddModal();
    });
  }

  // === OPEN EDIT ===
  function openEditModal(id) {
    const doOpen = () => {
      const cam = cameras.find((c) => c.id === id);
      if (!cam) return;
      document.getElementById("edit-camera-id").value = cam.id;
      document.getElementById("edit-camera-name").value = cam.name;
      document.getElementById("edit-ip-address").value = cam.ipAddress;
      document.getElementById("edit-camera-lab").value = cam.lab || "";
      document.querySelector(
        `input[name='edit-ptz-support'][value='${cam.ptzSupport ? "yes" : "no"}']`
      ).checked = true;

      editCameraModal.classList.add("active");
      document.body.style.overflow = "hidden";
    };

    // ensure labs are current before filling the select
    fetchLabs().then(doOpen);
  }

  // === EDIT FORM ===
  if (editCameraForm) {
    editCameraForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = parseInt(document.getElementById("edit-camera-id").value);
      const payload = {
        name: document.getElementById("edit-camera-name").value,
        ipAddress: document.getElementById("edit-ip-address").value,
        lab: document.getElementById("edit-camera-lab").value,
        ptzSupport:
          document.querySelector("input[name='edit-ptz-support']:checked")
            .value === "yes",
        status: "offline",
      };

      await updateCameraOnServer(id, payload);
      closeEditModal();
    });
  }

  function closeEditModal() {
    editCameraModal.classList.remove("active");
    document.body.style.overflow = "";
    editCameraForm.reset();
  }

  if (closeEditModalBtn)
    closeEditModalBtn.addEventListener("click", closeEditModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEditModal);
  editCameraModal.addEventListener("click", (e) => {
    if (
      e.target === editCameraModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeEditModal();
    }
  });

  window.cameraEdit = openEditModal;
  window.cameraDelete = async (id) => {
    if (confirm("Are you sure you want to delete this camera?")) {
      await deleteCameraOnServer(id);
    }
  };
}

// ping all cameras and refresh table + sidebar
