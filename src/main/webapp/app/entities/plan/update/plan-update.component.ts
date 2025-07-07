import { ChangeDetectorRef, Component, inject, NgZone, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

import SharedModule from 'app/shared/shared.module';
import { AbstractControl, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

import { IPlan } from '../plan.model';
import { PlanService } from '../service/plan.service';
import { PlanFormService, PlanFormGroup } from './plan-form.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MultiSelectModule } from 'primeng/multiselect';
import { DropdownModule } from 'primeng/dropdown';
import { ReportService } from 'app/entities/report/service/report.service';
import dayjs from 'dayjs/esm';
import { DialogModule } from 'primeng/dialog';
import { take } from 'rxjs/operators';
import { CheckLevelService } from 'app/entities/check-level/service/check-level.service';
import { FrequencyService } from 'app/entities/frequency/service/frequency.service';
import { CheckTargetService } from 'app/entities/check-target/service/check-target.service';
import { ReportTypeService } from 'app/entities/report-type/service/report-type.service';
import { SampleReportService } from 'app/entities/sample-report/service/sample-report.service';
import { AccountService } from 'app/core/auth/account.service';
import { Account } from 'app/core/auth/account.model';
import { EvaluatorService } from 'app/entities/evaluator/service/evaluator.service';
import { IEvaluator } from 'app/entities/evaluator/evaluator.model';
import { CheckerGroupService } from 'app/entities/checker-group/service/checker-group.service';
import { SourceService } from 'app/entities/source/service/source.service';
import { FileUploadModule } from 'primeng/fileupload';
import { NewReport } from 'app/entities/report/report.model';
import { ImageModule } from 'primeng/image';
import { ConvertService } from 'app/entities/convert/service/convert.service';
interface PlanDetail {
  id?: number | null;
  checkerName: string;
  code: string;
  createBy: string;
  frequency: string;
  implementer: string;
  name: string;
  nameResult: string;
  numberOfCheck: string;
  paticipant: string;
  planId?: number;
}

@Component({
  standalone: true,
  selector: 'jhi-plan-update',
  templateUrl: './plan-update.component.html',
  styleUrls: ['./plan-update.component.scss'],
  imports: [
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    NgbModule,
    MultiSelectModule,
    DropdownModule,
    DialogModule,
    FileUploadModule,
    ImageModule,
    // BrowserAnimationsModule,
    // BrowserModule,
    // SelectModule
  ],
})
export class PlanUpdateComponent implements OnInit {
  mode: 'NEW' | 'EDIT' | 'COPY' = 'NEW';
  isSaving = false;
  isEditMode = false;
  copiedPlan = false;
  isCopyMode = false;
  plan: IPlan | null = null;
  planDetailResults: any[] = [];
  listReport: any[] = []; // list report where dont have plan
  checkLevels: any[] = [];
  listOfFrequency: any[] = [];
  checkTargets: any[] = [];
  checkTargetBases: any[] = [];
  checkerGroups: any[] = [];
  reportTypes: any[] = [];
  sampleReport: any[] = [];
  evaluator: any[] = [];
  evaluators: any[] = [];
  account: Account | null = null;
  listTitleHeaders: any[] = [];
  listTitleBody: any[] = [];
  listSuggestions: any[] = [];
  listStatusReport: any[] = ['Đang thực hiện', 'Mới tạo', 'Đã hoàn thành'];
  listConvert: any[] = [];
  listReports: NewReport[] = [];
  selectedIndex: number = 0;
  selectedData: any = null;
  @ViewChild('userTesting') userTesting!: TemplateRef<any>;
  dialogVisible = false;
  dialogUploadVisible = false;
  dialogVisibility: { [key: string]: boolean } = {};
  selectedFiles: { dataKey: string; files: File[] }[] = [];
  imageLoadErrors = new Set<string>();
  userTester: any = {};
  selectedReport: any = {}
  isEditReport: boolean = false

  editForm: PlanFormGroup = this.planFormService.createPlanFormGroup();

  constructor(protected planService: PlanService,protected planFormService: PlanFormService,protected activatedRoute: ActivatedRoute,
    protected modalService: NgbModal,protected ngZone: NgZone,protected accountService: AccountService,protected reportService: ReportService,
    protected cdr: ChangeDetectorRef,protected checkLevelService: CheckLevelService,protected frequencyService: FrequencyService,protected checkTargetService: CheckTargetService,
    protected reportTypeService: ReportTypeService,protected sampleReportService: SampleReportService,protected evaluatorService: EvaluatorService,protected checkerGroupService: CheckerGroupService,protected sourceService: SourceService,
    protected convertService: ConvertService, protected router: Router) { }

  ngOnInit(): void {
    this.reportService
      .getAllWherePlanIdIsNull()
      .pipe(take(1))
      .subscribe(res => {
        this.listReport = res ? [...res] : [];
      });

    this.checkLevelService.getAllCheckLevels().subscribe(res => {
      this.checkLevels = res;
    });

    this.frequencyService.getAllCheckFrequency().subscribe(res => {
      this.listOfFrequency = res;
    });

    this.checkTargetService.getAllCheckTargets().subscribe(res => {
      this.checkTargetBases = res;
    });

    this.checkerGroupService.getAllCheckerGroups().subscribe(res => {
      this.checkerGroups = res;
      const checkGroupId = this.checkerGroups.find(x => x.name === this.plan?.subjectOfAssetmentPlan)?.id;
      this.checkTargets = this.checkTargetBases.filter(x => x.checkGroupId === checkGroupId);
    });

    this.reportTypeService.getAllCheckTargets().subscribe(res => {
      this.reportTypes = res;
    });

    this.sampleReportService.getAllCheckTargets().subscribe(res => {
      this.sampleReport = res;
    });

    this.convertService.getTypes().subscribe((converts: any) => {
      this.listConvert = converts;
    });

    this.evaluatorService
      .getAllCheckTargets()
      .pipe(
        switchMap(evaluators => {
          this.evaluators = evaluators;
          evaluators.forEach(e => {});
          return this.checkerGroupService.query();
        }),
      )
      .subscribe({
        next: res => {
          if (res.body) {
          }
        },
        error(error) {},
      });

    this.isCopyMode = history.state.mode === 'COPY' ? true : false;
    this.activatedRoute.data.pipe(take(1)).subscribe(({ plan }) => {
      if (this.isCopyMode) plan.code = `PLAN-COPY-${plan.code}`;
      this.plan = plan;
      if (plan) {
        this.updateForm(plan);
      }
    });

    this.editForm.get('name')?.valueChanges.subscribe(name => {
      if (name) {
        const code = this.generateCode(name);
        this.editForm.patchValue({ code }, { emitEvent: false });
      }
    });
    this.editForm.get('name')?.addValidators([Validators.required]);
    this.editForm.get('name')?.setAsyncValidators([this.duplicateNameValidator.bind(this)]);
    this.editForm.get('name')?.updateValueAndValidity();
    this.accountService.identity().subscribe(account => {
      this.account = account;

      if (account) {
        this.editForm.patchValue({
          updateBy: account.login,
        });
      }
    });
  }


  duplicateNameValidator(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value) {
      return of(null);
    }
    if (this.plan && this.plan.name === control.value) {
      return of(null);
    }
    return this.planService.checkNameExists(control.value).pipe(
      map(isDuplicate => (isDuplicate ? { duplicate: true } : null)),
      catchError(() => of(null)),
    );
  }

  previousState(): void {
    this.router.navigate(['/plan']);
  }

  loadReports(): void {
    this.reportService
      .getAllWherePlanIdIsNull()
      .pipe(take(1))
      .subscribe(res => {
        this.listReport = res;
      });
  }

  loadPlanDetails(planId: number, isCopy: boolean): void {
    this.reportService.getAllByPlanId(planId).subscribe({
      next: details => {
        if (isCopy) {
          // For copy mode, reset IDs
          this.planDetailResults = details.map(
            (detail: PlanDetail): PlanDetail => ({
              ...detail,
              id: null,
              planId: undefined,
            }),
          );
        } else {
          this.planDetailResults = details;
        }
      },
    });
    this.cdr.detectChanges();
  }

  save(): void {
    if (!this.checkAllData()) {
      return;
    }
    this.isSaving = true;
    const formPlan = this.planFormService.getPlan(this.editForm);
    const plan = {
      ...formPlan,
      createBy: formPlan.createBy ?? this.plan?.createBy,
      updatedAt: formPlan.updatedAt ?? this.plan?.updatedAt,
    };
    if (plan.id === null || this.mode === 'COPY') {
      // Create mode
      const newPlan = { ...plan, id: null };
      newPlan.updatedAt = dayjs(new Date());
      newPlan.updateBy = this.account?.login;
      newPlan.createBy = this.account?.login;
      newPlan.status = 'Mới tạo';
      this.planService.create(newPlan).subscribe(response => {
        const savedPlan = response.body;
        plan.updatedAt = dayjs(new Date());
        plan.updateBy = this.account?.login;
        plan.createBy = this.account?.login;
        if (savedPlan) {
          this.saveChildRecords(savedPlan.id);
        } else {
          this.onSaveSuccess();
        }
      });
    } else {
      // Update mode
      plan.updateBy = this.account?.login;
      plan.updatedAt = dayjs(new Date());
      this.planService.update(plan).subscribe(response => {
        const savedPlan = response.body;
        if (savedPlan) {
          this.saveChildRecords(savedPlan.id);
        } else {
          this.onSaveSuccess();
        }
      });
    }
  }

  checkAllData(): boolean {
    if (this.listReports.length == 0) {
      Swal.fire({
        title: 'Error',
        text: `Chưa có biên bản kiểm tra`,
        icon: 'error',
        confirmButtonText: 'OK',
      });
      return false;
    }
    for (let i = 0; i < this.listReports.length; i++) {
      const r = this.listReports[i];
      if (
        !r.name ||
        !r.testOfObject ||
        !r.checker ||
        !r.reportType ||
        !r.sampleReportId ||
        !r.frequency ||
        !r.convertScore ||
        !r.scoreScale ||
        !r.status
      ) {
        Swal.fire({
          title: 'Error',
          text: `Dòng ${i + 1} có trường bị bỏ trống.`,
          icon: 'error',
          confirmButtonText: 'OK',
        });
        return false;
      }
    }
    return true;
  }

  generateCode(name: string): string {
    const currentDate = dayjs().format('DDMMYYYYHHmm');
    const initials = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('');
    return `${initials}-${currentDate}`;
  }

  addNewRow(): void {
    this.dialogVisible = true;
    this.selectedReport = {
      id: null,
      name: '',
      code: '',
      sampleReportId: null,
      testOfObject: '',
      checker: '',
      status: 'Mới tạo',
      frequency: '',
      reportType: '',
      reportTypeId: null,
      groupReport: 0,
      createdAt: dayjs(),
      updatedAt: dayjs(),
      updateBy: this.account?.login,
      scoreScale: '',
      convertScore: '',
      planId: null,
      user: '',
      detail: '',
    };
    // this.listReports.push(newRow);
  }

  saveReportToPlan(data: any) {
    if(!this.isEditReport) {
      this.listReports.push(data)
    }else {
      this.listReports[this.selectedIndex] = data
    }
    this.dialogVisible = false
    this.isEditReport = false
  }

  deleteRow(index: number): void {
    const reportId = this.listReports[index].id as unknown as number;
    if (reportId !== null && reportId !== undefined) {
      this.reportService.delete(reportId).subscribe(() => {
        this.listReports.splice(index, 1);
      });
    } else {
      this.listReports.splice(index, 1);
    }
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen(toast) {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      },
    });
    Toast.fire({
      icon: 'success',
      title: 'Xóa thành công',
    });
  }

  openModalUser(index: number, data: any): void {
    // this.currentReport = data;
    this.modalService
      .open(this.userTesting, {
        ariaLabelledBy: 'modal-basic-title',
        size: 'lg',
        backdrop: 'static',
      })
      .result.then(
        result => {
          data.checker = this.userTester.name;
          this.updateReportName(index, this.userTester.name);
        },
        reason => {},
      );
  }

  showDialogEdit(data: any, index: number): void {
    this.isEditReport = true
    this.selectedIndex = index;
    this.selectedReport = data
    this.dialogVisible = true;
    if (typeof this.listReports[index].detail === 'string') {
      this.listReports[index].detail = JSON.parse(this.listReports[index].detail);
      this.selectedReport.detail = JSON.parse(this.listReports[index].detail);
    }
  }

  removeVietnameseAndSpaces(str: any) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/\s+/g, '')
      .trim();
  }

  updateReportCode(data: any, index: number): void {
    const selectedId = +data.target.value;
    const evaluatorName = this.evaluators[index]?.name ?? '';
    this.listReports[index].code = `${this.sampleReport.find(r => r.id === selectedId).code}-${dayjs().format('DDMMYYYYHHmmssSSS')}`;
    this.listReports[index].name = `${this.removeVietnameseAndSpaces(evaluatorName)}-${this.listReports[index].code}`;
    this.listReports[index].frequency = this.sampleReport.find(r => r.id === selectedId).frequency;
    this.listReports[index].reportType = this.sampleReport.find(r => r.id === selectedId).reportType;
    this.listReports[index].checker = this.evaluators[index].name;
    this.listReports[index].detail = this.sampleReport.find(r => r.id === selectedId).detail;
    this.listTitleBody = JSON.parse(this.listReports[index].detail).body;
    this.listTitleHeaders = JSON.parse(this.listReports[index].detail).header;
    this.listReports[index].detail = {
      header: this.listTitleHeaders,
      body: this.listTitleBody,
    };
  }

  selectReportSample(data: any) {
    const selectedId = +data.target.value;
    const evaluatorName = this.evaluators[0]?.name ?? '';
    this.selectedReport.code = `${this.sampleReport.find(r => r.id === selectedId).code}-${dayjs().format('DDMMYYYYHHmmssSSS')}`;
    this.selectedReport.name = `${this.removeVietnameseAndSpaces(evaluatorName)}-${this.selectedReport.code}`;
    this.selectedReport.frequency = this.sampleReport.find(r => r.id === selectedId).frequency;
    this.selectedReport.reportType = this.sampleReport.find(r => r.id === selectedId).reportType;
    this.selectedReport.checker = this.evaluators[0].name;
    this.selectedReport.detail = this.sampleReport.find(r => r.id === selectedId).detail;
    this.listTitleBody = JSON.parse(this.selectedReport.detail).body;
    this.listTitleHeaders = JSON.parse(this.selectedReport.detail).header;
    this.selectedReport.detail = {
      header: this.listTitleHeaders,
      body: this.listTitleBody,
    };
  }

  updateReportName(name: any, index?: number) {
    if(index) {
      if (name === '' || name === null) {
        this.listReports[index].name = `${this.removeVietnameseAndSpaces(this.listReports[index].checker)}-${this.listReports[index].code}`;
      } else {
        this.listReports[index].name = `${this.removeVietnameseAndSpaces(name)}-${this.listReports[index].code}`;
      }
    }else {
      if (name === '' || name === null) {
        this.selectedReport.name = `${this.removeVietnameseAndSpaces(this.selectedReport.checker)}-${this.selectedReport.code}`;
      } else {
        this.selectedReport.name = `${this.removeVietnameseAndSpaces(name)}-${this.selectedReport.code}`;
      }
    }
  }

  addNewRowBBKT(data: any): void {
    data.detail.body.push({
      data: data.detail.body[0].data.map((x: any) => ({ ...x, value: '' })),
    });
  }

  deleteRowBBKT(index: number, data: any): void {
    Swal.fire({
      title: 'Are you sure you want to delete this row?',
      showCancelButton: true,
      confirmButtonText: `Delete`,
      cancelButtonText: `Cancel`,
    }).then(result => {
      if (result.value) {
        // this.listReports[this.selectedIndex].detail.body.splice(index, 1);
        this.selectedReport.detail.body.splice(index, 1)
      }
    });
  }


  // Region Upload FILE
  showDialogUpLoad(data: any, rowIndex: number, colIndex: number): void {
    const key = `${rowIndex}-${colIndex}`;
    if (data.type === 'img' && !Array.isArray(data.value)) {
      data.value = [];
    }
    this.selectedData = data;
    this.dialogVisibility[key] = !this.dialogVisibility[key];
  }

  onFileSelect(event: any, data: any, index: number): void {
    const files: File[] = Array.from(event.files);
    const dataKey = data.header + '-' + index;
    const existing = this.selectedFiles.find(item => item.dataKey === dataKey);
    if (existing) {
      existing.files = [...existing.files, ...files];
    } else {
      this.selectedFiles.push({ dataKey, files });
    }
    if (!Array.isArray(data.value)) {
      data.value = [];
    }
    const existingNames = new Set(data.value);
    for (const file of files) {
      if (!existingNames.has(file.name)) {
        data.value.push(file.name);
        existingNames.add(file.name);
      }
    }
  }

  deleteFile(filename: string, data: any): void {
    const index = data.value.indexOf(filename);
    if (index > -1) {
      data.value.splice(index, 1);
      this.planService.deleteFile(filename).subscribe(response => {
        console.log('File deleted successfully:', response);
      });
    }
  }

  removeImg(event: any, data: any) {
    const index = data.value.indexOf(event.file.name);
    if (index > -1) {
      data.value.splice(index, 1);
    }
  }

  onClear(data: any): void {
    if (data) {
      data.value = [];
    }
  }

  onImageError(fileName: string) {
    this.imageLoadErrors.add(fileName);
  }

  checkTarget() {
    const checkGroupId = this.checkerGroups.find(x => x.name === this.editForm.get('subjectOfAssetmentPlan')?.value)?.id;
    this.checkTargets = this.checkTargetBases.filter(x => x.checkGroupId === checkGroupId);
    if (this.checkTargets.length === 0) {
      Swal.fire({
        title: 'Error',
        text: `Không có dữ liệu đối tượng đánh giá thuộc nhóm đối tượng đánh giá ${this.editForm.get('subjectOfAssetmentPlan')?.value}`,
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  }

  checkEvaluator() {
    const checkGroupId = this.userTester.checkerGroup.id;
    this.evaluator = this.evaluators.filter(x => x.userGroupId === checkGroupId);
    if (this.evaluator.length === 0) {
      Swal.fire({
        title: 'Error',
        text: `Không có dữ liệu người dùng thuộc nhóm đối tượng đánh giá ${this.userTester.checkerGroup.name}`,
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  }

  checkEvent(header: string, selectedIndex: number): void {
    const data = this.selectedReport?.detail?.header.find((element: any) => element.name === header);
    this.sourceService.getListTable().subscribe(tables => {
      this.sourceService.getListColumns().subscribe(columns => {
        const column = columns.find((element: any) => element[2] === data.field_name);
        const table = tables.find(x => x[2] === data.source_table);
        if (data) {
          const body = { field_name: column[1], source_table: table[1] };
          this.sampleReportService.getListSuggestions(body).subscribe((res: any) => {
            this.listSuggestions = res.body;
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No data found',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      });
    });
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IPlan>>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  async onSaveSuccess() {
    await Swal.fire({
      title: 'Success',
      text: 'Lưu thành công',
      icon: 'success',
      confirmButtonText: 'OK',
    });
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving = false;
  }

  protected updateForm(plan: IPlan): void {
    if (!plan) {
      return;
    }

    const formValues = {
      id: this.isCopyMode ? null : plan.id,
      code: plan.code,
      name: plan.name,
      subjectOfAssetmentPlan: plan.subjectOfAssetmentPlan,
      frequency: plan.frequency,
      timeStart: plan.timeStart ? dayjs(plan.timeStart).format('YYYY-MM-DDTHH:mm') : null,
      timeEnd: plan.timeEnd ? dayjs(plan.timeEnd).format('YYYY-MM-DDTHH:mm') : null,
      status: plan.status,
    };
    this.reportService.getAllByPlanId(plan.id).subscribe(res => {
      this.listReports = res;
      console.log(this.listReports);
    });
    this.editForm.patchValue(formValues);
  }

  protected generateNewCode(name: string): string {
    const currentDate = dayjs().format('DDMMYYYYHHmm');
    const initials = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('');
    return `COPY-${initials}-${currentDate}`;
  }

  protected saveChildRecords(planId: number): void {
    const requestSaves: Observable<any>[] = [];
    if (!this.listReports || this.listReports.length === 0) {
      this.onSaveSuccess();
      return;
    }
    this.listReports.forEach((report: any) => {
      report.detail = typeof report.detail === 'string' ? report.detail : JSON.stringify(report.detail);
      report.planId = planId.toString();
      // report.group = 0;

      const formData = new FormData();
      this.selectedFiles.forEach(fileGroup => {
        fileGroup.files.forEach(file => {
          formData.append('files', file);
        });
      });

      if (report.id === null) {
        const create$ = this.reportService.create(report).pipe(
          finalize(() => {
            this.selectedFiles.forEach(fileGroup => {
              fileGroup.files.forEach(file => {
                this.planService.upLoadFile(file).subscribe();
              });
            });
          }),
        );
        requestSaves.push(create$);
      } else {
        report.createdAt = dayjs(report.createdAt);
        report.updatedAt = dayjs();

        const update$ = this.reportService.update(report).pipe(
          finalize(() => {
            this.selectedFiles.forEach(fileGroup => {
              fileGroup.files.forEach(file => {
                this.planService.upLoadFile(file).subscribe();
              });
            });
          }),
        );
        requestSaves.push(update$);
      }
    });
    forkJoin(requestSaves).subscribe(() => {
      this.onSaveSuccess();
    });
  }
}
