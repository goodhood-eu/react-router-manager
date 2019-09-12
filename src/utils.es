export const getMatchableRoute = (route) => (
  typeof route.exact === 'undefined' ? { ...route, exact: true } : route
);
