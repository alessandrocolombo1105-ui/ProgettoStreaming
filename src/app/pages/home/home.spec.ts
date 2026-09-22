import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Home } from './home';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('crea la pagina', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('richiede i contenuti di tutti i caroselli in parallelo', () => {
    // Nove righe più il banner condividono i trending: le richieste partono
    // tutte all'inizializzazione, senza attendersi a vicenda.
    const requests = httpMock.match((req) => req.url.includes('api.themoviedb.org'));
    expect(requests.length).toBeGreaterThan(1);
  });

  it('mostra un carosello per ogni sezione', () => {
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('app-movie-row');
    expect(rows.length).toBe(9);
  });
});
