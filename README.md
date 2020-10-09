# crossplit

Chrome OS split/tiling window manager

# Issues and limitations

- Chrome OS doesn't currently have a way to see ALL your windows. App windows
  can't be edited (laid out). Same thig for Android and Linux apps.
- The new feature of desks isn't compatible either. Listing windows for a
  given screen returns all the windows of all the desks, for that given screen.
  As a result, this extension lays out all the window of a given screen
  together, as if they were all visible. This can give some surprising results
  (e.g. layout with holes).

Both of these are as far as I know current limitations of the APIs, and I don't
know of any workarounds either. But if you do, let me know!
