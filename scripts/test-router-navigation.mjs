import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryRouter, resolvePath } from 'react-router-dom';

const backslash = String.fromCharCode(92);
const mixed = ['//foo', backslash + backslash + 'foo', '/' + backslash + 'foo', backslash + '/foo'];
const router = () => createMemoryRouter([
  { path: '/home', element: null }, { path: '/foo', element: null },
  { path: '/crossing/:slug', element: null },
], { initialEntries: ['/home'] });

test('Router normalizes the mixed-separator paths covered by the maintainer fix', () => {
  for (const value of mixed) assert.deepEqual(resolvePath(value), { pathname: '/foo', search: '', hash: '' });
});
test('Router rejects external/protocol-relative navigation and leaves the current location intact', async () => {
  const r = router();
  try {
    for (const value of [...mixed, 'https://bp-router.invalid/path']) {
      await assert.rejects(r.navigate(value), /External navigation is not allowed/);
      assert.equal(r.state.location.pathname, '/home');
    }
  } finally { r.dispose(); }
});
test('internal query/hash, replace and Back/Forward navigation retain their intended history', async () => {
  const r = router();
  try {
    await r.navigate('/foo?area=california#lanes');
    assert.deepEqual([r.state.location.pathname, r.state.location.search, r.state.location.hash], ['/foo', '?area=california', '#lanes']);
    await r.navigate('/home?lang=es', { replace: true });
    await r.navigate(-1);
    assert.deepEqual([r.state.location.pathname, r.state.location.search], ['/home', '']);
    await r.navigate(1);
    assert.deepEqual([r.state.location.pathname, r.state.location.search], ['/home', '?lang=es']);
  } finally { r.dispose(); }
});
test('encoded separators inside an internal route parameter do not become an external destination', async () => {
  const r = router();
  try {
    await r.navigate('/crossing/%5C%5Cbp-router.invalid/');
    assert.equal(r.state.location.pathname, '/crossing/%5C%5Cbp-router.invalid/');
    assert.equal(r.state.errors, null);
  } finally { r.dispose(); }
});
