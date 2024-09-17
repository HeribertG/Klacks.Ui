export enum CursorEnum {
  alias = 'alias', //  This cursor position defined as the element that is an alias of an element to be created.
  allScroll = 'all-scroll', //  Whenever we want to show something can be scrolled in any direction then it’s helpful to use all-scroll cursor value.
  auto = 'auto', // By default, auto is used to set cursor value.
  cell = 'cell', // This is used to show a particular selected element is a cell.
  colResize = 'col-resize ', //  This cursor value is used to show the column is resized horizontally.
  copy = 'copy', //   This cursor type shows that something is to be copied.
  crosshair = 'crosshair',
  eResize = 'e-resize', //  This is used to show the edges of the box are going to move east means at right.
  nResize = 'n-resize',
  enResize = 'ne-resize',
  wResize = 'w-resize',
  sResize = 's-resize',
  seResize = 'se-resize',
  swResize = 'sw-resize',
  grab = 'grab', //  Whenever we want to show some grabbed data then we use this value to show the cursor.
  help = 'help', //  For a particular element, if some help is available then this cursor value is used.
  move = 'move',
  notAllowed = 'not-allowed', //  if something is not able to do any action then this type of cursor is used.
  progress = 'progress', // if there is something in progress or working, then it’s used as a progress cursor.
  default = 'default',
  wait = 'wait',
  pointer = 'pointer',
  text = 'text',
}
