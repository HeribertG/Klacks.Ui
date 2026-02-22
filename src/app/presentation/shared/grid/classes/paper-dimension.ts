// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export class PaperDimensions {
  private readonly INCHES_TO_MM = 25.4;
  private readonly NON_PRINTABLE_MARGIN_MM = 5; // assumed value

  getA3Dimensions(): { width: number; height: number } {
    return {
      width: 297,
      height: 420,
    };
  }

  getTabloidDimensions(): { width: number; height: number } {
    return {
      width: 11 * this.INCHES_TO_MM, // conversion to mm
      height: 17 * this.INCHES_TO_MM, // conversion to mm
    };
  }

  getDoubleDemyDimensions(): { width: number; height: number } {
    return {
      width: 22.5 * this.INCHES_TO_MM, // conversion to mm
      height: 17.5 * this.INCHES_TO_MM, // conversion to mm
    };
  }

  getNonPrintableWidth(paperWidth: number): number {
    return paperWidth - 2 * this.NON_PRINTABLE_MARGIN_MM;
  }
}

//   // Usage:
//   const paperService = new PaperDimensions();

//   const a3 = paperService.getA3Dimensions();
//   console.log(`A3 - Width: ${a3.width}mm, Height: ${a3.height}mm, Non-printable width: ${paperService.getNonPrintableWidth(a3.width)}mm`);

//   const tabloid = paperService.getTabloidDimensions();
//   console.log(`Tabloid - Width: ${tabloid.width}mm, Height: ${tabloid.height}mm, Non-printable width: ${paperService.getNonPrintableWidth(tabloid.width)}mm`);

//   const doubleDemy = paperService.getDoubleDemyDimensions();
//   console.log(`Double Demy - Width: ${doubleDemy.width}mm, Height: ${doubleDemy.height}mm, Non-printable width: ${paperService.getNonPrintableWidth(doubleDemy.width)}mm`);
