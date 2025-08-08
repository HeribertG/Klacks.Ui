import { ElementRef } from '@angular/core';

export function measureTableHeight(
  myTable: ElementRef,
  defaultRowHeight = 45,
  minimumRowHeight = 41
): { lines: number; tooBigVariation: boolean } | undefined {
  const win = window.innerHeight;

  const table = myTable.nativeElement as HTMLTableElement;
  if (table) {
    const realTopCard = table.offsetTop;

    let rowsNumber = 0;
    if (table && table.rows) {
      rowsNumber = table.rows.length;
    }

    let averageHeight = defaultRowHeight;

    let smallestRow = 99;
    let biggestRow = 0;
    let rowsHeight = 0;

    if (rowsNumber > 1) {
      for (let i = 1; i < rowsNumber; i++) {
        const l = table.rows[i].clientHeight;
        if (l < smallestRow) {
          smallestRow = l;
        }
        if (l > biggestRow) {
          biggestRow = l;
        }

        rowsHeight += l;
      }

      averageHeight = Math.round(rowsHeight / rowsNumber);

      if (averageHeight < minimumRowHeight) {
        averageHeight = minimumRowHeight;
      }
    }
    const tooBigVar = biggestRow / smallestRow >= 2.5;
    const tableHeight = win - (realTopCard + 9 * 26);
    const addLine = Math.round(tableHeight / averageHeight);

    return { lines: addLine, tooBigVariation: tooBigVar };
  }
  return undefined;
}
