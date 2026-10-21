import { Component, Input } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';

export type SkeletonVariant = 'cards' | 'detail' | 'profile' | 'list';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './skeleton-loader.component.html',
  styleUrl: './skeleton-loader.component.css'
})
export class SkeletonLoaderComponent {
  @Input() variant: SkeletonVariant = 'cards';
  @Input() count = 6;

  get items(): number[] {
    return Array.from({ length: this.count }, (_, index) => index);
  }
}
