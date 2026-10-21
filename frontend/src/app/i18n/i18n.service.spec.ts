import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(I18nService);
    service.setLocale('en');
  });

  it('translates a key in the current language', () => {
    expect(service.t('common.home')).toBe('Home');

    service.setLocale('pt-BR');

    expect(service.t('common.home')).toBe('Início');
  });

  it('fills placeholders and formats numbers for the current language', () => {
    expect(service.t('common.outOfFiveStars', { rating: 4.5 })).toBe('4.5 out of 5 stars');

    service.setLocale('pt-BR');

    expect(service.t('common.outOfFiveStars', { rating: 4.5 })).toBe('4,5 de 5 estrelas');
  });

  it('picks the plural form from the count', () => {
    expect(service.t('album.trackCount', { count: 1 })).toBe('1 track');
    expect(service.t('album.trackCount', { count: 12 })).toBe('12 tracks');

    service.setLocale('pt-BR');

    expect(service.t('album.trackCount', { count: 1 })).toBe('1 faixa');
    expect(service.t('album.trackCount', { count: 0 })).toBe('0 faixas');
  });

  it('keeps the html lang attribute in sync with the language', () => {
    service.setLocale('pt-BR');
    TestBed.tick();

    expect(document.documentElement.lang).toBe('pt-BR');
  });
});
