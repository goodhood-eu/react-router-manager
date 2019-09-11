import React from 'react';
import { Switch, Route, Redirect } from 'react-router';
import { getMatchableRoute, decodeRouteParams } from './utils';


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
  const matchableProps = getMatchableRoute(options);

  const redirect = <Redirect {...matchableProps} />;
  if (!statusCode) return redirect;

  const { from, to, push, ...routeProps } = matchableProps;
  return <RouteStatus {...routeProps} {...{ statusCode, path: from }}>{redirect}</RouteStatus>;
};

export const renderRoute = (route) => {
  const { component: RouteComponent, statusCode, props, routes, onEnter, ...options } = route;
  if (!route.render && !RouteComponent && !onEnter) {
    console.error('Detected a useless route in your configuration', route);
    return null;
  }

  const matchableProps = getMatchableRoute(options);

  let nestedRoutes;
  if (Array.isArray(routes)) nestedRoutes = renderRoutes(routes);

  const render = (rawRouteProps) => {
    const routeProps = decodeRouteParams(rawRouteProps);
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

  return <Route {...matchableProps} render={render} />;
};

const renderItem = (route, i) => {
  if (!route) return null;
  const { ...options } = route;
  if (!options.key) options.key = i;
  const render = options.to ? renderRedirect : renderRoute;
  return render(options);
};

export const renderRoutes = (routes) => {
  if (!routes || !routes.length) return null;
  return <Switch>{routes.map(renderItem)}</Switch>;
};
