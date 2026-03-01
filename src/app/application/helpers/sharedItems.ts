// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export function visibleRow(
  includeAuto = true
): { text: string; value: number }[] {
  const rows = [
    { text: '5', value: 5 },
    { text: '10', value: 10 },
    { text: '15', value: 15 },
    { text: '20', value: 20 },
  ];

  return includeAuto ? [{ text: 'pagination.auto', value: -1 }, ...rows] : rows;
}

export type Language = 'de' | 'fr' | 'it' | 'en';
