import { Routes } from '@angular/router';
import { authGuard } from './services/auth.service';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./views/hq-view.component').then((m) => m.HqViewComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./views/login-view.component').then((m) => m.LoginViewComponent)
  },
  {
    path: 'god-mode-secret',
    loadComponent: () => import('./components/god-mode/god-mode.component').then((m) => m.GodModeComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
