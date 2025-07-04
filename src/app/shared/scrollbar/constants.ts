export const SCROLLBAR_CONSTANTS = {
  MAX_FRAME_MODULO: 10,
  FIRST_STEP_BAR: 3,
  FIRST_STEP_BUTTON: 1,
  TICKS_OUTSIDE_RANGE: 5,

  MARGINS: {
    SCROLL: 16, // Die Gesamtbreite der Scrollbar
    THUMB: 3, // Der Randabstand des Thumbs
    MINIMUM_LENGTH: 14,
  },
} as const;
