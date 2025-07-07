import { Component, NgZone, inject, OnInit, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Data, ParamMap, Router, RouterModule } from '@angular/router';
import { combineLatest, filter, Observable, Subscription, tap } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationService, PrimeNGConfig, TreeNode } from 'primeng/api'; // Import TreeNode
import Swal from 'sweetalert2';

import SharedModule from 'app/shared/shared.module';
import { sortStateSignal, SortDirective, SortByDirective, type SortState, SortService } from 'app/shared/sort';
import { FormatMediumDatetimePipe } from 'app/shared/date';
import { FormsModule } from '@angular/forms';
import { SORT, ITEM_DELETED_EVENT, DEFAULT_SORT_DATA } from 'app/config/navigation.constants';
import { IPlan } from '../plan.model';
import { EntityArrayResponseType, PlanService } from '../service/plan.service';
import { TreeTableModule } from 'primeng/treetable';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { SummarizePlanComponent } from 'app/entities/summarize-plan/summarize-plan.component';
import { TagModule } from 'primeng/tag';
import { ReportService } from 'app/entities/report/service/report.service';
import { EvaluatorService } from 'app/entities/evaluator/service/evaluator.service';
import { ConvertService } from 'app/entities/convert/service/convert.service';
import { FileUploadModule } from 'primeng/fileupload';
import dayjs from 'dayjs/esm';
import { PlanGroupService } from 'app/entities/plan-group/service/plan-group.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { HttpResponse } from '@angular/common/http';
import { ExportExcelService } from '../service/export-excel.service';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { AccountService } from 'app/core/auth/account.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  standalone: true,
  selector: 'jhi-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
  imports: [
    RouterModule,
    FormsModule,
    SharedModule,
    SortDirective,
    SortByDirective,
    FormatMediumDatetimePipe,
    TreeTableModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    NgbModule,
    DialogModule,
    TagModule,
    FileUploadModule,
    HasAnyAuthorityDirective,
    CalendarModule,
    CheckboxModule,
    ConfirmDialogModule
  ],
  providers: [SummarizePlanComponent, ConfirmationService],
})
export class PlanComponent implements OnInit {
  subscription: Subscription | null = null;
  plans?: IPlan[];
  isLoading = false;
  sortState = sortStateSignal({});
  @ViewChild('dt2') dt2!: any;
  planDetailResults: any[] = [];
  planParent: any = {};
  checkTargets: any[] = [];
  planEvaluations: any[] = [];
  checkPlanDetails: any[] = [];
  criteriaSummaries: any = [];

  pageSizeOptions: number[] = [5, 10, 20, 30, 50, 100];
  selectedPageSize: number = 10;
  first: number = 0;
  totalRecords: number = 0;
  dialogCheckPlan = false;
  dialogCheckPlanChild = false;
  dialogGeneralCheckPlan = false;
  dialogSummaryOfCriteriaConclusion = false;
  dialogListReportByPlan: boolean = false
  evaluators: any[] = [];
  planGrDetail: any[] = [];
  listEvalReports: any = [];
  listEvalReportBase: any = [];
  planGroup: any = {};
  selectedData: any = null;
  dialogVisibility: { [key: string]: boolean } = {};
  disableSaveCheckDate: { [key: string]: boolean } = {};
  isNameDuplicate: { [key: string]: boolean } = {};
  selectedFiles: { dataKey: string; files: File[] }[] = [];
  imageLoadErrors = new Set<string>();
  report: any = {};
  reportSelected: any = {};
  currentPage: number = 0;
  minSelectableDate!: Date;
  maxSelectableDate!: Date;
  account: any = {};
  selectedPlan: any = {}
  listReportByPlan: any = []
  noteDialogVisible = false;
  selectedReport: any = null;

  trackId = (_index: number, item: IPlan): number => this.planService.getPlanIdentifier(item);

  constructor(
    public router: Router,
    protected planService: PlanService,
    protected activatedRoute: ActivatedRoute,
    protected modalService: NgbModal,
    protected convertService: ConvertService,
    protected sortService: SortService,
    protected ngZone: NgZone,
    protected summarizePlanDiaglog: SummarizePlanComponent,
    protected evaluatorService: EvaluatorService,
    protected planGrService: PlanGroupService,
    private exportExcelService: ExportExcelService,
    private cdr: ChangeDetectorRef,
    private accountService: AccountService,
    private confirmationService: ConfirmationService,
    private reportService: ReportService,
    private primengConfig: PrimeNGConfig
  ) { }

  ngOnInit(): void {
    this.primengConfig.setTranslation({
      dayNamesMin: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
      monthNames: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
      monthNamesShort: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"],
      today: 'Hôm nay',
      clear: 'Xóa',
      dateFormat: 'dd/mm/yy',
      firstDayOfWeek: 1,
    });
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => {
          if (!this.plans || this.plans.length === 0) {
            this.load();
          }
        }),
      )
      .subscribe();
    this.evaluatorService.getAllCheckTargets().subscribe(res => {
      this.evaluators = res;
    });
    this.convertService.query().subscribe(res => {
      this.listEvalReportBase = res.body;
    });
    this.accountService.identity().subscribe(account => {
      this.account = account;
    });
  }

  hasAnyAuthority(authorities: string[]): boolean {
    return this.accountService.hasAnyAuthority(authorities);
  }

  duplicateNameValidator(name: string | null, index: number): void {
    if (!name) {
      this.isNameDuplicate[index] = false;
      return;
    }
    this.planGrService.checkNameExists(name).subscribe({
      next: isDuplicate => {
        this.isNameDuplicate[index] = isDuplicate;
      },
      error: () => {
        this.isNameDuplicate[index] = false;
      },
    });
  }

  onPageSizeChange(event: any): void {
    this.selectedPageSize = event.rows;
    this.first = event.first;
  }

  showListReport(plan: any) {
    this.dialogListReportByPlan = true
    this.selectedPlan = plan
    this.planService.getAllStatisReportByPlanId(plan.id).subscribe(res => {
      console.log(res);
      this.listReportByPlan = res.body
    })
  }

  showDialogCheckPlan(data: any, index: number): void {
    this.planParent = data;
    this.report = this.listReportByPlan[index];
    this.loadEvalTable(this.listReportByPlan[index].id);
    this.minSelectableDate = new Date(this.planParent.timeStart);
    this.maxSelectableDate = new Date(this.planParent.timeEnd);
    this.minSelectableDate.setHours(0, 0, 0, 0);
    this.maxSelectableDate.setHours(23, 59, 59, 999);
    this.dialogCheckPlan = true;
  }

  getTotalPoit(data: any) {
    if (data.convertScore == 'Tính điểm') {
      const markNC = this.listEvalReportBase.find((item: any) => item.name == 'NC');
      const markLC = this.listEvalReportBase.find((item: any) => item.name == 'LY');
      const totalPointSummarize = data.scoreScale * data.sumOfAudit - (data.sumOfLy * markLC.mark + data.sumOfNc * markNC.mark);
      return totalPointSummarize;
    } else {
      return data.scoreScale;
    }
  }

  delete(plan: IPlan): void {
    this.confirmationService.confirm({
      message: 'Bạn có muốn xóa kế hoạch này ?',
      header: 'Xóa kế hoạch',
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text p-button-text',
      acceptIcon: 'none',
      rejectIcon: 'none',
      accept: () => {
        this.planService.delete(plan.id).subscribe(() => { this.load() })
      },
      reject: () => { },
    });
  }

  load(): void {
    this.isLoading = true;
    this.queryBackend().subscribe({
      next: res => {
        if (res.body) {
          this.planDetailResults = res.body;
          this.planDetailResults = this.planDetailResults.map(item => {
            return {
              ...item,
              timeStart: new Date(item.timeStart),
              timeEnd: new Date(item.timeEnd),
              createdAt: new Date(item.createdAt),
            }
          })
          this.totalRecords = this.planDetailResults.length;
          this.isLoading = false;
        }
      },
    });
  }


  navigateToInspectionReport(): void {
    this.router.navigate(['inspection-report']);
  }

  navigateToGrossScript(): void {
    this.router.navigate(['gross-script']);
  }

  restorePaginatorState() {
    if (this.dt2 && this.dt2.paginator) {
      this.dt2.first = this.currentPage * this.dt2.rows;
      // Kích hoạt lại phân trang để nó áp dụng trạng thái mới
      this.dt2.onLazyLoad.emit({
        first: this.dt2.first,
        rows: this.dt2.rows,
        sortField: this.dt2.sortField,
        sortOrder: this.dt2.sortOrder,
        filters: this.dt2.filters,
        globalFilter: this.dt2.globalFilter,
      });
    }
  }

  showDialogCheckPlanChild(data: any): void {
    // // Lấy kiểu đánh giá tương ứng với BBKT
    data.createdBy = this.account.login;
    data.checker = this.report.checker;
    this.planGroup = data;
    this.listEvalReports = this.listEvalReportBase.filter((item: any) => item.type === this.report.convertScore);
    if (data.id) {
      this.planGrService.findAllDetail(data.id).subscribe(res => {
        this.planGrDetail = res.body.map((item: any) => {
          return {
            ...item,
            image: JSON.parse(item.image),
          };
        });
      });
    } else {
      this.report.detail = typeof this.report.detail === 'string' ? JSON.parse(this.report.detail) : this.report.detail;
      this.planGrDetail = this.report.detail.body.map((row: any) => {
        const criterialGroup = row.data.find((item: any) => item.index === 1)?.value || '';
        const criterial = row.data.find((item: any) => item.index === 2)?.value || '';
        return {
          criterialGroupName: criterialGroup,
          criterialName: criterial,
          createdBy: data.createdBy,
          frequency: row.frequency,
        };
      });
      this.planGrDetail.sort((a, b) => a.criterialGroupName.localeCompare(b.criterialGroupName));
    }
    this.dialogCheckPlanChild = true;
  }

  getSeverity(status: string): any {
    switch (status) {
      case 'Đã hoàn thành':
        return 'success';
      case 'Chưa hoàn thành':
        return 'danger';
      case 'Đang thực hiện':
        return 'warning';
      case 'Mới tạo':
        return 'info';
    }
  }

  protected fillComponentAttributeFromRoute(params: ParamMap, data: Data): void {
    this.sortState.set(this.sortService.parseSortParam(params.get(SORT) ?? data[DEFAULT_SORT_DATA]));
  }


  protected queryBackend(): Observable<EntityArrayResponseType> {
    this.isLoading = true;
    const queryObject: any = {
      sort: this.sortService.buildSortParam(this.sortState()),
    };
    return this.planService.query(queryObject).pipe(tap(() => (this.isLoading = false)));
  }

  addRowPlanEvaluation(): void {
    this.planEvaluations.push({});
  }

  deletePlanChild(data: any, index: number): void {
    if (data && data.length > 0) {
      if (data[index].id) {
        this.planGrService.delete(data[index].id).subscribe({
          next: () => {
            console.log('Xóa thành công kế hoạch con');
            data.splice(index, 1);
          },
          error: error => {
            console.error('Lỗi khi xóa kế hoạch con:', error);
          },
        });
      } else {
        data.splice(index, 1);
      }
    }
  }

  // region
  // xử lý uploda file
  showDialogUpLoad(data: any, rowIndex: number): void {
    data.image = typeof data.image == 'string' ? JSON.parse(data.image) : data.image;
    if (!Array.isArray(data.image)) {
      data.image = [];
    }
    this.selectedData = data;
    this.dialogVisibility[rowIndex] = !this.dialogVisibility[rowIndex];
    this.imageLoadErrors.clear();
    this.cdr.detectChanges();
  }

  onFileSelect(event: any, data: any, index: number): void {
    const files: File[] = Array.from(event.files);
    const dataKey = data.reportCode + '-' + index;
    const existing = this.selectedFiles.find(item => item.dataKey === dataKey);
    if (existing) {
      existing.files = [...existing.files, ...files];
    } else {
      this.selectedFiles.push({ dataKey, files });
    }
    if (!Array.isArray(data.image)) {
      data.image = [];
    }
    const existingNames = new Set(data.image);
    for (const file of files) {
      const safeFileName = this.sanitizeFileName(file.name);
      if (!existingNames.has(safeFileName)) {
        data.image.push(safeFileName);
        existingNames.add(safeFileName);
      }
    }
  }

  deleteFile(filename: string, data: any): void {
    const index = data.image.indexOf(filename);
    if (index > -1) {
      data.image.splice(index, 1);
      this.planService.deleteFile(filename).subscribe(response => {
        console.log('File deleted successfully:', response);
      });
    }
  }

  removeImg(event: any, data: any) {
    const index = data.image.indexOf(event.file.name);
    if (index > -1) {
      data.image.splice(index, 1);
    }
  }

  onClear(data: any): void {
    if (data) {
      data.image = [];
    }
  }

  onImageError(fileName: string) {
    this.imageLoadErrors.add(fileName);
    this.cdr.detectChanges();
  }

  getTimestamp(): number {
    return Date.now();
  }

  sanitizeFileName(filename: string): string {
    return filename
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\-\.]/g, '');
  }

  generateCode(planId: number): string {
    const uid = window.crypto?.randomUUID?.() || this.fallbackUUID();
    const currentDate = dayjs().format('DDMMYYYYHHmmssSSS');
    return `PG-${planId}-${uid}-${currentDate}`;
  }

  private fallbackUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      // eslint-disable-next-line no-bitwise
      const r = (Math.random() * 16) | 0;
      // eslint-disable-next-line no-bitwise
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  openNoteDialog(report: any, index: number): void {
    if (report.hasEvaluation === 0) return;
    this.selectedReport = report;
    this.noteDialogVisible = true;
  }

  async savePlanGrAndDetail() {
    // Gán các giá trị khởi tạo nếu là tạo mới
    if (this.planGroup.id === undefined || this.planGroup.id === null) {
      this.planGroup.code = this.generateCode(this.planParent.id);
      this.planGroup.planId = this.planParent.id;
      this.planGroup.checkDate = dayjs(this.planGroup.checkDate).toISOString();
      this.planGroup.type = 'single';
      this.planGroup.createdAt = dayjs();
      this.planGroup.status = 'Mới tạo';
    } else {
      this.planGroup.checkDate = dayjs(this.planGroup.checkDate).toISOString();
      if (this.planGroup.status !== 'Đang thực hiện') {
        this.planGroup.status = 'Đang thực hiện';
      }
    }
    try {
      const res = await this.planService.createGroupHistory(this.planGroup).toPromise();
      const arrRptGrDetail = this.planGrDetail.map(item => ({
        ...item,
        createdAt: this.planGroup.checkDate,
        createdBy: this.planGroup.createdBy,
        planGroupHistoryId: res.body,
        reportId: this.report.id,
        reportName: this.report.name,
        status: item.result != null || item.hasEvaluation == 0 ? 'Đang thực hiện' : 'Mới tạo',
        convertScore: this.report.convertScore,
        image: JSON.stringify(item.image),
      }));
      const uploadPromises = this.selectedFiles.flatMap(fileGroup =>
        fileGroup.files.map(file => {
          const safeFileName = this.sanitizeFileName(file.name);
          const safeFile = new File([file], safeFileName, { type: file.type });
          return this.planService.upLoadFile(safeFile).toPromise();
        }),
      );
      await Promise.all(uploadPromises);
      this.planGroup.id = res.body;
      if (this.planGroup.status !== 'Đang thực hiện') {
        this.planGroup.status = 'Đang thực hiện';
      }
      if (arrRptGrDetail.length > 0) {
        await this.planService.createGroupHistoryDetail(arrRptGrDetail).toPromise();
      }
      if (this.report.status == 'Mới tạo') {
        this.report.detail = typeof this.report.detail === 'string' ? this.report.detail : JSON.stringify(this.report.detail);
        this.report.status = 'Đang thực hiện';
        this.report.createdAt = dayjs(this.report.createdAt);
        this.report.updatedAt = dayjs();
        await this.reportService.update(this.report).toPromise();
      }
      if (this.planParent.status == 'Mới tạo') {
        this.planParent.status = 'Đang thực hiện';
        this.planParent.timeStart = dayjs(this.planParent.timeStart);
        this.planParent.timeEnd = dayjs(this.planParent.timeEnd);
        this.planParent.createdAt = dayjs(this.planParent.createdAt);
        this.planParent.updatedAt = dayjs();
        await this.planService.update(this.planParent).toPromise();
      }
      const Toast = Swal.mixin({
        toast: true,
        position: 'center-end',
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
        title: 'Lưu dữ liệu thành công',
      });
      this.loadEvalTable(this.report.id);
      this.dialogCheckPlanChild = false;
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu:', error);
      Swal.fire('Lỗi', 'Đã xảy ra lỗi khi lưu dữ liệu.', 'error');
    }
  }

  loadEvalTable(planId: number) {
    this.planGrService.findAllPlanGrByReportId(planId).subscribe(res => {
      this.planEvaluations = res.body || [];
      this.planEvaluations = this.planEvaluations
        .filter((item: any) => item.type === 'single')
        .map((item: any) => {
          const dateOnly = item.checkDate ? new Date(item.checkDate) : '';
          return {
            ...item,
            checkDate: dateOnly,
          };
        });
      if (this.planEvaluations.length === 0) {
        this.planEvaluations.push({});
      }
    });
  }

  handleEnter(event: any): void {
    event.preventDefault(); 
    this.noteDialogVisible = false;
  }
}
