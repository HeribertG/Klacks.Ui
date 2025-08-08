import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './presentation/auth/auth.guard';
import { AdminGuard } from './presentation/auth/admin.guard';
import { LoginComponent } from './presentation/auth/login/login.component';
import { ErrorComponent } from './presentation/error/error.component';
import { CanDeactivateGuard } from './application/helpers/can-deactivate.guard';
import { HomeComponent } from './presentation/surface/home/home.component';
import { NoAccessComponent } from './presentation/no-access/no-access.component';
import { PageNotFoundComponent } from './presentation/page-not-found/page-not-found.component';

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
        loadComponent: () => import('./presentation/workplace/dashboard/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent)
      },
      { 
        path: 'client', 
        loadComponent: () => import('./presentation/workplace/address/all-address/all-address-home/all-address-home.component').then(m => m.AllAddressHomeComponent)
      },
      { 
        path: 'edit-address', 
        loadComponent: () => import('./presentation/workplace/address/edit-address/edit-address-home/edit-address-home.component').then(m => m.EditAddressHomeComponent)
      },
      { 
        path: 'edit-address/:id', 
        loadComponent: () => import('./presentation/workplace/address/edit-address/edit-address-home/edit-address-home.component').then(m => m.EditAddressHomeComponent)
      },
      { 
        path: 'schedule', 
        loadComponent: () => import('./presentation/workplace/schedule/schedule-home/schedule-home.component').then(m => m.ScheduleHomeComponent)
      },
      { 
        path: 'absence', 
        loadComponent: () => import('./presentation/workplace/absence-gantt/absence-gantt-home/absence-gantt-home.component').then(m => m.AbsenceGanttHomeComponent)
      },
      { 
        path: 'profile', 
        loadComponent: () => import('./presentation/workplace/profile/profile-home/profile-home.component').then(m => m.ProfileHomeComponent)
      },
      { 
        path: 'settings', 
        loadComponent: () => import('./presentation/workplace/settings/settings-home/settings-home.component').then(m => m.SettingsHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'group', 
        loadComponent: () => import('./presentation/workplace/group/all-group/all-group-home/all-group-home.component').then(m => m.AllGroupHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'edit-group', 
        loadComponent: () => import('./presentation/workplace/group/edit-group/edit-group-home/edit-group-home.component').then(m => m.EditGroupHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'edit-group/:id', 
        loadComponent: () => import('./presentation/workplace/group/edit-group/edit-group-home/edit-group-home.component').then(m => m.EditGroupHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'group-structure', 
        loadComponent: () => import('./presentation/workplace/settings/group-scope/group-scope.component').then(m => m.GroupScopeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'shift', 
        loadComponent: () => import('./presentation/workplace/shift/all-shift/all-shift-home/all-shift-home.component').then(m => m.AllShiftHomeComponent)
      },
      { 
        path: 'new-shift', 
        loadComponent: () => import('./presentation/workplace/shift/edit-shift/edit-shift-home/edit-shift-home.component').then(m => m.EditShiftHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'edit-shift', 
        loadComponent: () => import('./presentation/workplace/shift/edit-shift/edit-shift-home/edit-shift-home.component').then(m => m.EditShiftHomeComponent),
        canActivate: [AdminGuard]
      },
      { 
        path: 'edit-shift/:id', 
        loadComponent: () => import('./presentation/workplace/shift/edit-shift/edit-shift-home/edit-shift-home.component').then(m => m.EditShiftHomeComponent)
      },
      { 
        path: 'cut-shift', 
        loadComponent: () => import('./presentation/workplace/shift/cut-shift/cut-shift-home/cut-shift-home.component').then(m => m.CutShiftHomeComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
