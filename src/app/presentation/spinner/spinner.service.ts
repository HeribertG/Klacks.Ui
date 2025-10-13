import { Injectable } from '@angular/core';
import { ILoadingIndicator } from 'src/app/domain/interfaces/loading-indicator.interface';

@Injectable({
  providedIn: 'root',
})
export class SpinnerService implements ILoadingIndicator {
  private _showProgressSpinner = false;

  get showProgressSpinner(): boolean {
    return this._showProgressSpinner;
  }

  set showProgressSpinner(value: boolean) {
    this._showProgressSpinner = value;
  }
}
