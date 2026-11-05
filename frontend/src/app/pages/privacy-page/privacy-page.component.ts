import { Component } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationKey } from '../../i18n/translation.types';

interface PolicySection {
  title: TranslationKey;
  paragraphs?: TranslationKey[];
  items?: TranslationKey[];
}

/** Public privacy policy; its URL is also what Google's OAuth consent screen links to. */
@Component({
  selector: 'app-privacy-page',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './privacy-page.component.html',
  styleUrl: './privacy-page.component.css'
})
export class PrivacyPageComponent {
  readonly contactEmail = 'viniciuscmachak@gmail.com';

  readonly sections: PolicySection[] = [
    {
      title: 'privacy.collect.title',
      items: ['privacy.collect.account', 'privacy.collect.activity', 'privacy.collect.google']
    },
    { title: 'privacy.use.title', paragraphs: ['privacy.use.body'] },
    {
      title: 'privacy.services.title',
      items: [
        'privacy.services.deezer',
        'privacy.services.google',
        'privacy.services.cloudinary',
        'privacy.services.email',
        'privacy.services.analytics'
      ]
    },
    { title: 'privacy.storage.title', paragraphs: ['privacy.storage.body'] },
    { title: 'privacy.choices.title', paragraphs: ['privacy.choices.body'] }
  ];
}
