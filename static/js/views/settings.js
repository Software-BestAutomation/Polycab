let settings = {
  ptzSpeed: 5,
  serverIP: "192.168.1.100",
};

export function init() {
  loadSettings();
  initSpeedUI();
  setupSaveButton();
}

function loadSettings() {
  const savedSettings = localStorage.getItem("cameraSettings");
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      settings.ptzSpeed = parsed.ptzSpeed || settings.ptzSpeed;
      settings.serverIP = parsed.serverIP || settings.serverIP;
    } catch (e) {
      console.error("Failed to parse saved settings", e);
    }
  }

  // Update UI with loaded settings
  document.getElementById("settings-ptz-speed").value = settings.ptzSpeed;
  document.getElementById("settings-ptz-speed-value").textContent =
    settings.ptzSpeed;
  document.getElementById("server-ip").value = settings.serverIP;

  // Also update the main PTZ speed control if it exists
  const mainPtzSpeed = document.getElementById("ptz-speed");
  if (mainPtzSpeed) {
    mainPtzSpeed.value = settings.ptzSpeed;
    const mainPtzValue = document.getElementById("ptz-speed-value");
    if (mainPtzValue) {
      mainPtzValue.textContent = settings.ptzSpeed;
    }
  }
}

function initSpeedUI() {
  const input = document.getElementById("settings-ptz-speed");
  const badge = document.getElementById("settings-ptz-speed-value");
  if (!input || !badge) return;

  input.value = settings.ptzSpeed;
  badge.textContent = settings.ptzSpeed;

  input.addEventListener("input", () => {
    badge.textContent = input.value;
    badge.style.transform = "scale(1.2)";
    setTimeout(() => (badge.style.transform = "scale(1)"), 200);
  });
}

function setupSaveButton() {
  const saveBtn = document.getElementById("save-settings");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", () => {
    settings.ptzSpeed = parseInt(
      document.getElementById("settings-ptz-speed").value,
      10
    );
    settings.serverIP = document.getElementById("server-ip").value.trim();

    localStorage.setItem("cameraSettings", JSON.stringify(settings));

    // Update main PTZ speed control if it exists
    const mainPtzSpeed = document.getElementById("ptz-speed");
    if (mainPtzSpeed) {
      mainPtzSpeed.value = settings.ptzSpeed;
      const mainPtzValue = document.getElementById("ptz-speed-value");
      if (mainPtzValue) {
        mainPtzValue.textContent = settings.ptzSpeed;
      }
    }

    // Show confirmation
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Saved!";
    saveBtn.disabled = true;
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }, 2000);
  });
}

export function getPTZSpeed() {
  return settings.ptzSpeed;
}

export function getServerIP() {
  return settings.serverIP;
}
