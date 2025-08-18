// Sample data - in a real app, this would come from your backend
let labs = [];

async function fetchLabs() {
  const response = await fetch("/api/labs");
  labs = await response.json();
  renderLabsTable();
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
  // Initialize the table
  renderLabsTable();

  // Open add modal
  if (addLabBtn) {
    addLabBtn.addEventListener("click", () => {
      addLabModal.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  }

  // Close add modal
  function closeAddModal() {
    addLabModal.classList.remove("active");
    document.body.style.overflow = "";
    addLabForm.reset();
  }

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeAddModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeAddModal);

  // Close when clicking outside
  addLabModal.addEventListener("click", (e) => {
    if (
      e.target === addLabModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeAddModal();
    }
  });

  // Form submission
  if (addLabForm) {
    addLabForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const labName = document.getElementById("lab-name").value;
      const maxCameras = parseInt(document.getElementById("max-cameras").value);
      const status = document.getElementById("lab-status").value;
      const description = document.getElementById("lab-description").value;

      // Generate random camera counts for demonstration
      const totalCameras = Math.floor(Math.random() * maxCameras) + 1; // 1 to maxCameras
      const onlineCameras = Math.floor(Math.random() * (totalCameras + 1)); // 0 to totalCameras

      const newLab = {
        id: labs.length + 1,
        name: labName,
        maxCameras: maxCameras,
        totalCameras: totalCameras,
        onlineCameras: onlineCameras,
        status: status,
        description: description,
      };

      labs.push(newLab);
      renderLabsTable();
      closeAddModal();
    });
  }

  // Edit modal functions
  function openEditModal(labId) {
    const lab = labs.find((l) => l.id === labId);
    if (!lab) return;

    document.getElementById("edit-lab-id").value = lab.id;
    document.getElementById("edit-lab-name").value = lab.name;
    document.getElementById("edit-max-cameras").value = lab.maxCameras;
    document.getElementById("edit-lab-status").value = lab.status;
    document.getElementById("edit-lab-description").value = lab.description;

    editLabModal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  // Edit form submission
  if (editLabForm) {
    editLabForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const labId = parseInt(document.getElementById("edit-lab-id").value);
      const labName = document.getElementById("edit-lab-name").value;
      const maxCameras = parseInt(
        document.getElementById("edit-max-cameras").value
      );
      const status = document.getElementById("edit-lab-status").value;
      const description = document.getElementById("edit-lab-description").value;

      const labIndex = labs.findIndex((l) => l.id === labId);
      if (labIndex !== -1) {
        // Preserve existing camera counts when editing
        labs[labIndex] = {
          ...labs[labIndex],
          name: labName,
          maxCameras: maxCameras,
          status: status,
          description: description,
        };

        renderLabsTable();
        closeEditModal();
      }
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

  // Render the labs table
  function renderLabsTable() {
    if (!labsTableBody) return;

    if (labs.length === 0) {
      labsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            No labs found. Click "Add Lab" to create one.
          </td>
        </tr>
      `;
      return;
    }

    labsTableBody.innerHTML = labs
      .map(
        (lab) => `
      <tr>
        <td>${lab.name}</td>
        <td>${lab.totalCameras}</td>
        <td>${lab.onlineCameras}</td>
        <td>
          <span class="lab-status ${lab.status}">
            ${lab.status.charAt(0).toUpperCase() + lab.status.slice(1)}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="action-btn edit" onclick="window.labEdit(${lab.id})">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="action-btn delete" onclick="window.labDelete(${
              lab.id
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
  window.labEdit = openEditModal;
  window.labDelete = (labId) => {
    if (confirm("Are you sure you want to delete this lab?")) {
      labs = labs.filter((l) => l.id !== labId);
      renderLabsTable();
    }
  };
}
