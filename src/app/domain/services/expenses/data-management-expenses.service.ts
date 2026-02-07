import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DataExpensesService } from 'src/app/infrastructure/api/expenses/data-expenses.service';
import {
  ExpensesRequest,
  ExpensesResource,
} from 'src/app/domain/models/expenses';

@Injectable({
  providedIn: 'root',
})
export class DataManagementExpensesService {
  private dataExpensesService = inject(DataExpensesService);

  public isCreating = signal(false);
  public lastCreated = signal<ExpensesResource | undefined>(undefined);

  create(request: ExpensesRequest): Observable<ExpensesResource> {
    this.isCreating.set(true);
    return new Observable(observer => {
      this.dataExpensesService.create(request).subscribe({
        next: (result) => {
          this.lastCreated.set(result);
          this.isCreating.set(false);
          observer.next(result);
          observer.complete();
        },
        error: (err) => {
          this.isCreating.set(false);
          observer.error(err);
        }
      });
    });
  }

  get(id: string): Observable<ExpensesResource> {
    return this.dataExpensesService.get(id);
  }

  update(resource: ExpensesResource): Observable<ExpensesResource> {
    return new Observable(observer => {
      this.dataExpensesService.update(resource).subscribe({
        next: (result) => {
          observer.next(result);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  delete(id: string): Observable<ExpensesResource> {
    return this.dataExpensesService.delete(id);
  }
}
