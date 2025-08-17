// Sample data - in a real app, this would come from your backend
let requests = [
  {
    id: 1,
    clientId: "CL-001",
    lab: "Electronics Lab",
    cameras: ["Cam-EL-01", "Cam-EL-02"],
    requestTime: "2023-05-15 14:30",
    status: "pending",
  },
  {
    id: 2,
    clientId: "CL-002",
    lab: "Mechanical Lab",
    cameras: ["Cam-ME-01"],
    requestTime: "2023-05-16 09:15",
    status: "pending",
  },
  {
    id: 3,
    clientId: "CL-003",
    lab: "Physics Lab",
    cameras: ["Cam-PH-01", "Cam-PH-02", "Cam-PH-03"],
    requestTime: "2023-05-16 11:45",
    status: "pending",
  },
];

export function init() {
  const requestsTableBody = document.getElementById("requests-table-body");
  const badgeElement = document.querySelector(".badge");
  const modal = document.getElementById("review-modal");
  const modalCloseBtn = modal.querySelector(".modal-close-btn");
  const approveBtn = document.getElementById("approve-btn");
  const declineBtn = document.getElementById("decline-btn");

  // Initialize the table
  renderRequestsTable();

  // Update badge count
  if (badgeElement) {
    badgeElement.textContent = requests.length;
  }

  // Modal event listeners
  modalCloseBtn.addEventListener("click", closeModal);
  modal.querySelector(".modal-overlay").addEventListener("click", closeModal);

  // Expose function to window for inline event handler
  window.reviewRequest = (requestId) => {
    openRequestModal(requestId);
  };

  // Approve/Decline button handlers
  approveBtn.addEventListener("click", () => handleRequestAction(true));
  declineBtn.addEventListener("click", () => handleRequestAction(false));

  // Render the requests table
  function renderRequestsTable() {
    if (!requestsTableBody) return;

    if (requests.length === 0) {
      requestsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            No pending requests found.
          </td>
        </tr>
      `;
      return;
    }

    requestsTableBody.innerHTML = requests
      .map(
        (request) => `
      <tr>
        <td>${request.clientId}</td>
        <td>${request.lab}</td>
        <td>${request.cameras.join(", ")}</td>
        <td>${request.requestTime}</td>
        <td>
          <span class="request-status ${request.status}">
            ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
        </td>
        <td>
          <button class="review-btn" onclick="window.reviewRequest(${
            request.id
          })">
            <span class="material-symbols-outlined">rate_review</span>
            Review
          </button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  // Open modal with request details
  function openRequestModal(requestId) {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    // Populate modal with request details
    document.getElementById("detail-client-id").textContent = request.clientId;
    document.getElementById("detail-lab").textContent = request.lab;
    document.getElementById("detail-cameras").textContent =
      request.cameras.join(", ");
    document.getElementById("detail-time").textContent = request.requestTime;

    // Store current request ID in modal dataset
    modal.dataset.requestId = requestId;

    // Show modal
    modal.classList.add("active");
  }

  // Close modal
  function closeModal() {
    modal.classList.remove("active");
    delete modal.dataset.requestId;
  }

  // Handle approve/decline action
  function handleRequestAction(approve) {
    const requestId = parseInt(modal.dataset.requestId);
    if (!requestId) return;

    // Find the request in the array
    const requestIndex = requests.findIndex((r) => r.id === requestId);
    if (requestIndex === -1) return;

    if (approve) {
      // Update status to approved
      requests[requestIndex].status = "approved";
      // In a real app, you would also make an API call here to update the backend
    } else {
      // Remove the request from the array
      requests.splice(requestIndex, 1);
    }

    // Update UI
    renderRequestsTable();
    updateBadgeCount();
    closeModal();
  }

  // Update the badge count
  function updateBadgeCount() {
    if (badgeElement) {
      badgeElement.textContent = requests.length;
    }
  }
}
