import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'app/shared/shared.module';
import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { IConvert } from '../convert.model';
import { ConvertService } from '../service/convert.service';

@Component({
  standalone: true,
  templateUrl: './convert-delete-dialog.component.html',
  imports: [SharedModule, FormsModule],
})
export class ConvertDeleteDialogComponent {
  convert?: IConvert;

  protected convertService = inject(ConvertService);
  protected activeModal = inject(NgbActiveModal);

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: number): void {
    this.convertService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
