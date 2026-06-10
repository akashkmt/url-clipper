# URL Clipper

A Chrome extension that copies the current tab's URL to your clipboard - via a keyboard shortcut or the popup. Shows a small toast on the page so you know it worked.

## Install

1. Clone/download this repo
2. Go to `chrome://extensions`
3. Turn on **Developer mode**
4. Click **Load unpacked**, select this folder

## Usage

No shortcut is assigned out of the box. Chrome may suggest `Ctrl+Shift+C` (copy URL) and `Ctrl+Shift+U` (open popup), but it won't override an existing binding.

To set your shortcuts: hit **Change Shortcut** in the popup, or go to `chrome://extensions/shortcuts`.

You can also just click the toolbar icon and hit **Copy URL** from there.

## How it works

Keyboard shortcut and popup button both go through the service worker (`background.js`). It injects a small script into the active tab to write to clipboard, then injects a toast notification. For restricted pages (`chrome://`, `about:`, etc.) where script injection is blocked, it briefly opens a hidden `about:blank` tab to do the copy there instead.

## Files

```
manifest.json       extension config
background.js       service worker - copy logic, toast injection
popup.html/js/css   toolbar popup
options.html/js/css options page (shortcut info)
icons/              16, 48, 128px icons
```

## Permissions

- `activeTab` + `tabs` - get the current tab's URL
- `scripting` - inject copy/toast scripts into pages
- `commands` - keyboard shortcut support
- `clipboardWrite` - write to clipboard

## Author

Akash Kumawat - [akashkmt963@gmail.com](mailto:akashkmt963@gmail.com)
