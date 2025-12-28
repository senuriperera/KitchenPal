import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Role-based access guard
 * Usage in routes: canActivate: [roleGuard], data: { allowedRoles: ['admin', 'manager'] }
 */
export const roleGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/login']);
    }

    const allowedRoles = route.data['allowedRoles'] as string[] | undefined;

    // If no roles specified, just check authentication
    if (!allowedRoles || allowedRoles.length === 0) {
        return true;
    }

    const currentUser = authService.currentUserValue;
    if (currentUser && allowedRoles.includes(currentUser.role)) {
        return true;
    }

    // User doesn't have required role, redirect to dashboard
    console.warn(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    return router.createUrlTree(['/dashboard']);
};
