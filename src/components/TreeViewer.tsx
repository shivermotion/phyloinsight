'use client';
import { useEffect, useId, useRef } from 'react';
import * as d3 from 'd3';
import 'd3-selection-multi';

interface TreeViewerProps {
  newick: string;
}

// Fallback: very small Newick parser and D3 tree renderer
interface SimpleNode {
  name?: string;
  length?: number;
  children?: SimpleNode[];
}

function parseNewick(text: string): SimpleNode {
  let i = 0;
  function skipWs() {
    while (i < text.length && /\s/.test(text[i]!)) i++;
  }
  function parseName(): string {
    skipWs();
    const start = i;
    while (i < text.length && !/[\s,():;]/.test(text[i]!)) i++;
    return text.slice(start, i);
  }
  function parseLength(): number | undefined {
    skipWs();
    if (text[i] === ':') {
      i++;
      skipWs();
      const start = i;
      while (i < text.length && /[0-9eE+\-.]/.test(text[i]!)) i++;
      const num = Number(text.slice(start, i));
      return isFinite(num) ? num : undefined;
    }
    return undefined;
  }
  function parseSubtree(): SimpleNode {
    skipWs();
    const node: SimpleNode = {};
    if (text[i] === '(') {
      i++;
      node.children = [];
      while (true) {
        node.children.push(parseSubtree());
        skipWs();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === ')') {
          i++;
          break;
        }
        break;
      }
      node.length = parseLength();
    } else {
      node.name = parseName();
      node.length = parseLength();
    }
    return node;
  }
  const root = parseSubtree();
  return root;
}

function renderFallback(container: HTMLElement, tree: SimpleNode, width: number, height: number) {
  const root = d3.hierarchy<SimpleNode>(tree, d => d.children);
  const layout = d3.tree<SimpleNode>().size([height - 20, width - 40]);
  const positioned = layout(root);

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', 'translate(20,10)');

  svg
    .selectAll<SVGPathElement, d3.HierarchyPointLink<SimpleNode>>('path.link')
    .data(positioned.links())
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('d', d => {
      const sx = d.source.x;
      const sy = d.source.y;
      const tx = d.target.x;
      const ty = d.target.y;
      const mx = (sy + ty) / 2;
      return `M ${sy},${sx} C ${mx},${sx} ${mx},${tx} ${ty},${tx}`;
    })
    .attr('fill', 'none')
    .attr('stroke', '#999');

  const node = svg
    .selectAll<SVGGElement, d3.HierarchyPointNode<SimpleNode>>('g.node')
    .data(positioned.descendants())
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.y},${d.x})`);

  node.append('circle').attr('r', 3).attr('fill', '#2b6cb0');
  node
    .append('text')
    .attr('dx', 6)
    .attr('dy', 3)
    .text(d => d.data.name || '')
    .attr('font-size', 11)
    .attr('fill', '#333');
}

export default function TreeViewer({ newick }: TreeViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const containerId = `phylo-tree-${uid.replace(/:/g, '')}`;

  useEffect(() => {
    if (!ref.current || !newick) return;

    d3.select(ref.current).selectAll('*').remove();

    // Normalize Newick: ensure branch lengths exist
    let normalizedNewick = newick;
    if (!normalizedNewick.includes(':')) {
      normalizedNewick = normalizedNewick.replace(/\)/g, ':1.0)').replace(/;/g, ':1.0;');
    }
    try {
      normalizedNewick = normalizedNewick.replace(
        /(?<=\(|,)([A-Za-z_][A-Za-z0-9_.-]*)(?=(,|\)|;))/g,
        '$1:1.0'
      );
    } catch {}

    console.log('🌳 Rendering tree with Newick (fallback D3):', normalizedNewick);

    const width = ref.current?.clientWidth || 800;
    const height = ref.current?.clientHeight || 600;

    const simple = parseNewick(normalizedNewick.replace(/;\s*$/, ''));
    renderFallback(ref.current, simple, width, height);

    // Diagnostics
    const svgCount = ref.current?.querySelectorAll('svg')?.length ?? 0;
    const innerLen = ref.current?.innerHTML.length ?? 0;
    console.log(`🧪 D3 render — SVGs: ${svgCount}, innerHTML: ${innerLen}`);
  }, [newick, containerId]);

  return (
    <div
      id={containerId}
      ref={ref}
      className="w-full h-[600px] border border-gray-300 rounded"
      aria-label="Phylogenetic Tree Visualization"
    />
  );
}
