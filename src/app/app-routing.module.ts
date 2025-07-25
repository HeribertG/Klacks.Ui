import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { AdminGuard } from './auth/admin.guard';
import { LoginComponent } from './auth/login/login.component';
import { ErrorComponent } from './error/error.component';
import { CanDeactivateGuard } from './helpers/can-deactivate.guard';
import { HomeComponent } from './surface/home/home.component';
import { NoAccessComponent } from './no-access/no-access.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'error', component: ErrorComponent },
  { path: 'no-access', component: NoAccessComponent },
  { path: 'page-not-found', component: PageNotFoundComponent },

  {
    path: 'workplace',
    component: HomeComponent,
    canActivate: [AuthGuard],
    canDeactivate: [CanDeactivateGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./workplace/dashboard/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent)
      },
      { 
        path: 'client', 
        loadComponent: () => import('./workplace/address/all-address/all-address-home/all-address-home.component').then(m => m.AllAddressHomeComponent)
      },
      { 
        path: 'edit-address', 
        loadComponent: () => import('./workplace/address/edit-address/edit-address-home/edit-address-home.component').then(m => m.EditAddressHomeComponent)
      },
      { 
        path: 'edit-address/:id', 
        loadComponent: () => import('./workplace/address/edit-address/edit-address-home/edit-address-home.component').then(m => m.EditAddressHomeComponent)
      },
      { 
        path: 'schedule', 
        loadComponent: () => import('./workplace/schedule/schedule-home/schedule-home.component').then(m => m.ScheduleHomeComponent)
      },
      { 
        path: 'absence', 
        loadComponent: () => import('./workplace/absence-gantt/absence-gantt-home/absence-gantt-home.component').then(m => m.AbsenceGanttHomeComponent)
      },
      { 
        path: 'profile', 
        loadComponent: () => import('./workplace/profile/profile-home/profile-home.component').then(m => m.ProfileHomeComponent)
      },
      { 
        path: 'settings', 
        loadComponent: () => import('./workplace/settings/settings-home/settings-home.component').then(m => m.SettingsHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'group', 
        loadComponent: () => import('./workplace/group/all-group/all-group-home/all-group-home.component').then(m => m.AllGroupHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'edit-group', 
        loadComponent: () => import('./workplace/group/edit-group/edit-group-home/edit-group-home.component').then(m => m.EditGroupHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'edit-group/:id', 
        loadComponent: () => import('./workplace/group/edit-group/edit-group-home/edit-group-home.component').then(m => m.EditGroupHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'group-structure', 
        loadComponent: () => import('./workplace/settings/group-scope/group-scope.component').then(m => m.GroupScopeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'shift', 
        loadComponent: () => import('./workplace/shift/all-shift/all-shift-home/all-shift-home.component').then(m => m.AllShiftHomeComponent)
      },
      { 
        path: 'new-shift', 
        loadComponent: () => import('./workplace/shift/edit-shift/edit-shift-home/edit-shift-home.component').then(m => m.EditShiftHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'edit-shift', 
        loadComponent: () => import('./workplace/shift/edit-shift/edit-shift-home/edit-shift-home.component').then(m => m.EditShiftHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'edit-shift/:id', 
        loadComponent: () => import('./workplace/shift/edit-shift/edit-shift-home/edit-shift-home.component').then(m => m.EditShiftHomeComponent)
      },
      { 
        path: 'cut-shift', 
        loadComponent: () => import('./workplace/shift/cut-shift/cut-shift-home/cut-shift-home.component').then(m => m.CutShiftHomeComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
