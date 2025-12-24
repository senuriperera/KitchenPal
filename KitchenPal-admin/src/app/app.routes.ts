import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'inventory', component: InventoryComponent, canActivate: [authGuard] },
  { path: 'expiry-alerts', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
  { path: 'recipes', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
  { path: 'discount-approvals', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
  { path: 'reports', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
  { path: 'settings', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
];
