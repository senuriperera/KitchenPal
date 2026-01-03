import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserManagementComponent } from './user-management.component';
import { UserService } from '../../core/services/user.service';
import { BranchService } from '../../core/services/branch.service';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { provideRouter } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('UserManagementComponent', () => {
    let component: UserManagementComponent;
    let fixture: ComponentFixture<UserManagementComponent>;
    let userServiceSpy: jasmine.SpyObj<UserService>;
    let branchServiceSpy: jasmine.SpyObj<BranchService>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
        userServiceSpy = jasmine.createSpyObj('UserService', ['getUsers', 'createUser', 'updateUser', 'deleteUser']);
        branchServiceSpy = jasmine.createSpyObj('BranchService', ['getBranches', 'createBranch', 'updateBranch', 'deleteBranch']);
        authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin', 'isManager', 'getUserBranchId'], { currentUserValue: { id: 1, role: 'admin' } });

        // Setup default returns
        userServiceSpy.getUsers.and.returnValue(of([]));
        branchServiceSpy.getBranches.and.returnValue(of([]));
        authServiceSpy.isAdmin.and.returnValue(true);
        authServiceSpy.isManager.and.returnValue(false);
        authServiceSpy.getUserBranchId.and.returnValue(1);

        await TestBed.configureTestingModule({
            imports: [UserManagementComponent, CommonModule, FormsModule],
            providers: [
                provideRouter([]),
                { provide: UserService, useValue: userServiceSpy },
                { provide: BranchService, useValue: branchServiceSpy },
                { provide: AuthService, useValue: authServiceSpy }
            ],
            schemas: [NO_ERRORS_SCHEMA]
        })
            .compileComponents();

        fixture = TestBed.createComponent(UserManagementComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load users on init', () => {
        expect(userServiceSpy.getUsers).toHaveBeenCalled();
    });

    it('should switch tabs', () => {
        component.setActiveTab('branches');
        expect(component.activeTab).toBe('branches');
        expect(branchServiceSpy.getBranches).toHaveBeenCalled();
    });

    it('should open and close user modal', () => {
        component.addUser();
        expect(component.showAddUserModal).toBeTrue();
        component.closeModal();
        expect(component.showAddUserModal).toBeFalse();
    });
});
