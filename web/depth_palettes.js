// The palettes a channel coloured by depth is painted in, from its first slice shown to its last: eight stops each, which
// the 3D view's shader blends between. No page here: a study checks its own marks' colours against them.

export const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
// the Turbo palette's colours, a depth (0..1) to [r, g, b] of 0 to 1
function turbo(x) {
  x = 0.12 + 0.8 * Math.min(Math.max(x, 0), 1);
  const p = (k, k2) => k[0] + k[1] * x + k[2] * x * x + k[3] * x ** 3 + k2[0] * x ** 4 + k2[1] * x ** 5;
  return [p([0.13572138, 4.6153926, -42.66032258, 132.13108234], [-152.94239396, 59.28637943]),
    p([0.09140261, 2.19418839, 4.84296658, -14.18503333], [4.27729857, 2.82956604]),
    p([0.1066733, 12.64194608, -60.58204836, 110.36276771], [-89.90310912, 27.34824973])].map((v) => Math.min(Math.max(v, 0), 1));
}

const hexes = (...h) => h.map((x) => rgb("#" + x));
export const PALETTES = {
  turbo: { name: "Turbo", stops: Array.from({ length: 8 }, (_, i) => turbo(i / 7)) },
  viridis: { name: "Viridis", stops: hexes("440154", "46327e", "365c8d", "277f8e", "1fa187", "4ac16d", "a0da39", "fde725") },
  plasma: { name: "Plasma", stops: hexes("0d0887", "5302a3", "8b0aa5", "b83289", "db5c68", "f48849", "febd2a", "f0f921") },
  cool: { name: "Cool", stops: Array.from({ length: 8 }, (_, i) => [i / 7, 1 - i / 7, 1]) },
};
// a palette's colour at x, 0..1 through the slices shown, [r, g, b] of 0 to 1, as the shader blends it
export function paletteAt(key, x) {
  const st = PALETTES[key].stops, t = Math.min(Math.max(x, 0), 1) * 7, i = Math.min(Math.floor(t), 6), f = t - i;
  return st[i].map((v, c) => v + (st[i + 1][c] - v) * f);
}
