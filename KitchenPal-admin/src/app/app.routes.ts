import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard';
import { DiscountApprovalComponent } from './features/discount-approval/discount-approval';
import { UserManagementComponent } from './features/user-management/user-management';
import { LoginComponent } from './features/auth/login/login';
import { Recipes } from './features/recipes/recipes';
import { Reports } from './features/reports/reports';
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
  { path: 'recipes', component: Recipes, canActivate: [authGuard] },
  {
    path: 'discount-approvals',
    component: DiscountApprovalComponent,
    canActivate: [authGuard, roleGuard],
    data: { allowedRoles: ['admin'] },
  },
  { path: 'reports', component: Reports, canActivate: [authGuard] },
  {
    path: 'user-management',
    component: UserManagementComponent,
    canActivate: [authGuard, roleGuard],
    data: { allowedRoles: ['admin', 'branch_manager', 'manager', 'staff'] },
  },
  { path: 'settings', component: DashboardComponent, canActivate: [authGuard] }, // Placeholder
];
