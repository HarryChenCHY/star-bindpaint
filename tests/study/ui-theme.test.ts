import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../../src/app/night-ui.css', import.meta.url), 'utf8');
function color(name: string) {
  const hex = css.match(new RegExp(`--st-${name}: (#[0-9a-f]{6});`, 'i'))?.[1];
  assert.ok(hex, `Missing color token: ${name}`);
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
function contrast(a: string, b: string) {
  const values = [color(a), color(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}
test('Public UI text tokens meet normal-text contrast on their intended surfaces', () => {
  for (const surface of ['bg', 'surface', 'raised', 'hover']) {
    for (const text of ['text', 'muted']) assert.ok(contrast(text, surface) >= 4.5, `${text} / ${surface}`);
  }
  for (const [foreground, background] of [['on-primary', 'primary'], ['text', 'selected'], ['accent-text', 'selected'], ['danger', 'danger-bg']]) {
    assert.ok(contrast(foreground, background) >= 4.5, `${foreground} / ${background}`);
  }
});
test('Focus and control boundaries retain non-text contrast', () => {
  for (const surface of ['bg', 'surface', 'raised']) {
    assert.ok(contrast('control-line', surface) >= 3, `control-line / ${surface}`);
    assert.ok(contrast('focus', surface) >= 3, `focus / ${surface}`);
  }
});

test('Neutral workspace surfaces never tint the artwork surround', () => {
  for (const token of ['bg', 'surface', 'raised', 'hover', 'selected']) {
    const hex = css.match(new RegExp(`--st-${token}: (#[0-9a-f]{6});`, 'i'))?.[1];
    assert.ok(hex);
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
    assert.ok(channels[0] > 0, `${token} must not be pure black`);
    assert.equal(channels[0], channels[1], `${token} must be achromatic`);
    assert.equal(channels[1], channels[2], `${token} must be achromatic`);
  }
});
