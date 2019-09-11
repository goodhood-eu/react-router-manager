const { assert } = require('chai');

const {
  getMatchableRoute,
  decodeRouteParams,
} = require('../lib/utils');


describe('utils', () => {
  it('getMatchableRoute', () => {
    assert.deepEqual(getMatchableRoute({}), { exact: true }, 'injects defaults');
    assert.deepEqual(getMatchableRoute({ path: '/test' }), { path: '/test', exact: true }, 'keeps unrelated props');
    assert.deepEqual(getMatchableRoute({ exact: false }), { exact: false }, 'respects defaults');
    assert.deepEqual(getMatchableRoute({ path: '/test', exact: false }), { path: '/test', exact: false }, 'respects defaults and keeps unrelated props');
  });

  it('decodeRouteParams', () => {
    const props = { params: {} };
    const withParams = {
      params: {
        test1: encodeURIComponent('i am a string with spaces'),
        test2: encodeURIComponent('i am a string with % signs'),
      },
    };

    const decoded = {
      originalParams: withParams.params,
      params: {
        test1: 'i am a string with spaces',
        test2: 'i am a string with % signs',
      },
    };
    assert.notEqual(decodeRouteParams(props), props, 'doesn\'t mutate object');
    assert.notEqual(decodeRouteParams(props).params, props.params, 'doesn\'t mutate nested object');
    assert.equal(decodeRouteParams(props).originalParams, props.params, 'preserves original params');
    assert.deepEqual(decodeRouteParams(withParams), decoded, 'decodes params properly');
  });
});
