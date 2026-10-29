import test from 'node:test';
import assert from 'node:assert/strict';
import { clubShareData, shareClub } from '../js/club-share.mjs';

const data = {
  title: 'Manchester Hawks | 0161 Active',
  url: 'https://0161active.co.uk/html/korfball/manchester-hawks.html'
};

test('club sharing uses its clean canonical address rather than a local preview or filters', () => {
  assert.deepEqual(
    clubShareData('Manchester Hawks', `${data.url}?sport=korfball#profile-week-title`, 'http://127.0.0.1:5503/'),
    data
  );
  assert.equal(
    clubShareData('Example', 'javascript:alert(1)', 'https://example.org/club?x=1#week').url,
    'https://example.org/club'
  );
});

test('native sharing receives the club title and URL without copying to the clipboard', async () => {
  const received = [];
  const result = await shareClub(data, {
    share: async (value) => received.push(value),
    clipboard: { writeText: async () => assert.fail('Native share must not overwrite the clipboard') }
  });
  assert.equal(result, 'shared');
  assert.deepEqual(received, [data]);
});

test('cancelling the native share leaves the clipboard alone', async () => {
  const result = await shareClub(data, {
    share: async () => {
      throw Object.assign(new Error('Cancelled'), { name: 'AbortError' });
    },
    clipboard: { writeText: async () => assert.fail('Cancellation must not copy a link') }
  });
  assert.equal(result, 'cancelled');
});

test('unsupported or denied native sharing copies the URL, with a manual fallback if copying is denied', async () => {
  for (const share of [
    undefined,
    async () => {
      throw new Error('Not allowed');
    }
  ]) {
    const copied = [];
    assert.equal(
      await shareClub(data, { share, clipboard: { writeText: async (value) => copied.push(value) } }),
      'copied'
    );
    assert.deepEqual(copied, [data.url]);
  }
  assert.equal(await shareClub(data, {}), 'manual');
  assert.equal(
    await shareClub(data, {
      clipboard: {
        writeText: async () => {
          throw new Error('Denied');
        }
      }
    }),
    'manual'
  );
});
