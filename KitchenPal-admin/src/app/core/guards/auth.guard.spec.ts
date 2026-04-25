import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(() => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: authServiceSpy },
            ],
        });
    });

    const run = () =>
        TestBed.runInInjectionContext(() =>
            authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
        );

    it('returns true when authenticated', () => {
        authServiceSpy.isAuthenticated.and.returnValue(true);
        expect(run()).toBeTrue();
    });

    it('redirects to /login when not authenticated', () => {
        authServiceSpy.isAuthenticated.and.returnValue(false);
        const result = run() as any;
        expect(result.toString()).toContain('login');
    });
});
