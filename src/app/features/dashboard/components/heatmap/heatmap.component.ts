import { Component, ElementRef, Input, OnChanges, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full overflow-hidden bg-gray-900 rounded-lg border border-gray-800" #chartContainer>
      <div *ngIf="!data" class="flex items-center justify-center h-full text-gray-500">
        Select a scan to view debt heatmap
      </div>
    </div>
  `,
  styles: [`
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
export class HeatmapComponent implements OnChanges {
  @Input() data: any; // Hierarchical data
  @ViewChild('chartContainer', { static: true }) container!: ElementRef;

  ngOnChanges() {
    if (this.data) {
      this.render();
    }
  }

  private render() {
    const element = this.container.nativeElement;
    d3.select(element).selectAll('*').remove();

    const width = element.clientWidth;
    const height = element.clientHeight || 500;

    const color = d3.scaleLinear<string>()
      .domain([0, 100])
      .range(["#10b981", "#ef4444"]); // Green to Red

    const pack = d3.pack()
      .size([width, height])
      .padding(3);

    const root = d3.hierarchy(this.data)
      .sum(d => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // pack adds x, y, r to the node
    const rootNode = pack(root) as d3.HierarchyCircularNode<any>;

    const svg = d3.select(element).append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block')
      .style('margin', '0 -14px')
      .style('background', '#111827');

    const nodes = svg.selectAll('g')
      .data(rootNode.descendants())
      .join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    nodes.append('circle')
      .attr('r', d => d.r)
      .style('fill', (d: any) => d.children ? '#1f2937' : color(d.data.score || 0))
      .style('stroke', '#374151');

    nodes.filter((d: any) => !d.children && d.r > 20).append('text')
      .attr('dy', '0.3em')
      .text((d: any) => d.data.name.slice(0, d.r / 3))
      .style('font-size', '10px')
      .classed('label', true);

    // Simple tooltip (could be improved with HTML overlay)
    nodes.append('title')
      .text((d: any) => `${d.data.name}\nScore: ${d.data.score}\nComplexity: ${d.data.complexity}`);
  }
}
