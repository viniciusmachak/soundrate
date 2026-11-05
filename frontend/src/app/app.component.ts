import { Component } from '@angular/core';
import { LayoutComponent } from './components/layout/layout.component';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';
import { CookieBannerComponent } from './components/cookie-banner/cookie-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LayoutComponent, AudioPlayerComponent, CookieBannerComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'frontend';
}
