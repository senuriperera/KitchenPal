import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
    let service: UserService;
    let httpMock: HttpTestingController;
    const apiUrl = `${environment.apiUrl}/users`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [UserService],
        });
        service = TestBed.inject(UserService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('getUsers makes GET request and returns users', (done) => {
        const users = [{ id: 1, name: 'T', email: 'a@b.com', role: 'admin', branch: 'N/A', lastLogin: 'Never' }];
        service.getUsers().subscribe(result => {
            expect(result).toEqual(users);
            done();
        });
        httpMock.expectOne(apiUrl).flush(users);
    });

    it('createUser makes POST request', (done) => {
        const payload = { name: 'T', email: 'a@b.com', role: 'staff', password: 'pass' };
        const response = { message: 'User created successfully', user: { id: 1, name: 'T', email: 'a@b.com', role: 'staff' } };
        service.createUser(payload).subscribe(res => {
            expect(res.message).toBe('User created successfully');
            done();
        });
        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(payload);
        req.flush(response);
    });

    it('updateUser makes PUT request to correct URL', (done) => {
        const response = { message: 'User updated successfully', user: { id: 1, name: 'T', email: 'a@b.com', role: 'admin' } };
        service.updateUser(1, { role: 'admin' }).subscribe(res => {
            expect(res.message).toBe('User updated successfully');
            done();
        });
        const req = httpMock.expectOne(`${apiUrl}/1`);
        expect(req.request.method).toBe('PUT');
        req.flush(response);
    });

    it('deleteUser makes DELETE request', (done) => {
        service.deleteUser(1).subscribe(res => {
            expect(res.message).toBe('User deleted successfully');
            done();
        });
        const req = httpMock.expectOne(`${apiUrl}/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ message: 'User deleted successfully' });
    });
});
