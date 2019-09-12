const { assert } = require('chai');

const {
  getMatchableRoute,
} = require('../lib/utils');


describe('utils', () => {
  it('getMatchableRoute', () => {
    assert.deepEqual(getMatchableRoute({}), { exact: true }, 'injects defaults');
    assert.deepEqual(getMatchableRoute({ path: '/test' }), { path: '/test', exact: true }, 'keeps unrelated props');
    assert.deepEqual(getMatchableRoute({ exact: false }), { exact: false }, 'respects defaults');
    assert.deepEqual(getMatchableRoute({ path: '/test', exact: false }), { path: '/test', exact: false }, 'respects defaults and keeps unrelated props');
  });
});
