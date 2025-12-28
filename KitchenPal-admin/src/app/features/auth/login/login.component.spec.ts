import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';

describe('LoginComponent', () => {
    let component: LoginComponent;
    let fixture: ComponentFixture<LoginComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let router: Router;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
        // Default success return
        authServiceSpy.login.and.returnValue(of({ token: 'fake-token' }));

        await TestBed.configureTestingModule({
            imports: [LoginComponent, ReactiveFormsModule, CommonModule],
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                provideRouter([]) // We can spy on router instances if needed, or use RouterTestingModule logic via providers
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with invalid form', () => {
        expect(component.loginForm.valid).toBeFalse();
    });

    it('should call login on valid submit', () => {
        component.loginForm.controls['email'].setValue('test@example.com');
        component.loginForm.controls['password'].setValue('password123');
        expect(component.loginForm.valid).toBeTrue();

        const navigateSpy = spyOn(router, 'navigate');
        component.onSubmit();
        expect(authServiceSpy.login).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should handle login error', () => {
        authServiceSpy.login.and.returnValue(throwError(() => new Error('Login failed')));
        component.loginForm.controls['email'].setValue('test@example.com');
        component.loginForm.controls['password'].setValue('wrongpass');

        component.onSubmit();
        expect(component.errorMessage).toBe('Invalid email or password');
        expect(component.isLoading).toBeFalse();
    });
});
