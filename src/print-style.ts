import type { MElement } from './m-node';

/**
 * The MusicXML `color` of `element`, normalized to a CSS color. MusicXML writes
 * `"#RRGGBB"` or `"#AARRGGBB"` — alpha FIRST, which CSS and canvas read as
 * `#RRGGBBAA` — so the eight-digit form drops its alpha rather than handing a
 * renderer the wrong color. Null when unset, or when `element` is null (so a
 * caller can pass an optional child straight in).
 */
export function colorOf(element: MElement | null | undefined): string | null {
  const color = element?.getAttribute('color');
  if (color == null) {
    return null;
  }
  return /^#[0-9a-fA-F]{8}$/.test(color) ? `#${color.slice(3)}` : color;
}

/**
 * The MusicXML `placement` of `element`: above or below the staff. Null when
 * unstated — the default is the renderer's choice, so mdom doesn't pick one.
 */
export function placementOf(element: MElement | null | undefined): 'above' | 'below' | null {
  const placement = element?.getAttribute('placement');
  return placement === 'above' || placement === 'below' ? placement : null;
}
