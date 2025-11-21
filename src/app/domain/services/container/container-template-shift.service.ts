import { Injectable, signal, WritableSignal, computed } from '@angular/core';
import { IShift } from '../../models/shift-class';
import { IContainerTemplateItem } from '../../models/container-template-class';

export type WeekdayContainerTemplateItemsMap = {
  monday: IContainerTemplateItem[];
  tuesday: IContainerTemplateItem[];
  wednesday: IContainerTemplateItem[];
  thursday: IContainerTemplateItem[];
  friday: IContainerTemplateItem[];
  saturday: IContainerTemplateItem[];
  sunday: IContainerTemplateItem[];
};

@Injectable({
  providedIn: 'root'
})
export class ContainerTemplateShiftService {
  private currentWeekdaySignal: WritableSignal<string> = signal('monday');
  private weekdayContainerTemplateItemsSignal: WritableSignal<WeekdayContainerTemplateItemsMap> = signal({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  });

  public selectedContainerTemplateItemsSignal = computed(() => {
    const weekday = this.currentWeekdaySignal() as keyof WeekdayContainerTemplateItemsMap;
    const items = this.weekdayContainerTemplateItemsSignal()[weekday];
    return items;
  });

  public selectedShiftSignal: WritableSignal<IContainerTemplateItem | null> = signal(null);

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

  setSelectedContainerTemplateItems(containerTemplateItems: IContainerTemplateItem[]): void {
    const weekday = this.currentWeekdaySignal() as keyof WeekdayContainerTemplateItemsMap;
    const updatedMap = { ...this.weekdayContainerTemplateItemsSignal() };
    updatedMap[weekday] = containerTemplateItems;
    this.weekdayContainerTemplateItemsSignal.set(updatedMap);
  }

  getAllWeekdayTasks(): WeekdayContainerTemplateItemsMap {
    return this.weekdayContainerTemplateItemsSignal();
  }

  setAllWeekdayTasks(tasks: WeekdayContainerTemplateItemsMap): void {
    this.weekdayContainerTemplateItemsSignal.set(tasks);
  }

  addTask(task: IContainerTemplateItem): void {
    const currentTasks = this.selectedContainerTemplateItemsSignal();
    const exists = currentTasks.some(t => t.id === task.id);
    if (!exists) {
      this.setSelectedContainerTemplateItems([...currentTasks, task]);
    }
  }

  removeTask(taskId: string): void {
    const currentTasks = this.selectedContainerTemplateItemsSignal();
    this.setSelectedContainerTemplateItems(currentTasks.filter(t => t.id !== taskId));

    if (this.selectedShiftSignal()?.id === taskId) {
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
      sunday: []
    });
  }

  updateTask(taskId: string, updatedTask: IContainerTemplateItem): void {
    const currentTasks = this.selectedContainerTemplateItemsSignal();
    const index = currentTasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const updatedTasks = [...currentTasks];
      updatedTasks[index] = updatedTask;
      this.setSelectedContainerTemplateItems(updatedTasks);
    }
  }

  updateSelectedTask(item: IContainerTemplateItem): void {
    const currentTasks = this.selectedContainerTemplateItemsSignal();
    const index = currentTasks.findIndex(t => t.id === item.id);
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
