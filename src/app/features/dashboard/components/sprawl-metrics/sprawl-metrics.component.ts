import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DebtMetric } from '../../../../core/services/api.service';

@Component({
  selector: 'app-sprawl-metrics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Row: Score & Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Main Score Card -->
        <div class="md:col-span-1 bg-gray-900 rounded-xl p-6 border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
          
          <h3 class="text-sm font-uppercase tracking-wider text-gray-400 mb-6 z-10">Total Sprawl Score</h3>
          
          <div class="relative w-40 h-40 z-10 mb-4">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" stroke-width="8"/>
              <circle cx="60" cy="60" r="54" fill="none" 
                [attr.stroke]="getScoreColor(avgScore)"
                stroke-width="8"
                stroke-linecap="round"
                [attr.stroke-dasharray]="getGaugeOffset(avgScore)"/>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center flex-col">
              <span class="text-5xl font-bold text-white">{{ avgScore | number:'1.1-1' }}</span>
              <span [class]="'text-sm font-medium mt-1 px-3 py-0.5 rounded-full ' + getLevelClass(avgSprawlLevel)">
                {{ avgSprawlLevel | uppercase }}
              </span>
            </div>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="md:col-span-2 bg-gray-900 rounded-xl p-6 border border-gray-800 flex flex-col justify-center">
           <h3 class="text-lg font-semibold mb-6 flex items-center gap-2">
             <span>🔍 Scan Overview</span>
           </h3>
           <div class="grid grid-cols-3 gap-4">
             <div class="bg-gray-800/50 rounded-lg p-4 text-center">
               <div class="text-3xl font-bold text-white mb-1">{{ metrics?.length || 0 }}</div>
               <div class="text-xs text-gray-400 uppercase tracking-wide">Files Analyzed</div>
             </div>
             <div class="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/20">
               <div class="text-3xl font-bold text-green-400 mb-1">{{ cleanCount }}</div>
               <div class="text-xs text-green-400/80 uppercase tracking-wide">Clean Files</div>
             </div>
             <div class="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/20">
               <div class="text-3xl font-bold text-red-400 mb-1">{{ problematicCount }}</div>
               <div class="text-xs text-red-400/80 uppercase tracking-wide">High Debt</div>
             </div>
           </div>
        </div>
      </div>

      <!-- Detailed Metrics Grid -->
      <h3 class="text-xl font-bold text-white mt-8 mb-4">Breakdown by Metric (Click for Details)</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div *ngFor="let metric of formulaMetrics; trackBy: trackBySymbol" 
             (click)="openDetails(metric.symbol)"
             class="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-blue-500 hover:bg-gray-800 transition-all group cursor-pointer relative overflow-hidden">
          
          <div class="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span class="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Learn More</span>
          </div>

          <div class="flex items-center justify-between mb-4">
             <div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold" 
                  [style.background]="metric.color + '20'" [style.color]="metric.color">
               {{ metric.symbol }}
             </div>
             <div class="text-2xl font-bold text-white">{{ metric.value | number:'1.2-2' }}</div>
          </div>
          
          <h4 class="font-medium text-gray-200 mb-2 truncate" [title]="metric.name">{{ metric.name }}</h4>
          
          <!-- Progress Bar -->
          <div class="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
             <div class="h-full rounded-full" [style.width.%]="Math.min(metric.value * 50, 100)" [style.background]="metric.color"></div>
          </div>
          
          <p class="text-xs text-gray-500 h-8 line-clamp-2 mb-3">{{ metric.desc }}</p>
          
          <div *ngIf="metric.status !== 'Good'" class="text-xs bg-yellow-500/10 text-yellow-500 p-2 rounded border border-yellow-500/20">
            💡 {{ metric.advice }}
          </div>
          <div *ngIf="metric.status === 'Good'" class="text-xs bg-green-500/10 text-green-500 p-2 rounded border border-green-500/20">
            ✅ Optimized
          </div>
        </div>
      </div>

      <!-- Educational Modal -->
      <div *ngIf="selectedMetricCode()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" (click)="closeDetails()">
        <div class="bg-gray-900 rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all" (click)="$event.stopPropagation()">
          <div class="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold bg-blue-500/10 text-blue-400">
                {{ selectedMetricCode() }}
              </div>
              <h3 class="text-xl font-bold text-white">{{ selectedMetricDetails()?.title }}</h3>
            </div>
            <button (click)="closeDetails()" class="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800">
              ✖
            </button>
          </div>
          
          <div class="p-6 space-y-6" *ngIf="selectedMetricDetails() as details">
            <!-- What -->
            <div class="bg-gray-800/30 rounded-xl p-4 border border-gray-800">
              <h4 class="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wide">What does it mean?</h4>
              <p class="text-gray-300 leading-relaxed">{{ details.what }}</p>
            </div>

            <!-- Why -->
            <div class="bg-gray-800/30 rounded-xl p-4 border border-gray-800">
              <h4 class="text-sm font-semibold text-purple-400 mb-2 uppercase tracking-wide">Why is it a problem?</h4>
              <p class="text-gray-300 leading-relaxed">{{ details.why }}</p>
            </div>

            <!-- Fix -->
            <div>
              <h4 class="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wide">How to Fix It</h4>
              <div class="grid gap-3">
                <div *ngFor="let fix of details.fix" class="flex gap-3 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                  <span class="text-green-400">🛠️</span>
                  <span class="text-gray-200 text-sm">{{ fix }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
             <button (click)="closeDetails()" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium">
               Got it
             </button>
          </div>
        </div>
      </div>

      <!-- File List (Collapsible or Standard) -->
      <div class="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mt-6">
        <div class="p-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-lg font-semibold">Highest Debt Files</h3>
        </div>
        <div class="max-h-96 overflow-y-auto">
           <!-- Keep existing list implementation but maybe cleaner -->
           <div *ngFor="let file of sortedMetrics.slice(0, 50); let i = index" 
            class="px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
            (click)="selectedFile = selectedFile === file ? null : file">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <span class="w-6 text-center text-xs text-gray-500">{{ i + 1 }}</span>
                <span class="text-sm truncate font-mono text-gray-300">{{ file.filePath }}</span>
              </div>
              <div class="flex items-center gap-4">
                <span [class]="'text-sm font-bold ' + getTextClass(file.sprawlLevel)">
                  {{ file.sprawlScore | number:'1.1-1' }}
                </span>
              </div>
            </div>
            
            <!-- Expanded Details -->
            <div *ngIf="selectedFile === file" class="mt-3 pt-3 border-t border-gray-700 grid grid-cols-5 gap-2 text-xs">
               <div *ngFor="let m of formulaMetrics" class="text-center p-2 bg-gray-800 rounded">
                 <div class="text-gray-400 mb-1">{{ m.name }}</div>
                 <!-- Note: Ideally we map the file specific metrics here, simplified for now -->
                 <div class="font-medium text-white">
                    {{ 
                      m.symbol === 'N' ? (file.normalizedLOC | number:'1.1-1') :
                      m.symbol === 'C' ? (file.complexityScore | number:'1.1-1') :
                      m.symbol === 'D' ? (file.duplicationRatio | number:'1.1-1') :
                      m.symbol === 'R' ? (file.responsibilityScore | number:'1.1-1') :
                      (file.couplingScore | number:'1.1-1')
                    }}
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SprawlMetricsComponent {
  @Input() metrics: DebtMetric[] = [];
  
  selectedFile: DebtMetric | null = null;
  selectedMetricCode = signal<string | null>(null);
  selectedMetricDetails = computed(() => {
    const code = this.selectedMetricCode();
    return code ? this.metricDetails[code] : null;
  });

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

    const n = avg('normalizedLOC');
    const c = avg('complexityScore');
    const d = avg('duplicationRatio');
    const r = avg('responsibilityScore');
    const k = avg('couplingScore');

    return [
      { 
        symbol: 'N', 
        name: 'File Size (LOC)', 
        value: n, 
        color: '#3b82f6',
        desc: 'Ratio of actual LOC to ideal LOC (30)',
        advice: n > 1.5 ? 'Split large files into smaller modules' : 'Files are well-sized',
        status: n > 1.5 ? 'Action Needed' : 'Good'
      },
      { 
        symbol: 'C', 
        name: 'Logic Complexity', 
        value: c, 
        color: '#8b5cf6',
        desc: 'Cyclomatic complexity per 100 LOC',
        advice: c > 1.0 ? 'Simplify nested loops and conditionals' : 'Logic is straightforward',
        status: c > 1.0 ? 'Action Needed' : 'Good'
      },
      { 
        symbol: 'D', 
        name: 'Code Duplication', 
        value: d, 
        color: '#f59e0b',
        desc: 'Percentage of duplicated lines',
        advice: d > 0.1 ? 'Extract shared logic into utility functions' : 'Little duplication found',
        status: d > 0.1 ? 'Action Needed' : 'Good'
      },
      { 
        symbol: 'R', 
        name: 'Responsibilities', 
        value: r, 
        color: '#10b981',
        desc: 'Number of distinct tasks per file',
        advice: r > 1.2 ? 'Apply Single Responsibility Principle' : 'Files have focused purpose',
        status: r > 1.2 ? 'Action Needed' : 'Good'
      },
      { 
        symbol: 'K', 
        name: 'Dependencies', 
        value: k, 
        color: '#ef4444',
        desc: 'External imports and coupling',
        advice: k > 1.0 ? 'Reduce tight coupling between modules' : 'Modular dependencies',
        status: k > 1.0 ? 'Action Needed' : 'Good'
      }
    ];
  }

  trackBySymbol(index: number, item: any): string {
    return item.symbol;
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

  metricDetails: any = {
    'N': {
      title: 'File Size (Normalized LOC)',
      what: 'Measures the raw size of a file relative to an "ideal" size (30 LOC). Code sprawl often begins with files simply becoming too large.',
      why: 'Large files are harder to read, harder to test, and usually indicate that a component is doing too many things (violating Single Responsibility Principle).',
      fix: [
        'Break large components into smaller sub-components.',
        'Extract helper functions into separate utility files.',
        'Move static data/configurations to separate files.',
        'Use the "Extract Class" refactoring technique.'
      ]
    },
    'C': {
      title: 'Logic Complexity',
      what: 'Measures Cyclomatic Complexity per 100 lines of code. It counts the number of independent paths through your source code.',
      why: 'High complexity leads to bugs because it exceeds the programmer\'s ability to hold the logic in working memory. It also makes unit testing extremely difficult.',
      fix: [
        'Replace nested if/else statements with Guard Clauses.',
        'Extract complex condition logic into descriptive boolean functions.',
        'Use polymorphism (classes/interfaces) instead of huge switch statements.',
        'Avoid deep nesting (max 3 levels recommended).'
      ]
    },
    'D': {
      title: 'Code Duplication',
      what: 'Percentage of code lines that appear identically in other locations.',
      why: 'Duplication means "Double Maintenance". If you fix a bug in one place, you must remember to fix it in all copies. It is a major source of regression bugs.',
      fix: [
        'Apply the DRY (Don\'t Repeat Yourself) principle.',
        'Extract common logic into shared services or utility functions.',
        'Create base classes or higher-order components for shared behavior.',
        'Use composition to share functionality between mismatched components.'
      ]
    },
    'R': {
      title: 'Responsibilities',
      what: 'Estimates how many different distinct tasks a file is performing based on keyword clustering and import analysis.',
      why: 'A file should have one reason to change. If it handles UI, Data Fetching, and Business Logic, it is "God Object" anti-pattern.',
      fix: [
        'Separate concerns: View (Component), Data (Service), Logic (Utils).',
        'Move business logic out of UI components.',
        'Use state management pattern (Signals/Store) to decouple state logic.',
        'Split "Manager" or "Controller" classes that have become dumping grounds.'
      ]
    },
    'K': {
      title: 'Dependencies (Coupling)',
      what: 'Measures how tightly coupled this file is to other parts of the system (imports/exports).',
      why: 'Tight coupling makes code fragile. Changing one file might break 5 others. It also prevents reusing code in other parts of the app.',
      fix: [
        'Use dependency injection (DI) instead of hard dependencies.',
        'Depend on abstractions (interfaces) rather than concrete classes.',
        'Group related features into Modules or Libraries (Nx pattern).',
        'Avoid circular dependencies.'
      ]
    }
  };

  openDetails(symbol: string) {
    console.log('[SprawlMetrics] openDetails', symbol);
    this.selectedMetricCode.set(symbol);
  }

  closeDetails() {
    console.log('[SprawlMetrics] closeDetails');
    this.selectedMetricCode.set(null);
  }
}
