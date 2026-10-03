"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

/** Same seed → same photo for everyone (picsum seeded, grayscale). Nothing stored. */
const photo = (seed: string, px: number) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${px}/${px}?grayscale`;

function Photo({ seed, size, radius }: { seed: string; size: number; radius: number | string }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, borderRadius: radius, flex: "none", display: "block", objectFit: "cover" as const };
  if (failed) return <span aria-hidden="true" style={{ ...style, background: "var(--panel)", border: "1px solid var(--line)" }} />;
  return (
    <img
      src={photo(seed, Math.min(400, Math.round(size * 2)))}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ ...style, background: "var(--panel)" }}
    />
  );
}

/** Token image: a deterministic photo from the token's seed. */
export function TokenArt({ seed, size = 64, rounded = 0 }: { seed: string; size?: number; rounded?: number }) {
  return <Photo seed={`coin:${seed}`} size={size} radius={rounded} />;
}

/** Wallet avatar: the user's uploaded picture when there is one, else a deterministic photo. */
export function UserAvatar({ address, image, size = 24 }: { address: string; image?: string | null; size?: number }) {
  if (image) {
    return <img src={image} alt="" width={size} height={size} style={{ borderRadius: "50%", objectFit: "cover", flex: "none" }} />;
  }
  return <Photo seed={`user:${address}`} size={size} radius="50%" />;
}
