export class PaperDimensions {
  private readonly MM_TO_INCHES = 25.4;
  private readonly NON_PRINTABLE_MARGIN_MM = 5; // angenommener Wert

  getA3Dimensions(): { width: number; height: number } {
    return {
      width: 297,
      height: 420,
    };
  }

  getTabloidDimensions(): { width: number; height: number } {
    return {
      width: 11 * this.MM_TO_INCHES, // Umrechnung in mm
      height: 17 * this.MM_TO_INCHES, // Umrechnung in mm
    };
  }

  getDoubleDemyDimensions(): { width: number; height: number } {
    return {
      width: 22.5 * this.MM_TO_INCHES, // Umrechnung in mm
      height: 17.5 * this.MM_TO_INCHES, // Umrechnung in mm
    };
  }

  getNonPrintableWidth(paperWidth: number): number {
    return paperWidth - 2 * this.NON_PRINTABLE_MARGIN_MM;
  }
}

//   // Verwendung:
//   const paperService = new PaperDimensions();

//   const a3 = paperService.getA3Dimensions();
//   console.log(`A3 - Breite: ${a3.width}mm, Höhe: ${a3.height}mm, Nicht druckbare Breite: ${paperService.getNonPrintableWidth(a3.width)}mm`);

//   const tabloid = paperService.getTabloidDimensions();
//   console.log(`Tabloid - Breite: ${tabloid.width}mm, Höhe: ${tabloid.height}mm, Nicht druckbare Breite: ${paperService.getNonPrintableWidth(tabloid.width)}mm`);

//   const doubleDemy = paperService.getDoubleDemyDimensions();
//   console.log(`Double Demy - Breite: ${doubleDemy.width}mm, Höhe: ${doubleDemy.height}mm, Nicht druckbare Breite: ${paperService.getNonPrintableWidth(doubleDemy.width)}mm`);
