import { Component, ElementRef, Input, OnChanges, ViewChild, ViewEncapsulation, AfterViewInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gray-900 rounded-lg border border-gray-800 p-4 h-full flex flex-col transition-all duration-300"
         [class.fixed]="isMaximized" 
         [class.inset-0]="isMaximized" 
         [class.z-50]="isMaximized" 
         [class.min-h-[400px]]="!isMaximized">
      
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">Code Heatmap</h3>
        <button (click)="toggleMaximize()" class="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
          <span *ngIf="!isMaximized" title="Maximize">⛶</span>
          <span *ngIf="isMaximized" title="Minimize">✖</span>
        </button>
      </div>
      
      <!-- Empty state placeholder -->
      <div [class.hidden]="hasChildren" class="flex flex-col items-center justify-center flex-1 text-gray-500 min-h-[300px]">
        <div class="text-4xl mb-3">🗺️</div>
        <p>No file data to display</p>
        <p class="text-xs mt-1 text-gray-600">Run a scan to generate the heatmap</p>
      </div>
      
      <!-- D3 chart container -->
      <div [class.hidden]="!hasChildren" class="relative w-full flex-1 overflow-hidden rounded-lg min-h-[350px]" #chartContainer></div>
    </div>
  `,
  styles: [`
    .hidden { display: none !important; }
    .node { cursor: pointer; }
    .node:hover { stroke: #fff; stroke-width: 2px; }
    .label {
      font-family: sans-serif;
      text-anchor: middle;
      pointer-events: none;
      fill: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.6);
    }
  `],
  encapsulation: ViewEncapsulation.None
})
export class HeatmapComponent implements OnChanges, AfterViewInit {
  @Input() data: any;
  @ViewChild('chartContainer', { static: true }) container!: ElementRef;
  hasChildren = false;
  isMaximized = false;
  private initialized = false;

  ngAfterViewInit() {
    this.initialized = true;
    console.log('[Heatmap] AfterViewInit, data:', this.data?.children?.length || 0);
    this.checkAndRender();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.hasChildren = this.data?.children?.length > 0;
      console.log('[Heatmap] OnChanges, hasChildren:', this.hasChildren);
      if (this.initialized) {
        setTimeout(() => this.checkAndRender(), 50);
      }
    }
  }

  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
    // Wait for transition/layout update then re-render
    setTimeout(() => this.checkAndRender(), 300);
  }

  private checkAndRender() {
    console.log('[Heatmap] checkAndRender, hasChildren:', this.hasChildren, 'container:', !!this.container);
    if (this.hasChildren && this.container?.nativeElement) {
      this.render();
    }
  }

  private render() {
    const element = this.container.nativeElement;
    d3.select(element).selectAll('svg').remove();

    // Use current dimensions (will be larger in full screen)
    const width = element.clientWidth || 400;
    const height = element.clientHeight || 350;

    // Adjust limit based on screen size
    const limit = this.isMaximized ? 800 : 200; 
    const processedData = this.pruneData(this.data, limit);

    console.log('[Heatmap] Rendering, width:', width, 'height:', height, 'children:', processedData.children.length);

    if (!processedData || !processedData.children?.length || width <= 0) {
      return;
    }

    // Treemap Layout
    const root = d3.hierarchy(processedData)
      .sum(d => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Calculate layout
    d3.treemap()
      .size([width, height])
      .paddingTop(18)
      .paddingRight(1)
      .paddingInner(1)
      .round(true)(root);

    const svg = d3.select(element).append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block')
      .style('background', '#111827')
      .style('font-family', 'sans-serif');

    // color scale
    const color = d3.scaleLinear<string>()
         .domain([0, 100])
         .range(["#10b981", "#ef4444"]);

    const opacity = d3.scaleLinear<number>()
         .domain([10, 100])
         .range([0.7, 1]);

    // Render nodes
    const nodes = svg.selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

    // Rectangles
    nodes.append('rect')
      .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
      .attr('fill', (d: any) => {
        if(d.children) return '#1f2937'; // directory
        return color(d.data.score || 0); // file
      })
      .attr('fill-opacity', (d: any) => d.children ? 1 : opacity(d.data.score || 0))
      .attr('stroke', '#374151')
      .attr('stroke-width', 1);

    // Labels for directories (titles)
    nodes.filter((d: any) => d.children && (d.x1 - d.x0) > 30)
      .append('text')
      .attr('x', 4)
      .attr('y', 12)
      .text((d: any) => d.data.name)
      .attr('fill', '#9ca3af')
      .style('font-size', '10px')
      .style('font-weight', 'bold');

    // Labels for files (center)
    nodes.filter((d: any) => !d.children && (d.x1 - d.x0) > 30 && (d.y1 - d.y0) > 20)
      .append('text')
      .attr('x', 4)
      .attr('y', 14)
      .text((d: any) => d.data.name.substring(0, Math.floor((d.x1-d.x0)/6)))
      .attr('fill', 'white')
      .style('font-size', '10px');

    // Tooltip
    nodes.append('title')
      .text((d: any) => {
         const path = d.ancestors().reverse().map((a: any) => a.data.name).join('/');
         if (d.children) return path;
         return `${path}\nDebt Score: ${(d.data.score || 0).toFixed(1)}\nLOC: ${d.data.value || 0}`;
      });
      
    // Add legend hint
    if (this.data.children.length > processedData.children.length) {
      svg.append('text')
        .attr('x', width - 10)
        .attr('y', height - 10)
        .attr('text-anchor', 'end')
        .text('⚠️ Optimized View (Small files hidden)')
        .style('fill', '#6b7280')
        .style('font-size', '10px');
    }
  }

  // Smart pruning: Keep large files AND high-risk files
  private pruneData(data: any, limit: number): any {
    if (!data.children || data.children.length <= limit) return data;

    // Clone to avoid mutating original
    const clone = JSON.parse(JSON.stringify(data));
    
    // Sort by importance: High score > Large Size
    clone.children.sort((a: any, b: any) => {
      const scoreA = (a.score || 0) * (a.value || 1);
      const scoreB = (b.score || 0) * (b.value || 1);
      return scoreB - scoreA;
    });

    // Keep top N items + any severe items that might have fallen out
    const topItems = clone.children.slice(0, limit);
    
    // If we cut off severe items, add them back (up to limit + 50)
    const severeItems = clone.children.slice(limit).filter((c: any) => (c.score || 0) > 80);
    
    clone.children = [...topItems, ...severeItems.slice(0, 50)];
    return clone;
  }
}


