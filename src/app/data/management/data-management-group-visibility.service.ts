import { effect, inject, Injectable, signal } from '@angular/core';
import { IGroup, IGroupVisibility } from 'src/app/core/group-class';
import { DataGroupVisibilityService } from '../data-group-visibility.service';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataManagementGroupVisibilityService {
  public dataGroupVisibilityService = inject(DataGroupVisibilityService);

  public isRead = signal(false);
  public showProgressSpinner = signal(false);
  public readonly rootList = signal<IGroup[]>([]);
  public readonly groupVisibilityList = signal<IGroupVisibility[]>([]);
  public readonly groupVisibilitiesUpdated = signal<boolean>(false);

  constructor() {
    effect(() => {
      this.dataGroupVisibilityService.getRoots().subscribe({
        next: (groups) => this.rootList.set(groups),
        error: (err) =>
          console.error('Error when loading the group roots: ', err),
      });
    });

    effect(() => {
      this.dataGroupVisibilityService.getGroupVisibilities().subscribe({
        next: (groupVisibilities) =>
          this.groupVisibilityList.set(groupVisibilities),
        error: (err) =>
          console.error('Error when loading the group visibilities: ', err),
      });
    });
  }

  /* #region   edit GroupVisibility */

  saveGroupVisibilities(value: IGroupVisibility[]): Observable<void> {
    this.groupVisibilitiesUpdated.set(false);
    return this.dataGroupVisibilityService.setGroupVisibilities(value).pipe(
      tap(() => {
        this.groupVisibilitiesUpdated.set(true);
      })
    );
  }

  /* #rendegion   edit GroupVisibility */
}
