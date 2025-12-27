import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header';
import { UserService, User as ApiUser, CreateUserRequest } from '../../core/services/user.service';

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
    role: string;
    password: string;
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
    isLoading = false;
    errorMessage = '';
    successMessage = '';

    roles = [
        { value: 'admin', label: 'Admin' },
        { value: 'branch-manager', label: 'Branch Manager' },
        { value: 'staff', label: 'Staff' }
    ];

    userFormData: UserFormData = {
        name: '',
        email: '',
        role: '',
        password: ''
    };

    users: User[] = [];

    constructor(private userService: UserService) { }

    ngOnInit(): void {
        this.loadUsers();
    }

    loadUsers(): void {
        this.isLoading = true;
        this.errorMessage = '';

        this.userService.getUsers().subscribe({
            next: (users) => {
                this.users = users;
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading users:', error);
                this.errorMessage = 'Failed to load users. Please try again.';
                this.isLoading = false;
            }
        });
    }

    setActiveTab(tab: 'users' | 'branches'): void {
        this.activeTab = tab;
    }

    addUser(): void {
        this.showAddUserModal = true;
        this.resetForm();
        this.clearMessages();
    }

    closeModal(): void {
        this.showAddUserModal = false;
        this.resetForm();
        this.clearMessages();
    }

    resetForm(): void {
        this.userFormData = {
            name: '',
            email: '',
            role: '',
            password: ''
        };
    }

    clearMessages(): void {
        this.errorMessage = '';
        this.successMessage = '';
    }

    submitUser(): void {
        this.isLoading = true;
        this.clearMessages();

        const userData: CreateUserRequest = {
            name: this.userFormData.name,
            email: this.userFormData.email,
            role: this.userFormData.role,
            password: this.userFormData.password
        };

        this.userService.createUser(userData).subscribe({
            next: (response) => {
                console.log('User created successfully:', response);
                this.successMessage = 'User created successfully!';
                this.isLoading = false;
                this.closeModal();
                this.loadUsers(); // Refresh the user list
            },
            error: (error) => {
                console.error('Error creating user:', error);
                this.errorMessage = error.error?.error || 'Failed to create user. Please try again.';
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
        this.clearMessages();

        this.userService.deleteUser(user.id).subscribe({
            next: (response) => {
                console.log('User deleted successfully:', response);
                this.successMessage = 'User deleted successfully!';
                this.isLoading = false;
                this.loadUsers(); // Refresh the user list
            },
            error: (error) => {
                console.error('Error deleting user:', error);
                this.errorMessage = error.error?.error || 'Failed to delete user. Please try again.';
                this.isLoading = false;
            }
        });
    }
}
