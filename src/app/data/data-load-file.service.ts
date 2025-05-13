import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import * as FileSaver from 'file-saver';
import { CalendarRulesFilter } from '../core/calendar-rule-class';

@Injectable({
  providedIn: 'root',
})
export class DataLoadFileService {
  profileImage: any;
  iconImage: any;
  logoImage: any;

  private httpClient = inject(HttpClient);

  upLoadFile(file: FormData) {
    return this.httpClient
      .post(`${environment.baseUrl}LoadFile/Upload/`, file)
      .pipe();
  }

  downLoadFile(type: string) {
    return this.httpClient
      .get(`${environment.baseUrl}LoadFile/DownLoad?type=` + type, {
        responseType: 'blob',
      })
      .pipe(retry(3))
      .subscribe(
        (data) => {
          this.createImageFromBlob(data);
        },
        (error) => {
          console.log(error);
        }
      );
  }

  downLoadIcon() {
    return this.httpClient
      .get(`${environment.baseUrl}LoadFile/DownLoad?type=` + 'own-icon.ico', {
        responseType: 'blob',
      })
      .pipe(retry(3))
      .subscribe(
        (data) => {
          this.createIconFromBlob(data);
        },
        (error) => {
          console.log(error);
        }
      );
  }

  downLoadLogo() {
    return this.httpClient
      .get(`${environment.baseUrl}LoadFile/DownLoad?type=` + 'own-logo.png', {
        responseType: 'blob',
      })
      .pipe(retry(3))
      .subscribe(
        (data) => {
          this.createLogoFromBlob(data);
        },
        (error) => {
          console.log(error);
        }
      );
  }

  deleteIcon() {
    return this.httpClient
      .delete(`${environment.baseUrl}LoadFile/` + 'own-icon.ico')
      .pipe()
      .subscribe((x) => {
        this.profileImage = undefined;
      });
  }

  deleteLogo() {
    return this.httpClient
      .delete(`${environment.baseUrl}LoadFile/` + 'own-logo.png')
      .pipe()
      .subscribe((x) => {
        this.profileImage = undefined;
      });
  }

  deleteFile(type: string) {
    return this.httpClient
      .delete(`${environment.baseUrl}LoadFile/` + type)
      .pipe()
      .subscribe((x) => {
        this.profileImage = undefined;
      });
  }

  downloadAbsenceExcel(language: string) {
    return this.httpClient
      .get(
        `${environment.baseUrl}Absences/CreateExcelFile?language=` + language,
        {
          responseType: 'blob',
        }
      )
      .pipe()
      .subscribe((response) => FileSaver.saveAs(response, 'Absence.xlsx'));
  }

  downloadCalendarRulesExcel(filter: CalendarRulesFilter) {
    return this.httpClient
      .post(
        `${environment.baseUrl}Settings/CalendarRule/CreateExcelFile/`,
        filter,
        {
          responseType: 'blob',
        }
      )
      .pipe()
      .subscribe((response) =>
        FileSaver.saveAs(response, 'Feiertagsregeln.xlsx')
      );
  }

  private createImageFromBlob(image: Blob) {
    if (image.type === 'text/plain') {
      this.profileImage = undefined;
      return;
    }
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        this.profileImage = reader.result;
      },
      false
    );

    if (image) {
      reader.readAsDataURL(image);
    }
  }

  private createIconFromBlob(image: Blob) {
    if (image.type === 'text/plain') {
      this.iconImage = undefined;
      return;
    }
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        this.iconImage = reader.result;

        const favicon = document.getElementById('appIcon') as HTMLLinkElement;
        favicon.href = reader.result!.toString();
      },
      false
    );

    if (image) {
      reader.readAsDataURL(image);
    }
  }

  private createLogoFromBlob(image: Blob) {
    if (image.type === 'text/plain') {
      this.logoImage = undefined;
      return;
    }
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        this.logoImage = reader.result;
      },
      false
    );

    if (image) {
      reader.readAsDataURL(image);
    }
  }
}
