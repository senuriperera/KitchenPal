import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserManagementComponent } from './user-management.component';
import { UserService } from '../../core/services/user.service';
import { BranchService } from '../../core/services/branch.service';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

describe('UserManagementComponent', () => {
    let component: UserManagementComponent;
    let fixture: ComponentFixture<UserManagementComponent>;
    let userServiceSpy: jasmine.SpyObj<UserService>;
    let branchServiceSpy: jasmine.SpyObj<BranchService>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
        userServiceSpy = jasmine.createSpyObj('UserService', ['getUsers', 'createUser', 'updateUser', 'deleteUser']);
        branchServiceSpy = jasmine.createSpyObj('BranchService', ['getBranches', 'createBranch', 'updateBranch', 'deleteBranch']);
        authServiceSpy = jasmine.createSpyObj('AuthService', [], { currentUserValue: { id: 1, role: 'admin' } });

        // Setup default returns
        userServiceSpy.getUsers.and.returnValue(of([]));
        branchServiceSpy.getBranches.and.returnValue(of([]));

        await TestBed.configureTestingModule({
            imports: [UserManagementComponent, CommonModule, FormsModule],
            providers: [
                { provide: UserService, useValue: userServiceSpy },
                { provide: BranchService, useValue: branchServiceSpy },
                { provide: AuthService, useValue: authServiceSpy }
            ]
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
