class BTreeNode {
  keys: string[] = [];
  rowIndexes: number[][] = [];
  children: BTreeNode[] = [];
  leaf = true;
}

export class BTree {
  private readonly minDegree = 2;
  private root = new BTreeNode();

  search(key: string): number[] {
  let node = this.root;

  while (true) {
    let index = 0;

    while (index < node.keys.length && key > node.keys[index]) {
      index++;
    }

    if (index < node.keys.length && node.keys[index] === key) {
      return node.rowIndexes[index];
    }

    if (node.leaf) {
      return [];
    }

    node = node.children[index];
  }
}
}