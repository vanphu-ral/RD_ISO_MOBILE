import { Component, inject, OnInit, RendererFactory2, Renderer2, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet, Router, RouterModule } from '@angular/router';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';

import { AccountService } from 'app/core/auth/account.service';
import { AppPageTitleStrategy } from 'app/app-page-title-strategy';
import FooterComponent from '../footer/footer.component';
import PageRibbonComponent from '../profiles/page-ribbon.component';
import SharedModule from 'app/shared/shared.module';
import { LoginService } from 'app/login/login.service';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';

@Component({
  selector: 'jhi-main',
  standalone: true,
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  providers: [AppPageTitleStrategy],
  imports: [RouterOutlet, FooterComponent, PageRibbonComponent, SharedModule, RouterModule, HasAnyAuthorityDirective],
})
export default class MainComponent implements OnInit {

  account = inject(AccountService).trackCurrentAccount();


  IsShowNavbar: boolean = false;
  private clickListener: (() => void) | undefined;
  @ViewChild('sidebarId') sidebarElement!: ElementRef;
  @ViewChild('sidebarToggleButton') toggleButton!: ElementRef;


  constructor(private elementRef: ElementRef, private loginService: LoginService, private renderer: Renderer2, private router: Router, private appPageTitleStrategy: AppPageTitleStrategy, private accountService: AccountService, private translateService: TranslateService, private rootRenderer: RendererFactory2) {
    this.renderer = this.rootRenderer.createRenderer(document.querySelector('html'), null);
  }

  ngOnInit(): void {
    this.accountService.identity().subscribe();
    this.translateService.onLangChange.subscribe((langChangeEvent: LangChangeEvent) => {
      this.appPageTitleStrategy.updateTitle(this.router.routerState.snapshot);
      dayjs.locale(langChangeEvent.lang);
      this.renderer.setAttribute(document.querySelector('html'), 'lang', langChangeEvent.lang);
    });
  }

  login(): void {
    this.loginService.login();
  }

  logout(): void {
    this.closeMenubar();
    this.loginService.logout();
    this.router.navigate(['']);
  }

  toggleSidebar() {
    this.IsShowNavbar = !this.IsShowNavbar;
    document.getElementById('sidebar-id')!.classList.toggle('collapsed');
    document.getElementById('sidebar-id')?.style.setProperty('align-items', this.IsShowNavbar ? 'center' : '');
    document.getElementById('sidebar-id')?.style.setProperty('justify-content', this.IsShowNavbar ? 'center' : 'flex-end');

    const sidebar = this.sidebarElement.nativeElement;
    const toggleBtn = this.toggleButton.nativeElement;
    if (this.IsShowNavbar) {
      this.clickListener = this.renderer.listen(
        'document',
        'click',
        (event: MouseEvent) => {
          const clickedInsideMenubar = sidebar.contains(event.target);
          const clickedOnToggleButton = toggleBtn.contains(event.target);
          if (!clickedInsideMenubar && !clickedOnToggleButton) {
            this.closeMenubar();
          }
        }
      );
    } else {
      this.unsubscribeClickListener();
    }
  }

  closeMenubar() {
    this.IsShowNavbar = false;
    const sidebar = this.sidebarElement.nativeElement;
    this.renderer.removeClass(sidebar, 'collapsed'); 
    this.renderer.setStyle(sidebar, 'align-items', '');
    this.renderer.setStyle(sidebar, 'justify-content', 'flex-end');
    this.unsubscribeClickListener(); 
  }

  private unsubscribeClickListener() {
    if (this.clickListener) {
      this.clickListener(); 
      this.clickListener = undefined;
    }
  }

  ngOnDestroy() {
    this.unsubscribeClickListener();
  }
}
