/* eslint no-use-before-define: ["off"] */
import React from 'react';
import { matchPath, Switch, Route, Redirect } from 'react-router';

const RESOLVER_PROP_NAME = '__runResolverPromise__';

const defaultGetLocals = (data) => data;

export const connectResolver = (getPromise, Component) => {
  // There is no point in implementing a real HOC since there is no way to have a component chain
  // with multiple `getPromise` methods. Simply override whatever the current value is.
  Component[RESOLVER_PROP_NAME] = getPromise;
  return Component;
};

const getMatchableRoute = (route) => (
  typeof route.exact === 'undefined' ? { ...route, exact: true } : route
);

const matchRoute = (routes, path) => {
  let matches = [];

  for (const route of routes) {
    // It may be convenient to have `condition && route` in configuration objects, this allows it
    if (!route) continue;
    const match = matchPath(path, getMatchableRoute(route));
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

const getResolver = ({ component }) => {
  if (!component) return null;
  return component.resolver || component[RESOLVER_PROP_NAME];
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

export const injectStatusCode = (context, statusCode) => {
  if (context && statusCode) context.statusCode = statusCode;
};

export const RouteStatus = ({ statusCode, children, ...props }) => {
  const render = ({ staticContext }) => {
    injectStatusCode(staticContext, statusCode);
    return children;
  };

  return <Route {...props} render={render} />;
};

export const renderRedirect = (route) => {
  const { statusCode, ...options } = route;
  if (!statusCode) return <Redirect {...options} />;

  const { key, ...props } = options;
  return (
    <RouteStatus {...{ key, statusCode }} path={options.from}>
      <Redirect {...props} />
    </RouteStatus>
  );
};

export const renderRoute = (route) => {
  const { component: RouteComponent, statusCode, props, routes, onEnter, ...options } = route;
  if (!route.render && !RouteComponent && !onEnter) {
    console.error('Detected a useless route in your configuration', route);
    return null;
  }

  let nestedRoutes;
  if (Array.isArray(routes)) nestedRoutes = renderRoutes(routes);

  const render = (routeProps) => {
    // Check if it is a simple redirect first
    const redirect = typeof onEnter === 'function' && onEnter(routeProps);
    if (redirect) return renderRedirect(typeof redirect === 'string' ? { to: redirect } : redirect);

    // Route is to be handled here, set statusCode
    injectStatusCode(routeProps.staticContext, statusCode);

    // Attempt to render
    if (route.render) return route.render({ ...routeProps, nestedRoutes });
    if (!RouteComponent) return nestedRoutes;
    return <RouteComponent {...routeProps} {...props}>{nestedRoutes}</RouteComponent>;
  };

  return <Route {...options} render={render} />;
};

const renderItem = (route, i) => {
  if (!route) return null;
  const { ...options } = route;
  if (!options.key) options.key = i;
  const render = options.from ? renderRedirect : renderRoute;
  return render(getMatchableRoute(options));
};

export const renderRoutes = (routes) => {
  if (!routes || !routes.length) return null;
  return <Switch>{routes.map(renderItem)}</Switch>;
};
