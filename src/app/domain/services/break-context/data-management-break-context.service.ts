import { inject, Injectable, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { BreakContext, IBreakContext } from 'src/app/domain/models/break-context-class';
import { DataBreakContextService } from 'src/app/infrastructure/api/data-break-context.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementBreakContextService {
  private dataBreakContextService = inject(DataBreakContextService);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  public isRead = signal(false);
  public breakContexts = signal<IBreakContext[]>([]);

  private static readonly READ_RESET_DELAY = 100;

  private fireIsReadEvent(): void {
    this.isRead.set(true);
    setTimeout(() => this.isRead.set(false), DataManagementBreakContextService.READ_RESET_DELAY);
  }

  async readBreakContexts(): Promise<IBreakContext[]> {
    this._showProgressSpinner.set(true);

    try {
      const result = await lastValueFrom(this.dataBreakContextService.readBreakContextList());
      this.breakContexts.set(result || []);
      this.fireIsReadEvent();
      return this.breakContexts();
    } catch (error) {
      console.error('Error loading break contexts:', error);
      return [];
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  async addBreakContext(item: BreakContext): Promise<IBreakContext | null> {
    this._showProgressSpinner.set(true);

    try {
      const result = await lastValueFrom(this.dataBreakContextService.addBreakContext(item));
      await this.readBreakContexts();
      return result;
    } catch (error) {
      console.error('Error adding break context:', error);
      return null;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  async updateBreakContext(item: IBreakContext): Promise<IBreakContext | null> {
    this._showProgressSpinner.set(true);

    try {
      const result = await lastValueFrom(this.dataBreakContextService.updateBreakContext(item));
      await this.readBreakContexts();
      return result;
    } catch (error) {
      console.error('Error updating break context:', error);
      return null;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  async deleteBreakContext(id: string): Promise<boolean> {
    this._showProgressSpinner.set(true);

    try {
      await lastValueFrom(this.dataBreakContextService.deleteBreakContext(id));
      await this.readBreakContexts();
      return true;
    } catch (error) {
      console.error('Error deleting break context:', error);
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }
}
