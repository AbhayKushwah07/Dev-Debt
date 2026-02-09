import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, map } from 'rxjs';

// GitHub Repository from user's account
export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  isPrivate: boolean;
  htmlUrl: string;
  cloneUrl: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
}

// Repository stored in our system
export interface Repository {
  id: number;
  githubRepoId: string;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  htmlUrl: string;
  cloneUrl: string;
  createdAt: string;
  updatedAt: string;
}

// Sprawl formula metrics for a file
export interface SprawlMetrics {
  normalizedLOC: number;      // N - Size sprawl
  complexityScore: number;    // C - Logical sprawl
  duplicationRatio: number;   // D - Copy-paste sprawl
  responsibilityScore: number; // R - SRP violation
  couplingScore: number;      // K - Dependency sprawl
  aiEntropyFactor: number;    // AI penalty factor
}

// File-level debt metric (matches Prisma DebtMetric model)
export interface DebtMetric {
  id: number;
  filePath: string;
  loc: number;
  // Sprawl formula metrics at top level (as stored in DB)
  normalizedLOC: number;
  complexityScore: number;
  duplicationRatio: number;
  responsibilityScore: number;
  couplingScore: number;
  // Legacy/computed metrics
  cyclomaticComplexity: number;
  duplicatedLogicScore: number;
  aiEntropyScore: number;
  // Sprawl results
  sprawlScore: number;
  sprawlLevel: 'clean' | 'mild' | 'high' | 'severe';
  totalDebtScore: number;
  // Optional details
  details?: {
    hasLongFunctions?: boolean;
    hasDeepNesting?: boolean;
    hasRepetitivePatterns?: boolean;
    hasHighCoupling?: boolean;
    hasTooManyResponsibilities?: boolean;
  } | null;
}

// Scan status and results
export interface Scan {
  id: number;
  repositoryId: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  totalFiles?: number;
  analyzedFiles?: number;
  avgSprawlScore?: number;
  avgComplexity?: number;
}

export interface ScanResults {
  scanId: number;
  completedAt: string;
  metrics: DebtMetric[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // ==================== GitHub Repos ====================

  getGithubRepos(): Observable<GithubRepo[]> {
    return this.http.get<GithubRepo[]>(`${this.apiUrl}/github/repos`);
  }

  // ==================== Repositories ====================

  getRepositories(): Observable<Repository[]> {
    return this.http.get<Repository[]>(`${this.apiUrl}/repositories`);
  }

  getRepository(id: number): Observable<Repository & { scans: Scan[] }> {
    return this.http.get<Repository & { scans: Scan[] }>(`${this.apiUrl}/repositories/${id}`);
  }

  addRepository(repo: GithubRepo): Observable<Repository> {
    return this.http.post<Repository>(`${this.apiUrl}/repositories`, {
      githubRepoId: repo.id.toString(),
      name: repo.name,
      fullName: repo.fullName,
      owner: repo.owner,
      isPrivate: repo.isPrivate,
      htmlUrl: repo.htmlUrl,
      cloneUrl: repo.cloneUrl
    });
  }

  deleteRepository(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/repositories/${id}`);
  }

  // ==================== Scans ====================

  startScan(repoId: number): Observable<{ scanId: number; status: string }> {
    return this.http.post<{ scanId: number; status: string }>(
      `${this.apiUrl}/scans/${repoId}`,
      {}
    );
  }

  getScanStatus(scanId: number): Observable<Scan> {
    return this.http.get<Scan>(`${this.apiUrl}/scans/${scanId}`);
  }

  getScanResults(scanId: number): Observable<ScanResults> {
    return this.http.get<ScanResults>(`${this.apiUrl}/scans/${scanId}/results`);
  }

  // Poll scan until completion
  pollScanProgress(scanId: number): Observable<Scan> {
    return interval(2000).pipe(
      switchMap(() => this.getScanStatus(scanId)),
      takeWhile(scan => scan.status === 'PENDING' || scan.status === 'RUNNING', true)
    );
  }

  // Legacy method for backward compatibility
  scanRepository(repoId: number): Observable<{ scanId: number; status: string }> {
    return this.startScan(repoId);
  }
}
