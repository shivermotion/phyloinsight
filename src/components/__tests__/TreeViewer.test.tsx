import { render, screen } from '@testing-library/react';

// Mock minimal D3 API used by the fallback renderer
jest.mock('d3', () => {
  const chain = {
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
  };
  return {
    select: jest.fn(() => chain),
    hierarchy: jest.fn((tree: unknown) => ({ data: tree })),
    tree: jest.fn(() => ({
      size: jest.fn().mockReturnValue((root: unknown) => ({
        links: () => [],
        descendants: () => [],
      })),
    })),
  };
});

import TreeViewer from '@/components/TreeViewer';

describe('TreeViewer', () => {
  it('renders container for tree', () => {
    render(<TreeViewer newick="(A:1.0,(B:1.0,C:1.0):1.0);" />);
    const el = screen.getByLabelText('Phylogenetic Tree Visualization');
    expect(el).toBeInTheDocument();
  });
});
