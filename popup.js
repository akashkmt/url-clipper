document.addEventListener("DOMContentLoaded", async function () {
  await Promise.all([loadCurrentUrl(), loadShortcut()]);

  const copyBtn = document.getElementById("copyUrlBtn");
  copyBtn.addEventListener("click", copyUrl);
  copyBtn.focus();

  const shortcutBtn = document.getElementById("shortcutBtn");
  shortcutBtn.addEventListener("click", openChromeShortcuts);
  shortcutBtn.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openChromeShortcuts();
    }
  });
});

async function loadCurrentUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    document.getElementById("pageUrl").textContent = tab.url;
  }
}

async function loadShortcut() {
  try {
    const commands = await chrome.commands.getAll();
    const copyCommand = commands.find((cmd) => cmd.name === "copy-url");

    if (copyCommand?.shortcut) {
      renderShortcut(copyCommand.shortcut);
    }
  } catch (error) {
    console.error("Failed to load shortcut", error);
  }
}

function renderShortcut(shortcutString) {
  const display = document.getElementById("shortcutDisplay");
  display.innerHTML = "";

  const keys = shortcutString.split("+").map((key) => normalizeKey(key.trim()));

  keys.forEach((key) => {
    const keyElement = document.createElement("span");
    keyElement.className = "shortcut-key";
    keyElement.textContent = key;
    display.appendChild(keyElement);
  });
}

function normalizeKey(key) {
  const macMap = {
    Command: "⌘",
    Ctrl: "⌃",
    Control: "⌃",
    Shift: "⇧",
    Alt: "⌥",
    Option: "⌥",
  };

  const winMap = {
    Command: "Cmd",
    Ctrl: "Ctrl",
    Control: "Ctrl",
    Shift: "Shift",
    Alt: "Alt",
  };

  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const keyMap = isMac ? macMap : winMap;

  return keyMap[key] || key.toUpperCase();
}

function openChromeShortcuts() {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  window.close();
}

async function copyUrl() {
  const btn = document.getElementById("copyUrlBtn");
  const btnText = document.getElementById("btnText");
  const originalText = btnText.textContent;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.url) throw new Error("No URL");

    btn.classList.add("success");
    btnText.textContent = "Copied!";

    await chrome.runtime.sendMessage({
      action: "copyUrl",
      url: tab.url,
      tabId: tab.id,
    });

    setTimeout(() => {
      btn.classList.remove("success");
      btnText.textContent = originalText;
    }, 1500);
  } catch (error) {
    btnText.textContent = "Failed";
    setTimeout(() => {
      btnText.textContent = originalText;
    }, 1500);
  }
}
