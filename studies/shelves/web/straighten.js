// A book's four corners cut out of the photo as an upright picture, in the page: the same straightening as the
// finder's own (books.straighten), on the photo's pixels as the shell decoded them.

// the homography taking four points onto four others, as a 3×3 matrix by rows
export function homography(from, to) {
  const A = [];
  from.forEach(([x, y], i) => {
    const [u, v] = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let c = 0; c < 8; c++) {
    let r = c;
    for (let k = c + 1; k < 8; k++) if (Math.abs(A[k][c]) > Math.abs(A[r][c])) r = k;
    [A[c], A[r]] = [A[r], A[c]];
    for (let k = 0; k < 8; k++) if (k !== c) { const f = A[k][c] / A[c][c]; for (let j = c; j < 9; j++) A[k][j] -= f * A[c][j]; }
  }
  return [...A.map((row, i) => row[8] / A[i][i]), 1];
}

// image: {W, H, planes}, its channels' 8-bit pixels one plane after another (one plane for a grey photo, its red,
// green and blue for a colour one). The crop is RGBA, as wide as the box's top and bottom edges and as tall as its
// sides, on average, the first corner at its top left; each crop pixel's centre is sampled bilinearly where it falls
// in the photo, clamped at the photo's edge, and black where it falls off it.
export function straighten({ W, H, planes }, corners) {
  const side = (a, b) => Math.hypot(corners[a][0] - corners[b][0], corners[a][1] - corners[b][1]);
  const w = Math.max(1, Math.round((side(0, 1) + side(3, 2)) / 2)), h = Math.max(1, Math.round((side(0, 3) + side(1, 2)) / 2));
  const n = W * H, C = Math.floor(planes.length / n), chans = [0, 1, 2].map((k) => planes.subarray(Math.min(k, C - 1) * n, (Math.min(k, C - 1) + 1) * n));
  const M = homography([[0, 0], [w, 0], [w, h], [0, h]], corners), out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X0 = x + 0.5, Y0 = y + 0.5, d = M[6] * X0 + M[7] * Y0 + M[8], o = (y * w + x) * 4;
    const X = (M[0] * X0 + M[1] * Y0 + M[2]) / d - 0.5, Y = (M[3] * X0 + M[4] * Y0 + M[5]) / d - 0.5;
    out[o + 3] = 255;
    if (X < -0.5 || X > W - 0.5 || Y < -0.5 || Y > H - 0.5) continue;
    const cx = Math.min(Math.max(X, 0), W - 1), cy = Math.min(Math.max(Y, 0), H - 1);
    const x0 = Math.floor(cx), y0 = Math.floor(cy), x1 = Math.min(x0 + 1, W - 1), y1 = Math.min(y0 + 1, H - 1), fx = cx - x0, fy = cy - y0;
    for (let k = 0; k < 3; k++) {
      const p = chans[k], top = p[y0 * W + x0] * (1 - fx) + p[y0 * W + x1] * fx, bottom = p[y1 * W + x0] * (1 - fx) + p[y1 * W + x1] * fx;
      out[o + k] = Math.round(top * (1 - fy) + bottom * fy);
    }
  }
  return { width: w, height: h, data: out };
}
