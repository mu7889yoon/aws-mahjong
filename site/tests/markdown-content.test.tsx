import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { MarkdownContent } from '../src/components/MarkdownContent';
import { TileHand } from '../src/components/TileHand';

it('renders a score table and a hand fence as accessible tile images without a code wrapper', () => {
  const html = renderToStaticMarkup(
    <MarkdownContent
      source={'|飜|子|\n|-|-|\n|1|1000|\n\n```hand\n123m-55z\n```'}
      assetPath="assets/v2.0.1"
    />,
  );
  expect(html).toContain('<table>');
  expect(html).toContain('<td>1000</td>');
  expect(html).toContain('role="img"');
  expect(html).toContain('aria-label="手牌: 123m-55z"');
  expect(html.match(/<img /g)).toHaveLength(5);
  expect(html).toContain('/assets/v2.0.1/output/5z.svg');
  expect(html).not.toContain('<pre');
});

it('keeps called tiles in the same counterclockwise orientation as the original renderer', () => {
  const html = renderToStaticMarkup(<TileHand mpsz={'1\'2"p'} assetPath="assets/v2.0.1" />);
  expect(html.match(/rotate\(-90deg\)/g)).toHaveLength(3);
  expect(html.match(/<img /g)).toHaveLength(3);
});
