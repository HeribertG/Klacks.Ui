import { effect, inject, Injectable, signal } from '@angular/core';
import { IGroup, IGroupVisibility } from 'src/app/domain/models/group/group-class';
import { DataGroupVisibilityService } from 'src/app/infrastructure/api/group/data-group-visibility.service';
import { Observable, Subject, tap } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataManagementGroupVisibilityService {
  public dataGroupVisibilityService = inject(DataGroupVisibilityService);
  private destroy$ = new Subject<void>();

  public isRead = signal(false);
  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }
  public readonly rootList = signal<IGroup[]>([]);
  public readonly groupVisibilityList = signal<IGroupVisibility[]>([]);
  public readonly groupVisibilitiesUpdated = signal<boolean>(false);

  constructor() {
    effect(() => {
      this.dataGroupVisibilityService.getRoots().pipe(takeUntil(this.destroy$)).subscribe({
        next: (groups) => this.rootList.set(groups),
        error: (err) =>
          console.error('Error when loading the group roots: ', err),
      });
    });

    effect(() => {
      this.dataGroupVisibilityService.getGroupVisibilities().pipe(takeUntil(this.destroy$)).subscribe({
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

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
