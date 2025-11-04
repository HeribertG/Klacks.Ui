import { Injectable, signal, WritableSignal } from '@angular/core';
import { IShift } from '../../models/shift-class';

@Injectable({
  providedIn: 'root'
})
export class ContainerTemplateShiftService {
  public selectedTasksSignal: WritableSignal<IShift[]> = signal([]);
  public selectedShiftSignal: WritableSignal<IShift | null> = signal(null);

  get selectedTasks(): IShift[] {
    return this.selectedTasksSignal();
  }

  get selectedShift(): IShift | null {
    return this.selectedShiftSignal();
  }

  setSelectedTasks(tasks: IShift[]): void {
    this.selectedTasksSignal.set(tasks);
  }

  addTask(task: IShift): void {
    const currentTasks = this.selectedTasksSignal();
    const exists = currentTasks.some(t => t.id === task.id);
    if (!exists) {
      this.selectedTasksSignal.set([...currentTasks, task]);
    }
  }

  removeTask(taskId: string): void {
    const currentTasks = this.selectedTasksSignal();
    this.selectedTasksSignal.set(currentTasks.filter(t => t.id !== taskId));
  }

  clearTasks(): void {
    this.selectedTasksSignal.set([]);
  }

  updateTask(taskId: string, updatedTask: IShift): void {
    const currentTasks = this.selectedTasksSignal();
    const index = currentTasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const updatedTasks = [...currentTasks];
      updatedTasks[index] = updatedTask;
      this.selectedTasksSignal.set(updatedTasks);
    }
  }

  setSelectedShift(shift: IShift | null): void {
    this.selectedShiftSignal.set(shift);
  }
}
