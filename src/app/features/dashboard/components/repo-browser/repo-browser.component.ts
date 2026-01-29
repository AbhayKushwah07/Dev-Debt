import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, GithubRepo } from '../../../../core/services/api.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-repo-browser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" (click)="close.emit()">
      <div class="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col" 
        (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 class="text-lg font-semibold">Import Repository from GitHub</h2>
          <button (click)="close.emit()" class="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <!-- Search -->
        <div class="p-4 border-b border-gray-800">
          <input type="text" 
            [(ngModel)]="searchQuery"
            placeholder="Search repositories..."
            class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500">
        </div>

        <!-- Repo List -->
        <div class="flex-1 overflow-y-auto">
          <div *ngIf="loading()" class="p-8 text-center text-gray-400">
            <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading repositories...
          </div>

          <div *ngIf="error()" class="p-8 text-center text-red-400">
            {{ error() }}
          </div>

          <div *ngIf="!loading() && !error()">
            <div *ngFor="let repo of filteredRepos" 
              class="px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors flex items-center justify-between"
              (click)="selectRepo(repo)">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ repo.name }}</span>
                  <span *ngIf="repo.isPrivate" class="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">Private</span>
                </div>
                <p *ngIf="repo.description" class="text-sm text-gray-400 truncate mt-1">{{ repo.description }}</p>
                <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span *ngIf="repo.language">{{ repo.language }}</span>
                  <span>⭐ {{ repo.stargazersCount }}</span>
                  <span>🍴 {{ repo.forksCount }}</span>
                </div>
              </div>
              <button 
                class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-sm rounded transition-colors flex-shrink-0 ml-4"
                [disabled]="importing() === repo.id"
                (click)="$event.stopPropagation(); importRepo(repo)">
                <span *ngIf="importing() !== repo.id">Import</span>
                <span *ngIf="importing() === repo.id" class="animate-pulse">...</span>
              </button>
            </div>

            <div *ngIf="filteredRepos.length === 0" class="p-8 text-center text-gray-500">
              <div *ngIf="searchQuery">No repositories match "{{ searchQuery }}"</div>
              <div *ngIf="!searchQuery && repos().length === 0">No repositories found in your GitHub account</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RepoBrowserComponent {
  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<void>();

  private api = inject(ApiService);

  repos = signal<GithubRepo[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  importing = signal<number | null>(null);
  searchQuery = '';

  constructor() {
    this.loadRepos();
  }

  get filteredRepos(): GithubRepo[] {
    if (!this.searchQuery) return this.repos();
    const q = this.searchQuery.toLowerCase();
    return this.repos().filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.description?.toLowerCase().includes(q)
    );
  }

  loadRepos() {
    this.loading.set(true);
    this.error.set(null);
    
    this.api.getGithubRepos()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (repos) => this.repos.set(repos),
        error: (err) => this.error.set(err.message || 'Failed to load repositories')
      });
  }

  selectRepo(repo: GithubRepo) {
    // Could show details or auto-import
  }

  importRepo(repo: GithubRepo) {
    this.importing.set(repo.id);
    
    this.api.addRepository(repo)
      .pipe(finalize(() => this.importing.set(null)))
      .subscribe({
        next: () => {
          this.imported.emit();
          this.close.emit();
        },
        error: (err) => {
          if (err.status === 409) {
            alert('Repository already imported');
          } else {
            alert(err.error?.error || 'Failed to import repository');
          }
        }
      });
  }
}
