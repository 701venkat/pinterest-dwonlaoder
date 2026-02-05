# Pinterest Board & Screen Image Downloader Extension

This Chrome extension adds a floating button on Pinterest pages so you can:

- Download all currently visible Pinterest images on the screen.
- Use board-aware folders for downloads.
- Save files with readable image names (from pin alt/title when available).

## Install locally (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

## Usage

1. Open any Pinterest board or feed page.
2. Scroll until the images you want are visible.
3. Click **Download images on screen**.
4. Downloads will start automatically in a folder named after the board.

## Naming format

Downloaded files use this format:

`<board-name>/<image-name>.<extension>`

Examples:

- `recipe-ideas/chocolate-cake.jpg`
- `travel-2026/pin-123456789.webp`

If Pinterest does not provide a title/alt text, the extension falls back to a pin-based name.
