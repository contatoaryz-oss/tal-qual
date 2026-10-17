import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrice, parseSource } from './parse.ts';

test('parseSource: site', () => {
  assert.deepEqual(parseSource('massabruta.com.br'), { websiteUrl: 'https://massabruta.com.br', instagramHandle: null, suggestedName: 'Massabruta' });
  assert.equal(parseSource('https://www.doceria-boa.com/contato')?.websiteUrl, 'https://www.doceria-boa.com');
  assert.equal(parseSource('  http://loja.com  ')?.websiteUrl, 'http://loja.com');
});

test('parseSource: Instagram', () => {
  assert.equal(parseSource('@Massa.Bruta')?.instagramHandle, 'massa.bruta');
  assert.equal(parseSource('instagram.com/doceria_teste/')?.instagramHandle, 'doceria_teste');
  assert.equal(parseSource('https://www.instagram.com/hedone.doceria')?.instagramHandle, 'hedone.doceria');
  assert.equal(parseSource('@doceria.teste')?.suggestedName, 'Doceria Teste');
});

test('parseSource: recusa o que não é site nem @', () => {
  for (const bad of ['', '   ', 'isso nao e um site', 'localhost', '@', '@nome com espaço', 'instagram.com', 'ftp://x']) {
    assert.equal(parseSource(bad), null, bad);
  }
});

test('parsePrice', () => {
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice(undefined), null);
  assert.equal(parsePrice('89,90'), 8990);
  assert.equal(parsePrice('R$ 1.299,00'), 129900);
  assert.equal(parsePrice('1299'), 129900);
  assert.equal(parsePrice('0,5'), 50);
  for (const bad of ['abc', '1,2,3', '12.34', '-5', '1.29']) assert.equal(parsePrice(bad), 'invalid', bad);
});
