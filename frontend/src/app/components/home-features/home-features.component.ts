import { Component } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-home-features',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './home-features.component.html',
  styleUrl: './home-features.component.css'
})
export class HomeFeaturesComponent {}
