import { FACES, rng } from "@/lib/avatar";

/** Generated token image: gradient field, a few shapes and a face, all from the seed. */
export function TokenArt({ seed, size = 64, rounded = 8 }: { seed: string; size?: number; rounded?: number }) {
  const r = rng(seed);
  const h1 = Math.floor(r() * 360);
  const h2 = (h1 + 60 + Math.floor(r() * 120)) % 360;
  const face = FACES[Math.floor(r() * FACES.length)];
  const blobs = Array.from({ length: 3 }, () => ({
    cx: 10 + r() * 80,
    cy: 10 + r() * 80,
    rad: 14 + r() * 26,
    hue: Math.floor(r() * 360),
  }));
  const id = `g${Math.floor(r() * 1e9)}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-hidden="true"
      style={{ borderRadius: rounded, flex: "none", display: "block" }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`oklch(0.72 0.16 ${h1})`} />
          <stop offset="1" stopColor={`oklch(0.5 0.17 ${h2})`} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {blobs.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.rad} fill={`oklch(0.85 0.12 ${b.hue} / 0.35)`} />
      ))}
      <text x="50" y="54" textAnchor="middle" dominantBaseline="middle" fontSize="46">
        {face}
      </text>
    </svg>
  );
}

/** Wallet avatar: the user's uploaded picture when there is one, else a generated pattern. */
export function UserAvatar({ address, image, size = 24 }: { address: string; image?: string | null; size?: number }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" width={size} height={size} style={{ borderRadius: "50%", objectFit: "cover", flex: "none" }} />;
  }
  const r = rng(address);
  const hue = Math.floor(r() * 360);
  const cells = Array.from({ length: 15 }, () => r() > 0.5);
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" aria-hidden="true" style={{ borderRadius: "50%", flex: "none", display: "block" }}>
      <rect width="5" height="5" fill={`oklch(0.3 0.06 ${hue})`} />
      {cells.map((on, i) => {
        if (!on) return null;
        const x = i % 3;
        const y = Math.floor(i / 3);
        const fill = `oklch(0.78 0.15 ${hue})`;
        return (
          <g key={i}>
            <rect x={x} y={y} width="1" height="1" fill={fill} />
            {x < 2 && <rect x={4 - x} y={y} width="1" height="1" fill={fill} />}
          </g>
        );
      })}
    </svg>
  );
}
