import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CookieBannerComponent } from './cookie-banner.component';

describe('CookieBannerComponent', () => {
  const STORAGE_KEY = 'soundrate.cookieNoticeDismissed';

  function render() {
    TestBed.configureTestingModule({
      imports: [CookieBannerComponent],
      providers: [provideRouter([])]
    });
    const fixture = TestBed.createComponent(CookieBannerComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('shows the notice and links to the privacy policy on a first visit', () => {
    const banner: HTMLElement = render().nativeElement;

    expect(banner.querySelector('.cookie-banner')).not.toBeNull();
    expect(banner.querySelector('a')?.getAttribute('href')).toBe('/privacy');
  });

  it('hides the notice and remembers the choice when dismissed', () => {
    const fixture = render();

    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cookie-banner')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('stays hidden once it has been dismissed', () => {
    localStorage.setItem(STORAGE_KEY, 'true');

    expect(render().nativeElement.querySelector('.cookie-banner')).toBeNull();
  });
});
