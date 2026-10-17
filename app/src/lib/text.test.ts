import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clip } from './text.ts';

test('clip: curto fica igual', () => assert.equal(clip('Piso vinílico', 70), 'Piso vinílico'));
test('clip: não parte palavra e fecha com reticências', () => {
  const r = clip('Piso vinílico instalado com rodapé, acabamento completo e garantia estendida para sala', 70);
  assert.ok(r.length <= 70);
  assert.equal(r, 'Piso vinílico instalado com rodapé, acabamento completo e garantia…');
});
test('clip: tira vírgula solta antes das reticências', () => assert.equal(clip('aaaa bbbb, cccccccccc', 12), 'aaaa bbbb…'));
