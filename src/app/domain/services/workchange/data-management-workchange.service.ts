import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DataWorkChangeService } from 'src/app/infrastructure/api/workchange/data-work-change.service';
import {
  WorkChangeRequest,
  WorkChangeResource,
} from 'src/app/domain/models/workchange/work-change';

@Injectable({
  providedIn: 'root',
})
export class DataManagementWorkchangeService {
  private dataWorkChangeService = inject(DataWorkChangeService);

  public isCreating = signal(false);
  public lastCreated = signal<WorkChangeResource | undefined>(undefined);

  create(request: WorkChangeRequest): Observable<WorkChangeResource> {
    this.isCreating.set(true);
    return new Observable(observer => {
      this.dataWorkChangeService.create(request).subscribe({
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

  get(id: string): Observable<WorkChangeResource> {
    return this.dataWorkChangeService.get(id);
  }

  update(resource: WorkChangeResource): Observable<WorkChangeResource> {
    return new Observable(observer => {
      this.dataWorkChangeService.update(resource).subscribe({
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

  delete(id: string): Observable<WorkChangeResource> {
    return this.dataWorkChangeService.delete(id);
  }
}
