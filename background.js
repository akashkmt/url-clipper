const NOTIFICATION_DURATION = 3000;

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "copy-url") {
    await copyCurrentUrl();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "copyUrl") {
    copyUrlToClipboardAndShowToast(message.url, message.tabId)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error("Error copying URL:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function copyCurrentUrl() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.url) {
      console.error("No active tab or URL found");
      return;
    }

    await copyUrlToClipboardAndShowToast(tab.url, tab.id);
  } catch (error) {
    console.error("Error copying URL:", error);
  }
}

function isRestrictedUrl(url) {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("data:")
  );
}

async function copyUrlToClipboardAndShowToast(url, tabId) {
  // For restricted URLs (chrome://, about:, etc.) scripting.executeScript won't work.
  // Write to clipboard via offscreen document approach isn't needed — the popup
  // itself can write directly. For keyboard shortcut on restricted pages, show
  // a chrome notification instead.
  if (isRestrictedUrl(url)) {
    await copyViaOffscreen(url);
    return;
  }

  try {
    const [copyResult] = await chrome.scripting.executeScript({
      target: { tabId },
      func: copyUrlInPage,
      args: [url],
    });

    if (!copyResult?.result?.success) {
      throw new Error(copyResult?.result?.error || "Failed to copy URL");
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: showTemporaryNotification,
        args: ["URL copied!", false, NOTIFICATION_DURATION],
      });
    } catch (e) {
      console.log("Could not show toast on page:", e);
    }
  } catch (error) {
    console.error("Error in copyUrlToClipboardAndShowToast:", error);
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: showTemporaryNotification,
        args: ["Failed to copy URL", true, NOTIFICATION_DURATION],
      });
    } catch (e) {
      console.error("Could not show error toast:", e);
    }
    throw error;
  }
}

// For restricted pages where scripting is blocked, use a temporary offscreen
// iframe trick via a new tab approach — simplest fallback: write via popup message.
// Since we can't inject into chrome:// pages, we copy using a workaround:
// open a blank tab briefly, copy there, then close it.
async function copyViaOffscreen(url) {
  try {
    // Create a temporary about:blank tab, inject copy script, then close it
    const tempTab = await chrome.tabs.create({
      url: "about:blank",
      active: false,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tempTab.id },
        func: copyUrlInPage,
        args: [url],
      });
    } finally {
      chrome.tabs.remove(tempTab.id);
    }
  } catch (e) {
    console.error("Offscreen copy failed:", e);
  }
}

// Injected into page — copies URL to clipboard
async function copyUrlInPage(url) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return { success: true };
    }
  } catch (clipboardError) {
    console.warn("Navigator clipboard failed, falling back:", clipboardError);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand("copy");
    textarea.remove();
    if (!successful) throw new Error("execCommand copy failed");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Injected into page — shows toast notification
function showTemporaryNotification(message, isError = false, duration = 3000) {
  const existing = document.getElementById("url-copy-notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.id = "url-copy-notification";

  const icon = document.createElement("div");
  icon.innerHTML = isError ? "✕" : "✓";

  const messageText = document.createElement("span");
  messageText.textContent = message;

  notification.appendChild(icon);
  notification.appendChild(messageText);

  Object.assign(notification.style, {
    position: "fixed",
    top: "24px",
    right: "24px",
    background: isError ? "#fee" : "#fff",
    color: isError ? "#c00" : "#333",
    padding: "12px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: "500",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    border: `2px solid ${isError ? "#faa" : "#10b981"}`,
    zIndex: "2147483647",
    opacity: "0",
    transform: "translateY(-10px)",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  });

  Object.assign(icon.style, {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: isError ? "#ef4444" : "#10b981",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "bold",
    flexShrink: "0",
  });

  document.body.appendChild(notification);

  requestAnimationFrame(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.opacity = "0";
      notification.style.transform = "translateY(-10px)";
      setTimeout(() => notification.remove(), 200);
    }
  }, duration);
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Copy URL Shortcuts extension installed");
});
