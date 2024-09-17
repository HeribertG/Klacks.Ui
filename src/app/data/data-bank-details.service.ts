import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { IBankDetail } from '../core/bank-detail-class';

@Injectable({
  providedIn: 'root',
})
export class DataBankDetailsService {
  constructor(private httpClient: HttpClient) {}

  readBankDetailList() {
    return this.httpClient
      .get<IBankDetail[]>(`${environment.baseUrl}Settings/BankDetails/`)
      .pipe(retry(3));
  }

  getBankDetail(id: string) {
    return this.httpClient
      .get<IBankDetail>(`${environment.baseUrl}Settings/BankDetails/` + id)
      .pipe(retry(3));
  }

  updateBankDetail(value: IBankDetail) {
    return this.httpClient
      .put<IBankDetail>(`${environment.baseUrl}Settings/BankDetails/`, value)
      .pipe(retry(3));
  }

  addBankDetail(value: IBankDetail) {
    delete value.id;
    return this.httpClient
      .post<IBankDetail>(`${environment.baseUrl}Settings/BankDetails/`, value)
      .pipe(retry(3));
  }

  deleteBankDetail(id: string) {
    return this.httpClient
      .delete<IBankDetail>(`${environment.baseUrl}Settings/BankDetails/` + id)
      .pipe(retry(3));
  }
}
