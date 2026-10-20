export interface DescriptionBlock {
  id: string;
  type: 'text' | 'columns';
  text?: string;
  columnCount?: number;
  columns?: string[];
}

const COLUMNS_BLOCK_REGEX = /\[columns:([2-6])\]([\s\S]*?)\[\/columns\]/g;
const COL_ITEM_REGEX = /\[col\]([\s\S]*?)\[\/col\]/g;

/**
 * Parses raw description string into structured text & column blocks.
 */
export function parseDescriptionToBlocks(raw?: string | null): DescriptionBlock[] {
  if (!raw || !raw.trim()) {
    return [{ id: 'b_0', type: 'text', text: '' }];
  }

  const blocks: DescriptionBlock[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  COLUMNS_BLOCK_REGEX.lastIndex = 0;

  while ((match = COLUMNS_BLOCK_REGEX.exec(raw)) !== null) {
    const textBefore = raw.slice(lastIndex, match.index).trim();
    if (textBefore) {
      blocks.push({
        id: `txt_${lastIndex}`,
        type: 'text',
        text: textBefore,
      });
    }

    const count = parseInt(match[1], 10) || 2;
    const innerColumnsText = match[2] || '';
    const columns: string[] = [];

    let colMatch: RegExpExecArray | null;
    COL_ITEM_REGEX.lastIndex = 0;
    while ((colMatch = COL_ITEM_REGEX.exec(innerColumnsText)) !== null) {
      columns.push((colMatch[1] || '').trim());
    }

    while (columns.length < count) {
      columns.push('');
    }

    blocks.push({
      id: `col_${match.index}`,
      type: 'columns',
      columnCount: count,
      columns: columns.slice(0, count),
    });

    lastIndex = match.index + match[0].length;
  }

  const trailingText = raw.slice(lastIndex).trim();
  if (trailingText) {
    blocks.push({
      id: `txt_${lastIndex}`,
      type: 'text',
      text: trailingText,
    });
  }

  if (blocks.length === 0) {
    blocks.push({ id: 'b_empty', type: 'text', text: '' });
  }

  return blocks;
}

/**
 * Serializes structured blocks back into stored markdown.
 */
export function serializeBlocksToDescription(blocks: DescriptionBlock[]): string {
  if (!blocks || blocks.length === 0) return '';

  const chunks: string[] = [];

  for (const block of blocks) {
    if (block.type === 'text') {
      const t = (block.text || '').trim();
      if (t) chunks.push(t);
    } else if (block.type === 'columns') {
      const count = block.columns?.length || block.columnCount || 2;
      const cols = (block.columns || []).slice(0, count).map(c => `[col]\n${(c || '').trim()}\n[/col]`);
      const hasContent = cols.some(c => c.trim().length > 13);
      if (hasContent || cols.length > 0) {
        chunks.push(`[columns:${count}]\n${cols.join('\n')}\n[/columns]`);
      }
    }
  }

  return chunks.join('\n\n');
}
