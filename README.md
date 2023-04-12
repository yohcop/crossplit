# crossplit

Chrome OS split/tiling window manager

## Issues and limitations

- Chrome OS doesn't currently (or anymore) offer an API for extensions to list
  ALL your windows. For example, Chrome App windows can't be listed and
  therefore can't be edited (and laid out). Same thing for Android and Linux
  apps.
- The new feature of virtual desks isn't compatible either. Listing windows for
  a given screen returns all the windows of all the desks, for that screen.
  As a result, this extension lays out all the window of a given screen
  together, as if they were all currently visible. This can give some
  surprising results (e.g. layout with holes, filled on another desk).

Both of these are as far as I know current limitations of the APIs, and I don't
know of any workarounds either. But if you do, let me know!

## Installation

The extension is not currently published in the Chrome app store.

- Download the zip file for the repo
- Unzip the directory
- Go to manage extensions page (chrome://extensions/)
- Click `Load unpacked`
- Find and select the `src` directory of the repo
- Set and Customize keyboard shortcuts in the extension manage page
  (top-left menu -> Keyboard shortcuts)

## Generating layout images

`node testing/gen-layout-pics.mjs > build/a.html`