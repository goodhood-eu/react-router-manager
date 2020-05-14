export const getMatchableRoute = (route) => {
  const { exact = true, sensitive = false, strict = true, ...params } = route;
  return { ...params, exact, sensitive, strict };
};
