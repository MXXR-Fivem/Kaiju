import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./views/hq-view.component').then(m => m.HqViewComponent),
  },
  {
    path: 'god-mode-secret',
    loadComponent: () => import('./components/god-mode/god-mode.component').then(m => m.GodModeComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
