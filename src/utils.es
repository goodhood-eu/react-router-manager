export const getMatchableRoute = (route) => (
  typeof route.exact === 'undefined' ? { ...route, exact: true } : route
);

export const decodeMatchParams = ({ params, ...rest }) => ({
  ...rest,
  originalParams: params,
  params: Object.keys(params).reduce((acc, key) => ({
    ...acc,
    [key]: decodeURIComponent(params[key]),
  }), {}),
});
