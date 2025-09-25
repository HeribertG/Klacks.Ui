import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { DataLLMProviderService, ILLMProvider, IUpdateProviderRequest, ICreateProviderRequest } from 'src/app/infrastructure/api/data-llm-provider.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

@Injectable({
  providedIn: 'root'
})
export class DataManagementLLMProviderService {
  private dataLLMProviderService = inject(DataLLMProviderService);
  private toastService = inject(ToastShowService);

  private providersSubject = new BehaviorSubject<ILLMProvider[]>([]);
  public providers$ = this.providersSubject.asObservable();

  public isLoading = signal(false);

  async loadProviders(): Promise<ILLMProvider[]> {
    try {
      this.isLoading.set(true);
      const providers = await firstValueFrom(this.dataLLMProviderService.getProviders());
      this.providersSubject.next(providers);
      return providers;
    } catch (error) {
      console.error('Error loading providers:', error);
      this.toastService.showError('settings.llm-providers.error.load');
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateProvider(id: string, request: IUpdateProviderRequest): Promise<ILLMProvider | undefined> {
    try {
      const updatedProvider = await firstValueFrom(
        this.dataLLMProviderService.updateProvider(id, request)
      );

      const currentProviders = this.providersSubject.value;
      const updatedProviders = currentProviders.map(provider =>
        provider.id === id ? updatedProvider : provider
      );
      this.providersSubject.next(updatedProviders);

      this.toastService.showSuccess('settings.llm-providers.success.update', 'Success');
      return updatedProvider;
    } catch (error) {
      console.error('Error updating provider:', error);
      this.toastService.showError('settings.llm-providers.error.save');
      return undefined;
    }
  }

  async toggleProviderStatus(id: string, isEnabled: boolean): Promise<boolean> {
    try {
      const currentProviders = this.providersSubject.value;
      const provider = currentProviders.find(p => p.id === id);
      
      if (!provider) {
        this.toastService.showError('settings.llm-providers.error.not-found');
        return false;
      }

      if (isEnabled && !provider.apiKey) {
        this.toastService.showError('settings.llm-providers.error.no-api-key');
        return false;
      }

      const request: IUpdateProviderRequest = {
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        apiVersion: provider.apiVersion,
        isEnabled,
        priority: provider.priority
      };

      const updatedProvider = await this.updateProvider(id, request);
      
      if (updatedProvider) {
        const successKey = isEnabled 
          ? 'settings.llm-providers.success.enable'
          : 'settings.llm-providers.success.disable';
        this.toastService.showSuccess(successKey, 'Success');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error toggling provider status:', error);
      this.toastService.showError('settings.llm-providers.error.toggle');
      return false;
    }
  }

  async createProvider(request: ICreateProviderRequest): Promise<ILLMProvider | undefined> {
    try {
      const newProvider = await firstValueFrom(
        this.dataLLMProviderService.createProvider(request)
      );

      const currentProviders = this.providersSubject.value;
      this.providersSubject.next([...currentProviders, newProvider]);

      this.toastService.showSuccess('settings.llm-providers.success.create', 'Success');
      return newProvider;
    } catch (error) {
      console.error('Error creating provider:', error);
      this.toastService.showError('settings.llm-providers.error.create');
      return undefined;
    }
  }

  async deleteProvider(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.dataLLMProviderService.deleteProvider(id));

      const currentProviders = this.providersSubject.value;
      const updatedProviders = currentProviders.filter(provider => provider.id !== id);
      this.providersSubject.next(updatedProviders);

      this.toastService.showSuccess('settings.llm-providers.success.delete', 'Success');
      return true;
    } catch (error) {
      console.error('Error deleting provider:', error);
      this.toastService.showError('settings.llm-providers.error.delete');
      return false;
    }
  }

  getCurrentProviders(): ILLMProvider[] {
    return this.providersSubject.value;
  }
}