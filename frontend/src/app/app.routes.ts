import { Routes, UrlMatcher, UrlSegment } from '@angular/router';
import { authGuard } from './guards/auth.guard';

/**
 * Matches `<prefix>/<numeric id>` only, so `/album/abc` falls through to the not-found page
 * instead of asking the API (Deezer would resolve a non-numeric artist ID as a name search).
 */
function numericIdMatcher(prefix: string): UrlMatcher {
  return (segments: UrlSegment[]) =>
    segments.length === 2 && segments[0].path === prefix && /^\d{1,19}$/.test(segments[1].path)
      ? { consumed: segments, posParams: { id: segments[1] } }
      : null;
}

export const routes: Routes = [
  {
    path: '',
    title: 'titles.home',
    loadComponent: () => import('./pages/home-page/home-page.component').then(m => m.HomePageComponent)
  },
  {
    path: 'login',
    title: 'titles.login',
    loadComponent: () => import('./pages/login-page/login-page.component').then(m => m.LoginPageComponent)
  },
  {
    path: 'register',
    title: 'titles.register',
    loadComponent: () => import('./pages/register-page/register-page.component').then(m => m.RegisterPageComponent)
  },
  {
    path: 'forgot-password',
    title: 'titles.forgotPassword',
    loadComponent: () => import('./pages/forget-password-page/forget-password-page.component').then(m => m.ForgetPasswordPageComponent)
  },
  {
    path: 'reset-password',
    title: 'titles.resetPassword',
    loadComponent: () => import('./pages/reset-password-page/reset-password-page.component').then(m => m.ResetPasswordPageComponent)
  },
  {
    path: 'user/:username',
    title: 'titles.userProfile',
    loadComponent: () => import('./pages/user-profile-page/user-profile-page.component').then(m => m.UserProfilePageComponent)
  },
  {
    matcher: numericIdMatcher('album'),
    title: 'titles.albumDetails',
    loadComponent: () => import('./pages/album-details-page/album-details-page.component').then(m => m.AlbumDetailsPageComponent)
  },
  {
    matcher: numericIdMatcher('artist'),
    title: 'titles.artistDetails',
    loadComponent: () => import('./pages/artist-details-page/artist-details-page.component').then(m => m.ArtistDetailsPageComponent)
  },
  {
    path: 'settings',
    title: 'titles.settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings-page/settings-page.component').then(m => m.SettingsPageComponent)
  },
  {
    path: 'listen-later',
    title: 'titles.listenLater',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/listen-later-page/listen-later-page.component').then(m => m.ListenLaterPageComponent)
  },
  {
    path: 'about',
    title: 'titles.about',
    loadComponent: () => import('./pages/about-page/about-page.component').then(m => m.AboutPageComponent)
  },
  {
    path: '**',
    title: 'titles.notFound',
    loadComponent: () => import('./pages/not-found-page/not-found-page.component').then(m => m.NotFoundPageComponent)
  }
];
