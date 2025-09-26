declare module 'phylotree' {
  export const phylotree: new (newick: string) => {
    render: (options: {
      container: Element | string;
      width: number;
      height: number;
      [key: string]: unknown;
    }) => void;
    get_nodes?: () => unknown[];
    get_leaves?: () => unknown[];
  };
}
