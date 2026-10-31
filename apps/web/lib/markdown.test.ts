import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown, plainText, safeHref } from './markdown';

describe('knowledge Markdown', () => {
  it('reads headings, paragraphs, lists, checklists, quotes, code and rules', () => {
    const blocks = parseMarkdown(
      [
        '# Kickoff',
        'First line',
        'continues here.',
        '',
        '- one',
        '- [x] done',
        '- [ ] to do',
        '1. first',
        '2. second',
        '> Send the recap.',
        '```',
        '<script>x</script>',
        '```',
        '---',
      ].join('\n'),
    );
    expect(blocks.map((b) => b.t)).toEqual(['h', 'p', 'ul', 'ol', 'quote', 'code', 'hr']);
    expect(blocks[0]).toEqual({ t: 'h', level: 2, c: [{ t: 'text', v: 'Kickoff' }] });
    expect(blocks[1]).toEqual({ t: 'p', c: [{ t: 'text', v: 'First line continues here.' }] });
    expect(blocks[2]).toMatchObject({
      items: [{ checked: null }, { checked: true }, { checked: false }],
    });
    expect(blocks[5]).toEqual({ t: 'code', v: '<script>x</script>' });
  });

  it('starts headings at h2 whatever level the text begins with', () => {
    const levels = parseMarkdown('## Before\n\ntext\n\n### Detail').flatMap((b) =>
      b.t === 'h' ? [b.level] : [],
    );
    expect(levels).toEqual([2, 3]);
  });

  it('reads bold, italics, code and links inside a line', () => {
    expect(
      parseInline('Use **bold**, _this_, `code` and [the guide](https://example.com).'),
    ).toEqual([
      { t: 'text', v: 'Use ' },
      { t: 'strong', c: [{ t: 'text', v: 'bold' }] },
      { t: 'text', v: ', ' },
      { t: 'em', c: [{ t: 'text', v: 'this' }] },
      { t: 'text', v: ', ' },
      { t: 'code', v: 'code' },
      { t: 'text', v: ' and ' },
      { t: 'link', href: 'https://example.com', c: [{ t: 'text', v: 'the guide' }] },
      { t: 'text', v: '.' },
    ]);
    // Words with underscores and a lone asterisk stay as they are.
    expect(parseInline('snake_case_name costs 2 * 3')).toEqual([
      { t: 'text', v: 'snake_case_name costs 2 * 3' },
    ]);
  });

  it('keeps only web and mail links', () => {
    // Never a link, whatever is left over around it.
    expect(parseInline('[click](javascript:alert(1))').every((x) => x.t === 'text')).toBe(true);
    expect(parseInline('[x](data:text/html;base64,PHNjcmlwdD4=)')).toEqual([{ t: 'text', v: 'x' }]);
    expect(safeHref('data:text/html,hi')).toBeNull();
    expect(safeHref('mailto:hi@example.com')).toBe('mailto:hi@example.com');
    expect(safeHref('HTTPS://example.com/a?b=1')).toBe('HTTPS://example.com/a?b=1');
  });

  it('gives plain text for previews', () => {
    expect(plainText('## Goal\n\n- Understand **the problem** [well](https://x.com)')).toBe(
      'Goal Understand the problem well',
    );
    expect(plainText('x'.repeat(200), 10)).toBe('xxxxxxxxx…');
  });
});
