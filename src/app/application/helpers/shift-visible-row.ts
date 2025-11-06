export function visibleShiftRow(
  includeAuto = true
): { text: string; value: number }[] {
  const rows = [
    { text: '3', value: 3 },
    { text: '5', value: 5 },
    { text: '10', value: 10 },
    { text: '15', value: 15 },
    { text: '20', value: 20 },
  ];

  return includeAuto ? [{ text: 'auto', value: -1 }, ...rows] : rows;
}
