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

    // phylotree exposes a named export { phylotree } which is the constructor
    // @ts-expect-error types not bundled
    const tree = new Phylotree(newick);
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
  }, [newick]);

  return (
    <div
      ref={ref}
      className="w-full h-[600px] border border-gray-300 rounded"
      aria-label="Phylogenetic Tree Visualization"
    />
  );
}
