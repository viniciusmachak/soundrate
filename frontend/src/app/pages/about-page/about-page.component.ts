import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationKey } from '../../i18n/translation.types';

interface AboutFeature {
  icon: string;
  image: string;
  imageAlt: TranslationKey;
  label: TranslationKey;
  title: TranslationKey;
  description: TranslationKey;
  reversed: boolean;
}

interface Technology {
  name: string;
  image: string;
}

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.css',
})
export class AboutPageComponent {
  isTechnologyMarqueePaused = false;

  readonly features: AboutFeature[] = [
    {
      icon: 'travel_explore',
      image: '/albums-wallpaper.png',
      imageAlt: 'about.features.discover.imageAlt',
      label: 'about.features.discover.label',
      title: 'about.features.discover.title',
      description: 'about.features.discover.description',
      reversed: false,
    },
    {
      icon: 'star',
      image: '/rate-image.png',
      imageAlt: 'about.features.rate.imageAlt',
      label: 'about.features.rate.label',
      title: 'about.features.rate.title',
      description: 'about.features.rate.description',
      reversed: true,
    },
    {
      icon: 'forum',
      image: '/share-image.png',
      imageAlt: 'about.features.share.imageAlt',
      label: 'about.features.share.label',
      title: 'about.features.share.title',
      description: 'about.features.share.description',
      reversed: false,
    },
    {
      icon: 'bookmark',
      image: '/listen-later.png',
      imageAlt: 'about.features.later.imageAlt',
      label: 'about.features.later.label',
      title: 'about.features.later.title',
      description: 'about.features.later.description',
      reversed: true,
    },
  ];

  readonly technologies: Technology[] = [
    {
      name: 'Java',
      image: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg',
    },
    {
      name: 'Spring Boot',
      image: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/spring/spring-original.svg',
    },
    {
      name: 'TypeScript',
      image:
        'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg',
    },
    {
      name: 'Angular',
      image:
        'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/angular/angular-original.svg',
    },
    {
      name: 'PostgreSQL',
      image:
        'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg',
    },
    {
      name: 'Angular Material',
      image: 'https://cdn.simpleicons.org/materialdesign',
    },
    {
      name: 'RxJS',
      image: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/rxjs/rxjs-original.svg',
    },
    {
      name: 'Docker',
      image: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg',
    },
  ];

  hideUnavailableImage(event: Event): void {
    const image = event.target;

    if (image instanceof HTMLImageElement) {
      image.hidden = true;
    }
  }

  toggleTechnologyMarquee(): void {
    this.isTechnologyMarqueePaused = !this.isTechnologyMarqueePaused;
  }
}
