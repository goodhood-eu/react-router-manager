import React from 'react';
import { Switch, Route as RawRoute, Redirect as RawRedirect } from 'react-router';
import { isNumber, isFunction, getMatchableRoute } from './utils';

export const getRouteProps = ({
  component, statusCode, props, routes, intercept, ...cleanProps
}) => (
  cleanProps
);

export const getRequestProps = ({ location, match }, route) => ({ location, match, route });

export const isActionableRoute = ({ render, component, intercept }) => (
  Boolean(isFunction(render) || component || isFunction(intercept))
);

export const injectStatusCode = (context = {}, statusCode) => {
  if (isNumber(statusCode)) context.statusCode = statusCode;
};

export const RouteStatus = ({ statusCode, children, ...props }) => {
  const render = ({ staticContext }) => {
    injectStatusCode(staticContext, statusCode);
    return children;
  };

  return <RawRoute {...getMatchableRoute(props)} render={render} />;
};

export const Redirect = ({ route }) => {
  const { statusCode, ...props } = route;

  const redirect = <RawRedirect {...getMatchableRoute(props)} />;
  if (!statusCode) return redirect;

  const { from, to, push, ...routeProps } = props;

  // We wrap the Redirect in Switch to reset React Router's path logic.
  // Otherwise Redirect will ignore the `from` prop.
  return (
    <RouteStatus {...routeProps} {...{ statusCode, path: from }}>
      <Switch>{redirect}</Switch>
    </RouteStatus>
  );
};

export const Route = ({ route: originalRoute }) => {
  if (!isActionableRoute(originalRoute)) {
    console.error('Detected a useless route in your configuration', originalRoute);
    return null;
  }

  const renderProp = (routeProps) => {
    const { intercept } = originalRoute;
    const request = getRequestProps(routeProps, originalRoute);

    const route = isFunction(intercept) ? intercept(request) : originalRoute;
    if (route.to) return <Redirect route={route} />;

    const { component: RouteComponent, statusCode, props, routes, render } = route;

    // Route is to be handled here, set statusCode
    injectStatusCode(routeProps.staticContext, statusCode);

    const children = Array.isArray(routes) ? <RouterManager routes={routes} /> : null;

    // Attempt to render
    if (isFunction(render)) return render({ ...routeProps, children });
    if (!RouteComponent) return children;
    return <RouteComponent {...routeProps} {...props}>{children}</RouteComponent>;
  };

  return <RawRoute {...getMatchableRoute(getRouteProps(originalRoute))} render={renderProp} />;
};

const renderItem = (route, index) => {
  const { to, key, hook } = route;
  const Component = (to && !isFunction(hook)) ? Redirect : Route;
  return <Component {...route} key={key ? `${key}${index}` : index} />;
};

export const RouterManager = ({ routes }) => {
  if (!routes || !routes.length) return null;
  return <Switch>{routes.map(renderItem)}</Switch>;
};
