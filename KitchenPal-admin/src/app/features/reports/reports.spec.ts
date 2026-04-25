import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Reports } from './reports';

describe('Reports', () => {
    let component: Reports;
    let fixture: ComponentFixture<Reports>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Reports, HttpClientTestingModule],
            providers: [provideRouter([])],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(Reports);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
