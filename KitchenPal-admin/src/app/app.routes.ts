import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { UserManagementComponent } from './features/user-management/user-management.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'inventory', component: InventoryComponent, canActivate: [authGuard] },
  { path: 'expiry-alerts', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
  { path: 'recipes', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
  { path: 'discount-approvals', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
  { path: 'reports', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
  { path: 'user-management', component: UserManagementComponent, canActivate: [authGuard, roleGuard], data: { allowedRoles: ['admin', 'manager'] } },
  { path: 'settings', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
];
