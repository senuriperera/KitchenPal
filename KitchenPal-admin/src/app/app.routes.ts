import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard';
import { InventoryComponent } from './features/inventory/inventory';
import { UserManagementComponent } from './features/user-management/user-management';
import { LoginComponent } from './features/auth/login/login';
import { Recipes } from './features/recipes/recipes';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'inventory',
    component: InventoryComponent,
    canActivate: [authGuard],
  },
  {
    path: 'expiry-alerts',
    component: DashboardComponent,
    canActivate: [authGuard],
  }, // Placeholder
  { path: 'recipes', component: Recipes, canActivate: [authGuard] },
  {
    path: 'discount-approvals',
    component: DashboardComponent,
    canActivate: [authGuard],
  }, // Placeholder
  { path: 'reports', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
  {
    path: 'user-management',
    component: UserManagementComponent,
    canActivate: [authGuard, roleGuard],
    data: { allowedRoles: ['admin', 'branch_manager'] },
  },
  { path: 'settings', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
];
