import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { DataLLMProviderService, ILLMProvider, IUpdateProviderRequest, ICreateProviderRequest } from 'src/app/infrastructure/api/data-llm-provider.service';
import { EVENT_BUS_TOKEN, IEventBus } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';

@Injectable({
  providedIn: 'root'
})
export class DataManagementLLMProviderService {
  private dataLLMProviderService = inject(DataLLMProviderService);
  private eventBus = inject(EVENT_BUS_TOKEN);

  public providers = signal<ILLMProvider[]>([]);
  public isLoading = signal(false);

  private providers$ = toObservable(this.providers);

  async loadProviders(): Promise<ILLMProvider[]> {
    try {
      this.isLoading.set(true);
      const providers = await firstValueFrom(this.dataLLMProviderService.getProviders());
      this.providers.set(providers);
      return providers;
    } catch (error) {
      console.error('Error loading providers:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-providers.error.load', code: 'LLMProviderError', context: 'DataManagementLLMProviderService' });
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

      const currentProviders = this.providers();
      const updatedProviders = currentProviders.map(provider =>
        provider.id === id ? updatedProvider : provider
      );
      this.providers.set(updatedProviders);

      this.eventBus.emit(DomainEventType.SUCCESS, { message: 'settings.llm-providers.success.update', context: 'Success' });
      return updatedProvider;
    } catch (error) {
      console.error('Error updating provider:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-providers.error.save', code: 'LLMProviderError', context: 'DataManagementLLMProviderService' });
      return undefined;
    }
  }

  async toggleProviderStatus(id: string, isEnabled: boolean): Promise<boolean> {
    try {
      const currentProviders = this.providers();
      const provider = currentProviders.find(p => p.id === id);
      
      if (!provider) {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-providers.error.not-found', code: 'LLMProviderError', context: 'DataManagementLLMProviderService' });
        return false;
      }

      if (isEnabled && !provider.apiKey) {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-providers.error.no-api-key', code: 'LLMProviderError', context: 'DataManagementLLMProviderService' });
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
        this.eventBus.emit(DomainEventType.SUCCESS, { message: successKey, context: 'Success' });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error toggling provider status:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-providers.error.toggle', code: 'LLMProviderError', context: 'DataManagementLLMProviderService' });
      return false;
    }
  }

  async createProvider(request: ICreateProviderRequest): Promise<ILLMProvider | undefined> {
    try {
      const newProvider = await firstValueFrom(
        this.dataLLMProviderService.createProvider(request)
      );

      const currentProviders = this.providers();
      this.providers.set([...currentProviders, newProvider]);

      this.eventBus.emit(DomainEventType.SUCCESS, { message: 'settings.llm-providers.success.create', context: 'Success' });
      return newProvider;
    } catch (error) {
      console.error('Error creating provider:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-providers.error.create', code: 'LLMProviderError', context: 'DataManagementLLMProviderService' });
      return undefined;
    }
  }

  async deleteProvider(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.dataLLMProviderService.deleteProvider(id));

      const currentProviders = this.providers();
      const updatedProviders = currentProviders.filter(provider => provider.id !== id);
      this.providers.set(updatedProviders);

      this.eventBus.emit(DomainEventType.SUCCESS, { message: 'settings.llm-providers.success.delete', context: 'Success' });
      return true;
    } catch (error) {
      console.error('Error deleting provider:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-providers.error.delete', code: 'LLMProviderError', context: 'DataManagementLLMProviderService' });
      return false;
    }
  }

  getCurrentProviders(): ILLMProvider[] {
    return this.providers();
  }

  getProviders(): Observable<ILLMProvider[]> {
    return this.providers$;
  }
}