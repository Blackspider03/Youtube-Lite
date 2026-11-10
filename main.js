
const {
  app,
  BaseWindow,
  WebContentsView,
  ipcMain,
  session,
  shell
} = require("electron");

const fs = require("fs");
const path = require("path");

const { ElectronBlocker } =
  require("@ghostery/adblocker-electron");

const fetch = require("cross-fetch");

// =====================================
// CONFIGURATION
// =====================================

const HOME = "https://www.youtube.com/";
const PARTITION = "persist:youtube-lite";
const TOOLBAR_HEIGHT = 68;

let win = null;
let toolbar = null;
let browser = null;
let settingsFile = null;

let adBlockEnabled = true;
let blocker = null;
let blockerReady = false;

// =====================================
// SETTINGS
// =====================================

function loadSettings() {
  settingsFile = path.join(
    app.getPath("userData"),
    "settings.json"
  );

  try {
    const settings = JSON.parse(
      fs.readFileSync(settingsFile, "utf8")
    );

    adBlockEnabled =
      settings.adBlockEnabled !== false;
  } catch {
    adBlockEnabled = true;
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(
      settingsFile,
      JSON.stringify(
        { adBlockEnabled },
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      "Failed to save settings:",
      error
    );
  }
}

// =====================================
// GHOSTERY AD BLOCKER
// =====================================


async function setupAdBlocker() {
  const ses = session.fromPartition(PARTITION);

  const blockedDomains = [
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "adservice.google.com"
  ];

  ses.webRequest.onBeforeRequest(
    { urls: ["*://*/*"] },
    (details, callback) => {
      if (!adBlockEnabled) {
        return callback({ cancel: false });
      }

      let blocked = false;

      try {
        const host = new URL(
          details.url
        ).hostname.toLowerCase();

        blocked = blockedDomains.some(
          domain =>
            host === domain ||
            host.endsWith("." + domain)
        );
      } catch {}

      if (blocked) {
        console.log(
          "[AD BLOCKED]",
          details.url
        );
      }

      callback({ cancel: blocked });
    }
  );

  console.log("Basic ad blocker ready");
}



function setAdBlock(enabled) {
  adBlockEnabled = enabled;

  saveSettings();

  console.log(
    "[AD BLOCK]",
    enabled ? "ON" : "OFF"
  );

  sendState();

  if (
    browser &&
    !browser.webContents.isDestroyed()
  ) {
    browser.webContents.reloadIgnoringCache();
  }

  return adBlockEnabled;
}
// =====================================
// YOUTUBE URL HANDLING
// =====================================

function isYouTube(url) {
  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "https:" &&
      (
        parsed.hostname === "youtube.com" ||
        parsed.hostname.endsWith(".youtube.com")
      )
    );
  } catch {
    return false;
  }
}

function normalize(url) {
  if (!isYouTube(url)) {
    return url;
  }

  const parsed = new URL(url);

  const match = parsed.pathname.match(
    /^\/shorts\/([\w-]{11})(?:\/|$)/
  );

  if (match) {
    return (
      "https://www.youtube.com/watch?v=" +
      match[1]
    );
  }

  return url;
}

function navigate(url) {
  if (
    !browser ||
    browser.webContents.isDestroyed()
  ) {
    return;
  }

  if (!isYouTube(url)) {
    return;
  }

  browser.webContents
    .loadURL(normalize(url))
    .catch(error => {
      console.error(
        "Navigation failed:",
        error
      );
    });
}

// =====================================
// SHORTS AND SIDEBAR CSS
// =====================================

// CSS only. No MutationObserver.
// This reduces script errors and CPU usage.

const cleanupCSS = `
  ytd-guide-renderer,
  ytd-mini-guide-renderer,
  tp-yt-app-drawer,
  ytd-masthead #guide-button,
  #guide,

  ytd-reel-shelf-renderer,
  ytd-rich-shelf-renderer[is-shorts],
  ytd-shorts,
  ytd-reel-video-renderer,

  ytd-rich-item-renderer:has(
    a[href^="/shorts/"]
  ),

  ytd-video-renderer:has(
    a[href^="/shorts/"]
  ),

  ytd-grid-video-renderer:has(
    a[href^="/shorts/"]
  ),

  ytd-compact-video-renderer:has(
    a[href^="/shorts/"]
  ),

  ytd-guide-entry-renderer:has(
    a[href^="/shorts"]
  ),

  ytd-mini-guide-entry-renderer:has(
    a[href^="/shorts"]
  ),

  a[href^="/shorts/"] {
    display: none !important;
  }

  ytd-app[guide-persistent-and-visible]
  ytd-page-manager,

  ytd-app[mini-guide-visible]
  ytd-page-manager {
    margin-left: 0 !important;
  }
`;

// =====================================
// SEND STATE TO TOOLBAR
// =====================================

function sendState() {
  if (!toolbar || !browser) {
    return;
  }

  if (
    toolbar.webContents.isDestroyed() ||
    browser.webContents.isDestroyed()
  ) {
    return;
  }

  const wc = browser.webContents;

  toolbar.webContents.send(
    "browser-state",
    {
      url: wc.getURL(),

      canGoBack:
        wc.navigationHistory.canGoBack(),

      canGoForward:
        wc.navigationHistory.canGoForward(),

      adBlockEnabled
    }
  );
}

// =====================================
// WINDOW RESIZING
// =====================================

function resize() {
  if (
    !win ||
    win.isDestroyed() ||
    !toolbar ||
    !browser
  ) {
    return;
  }

  const [width, height] =
    win.getContentSize();

  toolbar.setBounds({
    x: 0,
    y: 0,
    width,
    height: TOOLBAR_HEIGHT
  });

  browser.setBounds({
    x: 0,
    y: TOOLBAR_HEIGHT,
    width,
    height: Math.max(
      0,
      height - TOOLBAR_HEIGHT
    )
  });
}

// =====================================
// CREATE BROWSER WINDOW
// =====================================

function createWindow() {
  win = new BaseWindow({
    width: 1360,
    height: 860,
    minWidth: 780,
    minHeight: 500,
    title: "YouTube Lite",
    backgroundColor: "#0b0b10",
    autoHideMenuBar: true
  });

  // Toolbar view
  toolbar = new WebContentsView({
    webPreferences: {
      preload: path.join(
        __dirname,
        "preload.js"
      ),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // YouTube view
  browser = new WebContentsView({
    webPreferences: {
      partition: PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.contentView.addChildView(toolbar);
  win.contentView.addChildView(browser);

  resize();

  win.on("resize", resize);

  // Debugging errors in CMD only.
  // No DevTools popup.

  toolbar.webContents.on(
    "preload-error",
    (_event, preloadPath, error) => {
      console.error(
        "Toolbar preload error:",
        preloadPath,
        error
      );
    }
  );

  toolbar.webContents.loadFile(
    path.join(__dirname, "index.html")
  ).catch(console.error);

  const wc = browser.webContents;

  // Apply CSS when YouTube loads.
  wc.on("dom-ready", () => {
    if (!isYouTube(wc.getURL())) {
      return;
    }

    wc.insertCSS(cleanupCSS)
      .catch(error => {
        console.error(
          "CSS insertion failed:",
          error
        );
      });
  });

  // Handle new windows
  wc.setWindowOpenHandler(({ url }) => {
    if (isYouTube(url)) {
      navigate(url);
    } else if (
      url.startsWith("https://")
    ) {
      shell.openExternal(url)
        .catch(console.error);
    }

    return { action: "deny" };
  });

  // Block navigation outside YouTube
  wc.on(
    "will-navigate",
    (event, url) => {
      if (!isYouTube(url)) {
        event.preventDefault();
        return;
      }

      const next = normalize(url);

      if (next !== url) {
        event.preventDefault();
        navigate(next);
      }
    }
  );

  // Handle navigation within YouTube
  wc.on(
    "did-navigate-in-page",
    (_event, url) => {
      const next = normalize(url);

      if (next !== url) {
        navigate(next);
      }

      sendState();
    }
  );

  wc.on("did-navigate", sendState);
  wc.on("did-stop-loading", sendState);

  // Full-screen video
  wc.on(
    "enter-html-full-screen",
    () => {
      if (win && !win.isDestroyed()) {
        win.setFullScreen(true);
      }
    }
  );

  wc.on(
    "leave-html-full-screen",
    () => {
      if (win && !win.isDestroyed()) {
        win.setFullScreen(false);
      }
    }
  );

  // Close views safely
  win.on("closed", () => {
    if (
      toolbar &&
      !toolbar.webContents.isDestroyed()
    ) {
      toolbar.webContents.close();
    }

    if (
      browser &&
      !browser.webContents.isDestroyed()
    ) {
      browser.webContents.close();
    }

    win = null;
    toolbar = null;
    browser = null;
  });

  navigate(HOME);
}

// =====================================
// IPC SECURITY
// =====================================

function validSender(event) {
  return (
    toolbar &&
    !toolbar.webContents.isDestroyed() &&
    event.sender === toolbar.webContents
  );
}

// Navigation buttons
ipcMain.handle(
  "browser-action",
  (event, action) => {
    if (!validSender(event) || !browser) {
      return;
    }

    const wc = browser.webContents;

    if (wc.isDestroyed()) {
      return;
    }

    const history =
      wc.navigationHistory;

    switch (action) {
      case "back":
        if (history.canGoBack()) {
          history.goBack();
        }
        break;

      case "forward":
        if (history.canGoForward()) {
          history.goForward();
        }
        break;

      case "reload":
        wc.reload();
        break;

      case "home":
        navigate(HOME);
        break;
    }

    sendState();
  }
);

// Get ad-block state
ipcMain.handle(
  "get-adblock-state",
  event => {
    return validSender(event)
      ? adBlockEnabled
      : false;
  }
);

// Change ad-block state
ipcMain.handle(
  "set-adblock-state",
  (event, enabled) => {
    if (
      !validSender(event) ||
      typeof enabled !== "boolean"
    ) {
      return adBlockEnabled;
    }

    return setAdBlock(enabled);
  }
);

// =====================================
// START APPLICATION
// =====================================

app.whenReady().then(async () => {
  loadSettings();

  const ses =
    session.fromPartition(PARTITION);

  ses.setPermissionCheckHandler(
    (_wc, permission) => {
      return permission === "fullscreen";
    }
  );

  ses.setPermissionRequestHandler(
    (_wc, permission, callback) => {
      callback(
        permission === "fullscreen"
      );
    }
  );

  await setupAdBlocker();

  createWindow();
}).catch(error => {
  console.error(
    "Application startup failed:",
    error
  );

  app.quit();
});

app.on(
  "window-all-closed",
  () => {
    app.quit();
  }
);
