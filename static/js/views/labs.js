export function init() {
  // Example: fetch('/api/labs').then(...)
  const mount = document.getElementById("labs-table-mount");
  if (mount) mount.textContent = "Labs module ready.";
}
