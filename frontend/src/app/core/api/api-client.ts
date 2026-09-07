import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API_BASE_URL } from '../../types/constants';
import { ApiResponse, RequestError } from './api-response.types';

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(endpoint: string) {
    return this.request<T>('GET', endpoint);
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>('POST', endpoint, body);
  }

  put<T>(endpoint: string, body: unknown) {
    return this.request<T>('PUT', endpoint, body);
  }

  patch<T>(endpoint: string, body: unknown) {
    return this.request<T>('PATCH', endpoint, body);
  }

  delete<T>(endpoint: string) {
    return this.request<T>('DELETE', endpoint);
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const request$ = this.http
      .request<ApiResponse<T>>(method, url, {
        body,
        withCredentials: true,
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          const body = error.error as ApiResponse<T> | null;
          return throwError(
            () =>
              new RequestError(
                body?.error?.message ?? 'Request failed',
                body?.error?.code ?? 0,
                error.status,
              ),
          );
        }),
      );

    return firstValueFrom(request$);
  }
}
