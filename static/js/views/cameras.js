// Sample data - in a real app, this would come from your backend
let cameras = [
  {
    id: 1,
    name: "Cam-EL-01",
    ipAddress: "192.168.1.101",
    lab: "Electronics Lab",
    status: "online",
    ptzSupport: true,
  },
  {
    id: 2,
    name: "Cam-ME-01",
    ipAddress: "192.168.1.102",
    lab: "Mechanical Lab",
    status: "online",
    ptzSupport: false,
  },
];

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

  const camerasTableBody = document.getElementById("cameras-table-body");

  // Initialize the table
  renderCamerasTable();

  // Open add modal
  if (addCameraBtn) {
    addCameraBtn.addEventListener("click", () => {
      addCameraModal.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  }

  // Close add modal
  function closeAddModal() {
    addCameraModal.classList.remove("active");
    document.body.style.overflow = "";
    addCameraForm.reset();
  }

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeAddModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeAddModal);

  // Close when clicking outside
  addCameraModal.addEventListener("click", (e) => {
    if (
      e.target === addCameraModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeAddModal();
    }
  });

  // Form submission
  if (addCameraForm) {
    addCameraForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const cameraName = document.getElementById("camera-name").value;
      const ipAddress = document.getElementById("ip-address").value;
      const lab = document.getElementById("camera-lab").value;
      const ptzSupport =
        document.querySelector("input[name='ptz-support']:checked").value ===
        "yes";

      // For demo, randomly set status
      const status = Math.random() > 0.3 ? "online" : "offline";

      const newCamera = {
        id: cameras.length + 1,
        name: cameraName,
        ipAddress: ipAddress,
        lab: lab,
        status: status,
        ptzSupport: ptzSupport,
      };

      cameras.push(newCamera);
      renderCamerasTable();
      closeAddModal();
    });
  }

  // Edit modal functions
  function openEditModal(cameraId) {
    const camera = cameras.find((c) => c.id === cameraId);
    if (!camera) return;

    document.getElementById("edit-camera-id").value = camera.id;
    document.getElementById("edit-camera-name").value = camera.name;
    document.getElementById("edit-ip-address").value = camera.ipAddress;
    document.getElementById("edit-camera-lab").value = camera.lab;
    document.querySelector(
      `input[name='edit-ptz-support'][value='${
        camera.ptzSupport ? "yes" : "no"
      }']`
    ).checked = true;

    editCameraModal.classList.add("active");
    document.body.style.overflow = "hidden";
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

  // Edit form submission
  if (editCameraForm) {
    editCameraForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const cameraId = parseInt(
        document.getElementById("edit-camera-id").value
      );
      const cameraName = document.getElementById("edit-camera-name").value;
      const ipAddress = document.getElementById("edit-ip-address").value;
      const lab = document.getElementById("edit-camera-lab").value;
      const ptzSupport =
        document.querySelector("input[name='edit-ptz-support']:checked")
          .value === "yes";

      const cameraIndex = cameras.findIndex((c) => c.id === cameraId);
      if (cameraIndex !== -1) {
        cameras[cameraIndex] = {
          ...cameras[cameraIndex],
          name: cameraName,
          ipAddress: ipAddress,
          lab: lab,
          ptzSupport: ptzSupport,
        };

        renderCamerasTable();
        closeEditModal();
      }
    });
  }

  // Delete camera function
  function deleteCamera(cameraId) {
    if (confirm("Are you sure you want to delete this camera?")) {
      cameras = cameras.filter((c) => c.id !== cameraId);
      renderCamerasTable();
    }
  }

  // Render the cameras table
  function renderCamerasTable() {
    if (!camerasTableBody) return;

    if (cameras.length === 0) {
      camerasTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            No cameras found. Click "Add Camera" to create one.
          </td>
        </tr>
      `;
      return;
    }

    camerasTableBody.innerHTML = cameras
      .map(
        (camera) => `
      <tr>
        <td>${camera.name}</td>
        <td>${camera.ipAddress}</td>
        <td>${camera.lab}</td>
        <td>
          <span class="status-indicator ${camera.status}">
            ${camera.status.charAt(0).toUpperCase() + camera.status.slice(1)}
          </span>
        </td>
        <td>${camera.ptzSupport ? "Yes" : "No"}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn edit" onclick="window.cameraEdit(${
              camera.id
            })">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="action-btn delete" onclick="window.cameraDelete(${
              camera.id
            })">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  }

  // Expose functions to window for inline event handlers
  window.cameraEdit = openEditModal;
  window.cameraDelete = deleteCamera;
}
