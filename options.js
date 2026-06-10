document.addEventListener("DOMContentLoaded", function () {
  updateShortcutDisplay();
  setupEventListeners();
});

async function updateShortcutDisplay() {
  const shortcutElement = document.getElementById("currentShortcut");
  if (!shortcutElement) return;

  try {
    const commands = await chrome.commands.getAll();
    const copyCommand = commands.find((cmd) => cmd.name === "copy-url");

    if (copyCommand?.shortcut) {
      shortcutElement.textContent = copyCommand.shortcut;
    } else {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      shortcutElement.textContent = isMac ? "⌘⇧C" : "Ctrl+Shift+C";
    }
  } catch (e) {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    shortcutElement.textContent = isMac ? "⌘⇧C" : "Ctrl+Shift+C";
  }
}

function setupEventListeners() {
  document
    .getElementById("openChromeShortcuts")
    .addEventListener("click", function () {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    });
}
