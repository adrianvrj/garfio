/** The paper's copy: headlines written from a meme's numbers. Nothing here is invented, only phrased. */
import { fmt } from "./units";

/** The front page's banner word, shouted from how close the lead meme is to graduating. */
export function banner(progress: number) {
  if (progress >= 90) return "¡A un paso!";
  if (progress >= 50) return "¡Media curva!";
  return "¡Arranca la carrera!";
}

/** The lead story's headline, from how far the curve is from graduating. */
export function leadHeadline(symbol: string, progress: number) {
  if (progress >= 90) return `$${symbol}, a ${fmt(100 - progress, 1)}% de graduar`;
  if (progress >= 50) return `$${symbol} ya vendió más de la mitad de su curva`;
  return `$${symbol} encabeza la carrera a Soroswap`;
}

/** A story's headline: graduation first, then the day's move, then the curve. */
export function storyHeadline(symbol: string, o: { graduated: boolean; progress: number; change?: number }) {
  const s = `$${symbol}`;
  if (o.graduated) return `${s} se gradúa y pasa a Soroswap`;
  if (o.change !== undefined && o.change >= 100) return `${s} se dispara ${fmt(o.change, 0)}% en un día`;
  if (o.change !== undefined && o.change >= 1) return `${s} sube ${fmt(o.change, 1)}% en 24 horas`;
  if (o.change !== undefined && o.change <= -1) return `${s} cae ${fmt(-o.change, 1)}% en 24 horas`;
  if (o.progress >= 50) return `${s} pasa la mitad de su curva`;
  return `${s} sale a la venta`;
}

/** The ears' teasers: shorter, shoutier. */
export function earHeadline(symbol: string, o: { change?: number; graduated?: boolean; fresh?: boolean }) {
  const s = `$${symbol}`;
  if (o.graduated) return `${s} se gradúa`;
  if (o.fresh) return `Nace ${s}`;
  if (o.change !== undefined && o.change >= 0) return `${s} sube ${fmt(o.change, 0)}%`;
  if (o.change !== undefined) return `${s} cae ${fmt(-o.change, 0)}%`;
  return s;
}
