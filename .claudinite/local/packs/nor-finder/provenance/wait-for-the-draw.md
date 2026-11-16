## 2026-11-16 · born · a test waits for the surface's own draw, not a count of frames
- **Source:** the owner, after #969: "add some of those lessons to the project's local pack on how
  to do things".
- **Reason:** moving the 3D view from every-frame to on-demand drawing broke tests that read its
  canvas after two frames; `viewDrawn()` replaced them.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** prose: a regex cannot tell a frame wait before a canvas read from one before a DOM
  read, so the frame-wait-in-one-file check stops at confining the waits.
- **Retire when:** every drawing surface offers a draw wait and frames() is gone from the drivers,
  or a check can pair a frame wait with a canvas read.
