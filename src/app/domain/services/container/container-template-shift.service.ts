import { Injectable, signal, WritableSignal, computed } from '@angular/core';
import { IContainerTemplateItem } from '../../models/container-template-class';

export interface IWeekdayContainerTemplateItemsMap {
  monday: IContainerTemplateItem[];
  tuesday: IContainerTemplateItem[];
  wednesday: IContainerTemplateItem[];
  thursday: IContainerTemplateItem[];
  friday: IContainerTemplateItem[];
  saturday: IContainerTemplateItem[];
  sunday: IContainerTemplateItem[];
}

@Injectable({
  providedIn: 'root',
})
export class ContainerTemplateShiftService {
  private currentWeekdaySignal: WritableSignal<string> = signal('monday');
  private weekdayContainerTemplateItemsSignal: WritableSignal<IWeekdayContainerTemplateItemsMap> =
    signal({
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    });

  public selectedContainerTemplateItemsSignal = computed(() => {
    const weekday =
      this.currentWeekdaySignal() as keyof IWeekdayContainerTemplateItemsMap;
    const items = this.weekdayContainerTemplateItemsSignal()[weekday];
    return items;
  });

  public selectedShiftSignal: WritableSignal<IContainerTemplateItem | null> =
    signal(null);

  get selectedContainerTemplateItems(): IContainerTemplateItem[] {
    return this.selectedContainerTemplateItemsSignal();
  }

  get selectedShift(): IContainerTemplateItem | null {
    return this.selectedShiftSignal();
  }

  setCurrentWeekday(weekday: string): void {
    this.currentWeekdaySignal.set(weekday);
  }

  getCurrentWeekday(): string {
    return this.currentWeekdaySignal();
  }

  setSelectedContainerTemplateItems(
    containerTemplateItems: IContainerTemplateItem[]
  ): void {
    const weekday =
      this.currentWeekdaySignal() as keyof IWeekdayContainerTemplateItemsMap;
    const updatedMap = { ...this.weekdayContainerTemplateItemsSignal() };
    updatedMap[weekday] = containerTemplateItems;
    this.weekdayContainerTemplateItemsSignal.set(updatedMap);
  }

  getAllWeekdayTasks(): IWeekdayContainerTemplateItemsMap {
    return this.weekdayContainerTemplateItemsSignal();
  }

  setAllWeekdayTasks(tasks: IWeekdayContainerTemplateItemsMap): void {
    this.weekdayContainerTemplateItemsSignal.set(tasks);
  }

  addTask(task: IContainerTemplateItem): void {
    const currentTasks = this.selectedContainerTemplateItemsSignal();
    const taskIdentifier = task.id || task.tmpId;
    const exists = currentTasks.some((t) => {
      const existingIdentifier = t.id || t.tmpId;
      return existingIdentifier === taskIdentifier;
    });
    if (!exists) {
      this.setSelectedContainerTemplateItems([...currentTasks, task]);
    }
  }

  removeTask(taskId: string): void {
    const currentTasks = this.selectedContainerTemplateItemsSignal();
    this.setSelectedContainerTemplateItems(
      currentTasks.filter((t) => {
        const itemIdentifier = t.id || t.tmpId;
        return itemIdentifier !== taskId;
      })
    );

    const selectedShift = this.selectedShiftSignal();
    const selectedIdentifier = selectedShift?.id || selectedShift?.tmpId;
    if (selectedIdentifier === taskId) {
      this.selectedShiftSignal.set(null);
    }
  }

  clearTasks(): void {
    this.setSelectedContainerTemplateItems([]);
  }

  clearAllTasks(): void {
    this.weekdayContainerTemplateItemsSignal.set({
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    });
  }

  updateTask(taskId: string, updatedTask: IContainerTemplateItem): void {
    const currentTasks = this.selectedContainerTemplateItemsSignal();
    const index = currentTasks.findIndex((t) => {
      const itemIdentifier = t.id || t.tmpId;
      return itemIdentifier === taskId;
    });
    if (index !== -1) {
      const updatedTasks = [...currentTasks];
      updatedTasks[index] = updatedTask;
      this.setSelectedContainerTemplateItems(updatedTasks);
    }
  }

  updateSelectedTask(item: IContainerTemplateItem): void {
    const currentTasks = this.selectedContainerTemplateItemsSignal();
    const itemIdentifier = item.id || item.tmpId;
    const index = currentTasks.findIndex((t) => {
      const existingIdentifier = t.id || t.tmpId;
      return existingIdentifier === itemIdentifier;
    });
    if (index !== -1) {
      const updatedTasks = [...currentTasks];
      updatedTasks[index] = item;
      this.setSelectedContainerTemplateItems(updatedTasks);
    }
  }

  setSelectedShift(item: IContainerTemplateItem | null): void {
    this.selectedShiftSignal.set(item);
  }
}
