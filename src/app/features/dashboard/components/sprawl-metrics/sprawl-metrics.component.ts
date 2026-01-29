import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DebtMetric } from '../../../../core/services/api.service';

@Component({
  selector: 'app-sprawl-metrics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Overall Score Card -->
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Sprawl Analysis</h3>
          <span [class]="'px-3 py-1 rounded-full text-sm font-medium ' + getLevelClass(avgSprawlLevel)">
            {{ avgSprawlLevel | uppercase }}
          </span>
        </div>
        
        <!-- Score Gauge -->
        <div class="flex items-center gap-6">
          <div class="relative w-32 h-32">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" stroke-width="12"/>
              <circle cx="60" cy="60" r="54" fill="none" 
                [attr.stroke]="getScoreColor(avgScore)"
                stroke-width="12"
                stroke-linecap="round"
                [attr.stroke-dasharray]="getGaugeOffset(avgScore)"/>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center flex-col">
              <span class="text-3xl font-bold">{{ avgScore | number:'1.1-1' }}</span>
              <span class="text-xs text-gray-400">Sprawl Score</span>
            </div>
          </div>
          
          <div class="flex-1 space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">Files Analyzed</span>
              <span class="font-medium">{{ metrics?.length || 0 }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">Clean Files</span>
              <span class="text-green-400 font-medium">{{ cleanCount }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">High/Severe</span>
              <span class="text-red-400 font-medium">{{ problematicCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Formula Breakdown -->
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 class="text-lg font-semibold mb-4">Formula Breakdown</h3>
        <p class="text-xs text-gray-500 mb-4">S = w₁N + w₂C + w₃D + w₄R + w₅K</p>
        
        <div class="space-y-3">
          <div *ngFor="let metric of formulaMetrics" class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">
                <span class="font-mono text-blue-400">{{ metric.symbol }}</span> {{ metric.name }}
              </span>
              <span class="font-medium">{{ metric.value | number:'1.2-2' }}</span>
            </div>
            <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500"
                [style.width.%]="Math.min(metric.value * 50, 100)"
                [style.background]="metric.color">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- File List -->
      <div class="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div class="p-4 border-b border-gray-800">
          <h3 class="text-lg font-semibold">Files by Sprawl Score</h3>
        </div>
        <div class="max-h-96 overflow-y-auto">
          <div *ngFor="let file of sortedMetrics; let i = index" 
            class="px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
            (click)="selectedFile = selectedFile === file ? null : file">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <span class="w-6 text-center text-xs text-gray-500">{{ i + 1 }}</span>
                <div class="w-2 h-2 rounded-full" [style.background]="getScoreColor(file.sprawlScore)"></div>
                <span class="text-sm truncate">{{ file.filePath }}</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-xs text-gray-500">{{ file.loc }} LOC</span>
                <span [class]="'text-sm font-medium ' + getTextClass(file.sprawlLevel)">
                  {{ file.sprawlScore | number:'1.1-1' }}
                </span>
              </div>
            </div>
            
            <!-- Expanded Details -->
            <div *ngIf="selectedFile === file" class="mt-3 pt-3 border-t border-gray-700 grid grid-cols-5 gap-2 text-xs">
              <div class="text-center p-2 bg-gray-800 rounded">
                <div class="text-gray-400">N (Size)</div>
                <div class="font-medium">{{ file.normalizedLOC | number:'1.2-2' }}</div>
              </div>
              <div class="text-center p-2 bg-gray-800 rounded">
                <div class="text-gray-400">C (Complexity)</div>
                <div class="font-medium">{{ file.complexityScore | number:'1.2-2' }}</div>
              </div>
              <div class="text-center p-2 bg-gray-800 rounded">
                <div class="text-gray-400">D (Duplication)</div>
                <div class="font-medium">{{ file.duplicationRatio | number:'1.2-2' }}</div>
              </div>
              <div class="text-center p-2 bg-gray-800 rounded">
                <div class="text-gray-400">R (Responsibility)</div>
                <div class="font-medium">{{ file.responsibilityScore | number:'1.2-2' }}</div>
              </div>
              <div class="text-center p-2 bg-gray-800 rounded">
                <div class="text-gray-400">K (Coupling)</div>
                <div class="font-medium">{{ file.couplingScore | number:'1.2-2' }}</div>
              </div>
            </div>
          </div>
          
          <div *ngIf="!metrics?.length" class="p-8 text-center text-gray-500">
            No files analyzed yet. Run a scan to see results.
          </div>
        </div>
      </div>
    </div>
  `
})
export class SprawlMetricsComponent {
  @Input() metrics: DebtMetric[] = [];
  
  selectedFile: DebtMetric | null = null;
  Math = Math;

  get sortedMetrics(): DebtMetric[] {
    return [...this.metrics].sort((a, b) => b.sprawlScore - a.sprawlScore);
  }

  get avgScore(): number {
    if (!this.metrics?.length) return 0;
    return this.metrics.reduce((sum, m) => sum + m.sprawlScore, 0) / this.metrics.length;
  }

  get avgSprawlLevel(): string {
    const score = this.avgScore;
    if (score < 0.8) return 'clean';
    if (score < 1.2) return 'mild';
    if (score < 1.6) return 'high';
    return 'severe';
  }

  get cleanCount(): number {
    return this.metrics?.filter(m => m.sprawlLevel === 'clean').length || 0;
  }

  get problematicCount(): number {
    return this.metrics?.filter(m => m.sprawlLevel === 'high' || m.sprawlLevel === 'severe').length || 0;
  }

  get formulaMetrics() {
    if (!this.metrics?.length) return [];
    
    const avg = (key: keyof DebtMetric) => 
      this.metrics.reduce((sum, m) => sum + (Number(m[key]) || 0), 0) / this.metrics.length;

    return [
      { symbol: 'N', name: 'Normalized LOC', value: avg('normalizedLOC'), color: '#3b82f6' },
      { symbol: 'C', name: 'Complexity', value: avg('complexityScore'), color: '#8b5cf6' },
      { symbol: 'D', name: 'Duplication', value: avg('duplicationRatio'), color: '#f59e0b' },
      { symbol: 'R', name: 'Responsibility', value: avg('responsibilityScore'), color: '#10b981' },
      { symbol: 'K', name: 'Coupling', value: avg('couplingScore'), color: '#ef4444' }
    ];
  }

  getGaugeOffset(score: number): string {
    const circumference = 2 * Math.PI * 54;
    const progress = Math.min(score / 2, 1); // Max at 2.0
    return `${circumference * progress} ${circumference}`;
  }

  getScoreColor(score: number): string {
    if (score < 0.8) return '#22c55e';
    if (score < 1.2) return '#eab308';
    if (score < 1.6) return '#f97316';
    return '#ef4444';
  }

  getLevelClass(level: string): string {
    switch (level) {
      case 'clean': return 'bg-green-500/20 text-green-400';
      case 'mild': return 'bg-yellow-500/20 text-yellow-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'severe': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  }

  getTextClass(level: string): string {
    switch (level) {
      case 'clean': return 'text-green-400';
      case 'mild': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'severe': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }
}
