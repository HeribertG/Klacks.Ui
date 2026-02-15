export enum BorderLineStyle {
  None = 0,
  Thin = 1,
  Medium = 2,
  Thick = 3,
  Dashed = 4,
  Double = 5
}

export interface BorderSideStyle {
  lineStyle: BorderLineStyle;
  color: string;
}

export interface CellBorderStyle {
  top: BorderSideStyle;
  right: BorderSideStyle;
  bottom: BorderSideStyle;
  left: BorderSideStyle;
}

export const DEFAULT_BORDER_SIDE: BorderSideStyle = {
  lineStyle: BorderLineStyle.None,
  color: '#000000',
};

export const BORDER_LINE_WIDTHS: Record<BorderLineStyle, number> = {
  [BorderLineStyle.None]: 0,
  [BorderLineStyle.Thin]: 0.1,
  [BorderLineStyle.Medium]: 0.3,
  [BorderLineStyle.Thick]: 0.7,
  [BorderLineStyle.Dashed]: 0.2,
  [BorderLineStyle.Double]: 0.3,
};
