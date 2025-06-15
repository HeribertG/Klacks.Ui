export enum ImageAlignmentEnum {
  LeftTop,
  LeftCenter,
  LeftBottom,
  CenterTop,
  CenterCenter,
  CenterBottom,
  RightTop,
  RightCenter,
  RightBottom,
  LeftFirstTextLine,
  RightFirstTextLine
}

export enum ImagePlaceEnum {
  Fit,
  OverText,
  UnderText
}

export enum TextAlignmentEnum { Left, Right, Center, Justify }

export enum BaselineAlignmentEnum { Top, Bottom, Center }

export enum CellTypeEnum { Empty, Standard }

export enum EmptyCellBackgroundEnum { default, Saturday, Sunday, Holiday, Invalid }

export enum MenuIDEnum {

  emCut = -1,

  emCopy = -2,

  emPaste = -3,

  emDelete = -4,

  emUndo = -5,

  emRedo = -6,

  emTransformPlaceholder = -100,

  emConvertTo = 101,

  emDeletePlaceholder = -102,

  emRelief = -400,

  emSplit = -450,

  emUnion = -451,

  emSplitCapsule = -460,

  emUnionCapsule = -461,

  emCorrection = -500,

  emShowAllEntries = -555,

  emExpenses = -600,

  emConfirm = -700,

  emConfirmAll = -701,

  emReferenceToShiftGrid = -755,

  emUnConfirm = -777,

  emUnConfirmAll = -778,

  emAnnulledShift = -800,

  emAnnulledShiftPaid = -801,

  emAnnulledShiftAll = -802,

  emAnnulledShiftPaidAll = -803,

  emMonthlyAnnulled = -804,

  emUnAnnulledShift = -880,

  emUnAnnulledShiftAll = -881,

  emEXPERIENCE_SERVICE = -900,

  emEXPERIENCE_OBJECT = -901,

  emEXPERIENCE_CLIENT = -902,

  emEXPERIENCE_ORDER = -903,

  emDeleteCapsule_as_Daily_Template = -1000,

  emSaveCapsule_as_Daily_Template = -1001,

  emShowAllEmptyPerson = -2000,

  emMonthlyUnscheduling = -3000,
}

