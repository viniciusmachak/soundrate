import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, debounceTime, distinctUntilChanged, finalize, map, Subscription } from 'rxjs';
import { FollowedArtist } from '../../models/followed-artist.model';
import { SocialUser } from '../../models/social-user.model';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { FeedbackService } from '../../services/feedback.service';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

export interface UserListDialogData {
  username: string;
  listType: 'followers' | 'following';
  totalCount: number;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatTabsModule,
    RouterLink,
    SkeletonLoaderComponent,
    TranslatePipe
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit {
  private readonly usersSubject = new BehaviorSubject<SocialUser[]>([]);
  readonly users$ = this.usersSubject.asObservable();

  private readonly artistsSubject = new BehaviorSubject<FollowedArtist[]>([]);
  readonly artists$ = this.artistsSubject.asObservable();

  private currentUsersPage = 0;
  private currentArtistsPage = 0;
  private readonly pageSize = 20;
  private usersQuery = '';
  private artistsQuery = '';
  private hasAttemptedUsersLoad = false;
  private hasAttemptedArtistsLoad = false;
  private usersRequest?: Subscription;
  private artistsRequest?: Subscription;
  private readonly updatingUserIds = new Set<number>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  activeTabIndex = 0;
  hasMoreUsers = true;
  hasMoreArtists = true;
  isLoadingUsers = false;
  isLoadingArtists = false;
  showUsersSkeleton = false;
  showArtistsSkeleton = false;
  usersError = false;
  artistsError = false;
  usersTotal = 0;
  artistsTotal = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: UserListDialogData,
    private readonly apiService: ApiService,
    private readonly authService: AuthService,
    private readonly feedback: FeedbackService,
    private readonly destroyRef: DestroyRef,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.resetUsers('');

    this.searchControl.valueChanges
      .pipe(
        map(query => query.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(query => {
        if (this.activeTabIndex === 1) {
          this.resetArtists(query);
        } else {
          this.resetUsers(query);
        }
      });
  }

  loadUsers(): void {
    if (this.isLoadingUsers) return;

    const pageNumber = this.currentUsersPage;
    this.isLoadingUsers = true;
    this.usersError = false;
    this.showUsersSkeleton = !this.hasAttemptedUsersLoad;
    this.hasAttemptedUsersLoad = true;

    const request = this.data.listType === 'followers'
      ? this.apiService.getFollowers(this.data.username, pageNumber, this.pageSize, this.usersQuery)
      : this.apiService.getFollowing(this.data.username, pageNumber, this.pageSize, this.usersQuery);

    this.usersRequest = request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishUsersLoading())
      )
      .subscribe({
        next: page => {
          const currentUsers = pageNumber === 0 ? [] : this.usersSubject.getValue();
          this.usersSubject.next([...currentUsers, ...page.content]);
          this.usersTotal = page.totalElements;
          this.hasMoreUsers = !page.last;
          this.currentUsersPage = pageNumber + 1;
        },
        error: () => {
          this.usersError = true;
        }
      });
  }

  loadArtists(): void {
    if (this.data.listType !== 'following' || this.isLoadingArtists) return;

    const pageNumber = this.currentArtistsPage;
    this.isLoadingArtists = true;
    this.artistsError = false;
    this.showArtistsSkeleton = !this.hasAttemptedArtistsLoad;
    this.hasAttemptedArtistsLoad = true;

    this.artistsRequest = this.apiService
      .getFollowingArtists(this.data.username, pageNumber, this.pageSize, this.artistsQuery)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishArtistsLoading())
      )
      .subscribe({
        next: page => {
          const currentArtists = pageNumber === 0 ? [] : this.artistsSubject.getValue();
          this.artistsSubject.next([...currentArtists, ...page.content]);
          this.artistsTotal = page.totalElements;
          this.hasMoreArtists = !page.last;
          this.currentArtistsPage = pageNumber + 1;
        },
        error: () => {
          this.artistsError = true;
        }
      });
  }

  onTabChange(index: number): void {
    this.activeTabIndex = index;
    const query = this.searchControl.value.trim();

    if (index === 1) {
      if (!this.hasAttemptedArtistsLoad || this.artistsQuery !== query) this.resetArtists(query);
    } else if (this.usersQuery !== query) {
      this.resetUsers(query);
    }
  }

  retryUsers(): void {
    this.loadUsers();
  }

  retryArtists(): void {
    this.loadArtists();
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  canFollowUser(user: SocialUser): boolean {
    return this.authService.isAuthenticated()
      && this.authService.currentUserValue?.username !== user.username;
  }

  isUpdatingUser(userId: number): boolean {
    return this.updatingUserIds.has(userId);
  }

  toggleUserFollow(user: SocialUser): void {
    if (!this.canFollowUser(user) || this.isUpdatingUser(user.id)) return;

    const wasFollowed = user.isFollowedByCurrentUser;
    this.updatingUserIds.add(user.id);
    this.updateUserFollowState(user.id, !wasFollowed);

    const request = wasFollowed
      ? this.apiService.unfollowUser(user.username)
      : this.apiService.followUser(user.username);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.updatingUserIds.delete(user.id);
        this.feedback.success(
          this.i18n.t(wasFollowed ? 'userList.feedback.unfollowed' : 'userList.feedback.followed',
            { username: user.username }),
          this.i18n.t(wasFollowed ? 'userList.feedback.unfollowedMessage' : 'userList.feedback.followedMessage')
        );
      },
      error: () => {
        this.updatingUserIds.delete(user.id);
        this.updateUserFollowState(user.id, wasFollowed);
        this.feedback.error(
          this.i18n.t(wasFollowed ? 'userList.feedback.unfollowError' : 'userList.feedback.followError',
            { username: user.username }),
          this.i18n.t('userList.feedback.errorMessage')
        );
      }
    });
  }

  get title(): string {
    return this.i18n.t(this.data.listType === 'followers' ? 'userList.followersTitle' : 'userList.followingTitle',
      { count: this.data.totalCount });
  }

  get searchLabel(): string {
    return this.i18n.t(this.activeTabIndex === 1 ? 'userList.searchArtists' : 'userList.searchPeople');
  }

  get peopleEmptyMessage(): string {
    const query = this.searchControl.value.trim();
    const username = this.data.username;
    if (query) return this.i18n.t('userList.noPeopleMatch', { query });
    if (this.data.listType === 'followers') return this.i18n.t('userList.noFollowers', { username });
    return this.i18n.t('userList.noFollowingPeople', { username });
  }

  get artistsEmptyMessage(): string {
    const query = this.searchControl.value.trim();
    if (query) return this.i18n.t('userList.noArtistsMatch', { query });
    return this.i18n.t('userList.noFollowingArtists', { username: this.data.username });
  }

  private resetUsers(query: string): void {
    this.usersRequest?.unsubscribe();
    this.usersQuery = query;
    this.currentUsersPage = 0;
    this.usersTotal = 0;
    this.hasMoreUsers = true;
    this.isLoadingUsers = false;
    this.usersError = false;
    this.usersSubject.next([]);
    this.loadUsers();
  }

  private resetArtists(query: string): void {
    this.artistsRequest?.unsubscribe();
    this.artistsQuery = query;
    this.currentArtistsPage = 0;
    this.artistsTotal = 0;
    this.hasMoreArtists = true;
    this.isLoadingArtists = false;
    this.artistsError = false;
    this.artistsSubject.next([]);
    this.loadArtists();
  }

  private finishUsersLoading(): void {
    this.isLoadingUsers = false;
    this.showUsersSkeleton = false;
  }

  private finishArtistsLoading(): void {
    this.isLoadingArtists = false;
    this.showArtistsSkeleton = false;
  }

  private updateUserFollowState(userId: number, isFollowed: boolean): void {
    this.usersSubject.next(
      this.usersSubject.getValue().map(user =>
        user.id === userId ? { ...user, isFollowedByCurrentUser: isFollowed } : user
      )
    );
  }
}
