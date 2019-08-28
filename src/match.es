import { matchPath } from 'react-router';
import { getMatchableRoute } from './utils';
import { getResolver } from './connect';


const defaultGetLocals = (data) => data;

const matchRoute = (routes, path) => {
  let matches = [];

  for (const route of routes) {
    // It may be convenient to have `condition && route` in configuration objects, this allows it
    if (!route) continue;
    const matchableProps = getMatchableRoute(route);
    const match = matchPath(path, matchableProps);
    if (!match) continue;

    matches.push({ route, match });
    if (Array.isArray(route.routes)) {
      const nested = matchRoute(route.routes, path);
      if (nested) matches = matches.concat(nested);
    }

    // No need to continue because the first match needs to be returned.
    // Can't show multiple routes simultaneously. This matches <Switch> behavior.
    return matches;
  }

  return null;
};

export const runResolver = (routes, path, getLocals = defaultGetLocals) => {
  const matches = matchRoute(routes, path);
  if (!matches || !matches.length) return Promise.resolve([]);

  const promises = matches.reduce((acc, details) => {
    const resolver = getResolver(details.route);
    if (resolver) acc.push(resolver(getLocals(details)));
    return acc;
  }, []);

  return Promise.all(promises);
};
