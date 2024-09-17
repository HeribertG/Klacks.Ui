export enum WeekDaysEnum {
  Workday = 0,
  Saturday = 1,
  Sunday = 2,
  Holiday = 3,
  OfficiallyHoliday = 4,
}

export enum EditableModeEnum {
  ///  <summary>
  /// No edit support
  /// </summary>
  None = 0,

  ///  <summary>
  /// Edit the cell with F2 key
  /// </summary>
  F2Key = 1,

  ///  <summary>
  /// Edit the cell with a double click
  /// </summary>
  DoubleClick = 2,

  ///  <summary>
  /// Edit a cell with a single Key
  /// </summary>
  SingleClick = 4,

  ///  <summary>
  /// Edit the cell pressing any keys
  /// </summary>
  AnyKey = 9,

  ///  <summary>
  /// Edit the cell when it receive the focus
  /// </summary>
  Focus = 16,

  ///  <summary>
  /// DoubleClick + F2Key
  /// </summary>
  Default = DoubleClick | F2Key | AnyKey,
}

export enum GridSelectionModeEnum {
  Cell = 1,
  Row = 2,
  CellCtrl = 3,
}

export enum PositionStateEnum {
  None = 0,
  IsCtrl,
  IsShift,
}

export enum SelectedCellTypeEnum {
  enCell,
  enLine,
}

export enum ClipboardModeEnum {
  None,
  Copy,
  Cut,
  Paste,
  Delete,
  All,
}
