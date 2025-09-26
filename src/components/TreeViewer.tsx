'use client';
import { useEffect, useId, useRef } from 'react';
import * as d3 from 'd3';
import { phylotree as Phylotree } from 'phylotree';

interface TreeViewerProps {
  newick: string;
}

export default function TreeViewer({ newick }: TreeViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const containerId = `phylo-tree-${uid.replace(/:/g, '')}`;

  useEffect(() => {
    if (!ref.current || !newick) return;
    d3.select(ref.current).selectAll('*').remove();

    // Ensure Newick has branch lengths for all nodes
    let normalizedNewick = newick;

    // Simple approach: if no colons at all, add default branch lengths
    if (!normalizedNewick.includes(':')) {
      normalizedNewick = normalizedNewick.replace(/\)/g, ':1.0)').replace(/;/g, ':1.0;');
    }
    // Additionally, append :1.0 to any tip label missing a branch length
    // Match labels that appear right after '(' or ',' and are NOT already followed by ':'
    try {
      normalizedNewick = normalizedNewick.replace(/(?<=\(|,)([A-Za-z_][A-Za-z0-9_.-]*)(?=(,|\)|;))/g, '$1:1.0');
    } catch {}

    console.log('🌳 Rendering tree with Newick:', normalizedNewick);

    try {
      // phylotree exposes a named export { phylotree } which is the constructor
      // @ts-expect-error types not bundled
      const tree = new Phylotree(normalizedNewick);

      // Optional introspection (not all builds expose these methods)
      try {
        // @ts-expect-error runtime method
        const nodes = typeof tree.get_nodes === 'function' ? tree.get_nodes() : [];
        // @ts-expect-error runtime method
        const leaves = typeof tree.get_leaves === 'function' ? tree.get_leaves() : [];
        console.log(`🧩 Tree parsed: ${nodes?.length ?? 0} nodes, ${leaves?.length ?? 0} leaves`);
      } catch {}

      const width = ref.current?.clientWidth || 800;
      const height = ref.current?.clientHeight || 600;
      console.log(`📐 Container size: ${width}x${height}, id: #${containerId}`);

      console.time('⏱️ Tree render time');
      // @ts-expect-error render signature is dynamic
      tree.render({
        container: ref.current, // render into the DOM node
        width,
        height,
        'left-right-spacing': 'fit-to-size',
        'top-bottom-spacing': 'fit-to-size',
        zoom: true,
        'node-circle-size': 4,
      });
      console.timeEnd('⏱️ Tree render time');

      queueMicrotask(() => {
        const containerEl = ref.current as HTMLElement | null;
        const svgCount = containerEl?.querySelectorAll('svg')?.length ?? 0;
        const nodeCircles = containerEl?.querySelectorAll('circle')?.length ?? 0;
        const linkPaths = containerEl?.querySelectorAll('path')?.length ?? 0;
        const innerLen = containerEl?.innerHTML.length ?? 0;
        console.log(`🖼️ SVGs: ${svgCount}, circles (nodes): ${nodeCircles}, paths (links): ${linkPaths}, innerHTML: ${innerLen}`);
      });

      console.log('✅ Tree rendered successfully');
    } catch (err) {
      console.error('❌ Tree rendering error:', err);
    }
  }, [newick]);

  return (
    <div
      id={containerId}
      ref={ref}
      className="w-full h-[600px] border border-gray-300 rounded"
      aria-label="Phylogenetic Tree Visualization"
    />
  );
}
