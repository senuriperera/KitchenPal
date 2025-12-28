import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header';
import { UserService, User as ApiUser, CreateUserRequest } from '../../core/services/user.service';
import { BranchService, CreateBranchRequest } from '../../core/services/branch.service';
import { AuthService } from '../../core/services/auth.service';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    branch: string;
    lastLogin: string;
    avatar?: string;
}

interface UserFormData {
    name: string;
    email: string;
    branch_id: number | null;
    role: string;
    password: string;
}

interface Branch {
    id: number;
    name: string;
    address: string;
    contact_email: string;
    contact_number: string;
    created_at?: string;
    updated_at?: string;
}

interface BranchFormData {
    name: string;
    address: string;
    contact_email: string;
    contact_number: string;
}

@Component({
    selector: 'app-user-management',
    standalone: true,
    imports: [CommonModule, FormsModule, HeaderComponent],
    templateUrl: './user-management.component.html',
    styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
    activeTab: 'users' | 'branches' = 'users';
    showAddUserModal = false;
    showAddBranchModal = false;
    isLoading = false;

    // Role-based access control
    isAdmin = false;
    isManager = false;
    currentUserBranchId: number | null = null;

    // Separate messages for each tab
    userErrorMessage = '';
    userSuccessMessage = '';
    branchErrorMessage = '';
    branchSuccessMessage = '';

    roles = [
        { value: 'admin', label: 'Admin' },
        { value: 'manager', label: 'Branch Manager' },
        { value: 'staff', label: 'Staff' }
    ];

    userFormData: UserFormData = {
        name: '',
        email: '',
        branch_id: null,
        role: '',
        password: ''
    };

    branchFormData: BranchFormData = {
        name: '',
        address: '',
        contact_email: '',
        contact_number: ''
    };

    users: User[] = [];
    branches: Branch[] = [];

    constructor(
        private userService: UserService,
        private branchService: BranchService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        // Check user role
        this.isAdmin = this.authService.isAdmin();
        this.isManager = this.authService.isManager();
        this.currentUserBranchId = this.authService.getUserBranchId();

        // Load data based on role
        this.loadUsers();

        // Only load branches for admins
        if (this.isAdmin) {
            this.loadBranches();
        }
    }

    loadUsers(): void {
        this.isLoading = true;
        this.userErrorMessage = '';

        this.userService.getUsers().subscribe({
            next: (users) => {
                this.users = users;
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading users:', error);
                this.userErrorMessage = 'Failed to load users. Please try again.';
                this.isLoading = false;
            }
        });
    }

    loadBranches(): void {
        this.isLoading = true;
        this.branchErrorMessage = '';

        this.branchService.getBranches().subscribe({
            next: (branches) => {
                this.branches = branches;
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading branches:', error);
                this.branchErrorMessage = 'Failed to load branches. Please try again.';
                this.isLoading = false;
            }
        });
    }

    setActiveTab(tab: 'users' | 'branches'): void {
        this.activeTab = tab;

        // Clear messages for the active tab
        if (tab === 'users') {
            this.userErrorMessage = '';
            this.userSuccessMessage = '';
        } else {
            this.branchErrorMessage = '';
            this.branchSuccessMessage = '';
        }

        // Load data for the active tab
        if (tab === 'branches' && this.branches.length === 0) {
            this.loadBranches();
        }
    }

    addUser(): void {
        this.showAddUserModal = true;
        this.resetForm();
        this.userErrorMessage = '';
        this.userSuccessMessage = '';

        // Load branches if not already loaded
        if (this.branches.length === 0) {
            this.loadBranches();
        }
    }

    closeModal(): void {
        this.showAddUserModal = false;
        this.resetForm();
        this.userErrorMessage = '';
        this.userSuccessMessage = '';
    }

    resetForm(): void {
        this.userFormData = {
            name: '',
            email: '',
            branch_id: null,
            role: '',
            password: ''
        };
    }

    submitUser(): void {
        this.isLoading = true;
        this.userErrorMessage = '';
        this.userSuccessMessage = '';

        const userData: any = {
            name: this.userFormData.name,
            email: this.userFormData.email,
            branch_id: this.userFormData.branch_id,
            role: this.userFormData.role,
            password: this.userFormData.password
        };

        this.userService.createUser(userData).subscribe({
            next: (response) => {
                console.log('User created successfully:', response);
                this.userSuccessMessage = 'User created successfully!';
                this.isLoading = false;
                this.closeModal();
                this.loadUsers(); // Refresh the user list
            },
            error: (error) => {
                console.error('Error creating user:', error);
                this.userErrorMessage = error.error?.error || 'Failed to create user. Please try again.';
                this.isLoading = false;
            }
        });
    }

    editUser(user: User): void {
        console.log('Edit user:', user);
        // TODO: Implement edit user modal
        alert('Edit functionality coming soon!');
    }

    deleteUser(user: User): void {
        if (!confirm(`Are you sure you want to delete ${user.name}?`)) {
            return;
        }

        this.isLoading = true;
        this.userErrorMessage = '';
        this.userSuccessMessage = '';

        this.userService.deleteUser(user.id).subscribe({
            next: (response) => {
                console.log('User deleted successfully:', response);
                this.userSuccessMessage = 'User deleted successfully!';
                this.isLoading = false;
                this.loadUsers(); // Refresh the user list
            },
            error: (error) => {
                console.error('Error deleting user:', error);
                this.userErrorMessage = error.error?.error || 'Failed to delete user. Please try again.';
                this.isLoading = false;
            }
        });
    }

    // Branch Management Methods
    addBranch(): void {
        this.showAddBranchModal = true;
        this.resetBranchForm();
        this.branchErrorMessage = '';
        this.branchSuccessMessage = '';
    }

    closeBranchModal(): void {
        this.showAddBranchModal = false;
        this.resetBranchForm();
        this.branchErrorMessage = '';
        this.branchSuccessMessage = '';
    }

    resetBranchForm(): void {
        this.branchFormData = {
            name: '',
            address: '',
            contact_email: '',
            contact_number: ''
        };
    }

    submitBranch(): void {
        this.isLoading = true;
        this.branchErrorMessage = '';
        this.branchSuccessMessage = '';

        const branchData: CreateBranchRequest = {
            name: this.branchFormData.name,
            address: this.branchFormData.address,
            contact_email: this.branchFormData.contact_email,
            contact_number: this.branchFormData.contact_number
        };

        this.branchService.createBranch(branchData).subscribe({
            next: (response) => {
                console.log('Branch created successfully:', response);
                this.branchSuccessMessage = 'Branch created successfully!';
                this.isLoading = false;
                this.closeBranchModal();
                this.loadBranches(); // Refresh the branches list
            },
            error: (error) => {
                console.error('Error creating branch:', error);
                this.branchErrorMessage = error.error?.error || 'Failed to create branch. Please try again.';
                this.isLoading = false;
            }
        });
    }

    editBranch(branch: Branch): void {
        console.log('Edit branch:', branch);
        alert('Edit functionality coming soon!');
    }

    deleteBranch(branch: Branch): void {
        if (!confirm(`Are you sure you want to delete ${branch.name}?`)) {
            return;
        }

        this.isLoading = true;
        this.branchErrorMessage = '';
        this.branchSuccessMessage = '';

        this.branchService.deleteBranch(branch.id).subscribe({
            next: (response) => {
                console.log('Branch deleted successfully:', response);
                this.branchSuccessMessage = 'Branch deleted successfully!';
                this.isLoading = false;
                this.loadBranches(); // Refresh the branches list
            },
            error: (error) => {
                console.error('Error deleting branch:', error);
                this.branchErrorMessage = error.error?.error || 'Failed to delete branch. Please try again.';
                this.isLoading = false;
            }
        });
    }
}
