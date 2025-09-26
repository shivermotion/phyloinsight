'use client';
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { phylotree as Phylotree } from 'phylotree';

interface TreeViewerProps {
  newick: string;
}

export default function TreeViewer({ newick }: TreeViewerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !newick) return;
    d3.select(ref.current).selectAll('*').remove();

    // Ensure Newick has branch lengths for all nodes
    let normalizedNewick = newick;
    
    // Fix missing branch lengths more comprehensively
    if (!normalizedNewick.includes(':')) {
      // No branch lengths at all
      normalizedNewick = normalizedNewick.replace(/\)/g, ':1.0)').replace(/;/g, ':1.0;');
    } else {
      // Some branch lengths exist, but might be missing for some nodes
      // Add default branch lengths to nodes that don't have them
      normalizedNewick = normalizedNewick
        .replace(/([A-Za-z0-9_|]+)(?![:\d])/g, '$1:1.0')  // Add :1.0 to nodes without branch lengths
        .replace(/\)(?![:\d])/g, ':1.0)')  // Add :1.0 to closing parentheses without branch lengths
        .replace(/;(?![:\d])/g, ':1.0;');  // Add :1.0 to semicolon without branch lengths
    }
    
    console.log('🌳 Rendering tree with Newick:', normalizedNewick);

    try {
      // phylotree exposes a named export { phylotree } which is the constructor
      // @ts-expect-error types not bundled
      const tree = new Phylotree(normalizedNewick);
      // @ts-expect-error render signature is dynamic
      tree.render({
        container: ref.current,
        width: 800,
        height: 600,
        'left-right-spacing': 'fit-to-size',
        'top-bottom-spacing': 'fit-to-size',
        zoom: true,
        'node-circle-size': 4,
      });
      console.log('✅ Tree rendered successfully');
    } catch (err) {
      console.error('❌ Tree rendering error:', err);
    }
  }, [newick]);

  return (
    <div
      ref={ref}
      className="w-full h-[600px] border border-gray-300 rounded"
      aria-label="Phylogenetic Tree Visualization"
    />
  );
}
