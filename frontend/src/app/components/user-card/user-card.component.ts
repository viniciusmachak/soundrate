import { Component, Input } from '@angular/core';
import { User } from '../../models/user.model';

import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './user-card.component.html',
  styleUrl: '../entity-card.shared.css'
})
export class UserCardComponent {
  @Input() user!: User;
}
