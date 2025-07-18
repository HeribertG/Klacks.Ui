import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login/login.component';
import { ErrorComponent } from './error/error.component';
import { CanDeactivateGuard } from './helpers/can-deactivate.guard';
import { HomeComponent } from './surface/home/home.component';
import { NoAccessComponent } from './no-access/no-access.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

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
  { path: 'no-access', component: NoAccessComponent },
  { path: 'page-not-found', component: PageNotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
