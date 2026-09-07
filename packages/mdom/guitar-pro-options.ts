/** Choices shared by Guitar Pro import and export. */
export interface GuitarProOptions {
  /** Reject unsupported musical features by default, or explicitly omit them. Layout is always regenerated. */
  unsupported?: 'error' | 'omit';
}
