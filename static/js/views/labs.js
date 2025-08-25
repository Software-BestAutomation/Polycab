let labs = [];

function renderLabsTable() {
  const labsTableBody = document.getElementById("labs-table-body");
  if (!labsTableBody) return;

  if (labs.length === 0) {
    labsTableBody.innerHTML = `
      <tr><td colspan="5" class="empty-state">No labs found. Click "Add Lab" to create one.</td></tr>`;
    return;
  }

  labsTableBody.innerHTML = labs
    .map(
      (lab) => `
    <tr>
      <td>${lab.name}</td>
      <td>${lab.totalCameras}</td>
      <td>${lab.onlineCameras}</td>
      <td><span class="lab-status ${lab.status}">${lab.status}</span></td>
      <td>
        <div class="action-buttons">
          <button class="action-btn edit" onclick="window.labEdit(${lab.id})"><span class="material-symbols-outlined">edit</span></button>
          <button class="action-btn delete" onclick="window.labDelete(${lab.id})"><span class="material-symbols-outlined">delete</span></button>
        </div>
      </td>
    </tr>`
    )
    .join("");
}

async function fetchLabs() {
  const response = await fetch("/api/labs", { cache: "no-store" });
  labs = await response.json();
  renderLabsTable();
}

async function addLabToServer(payload) {
  await fetch("/api/labs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await fetchLabs();
  window.dispatchEvent(new CustomEvent("labs:changed")); // <--- add
}

async function updateLabOnServer(id, payload) {
  await fetch(`/api/labs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await fetchLabs();
  window.dispatchEvent(new CustomEvent("labs:changed")); // <--- add
}

async function deleteLabOnServer(id) {
  await fetch(`/api/labs/${id}`, { method: "DELETE" });
  await fetchLabs();
  window.dispatchEvent(new CustomEvent("labs:changed")); // <--- add
}

export function init() {
  const addLabBtn = document.getElementById("add-lab-btn");
  const addLabModal = document.getElementById("add-lab-modal");
  const closeModalBtn = document.getElementById("close-add-lab-modal");
  const cancelBtn = document.getElementById("cancel-add-lab");
  const addLabForm = document.getElementById("add-lab-form");

  const editLabModal = document.getElementById("edit-lab-modal");
  const closeEditModalBtn = document.getElementById("close-edit-lab-modal");
  const cancelEditBtn = document.getElementById("cancel-edit-lab");
  const editLabForm = document.getElementById("edit-lab-form");

  const labsTableBody = document.getElementById("labs-table-body");

  fetchLabs();

  if (addLabBtn) {
    addLabBtn.addEventListener("click", () => {
      addLabModal.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  }

  function closeAddModal() {
    addLabModal.classList.remove("active");
    document.body.style.overflow = "";
    addLabForm.reset();
  }

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeAddModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeAddModal);

  addLabModal.addEventListener("click", (e) => {
    if (
      e.target === addLabModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeAddModal();
    }
  });

  if (addLabForm) {
    addLabForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        name: document.getElementById("lab-name").value,
        status: document.getElementById("lab-status").value,
        description: document.getElementById("lab-description").value,
      };

      await addLabToServer(payload);
      closeAddModal();
    });
  }

  function openEditModal(labId) {
    const lab = labs.find((l) => l.id === labId);
    if (!lab) return;

    document.getElementById("edit-lab-id").value = lab.id;
    document.getElementById("edit-lab-name").value = lab.name;
    document.getElementById("edit-lab-status").value = lab.status;
    document.getElementById("edit-lab-description").value = lab.description;

    editLabModal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  if (editLabForm) {
    editLabForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const labId = parseInt(document.getElementById("edit-lab-id").value);

      const payload = {
        name: document.getElementById("edit-lab-name").value,
        status: document.getElementById("edit-lab-status").value,
        description: document.getElementById("edit-lab-description").value,
      };

      await updateLabOnServer(labId, payload);
      closeEditModal();
    });
  }

  function closeEditModal() {
    editLabModal.classList.remove("active");
    document.body.style.overflow = "";
    editLabForm.reset();
  }

  if (closeEditModalBtn)
    closeEditModalBtn.addEventListener("click", closeEditModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEditModal);
  editLabModal.addEventListener("click", (e) => {
    if (
      e.target === editLabModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeEditModal();
    }
  });

  window.labEdit = openEditModal;
  window.labDelete = async (id) => {
    if (confirm("Are you sure you want to delete this lab?")) {
      await deleteLabOnServer(id);
    }
  };
}
