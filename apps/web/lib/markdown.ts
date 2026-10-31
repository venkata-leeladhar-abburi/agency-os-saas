// A small, safe Markdown reader for knowledge items: it turns text into a tree the page draws
// with React, so nothing is ever inserted as HTML. Links keep only web and mail addresses.

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: Inline[] };

export type ListItem = { c: Inline[]; checked: boolean | null };

export type Block =
  | { t: 'h'; level: 2 | 3 | 4; c: Inline[] }
  | { t: 'p'; c: Inline[] }
  | { t: 'ul'; items: ListItem[] }
  | { t: 'ol'; items: ListItem[] }
  | { t: 'quote'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'hr' };

/** Web, mail and in-page addresses only; anything else (javascript:, data:) is dropped. */
export function safeHref(href: string): string | null {
  const h = href.trim();
  return /^(https?:\/\/|mailto:|#)/i.test(h) && !/[\s<>"]/.test(h) ? h : null;
}

const INLINE =
  /`([^`]+)`|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(?<![\w*])\*(?!\s)(.+?)\*(?!\w)|(?<!\w)_(?!\s)(.+?)_(?!\w)/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push({ t: 'text', v: rest });
      break;
    }
    if (m.index > 0) out.push({ t: 'text', v: rest.slice(0, m.index) });
    const [whole, code, strong, linkText, href, em1, em2] = m;
    if (code !== undefined) out.push({ t: 'code', v: code });
    else if (strong !== undefined) out.push({ t: 'strong', c: parseInline(strong) });
    else if (linkText !== undefined) {
      const safe = safeHref(href!);
      out.push(
        safe ? { t: 'link', href: safe, c: parseInline(linkText) } : { t: 'text', v: linkText },
      );
    } else out.push({ t: 'em', c: parseInline((em1 ?? em2)!) });
    rest = rest.slice(m.index + whole.length);
  }
  // Join neighbouring text pieces.
  return out.reduce<Inline[]>((acc, x) => {
    const last = acc.at(-1);
    if (x.t === 'text' && last?.t === 'text') last.v += x.v;
    else acc.push(x);
    return acc;
  }, []);
}

const BULLET = /^\s*[-*]\s+(?:\[( |x|X)\]\s+)?(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: 'p', c: parseInline(para.join(' ')) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^```/.test(line.trim())) {
      flush();
      const code: string[] = [];
      for (i++; i < lines.length && !/^```/.test(lines[i]!.trim()); i++) code.push(lines[i]!);
      blocks.push({ t: 'code', v: code.join('\n') });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      // The page title is the h1, so # becomes h2.
      blocks.push({
        t: 'h',
        level: (heading[1]!.length + 1) as 2 | 3 | 4,
        c: parseInline(heading[2]!),
      });
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flush();
      blocks.push({ t: 'hr' });
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush();
      const quote: string[] = [];
      for (; i < lines.length && /^>\s?/.test(lines[i]!); i++)
        quote.push(lines[i]!.replace(/^>\s?/, ''));
      i--;
      blocks.push({ t: 'quote', c: parseInline(quote.join(' ')) });
      continue;
    }
    const kind = BULLET.test(line) ? 'ul' : NUMBER.test(line) ? 'ol' : null;
    if (kind) {
      flush();
      const items: ListItem[] = [];
      for (; i < lines.length; i++) {
        const l = lines[i]!;
        const b = kind === 'ul' ? BULLET.exec(l) : null;
        const n = kind === 'ol' ? NUMBER.exec(l) : null;
        if (b)
          items.push({ c: parseInline(b[2]!), checked: b[1] === undefined ? null : b[1] !== ' ' });
        else if (n) items.push({ c: parseInline(n[1]!), checked: null });
        else break;
      }
      i--;
      blocks.push({ t: kind, items });
      continue;
    }
    para.push(line.trim());
  }
  flush();
  // Headings start at h2 under the page's title, whichever level the writer began with.
  const top = Math.min(...blocks.map((x) => (x.t === 'h' ? x.level : 9)));
  if (top < 9 && top > 2)
    for (const x of blocks)
      if (x.t === 'h') x.level = Math.max(2, x.level - (top - 2)) as 2 | 3 | 4;
  return blocks;
}

/** Plain text, for previews and search snippets. */
export function plainText(source: string, max = 160): string {
  const text = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`[\]]|\(https?:[^)]*\)|^\s*[-*]\s+(\[.\]\s+)?|^\s*\d+[.)]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
