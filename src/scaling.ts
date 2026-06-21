const MM_PER_INCH = 25.4;
/** CSS reference pixel: 96px spans one inch. The default for px conversions. */
const CSS_DPI = 96;

/**
 * The `<scaling>` mapping from `<defaults>`: `tenths` tenths span `millimeters`
 * millimeters. Tenths are otherwise dimensionless, so this is what ties a tenths
 * value (a `<measure>` width, a position, a font size) to a physical length.
 *
 * Tenths are the hub: `to*` converts tenths outward, `from*` converts back.
 */
export class Scaling {
  constructor(
    readonly millimeters: number,
    readonly tenths: number
  ) {}

  /**
   * Conventional engraving default (40 tenths = one 7mm staff height). MusicXML
   * leaves the no-`<scaling>` case implementation-defined; this is what
   * {@link Score.scaling} falls back to when `<scaling>` is absent.
   */
  static readonly default = new Scaling(7, 40);

  /** Millimeters per tenth — the conversion factor. */
  get mmPerTenth(): number {
    return this.millimeters / this.tenths;
  }

  /** Tenths → millimeters. */
  toMillimeters(tenths: number): number {
    return tenths * this.mmPerTenth;
  }

  /** Millimeters → tenths. */
  fromMillimeters(millimeters: number): number {
    return millimeters / this.mmPerTenth;
  }

  /** Tenths → pixels at `dpi` (default 96, the CSS reference pixel). */
  toPixels(tenths: number, dpi = CSS_DPI): number {
    return (this.toMillimeters(tenths) / MM_PER_INCH) * dpi;
  }

  /** Pixels → tenths at `dpi` (default 96, the CSS reference pixel). */
  fromPixels(pixels: number, dpi = CSS_DPI): number {
    return this.fromMillimeters((pixels / dpi) * MM_PER_INCH);
  }
}
