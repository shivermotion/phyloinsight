'use client';
import { useEffect, useId, useRef } from 'react';
import { select } from 'd3-selection';
import { phylotree as Phylotree } from 'phylotree';

interface TreeViewerProps {
  newick: string;
}

// Minimal typings for the Phylotree constructor and instance we use
interface PhylotreeInstance {
  render: (options: {
    container: Element | string;
    width: number;
    height: number;
    [key: string]: unknown;
  }) => void;
  get_nodes?: () => unknown[];
  get_leaves?: () => unknown[];
}

type PhylotreeCtor = new (newick: string) => PhylotreeInstance;
const PhylotreeConstructor = Phylotree as unknown as PhylotreeCtor;

export default function TreeViewer({ newick }: TreeViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const containerId = `phylo-tree-${uid.replace(/:/g, '')}`;

  useEffect(() => {
    if (!ref.current || !newick) return;
    select(ref.current).selectAll('*').remove();

    // Ensure Newick has branch lengths for all nodes
    let normalizedNewick = newick;

    // Simple approach: if no colons at all, add default branch lengths
    if (!normalizedNewick.includes(':')) {
      normalizedNewick = normalizedNewick.replace(/\)/g, ':1.0)').replace(/;/g, ':1.0;');
    }
    // Additionally, append :1.0 to any tip label missing a branch length
    // Match labels that appear right after '(' or ',' and are NOT already followed by ':'
    try {
      normalizedNewick = normalizedNewick.replace(
        /(?<=\(|,)([A-Za-z_][A-Za-z0-9_.-]*)(?=(,|\)|;))/g,
        '$1:1.0'
      );
    } catch {}

    console.log('🌳 Rendering tree with Newick:', normalizedNewick);

    try {
      const tree = new PhylotreeConstructor(normalizedNewick);

      // Optional introspection (not all builds expose these methods)
      try {
        const nodes = typeof tree.get_nodes === 'function' ? tree.get_nodes() : [];
        const leaves = typeof tree.get_leaves === 'function' ? tree.get_leaves() : [];
        console.log(`🧩 Tree parsed: ${nodes?.length ?? 0} nodes, ${leaves?.length ?? 0} leaves`);
      } catch {}

      const width = ref.current?.clientWidth || 800;
      const height = ref.current?.clientHeight || 600;
      console.log(`📐 Container size: ${width}x${height}, id: #${containerId}`);

      console.time('⏱️ Tree render time');
      tree.render({
        container: ref.current,
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
        console.log(
          `🖼️ SVGs: ${svgCount}, circles (nodes): ${nodeCircles}, paths (links): ${linkPaths}, innerHTML: ${innerLen}`
        );
      });

      console.log('✅ Tree rendered successfully');
    } catch (err) {
      console.error('❌ Tree rendering error:', err);
    }
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
