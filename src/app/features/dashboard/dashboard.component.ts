import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScanStore } from '../../core/state/scan.store';
import { HeatmapComponent } from './components/heatmap/heatmap.component';
import { SprawlMetricsComponent } from './components/sprawl-metrics/sprawl-metrics.component';
import { RepoBrowserComponent } from './components/repo-browser/repo-browser.component';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService, DebtMetric, Repository } from '../../core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeatmapComponent, SprawlMetricsComponent, RepoBrowserComponent],
  template: `
    <div class="flex h-screen bg-gray-950 text-white overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-72 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div class="p-4 border-b border-gray-800">
          <div class="flex items-center justify-between mb-1">
            <h1 class="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">DevDebt</h1>
            <button (click)="logout()" class="text-xs text-gray-400 hover:text-red-400 transition-colors">Logout</button>
          </div>
          <p class="text-xs text-gray-500">Sprawl Detector</p>
        </div>
        
        <!-- Import Button -->
        <div class="p-4 border-b border-gray-800">
          <button 
            (click)="showRepoBrowser.set(true)"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
            <span class="text-lg">+</span> Import from GitHub
          </button>
        </div>

        <!-- Repository List -->
        <div class="flex-1 overflow-y-auto p-4">
          <h3 class="text-xs font-semibold text-gray-500 uppercase mb-3">Your Repositories</h3>
          
          <div *ngIf="store.isLoading()" class="text-sm text-gray-500 animate-pulse">Loading...</div>
          
          <ul class="space-y-1">
            <li *ngFor="let repo of store.repositories()">
              <div 
                [class]="'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ' + 
                  (selectedRepo?.id === repo.id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-gray-800')">
                <div class="flex justify-between items-center" (click)="selectRepo(repo)">
                  <div class="min-w-0">
                    <span class="truncate block font-medium">{{ repo.name }}</span>
                    <span class="text-xs text-gray-500">{{ repo.owner }}</span>
                  </div>
                </div>
                
                <div *ngIf="selectedRepo?.id === repo.id" class="mt-2 flex gap-2">
                  <button 
                    (click)="scanRepo(repo.id)"
                    [disabled]="scanning()"
                    class="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 rounded text-xs font-medium transition-colors">
                    {{ scanning() ? 'Scanning...' : '🔍 Scan' }}
                  </button>
                  <button 
                    (click)="deleteRepo(repo.id)"
                    class="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs transition-colors">
                    🗑️
                  </button>
                </div>
              </div>
            </li>
          </ul>
          
          <div *ngIf="!store.isLoading() && store.repositories().length === 0" class="text-center text-gray-500 text-sm py-8">
            <p>No repositories yet.</p>
            <p class="text-xs mt-1">Import from GitHub to get started.</p>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col min-w-0">
        <header class="h-14 border-b border-gray-800 flex items-center px-6 justify-between bg-gray-900/50 backdrop-blur flex-shrink-0">
          <h2 class="font-medium">
            {{ selectedRepo ? selectedRepo.name + ' Analysis' : 'Sprawl Analysis Dashboard' }}
          </h2>
          <div *ngIf="scanStatus()" class="flex items-center gap-2 text-sm">
            <span [class]="'w-2 h-2 rounded-full ' + getStatusColor(scanStatus())"></span>
            <span class="text-gray-400">{{ scanStatus() }}</span>
          </div>
        </header>

        <div class="flex-1 p-6 overflow-auto">
          <!-- No Selection State -->
          <div *ngIf="!selectedRepo && !scanResults().length" class="h-full flex flex-col items-center justify-center text-gray-500">
            <div class="text-6xl mb-4">📊</div>
            <h3 class="text-xl font-medium text-gray-300 mb-2">Welcome to DevDebt</h3>
            <p class="text-center max-w-md">
              Import a repository from GitHub and run a scan to detect code sprawl 
              using our 5-metric formula: Size, Complexity, Duplication, Responsibility, and Coupling.
            </p>
          </div>

          <!-- Scan Results -->
          <!-- Scan Results -->
          <div *ngIf="scanResults().length" class="space-y-8">
            <app-sprawl-metrics [metrics]="scanResults()"></app-sprawl-metrics>
            <app-heatmap [data]="heatmapData"></app-heatmap>
          </div>

          <!-- Scanning Progress -->
          <div *ngIf="scanning() && !scanResults().length" class="h-full flex flex-col items-center justify-center">
            <div class="animate-spin w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <h3 class="text-xl font-medium mb-2">Analyzing Repository</h3>
            <p class="text-gray-400 text-sm">Running sprawl detection on your codebase...</p>
            <div class="mt-4 text-xs text-gray-500 max-w-md text-center">
              Calculating: Normalized LOC (N), Complexity (C), Duplication (D), Responsibility (R), Coupling (K)
            </div>
          </div>
        </div>
      </main>

      <!-- Repo Browser Modal -->
      <app-repo-browser 
        *ngIf="showRepoBrowser()"
        (close)="showRepoBrowser.set(false)"
        (imported)="onRepoImported()">
      </app-repo-browser>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  store = inject(ScanStore);
  auth = inject(AuthService);
  api = inject(ApiService);

  showRepoBrowser = signal(false);
  selectedRepo: Repository | null = null;
  scanning = signal(false);
  scanStatus = signal<string | null>(null);
  scanResults = signal<DebtMetric[]>([]);

  // Heatmap data derived from scan results
  get heatmapData(): any {
    const metrics = this.scanResults();
    console.log('[Dashboard] heatmapData getter called, metrics count:', metrics.length);
    
    if (!metrics.length) return null;

    // Group by directory structure
    const root: any = { name: 'root', children: [] };
    
    for (const metric of metrics) {
      // Handle both forward and backward slashes
      const parts = metric.filePath.replace(/\\/g, '/').split('/').filter(p => p);
      let current = root;
      
      for (let i = 0; i < parts.length - 1; i++) {
        let child = current.children.find((c: any) => c.name === parts[i]);
        if (!child) {
          child = { name: parts[i], children: [] };
          current.children.push(child);
        }
        current = child;
      }
      
      // Add file as leaf node
      if (parts.length > 0) {
        current.children.push({
          name: parts[parts.length - 1],
          value: metric.loc || 1, // Ensure non-zero value
          score: (metric.sprawlScore || 0) * 50 // Scale for visibility
        });
      }
    }

    console.log('[Dashboard] heatmapData built with', root.children.length, 'top-level items');
    return root;
  }

  ngOnInit() {
    this.store.loadRepositories();
  }

  selectRepo(repo: Repository) {
    if (this.selectedRepo?.id === repo.id) {
      this.selectedRepo = null;
      this.scanResults.set([]);
      this.scanStatus.set(null);
    } else {
      this.selectedRepo = repo;
      this.loadRepoDetails(repo.id);
    }
  }

  private loadRepoDetails(repoId: number) {
    this.scanResults.set([]);
    this.scanStatus.set('Loading details...');
    
    this.api.getRepository(repoId).subscribe({
      next: (repo) => {
        if (repo.scans && repo.scans.length > 0) {
          const latestScan = repo.scans[0];
          this.scanStatus.set(latestScan.status);
          
          if (latestScan.status === 'COMPLETED') {
            this.loadScanResults(latestScan.id);
          } else if (latestScan.status === 'RUNNING' || latestScan.status === 'PENDING') {
            this.scanning.set(true);
            this.pollScan(latestScan.id);
          }
        } else {
          this.scanStatus.set('No scans yet');
        }
      },
      error: (err) => {
        console.error('Error loading repo details:', err);
        this.scanStatus.set('Error loading repo');
      }
    });
  }

  scanRepo(repoId: number) {
    this.scanning.set(true);
    this.scanStatus.set('Starting scan...');
    this.scanResults.set([]);

    this.api.startScan(repoId).subscribe({
      next: (res) => {
        this.scanStatus.set('Analyzing...');
        this.pollScan(res.scanId);
      },
      error: (err) => {
        this.scanning.set(false);
        this.scanStatus.set('Failed to start scan');
        console.error('Scan error:', err);
      }
    });
  }

  private pollScan(scanId: number) {
    this.api.pollScanProgress(scanId).subscribe({
      next: (scan) => {
        this.scanStatus.set(scan.status);
        
        if (scan.status === 'COMPLETED') {
          this.loadScanResults(scanId);
        } else if (scan.status === 'FAILED') {
          this.scanning.set(false);
          this.scanStatus.set('Scan failed');
        }
      },
      error: (err) => {
        this.scanning.set(false);
        this.scanStatus.set('Error polling scan');
      }
    });
  }

  private loadScanResults(scanId: number) {
    this.api.getScanResults(scanId).subscribe({
      next: (results) => {
        this.scanResults.set(results.metrics);
        this.scanning.set(false);
        this.scanStatus.set('Completed');
      },
      error: (err) => {
        this.scanning.set(false);
        this.scanStatus.set('Failed to load results');
      }
    });
  }

  deleteRepo(repoId: number) {
    if (confirm('Remove this repository?')) {
      this.api.deleteRepository(repoId).subscribe({
        next: () => {
          this.store.loadRepositories();
          if (this.selectedRepo?.id === repoId) {
            this.selectedRepo = null;
            this.scanResults.set([]);
          }
        }
      });
    }
  }

  onRepoImported() {
    this.store.loadRepositories();
  }

  getStatusColor(status: string | null): string {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500';
      case 'RUNNING': return 'bg-blue-500 animate-pulse';
      case 'COMPLETED': return 'bg-green-500';
      case 'FAILED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  logout() {
    this.auth.logout();
  }
}
