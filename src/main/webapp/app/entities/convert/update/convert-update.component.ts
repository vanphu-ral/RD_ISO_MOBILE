import { Component, inject, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, tap } from 'rxjs/operators';

import SharedModule from 'app/shared/shared.module';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormControl,
  FormGroup,
} from '@angular/forms';

import { IConvert } from '../convert.model';
import { ConvertService } from '../service/convert.service';
import { ConvertFormService, ConvertFormGroup } from './convert-form.service';
import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import dayjs from 'dayjs/esm';
import Swal from 'sweetalert2';

@Component({
  standalone: true,
  selector: 'jhi-convert-update',
  templateUrl: './convert-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class ConvertUpdateComponent implements OnInit {
  isSaving = false;
  convert: IConvert | null = null;
  account: Account | null = null;
  ediForms: FormGroup | null = null;
  protected convertService = inject(ConvertService);
  protected convertFormService = inject(ConvertFormService);
  protected activatedRoute = inject(ActivatedRoute);
  protected accountService = inject(AccountService);
  protected formBuilder = inject(FormBuilder);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ConvertFormGroup = this.convertFormService.createConvertFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ convert }) => {
      this.convert = convert;
      if (convert) {
        this.updateForm(convert);
      }
    });
    this.accountService.identity().subscribe(account => {
      this.account = account;

      if (account) {
        this.editForm.patchValue({
          updateBy: account.login,
        });
      }
    });

    this.activatedRoute.data.subscribe(({ convert }) => {
      this.convert = convert;
      if (convert) {
        this.updateForm(convert);
      }
    });

    this.editForm.get('type')?.valueChanges.subscribe(value => {
      if (value === 'Bước nhảy') {
        this.editForm.get('mark')?.disable();
        this.editForm.patchValue({
          mark: '',
        });
      } else {
        this.editForm.get('mark')?.enable();
      }
    });
    // this.editForm = this.convertFormService.createConvertFormGroup();
    this.editForm.get('name')?.addValidators([Validators.required]);
    this.editForm.get('name')?.setAsyncValidators([this.duplicateNameValidator.bind(this)]);
    this.editForm.get('name')?.updateValueAndValidity();
  }

  previousState(): void {
    window.history.back();
  }

  duplicateNameValidator(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value) {
      return of(null);
    }
    if (this.convert && this.convert.name === control.value) {
      return of(null);
    }
    return this.convertService.checkNameExists(control.value).pipe(
      map(isDuplicate => (isDuplicate ? { duplicate: true } : null)),
      catchError(() => of(null)),
    );
  }

  save(): void {
    this.isSaving = true;
    const convert = this.convertFormService.getConvert(this.editForm);
    if (this.editForm.invalid) {
      this.markAllAsTouched();
      this.showValidationError();
      return;
    }
    if (convert.type === 'Bước nhảy') {
      convert.mark = '';
    }
    if (convert.id !== null) {
      convert.updatedAt = dayjs(new Date());
      convert.updateBy = this.account?.login;
      this.subscribeToSaveResponse(this.convertService.update(convert));
    } else {
      convert.createdAt = dayjs(new Date());
      convert.updatedAt = dayjs(new Date());
      convert.updateBy = this.account?.login;
      this.subscribeToSaveResponse(this.convertService.create(convert));
    }
  }

  markAllAsTouched(): void {
    Object.values(this.editForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  showValidationError(): void {
    const errors = this.editForm.get('name')?.errors;
    let errorMessage = 'Vui lòng kiểm tra lại thông tin';

    if (errors?.['required']) {
      errorMessage = 'Tên không được để trống';
    } else if (errors?.['duplicate']) {
      errorMessage = 'Tên này đã tồn tại';
    }

    Swal.fire({
      icon: 'error',
      title: 'Lỗi',
      text: errorMessage,
      confirmButtonText: 'OK',
    });
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IConvert>>): void {
    result.subscribe({
      next: () => {
        Swal.fire({
          title: 'Success',
          text: this.convert?.id ? 'Cập nhật thành công!' : 'Thêm mới thành công!',
          icon: 'success',
          confirmButtonText: 'OK',
        }).then(() => {
          this.onSaveSuccess();
        });
      },
      error: () => {
        Swal.fire({
          title: 'Error',
          text: this.convert?.id ? 'Cập nhật thất bại!' : 'Thêm mới thất bại!',
          icon: 'error',
          confirmButtonText: 'OK',
        }).then(() => {
          this.onSaveError();
        });
      },
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving = false;
  }

  protected updateForm(convert: IConvert): void {
    this.convert = convert;
    this.convertFormService.resetForm(this.editForm, convert);
  }
}
