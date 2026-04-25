import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService, User } from '../services/auth.service';

describe('roleGuard', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    const adminUser: User = { user_id: '1', email: 'a@b.com', name: 'Admin', role: 'admin' };

    beforeEach(() => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
        (authServiceSpy as any).currentUserValue = null;
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: authServiceSpy },
            ],
        });
    });

    const run = (allowedRoles?: string[], user?: User | null) => {
        (authServiceSpy as any).currentUserValue = user !== undefined ? user : adminUser;
        const route = { data: allowedRoles?.length ? { allowedRoles } : {} } as unknown as ActivatedRouteSnapshot;
        return TestBed.runInInjectionContext(() =>
            roleGuard(route, {} as RouterStateSnapshot)
        );
    };

    it('redirects to /login when not authenticated', () => {
        authServiceSpy.isAuthenticated.and.returnValue(false);
        const result = run() as any;
        expect(result.toString()).toContain('login');
    });

    it('returns true when no roles are required', () => {
        authServiceSpy.isAuthenticated.and.returnValue(true);
        expect(run([])).toBeTrue();
    });

    it('returns true when user has the required role', () => {
        authServiceSpy.isAuthenticated.and.returnValue(true);
        expect(run(['admin'])).toBeTrue();
    });

    it('is case-insensitive for role matching', () => {
        authServiceSpy.isAuthenticated.and.returnValue(true);
        expect(run(['ADMIN'])).toBeTrue();
    });

    it('redirects to /dashboard when user lacks required role', () => {
        authServiceSpy.isAuthenticated.and.returnValue(true);
        const result = run(['admin'], { ...adminUser, role: 'staff' }) as any;
        expect(result.toString()).toContain('dashboard');
    });
});
