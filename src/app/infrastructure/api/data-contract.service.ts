import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Contract, IContract } from 'src/app/domain/models/contract-class';
import { retry } from 'rxjs';

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
    delete value.internal;
    return this.httpClient
      .post<IContract>(`${environment.baseUrl}Contracts/`, value)
      .pipe();
  }

  updateContract(value: Contract) {
    delete value.internal;
    return this.httpClient
      .put<IContract>(`${environment.baseUrl}Contracts/`, value)
      .pipe();
  }

  deleteContract(id: string) {
    return this.httpClient
      .delete<IContract>(`${environment.baseUrl}Contracts/` + id)
      .pipe(retry(3));
  }
}