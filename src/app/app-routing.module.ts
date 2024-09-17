import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login/login.component';
import { ErrorComponent } from './error/error.component';
import { CanDeactivateGuard } from './helpers/can-deactivate.guard';
import { HomeComponent } from './surface/home/home.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'workplace/edit-address/:id',
    canActivate: [AuthGuard],
    component: HomeComponent,
    canDeactivate: [CanDeactivateGuard],
  },
  {
    path: 'workplace/:id',
    canActivate: [AuthGuard],
    component: HomeComponent,
    canDeactivate: [CanDeactivateGuard],
  },
  { path: 'workplace', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'error', component: ErrorComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
