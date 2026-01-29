import { Injectable, signal } from '@angular/core';
import { ApiService, Repository, Scan, ScanResults } from '../services/api.service';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScanStore {
  // State signals
  repositories = signal<Repository[]>([]);
  currentScan = signal<Scan | null>(null);
  scanResults = signal<ScanResults | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor(private api: ApiService) {}

  loadRepositories() {
    this.isLoading.set(true);
    this.api.getRepositories()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (repos) => this.repositories.set(repos),
        error: (err) => this.error.set(err.message)
      });
  }

  startScan(repoId: number) {
    this.isLoading.set(true);
    this.api.startScan(repoId)
      .subscribe({
        next: (res) => {
          console.log('Scan started', res);
          // Poll for scan completion
          this.api.pollScanProgress(res.scanId).subscribe({
            next: (scan) => {
              this.currentScan.set(scan);
              if (scan.status === 'COMPLETED') {
                this.loadScanResults(res.scanId);
              }
            },
            complete: () => this.isLoading.set(false)
          });
        },
        error: (err) => {
          this.error.set(err.message);
          this.isLoading.set(false);
        }
      });
  }

  private loadScanResults(scanId: number) {
    this.api.getScanResults(scanId).subscribe({
      next: (results) => this.scanResults.set(results),
      error: (err) => this.error.set(err.message)
    });
  }
}
