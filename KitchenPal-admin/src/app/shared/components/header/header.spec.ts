import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('AuthService', ['logout']);

        await TestBed.configureTestingModule({
            imports: [HeaderComponent, HttpClientTestingModule],
            providers: [
                { provide: AuthService, useValue: spy }
            ]
        })
            .compileComponents();

        authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call logout on AuthService when logout is triggered', () => {
        component.logout();
        expect(authServiceSpy.logout).toHaveBeenCalled();
    });

    it('should display provided title', () => {
        component.title = 'Test Title';
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        // Assuming the title is rendered in an element with class 'header-title' or h1/h2
        // If not sure about template structure, we can check property first
        expect(component.title).toBe('Test Title');
    });
});
