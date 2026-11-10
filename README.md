# YouTube Lite

A lightweight desktop YouTube browser built with **Electron, HTML, CSS, and JavaScript**.

YouTube Lite provides a custom dark toolbar, navigation controls, Shorts filtering, and an optional basic ad-domain blocker.

> **Note:** This is an independent, unofficial project and is not affiliated with YouTube or Google. Ad blocking is limited: some ads, including in-video ads, may still appear. YouTube's interface and behavior can change.

## Features

- Desktop YouTube browsing in a dedicated window
- Dark custom toolbar
- Back, forward, refresh, and home buttons
- Hide Shorts links and sections (where supported by YouTube's current layout)
- Redirect `/shorts/VIDEO_ID` links to standard watch pages
- Ad Block ON/OFF switch with saved preference
- Full-screen video support
- Persistent browsing session
- Windows installer using electron-builder

## Requirements

- Windows 10 or 11 (64-bit) for the provided build command
- Node.js and npm
- Internet connection for YouTube and initial dependency installation

## Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/youtube-lite.git
   cd youtube-lite
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the app:

   ```bash
   npm start
   ```

If you downloaded the source as a ZIP, extract it, open a terminal in the extracted folder, and run `npm install` followed by `npm start`.

## Build the Windows installer

```bash
npm run dist
```

When the build succeeds, find the installer in the `dist/` folder (for example, `YouTube Lite Setup 1.0.0.exe`). You can share this installer in a GitHub Release.

## Project structure

```text
youtube-lite/
├── main.js          # Electron window, navigation, filtering, and IPC
├── preload.js       # Secure bridge between toolbar and Electron
├── index.html       # Toolbar markup
├── style.css        # Toolbar styling
├── renderer.js      # Toolbar controls
├── package.json     # Scripts and dependencies
├── package-lock.json
├── .gitignore
└── README.md
```

## Ad blocker notes

The working basic blocker filters selected advertising domains; it does **not** guarantee ad-free YouTube videos. Turning Ad Block OFF allows requests through the app's blocker but does not force YouTube to show ads. If you use a different version of `main.js`, behavior may vary.

## Troubleshooting

- **Blank video player:** Try switching Ad Block OFF and reloading. Some filtering methods interfere with playback.
- **Electron installation problem:** Retry `npm install` with a working internet connection.
- **Windows warning for installer:** An unsigned installer may trigger Windows SmartScreen. Only install software from sources you trust.

## Contributing

Issues and pull requests are welcome. Please describe the problem and include steps to reproduce it.

## License

No license is included yet. Add a `LICENSE` file (for example, MIT) if you want to give others permission to reuse, modify, and redistribute your code.
