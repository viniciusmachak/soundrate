import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.css'
})
export class NotFoundPageComponent {}
