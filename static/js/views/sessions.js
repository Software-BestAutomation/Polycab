// Sample data - in a real app, this would come from your backend
let sessions = [
  {
    id: 1,
    clientId: "CL-0901",
    camera: "Cam-EL-01",
    lab: "Electronics Lab",
    startTime: "5/15/2023, 9:00:00 AM",
    endTime: "5/15/2023, 10:00:00 AM",
    duration: "1h",
    ptzUsage: "Moderate",
    status: "completed",
  },
  {
    id: 1,
    clientId: "CL-0901",
    camera: "Cam-EL-01",
    lab: "Electronics Lab",
    startTime: "5/15/2023, 9:00:00 AM",
    endTime: "5/15/2023, 10:00:00 AM",
    duration: "1h",
    ptzUsage: "Moderate",
    status: "completed",
  },
  {
    id: 2,
    clientId: "CL-0902",
    camera: "Cam-RL-01",
    lab: "Robotics Lab",
    startTime: "5/15/2023, 9:30:00 AM",
    endTime: "5/15/2023, 11:00:00 AM",
    duration: "1h 30m",
    ptzUsage: "High",
    status: "completed",
  },
  {
    id: 3,
    clientId: "CL-0903",
    camera: "Cam-PL-01",
    lab: "Physics Lab",
    startTime: "5/15/2023, 10:15:00 AM",
    endTime: null,
    duration: "Active",
    ptzUsage: "Low",
    status: "active",
  },
  {
    id: 4,
    clientId: "CL-0904",
    camera: "Cam-CS-01",
    lab: "Computer Science Lab",
    startTime: "5/15/2023, 1:00:00 PM",
    endTime: "5/15/2023, 3:45:00 PM",
    duration: "2h 45m",
    ptzUsage: "High",
    status: "completed",
  },
  {
    id: 5,
    clientId: "CL-0905",
    camera: "Cam-BL-01",
    lab: "Biology Lab",
    startTime: "5/16/2023, 8:00:00 AM",
    endTime: null,
    duration: "Active",
    ptzUsage: "Moderate",
    status: "active",
  },
];

export function init() {
  const sessionsTableBody = document.getElementById("sessions-table-body");
  const sessionsCountElement = document.getElementById("sessions-count");

  // Initialize the table
  renderSessionsTable();

  // Update sessions count
  if (sessionsCountElement) {
    sessionsCountElement.textContent = sessions.length;
  }

  // Render the sessions table
  function renderSessionsTable() {
    if (!sessionsTableBody) return;

    if (sessions.length === 0) {
      sessionsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            No sessions found.
          </td>
        </tr>
      `;
      return;
    }

    sessionsTableBody.innerHTML = sessions
      .map(
        (session) => `
        <tr class="${session.status === "active" ? "active-session" : ""}">
          <td>${session.clientId}</td>
          <td>${session.camera}</td>
          <td>${session.lab}</td>
          <td>${session.startTime}</td>
          <td>${session.endTime || "Active"}</td>
          <td>
            <span class="status-badge ${getStatusClass(session)}">
              ${session.duration}
            </span>
          </td>
          <td>
            <span class="status-badge ${getPtzUsageClass(session.ptzUsage)}">
              ${session.ptzUsage}
            </span>
          </td>
        </tr>
      `
      )
      .join("");
  }

  // Simplified status classification
  function getStatusClass(session) {
    if (session.status === "active") return "active";
    return "completed";
  }

  // Simplified PTZ usage classification
  function getPtzUsageClass(ptzUsage) {
    return ptzUsage.toLowerCase();
  }
}
