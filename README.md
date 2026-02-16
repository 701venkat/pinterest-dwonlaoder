# Pinterest Board & Screen Image Downloader Extension

Chrome extension to download Pinterest images with readable filenames.

## Features

- **Download images on screen**: downloads only images currently visible in your viewport.
- **Download whole board**: auto-scrolls on board pages and gathers many pins before downloading.
- Saves files using this format: `<board-name>/<image-name>.<extension>`.
- Uses image alt/title when available, then pin id / URL fallback for stable names.

## Install locally (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

## Usage

1. Open Pinterest and wait for pins to load.
2. Use floating action buttons:
   - **Download images on screen**
   - **Download whole board** (enabled only on board pages)
3. Watch the status text in the floating panel.

## Notes

- Pinterest is a single-page app; this extension keeps controls active when navigating between pages.
- If some images are not loaded yet, scroll a little and run again.
