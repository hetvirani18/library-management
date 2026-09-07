import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { AuthUser, AuthUserSchema, LoginCredentials, RegisterInput, UpdateProfileInput } from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);

  private readonly currentUserSignal = signal<AuthUser | null>(null);
  private readonly isLoadingSignal = signal(true);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);
  readonly isLibrarian = computed(() => this.currentUserSignal()?.role === 'Librarian');
  readonly isMember = computed(() => this.currentUserSignal()?.role === 'Member');

  async bootstrap(): Promise<void> {
    try {
      const response = await this.api.get<AuthUser>('/auth/me');
      this.currentUserSignal.set(response.data ? AuthUserSchema.parse(response.data) : null);
    } catch {
      this.currentUserSignal.set(null);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthUser> {
    const response = await this.api.post<AuthUser>('/auth/login', credentials);
    const user = AuthUserSchema.parse(response.data);
    this.currentUserSignal.set(user);
    return user;
  }

  async register(input: RegisterInput): Promise<AuthUser> {
    const response = await this.api.post<AuthUser>('/auth/register', input);
    const user = AuthUserSchema.parse(response.data);
    this.currentUserSignal.set(user);
    return user;
  }

  async updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
    const response = await this.api.put<AuthUser>('/auth/me', input);
    const user = AuthUserSchema.parse(response.data);
    this.currentUserSignal.set(user);
    return user;
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout', {});
    this.currentUserSignal.set(null);
  }
}
