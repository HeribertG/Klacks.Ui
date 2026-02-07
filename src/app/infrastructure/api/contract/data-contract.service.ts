import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Contract, IContract } from 'src/app/domain/models/contract/contract-class';
import { retry } from 'rxjs';
import { dateWithLocalTimeCorrection } from 'src/app/shared/helpers/date.helper';

@Injectable({
  providedIn: 'root',
})
export class DataContractService {
  private httpClient = inject(HttpClient);

  getList() {
    return this.httpClient
      .get<IContract[]>(`${environment.baseUrl}Contracts/`)
      .pipe(retry(3));
  }

  getContract(id: string) {
    return this.httpClient
      .get<IContract>(`${environment.baseUrl}Contracts/` + id)
      .pipe(retry(3));
  }

  addContract(value: Contract) {
    this.correctDates(value);
    delete value.id;
    this.prepareForApi(value);
    return this.httpClient
      .post<IContract>(`${environment.baseUrl}Contracts/`, value)
      .pipe();
  }

  updateContract(value: Contract) {
    this.correctDates(value);
    this.prepareForApi(value);
    return this.httpClient
      .put<IContract>(`${environment.baseUrl}Contracts/`, value)
      .pipe();
  }

  deleteContract(id: string) {
    return this.httpClient
      .delete<IContract>(`${environment.baseUrl}Contracts/` + id)
      .pipe(retry(3));
  }

  private correctDates(value: IContract) {
    if (!value) return;

    if (value.validFrom) {
      value.validFrom = dateWithLocalTimeCorrection(new Date(value.validFrom)) as Date;
    }

    if (value.validUntil) {
      value.validUntil = dateWithLocalTimeCorrection(new Date(value.validUntil));
    } else {
      value.validUntil = undefined;
    }
  }

  private prepareForApi(value: IContract) {
    if (value.calendarSelection) {
      value.calendarSelectionId = value.calendarSelection.id;
      delete value.calendarSelection;
    }
  }
}
