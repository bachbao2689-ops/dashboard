export interface DescriptionColumn {
  text: string;
  imageUrl?: string;
}

export interface DescriptionBlock {
  id: string;
  type: 'text' | 'columns';
  text?: string;
  columnCount?: 2 | 3;
  columns?: DescriptionColumn[];
}

const COLUMNS_BLOCK_REGEX = /\[columns:([23])\]([\s\S]*?)\[\/columns\]/g;
const COL_ITEM_REGEX = /\[col\]([\s\S]*?)\[\/col\]/g;
const IMG_EXTRACTION_REGEX = /(?:!\[([^\]]*)\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)|\[img:(https?:\/\/[^\s\]]+|data:image\/[^\s\]]+)\])/;

/**
 * Parses a raw description string (with markdown + [columns:N] tags) into structured blocks.
 */
export function parseDescriptionToBlocks(raw?: string | null): DescriptionBlock[] {
  if (!raw || !raw.trim()) {
    return [{ id: 'b_init', type: 'text', text: '' }];
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

    const count = parseInt(match[1], 10) === 3 ? 3 : 2;
    const innerColumnsText = match[2] || '';
    const columns: DescriptionColumn[] = [];

    let colMatch: RegExpExecArray | null;
    COL_ITEM_REGEX.lastIndex = 0;
    while ((colMatch = COL_ITEM_REGEX.exec(innerColumnsText)) !== null) {
      const colContent = colMatch[1] || '';
      const imgMatch = colContent.match(IMG_EXTRACTION_REGEX);
      let imageUrl: string | undefined;
      let textWithoutImg = colContent;

      if (imgMatch) {
        imageUrl = imgMatch[2] || imgMatch[3];
        textWithoutImg = colContent.replace(imgMatch[0], '').trim();
      }

      columns.push({
        text: textWithoutImg.trim(),
        imageUrl: imageUrl?.trim(),
      });
    }

    // Ensure we have at least `count` columns
    while (columns.length < count) {
      columns.push({ text: '' });
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
 * Serializes structured blocks back into a stored markdown string.
 */
export function serializeBlocksToDescription(blocks: DescriptionBlock[]): string {
  if (!blocks || blocks.length === 0) return '';

  const chunks: string[] = [];

  for (const block of blocks) {
    if (block.type === 'text') {
      const t = (block.text || '').trim();
      if (t) chunks.push(t);
    } else if (block.type === 'columns') {
      const count = block.columnCount === 3 ? 3 : 2;
      const cols = (block.columns || []).slice(0, count).map(col => {
        const parts: string[] = [];
        if (col.text?.trim()) parts.push(col.text.trim());
        if (col.imageUrl?.trim()) parts.push(`![image](${col.imageUrl.trim()})`);
        return `[col]\n${parts.join('\n')}\n[/col]`;
      });

      // Only serialize if at least one column has content or user explicitly kept the column layout
      const hasContent = cols.some(c => c.trim().length > 13); // longer than empty [col][/col]
      if (hasContent || cols.length > 0) {
        chunks.push(`[columns:${count}]\n${cols.join('\n')}\n[/columns]`);
      }
    }
  }

  return chunks.join('\n\n');
}
