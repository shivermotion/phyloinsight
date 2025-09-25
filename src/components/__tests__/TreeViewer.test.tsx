import { render, screen } from '@testing-library/react';

jest.mock('d3', () => ({
  select: () => ({ selectAll: () => ({ remove: () => ({}) }) }),
}));
jest.mock('phylotree', () => ({
  __esModule: true,
  default: function MockTree() {
    return {
      render: () => {},
    };
  },
}));

import TreeViewer from '@/components/TreeViewer';

describe('TreeViewer', () => {
  it('renders container for tree', () => {
    render(<TreeViewer newick="(A,(B,C));" />);
    const el = screen.getByLabelText('Phylogenetic Tree Visualization');
    expect(el).toBeInTheDocument();
  });
});
