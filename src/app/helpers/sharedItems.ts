export function visibleRow(): { text: string; value: number }[] {
  return [
    { text: 'auto', value: -1 },
    { text: '5', value: 5 },
    { text: '10', value: 10 },
    { text: '15', value: 15 },
    { text: '20', value: 20 },
  ];
}

export function visibleRowSimple(): { text: string; value: number }[] {
  return [
    { text: '5', value: 5 },
    { text: '10', value: 10 },
    { text: '15', value: 15 },
    { text: '20', value: 20 },
  ];
}

export type Language = 'de' | 'fr' | 'it' | 'en';
