"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useMemeArt } from "@/lib/art";

const person = (seed: string, px: number) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${px}/${px}?grayscale`;

/** `size` fixes a square; `wide` fills the column, still square. */
function Photo({ src, size, radius, wide }: { src: (w: number, h: number) => string; size: number; radius: number | string; wide?: boolean }) {
  const [failed, setFailed] = useState(false);
  const box = wide
    ? { width: "100%", height: "auto", aspectRatio: "1 / 1", borderRadius: radius }
    : { width: size, height: size, borderRadius: radius };
  const style = { ...box, flex: "none", display: "block", objectFit: "cover" as const, background: "var(--panel)" };
  if (failed) return <span aria-hidden="true" style={style} />;
  const [w, h] = wide ? [600, 400] : [Math.min(400, Math.round(size * 2)), Math.min(400, Math.round(size * 2))];
  return (
    <img
      src={src(w, h)}
      alt=""
      width={wide ? w : size}
      height={wide ? h : size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={style}
    />
  );
}

/**
 * Token image: a photo about the meme's name ($TACO → tacos), until creators can upload their own.
 * With no photo to be found, the paper runs the ticker in a red box instead.
 */
export function TokenArt({ seed, size = 64, rounded = 0, wide }: { seed: string; size?: number; rounded?: number; wide?: boolean }) {
  const cut = seed.indexOf(":");
  const [symbol, name] = cut < 0 ? [seed, seed] : [seed.slice(0, cut), seed.slice(cut + 1)];
  const src = useMemeArt(symbol, name);
  const box = wide ? { width: "100%", aspectRatio: "1 / 1" } : { width: size, height: size };
  if (src === undefined) return <span aria-hidden="true" className="art-blank" style={{ ...box, borderRadius: rounded }} />;
  if (src === null) {
    return (
      <span aria-hidden="true" className="art-none" style={{ ...box, borderRadius: rounded }}>
        {/* Sized to the box: Anton's caps run about half an em wide. */}
        {wide || size >= 40
          ? <span style={{ fontSize: `min(40cqh, ${Math.round((wide ? 110 : 140) / (symbol.length + 1))}cqw)` }}>${symbol}</span>
          : <span style={{ fontSize: "70cqh" }}>{symbol.charAt(0)}</span>}
      </span>
    );
  }
  return <Photo key={src} src={() => src} size={size} radius={rounded} wide={wide} />;
}

/** Wallet avatar: the user's uploaded picture when there is one, else a deterministic photo. */
export function UserAvatar({ address, image, size = 24 }: { address: string; image?: string | null; size?: number }) {
  if (image) {
    return <img src={image} alt="" width={size} height={size} style={{ borderRadius: "50%", objectFit: "cover", flex: "none" }} />;
  }
  return <Photo src={(w) => person(`user:${address}`, w)} size={size} radius="50%" />;
}
