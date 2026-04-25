import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService, AuthResponse, User } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    let router: Router;

    const mockUser: User = { user_id: '1', email: 'a@b.com', name: 'Admin', role: 'admin', branch_id: 1 };
    const mockAuthResponse: AuthResponse = { accessToken: 'access-tok', refreshToken: 'refresh-tok', user: mockUser };

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [provideRouter([]), AuthService],
        });
        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('login stores tokens and emits user', (done) => {
        service.login('a@b.com', 'pass').subscribe(user => {
            expect(user).toEqual(mockUser);
            expect(localStorage.getItem('accessToken')).toBe('access-tok');
            expect(localStorage.getItem('refreshToken')).toBe('refresh-tok');
            done();
        });
        httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
    });

    it('logout clears storage and navigates to /login', () => {
        localStorage.setItem('accessToken', 'tok');
        const navSpy = spyOn(router, 'navigate');
        service.logout();
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(navSpy).toHaveBeenCalledWith(['/login']);
        httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush({});
    });

    it('logout without token skips HTTP call and still navigates', () => {
        const navSpy = spyOn(router, 'navigate');
        service.logout();
        httpMock.expectNone(`${environment.apiUrl}/auth/logout`);
        expect(navSpy).toHaveBeenCalledWith(['/login']);
    });

    it('isAuthenticated returns false without stored token', () => {
        expect(service.isAuthenticated()).toBeFalse();
    });

    it('isAuthenticated returns true when user and token are set', () => {
        localStorage.setItem('accessToken', 'tok');
        (service as any).currentUserSubject.next(mockUser);
        expect(service.isAuthenticated()).toBeTrue();
    });

    it('hasRole returns true for matching role (case-insensitive)', () => {
        (service as any).currentUserSubject.next(mockUser);
        expect(service.hasRole('admin')).toBeTrue();
        expect(service.hasRole('ADMIN')).toBeTrue();
        expect(service.hasRole('staff')).toBeFalse();
    });

    it('isAdmin returns true for admin user', () => {
        (service as any).currentUserSubject.next(mockUser);
        expect(service.isAdmin()).toBeTrue();
    });

    it('isManager returns true for branch_manager', () => {
        (service as any).currentUserSubject.next({ ...mockUser, role: 'branch_manager' });
        expect(service.isManager()).toBeTrue();
    });

    it('isManager returns true for manager role', () => {
        (service as any).currentUserSubject.next({ ...mockUser, role: 'manager' });
        expect(service.isManager()).toBeTrue();
    });

    it('getUserBranchId returns branch_id from current user', () => {
        (service as any).currentUserSubject.next(mockUser);
        expect(service.getUserBranchId()).toBe(1);
    });

    it('getUserBranchId returns null when not logged in', () => {
        (service as any).currentUserSubject.next(null);
        expect(service.getUserBranchId()).toBeNull();
    });

    it('refreshToken throws when no refresh token stored', () => {
        expect(() => service.refreshToken()).toThrowError('No refresh token available');
    });

    it('refreshToken posts and stores new access token', (done) => {
        localStorage.setItem('refreshToken', 'old-ref');
        service.refreshToken().subscribe(token => {
            expect(token).toBe('new-access');
            expect(localStorage.getItem('accessToken')).toBe('new-access');
            done();
        });
        httpMock.expectOne(`${environment.apiUrl}/auth/refresh`).flush({ accessToken: 'new-access' });
    });
});
