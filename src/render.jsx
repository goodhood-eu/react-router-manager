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

export const Redirect = (props) => {
  const { statusCode, ...route } = props;

  const redirect = <RawRedirect {...getMatchableRoute(route)} />;
  if (!statusCode) return redirect;

  const { from, to, push, ...routeProps } = route;

  // We wrap the Redirect in Switch to reset React Router's path logic.
  // Otherwise Redirect will ignore the `from` prop.
  return (
    <RouteStatus {...routeProps} {...{ statusCode, path: from }}>
      <Switch>{redirect}</Switch>
    </RouteStatus>
  );
};

export const Route = (props) => {
  if (!isActionableRoute(props)) {
    console.error('Detected a useless route in your configuration', props);
    return null;
  }

  const renderProp = (routeProps) => {
    const { intercept } = props;
    const request = getRequestProps(routeProps, props);
    const route = isFunction(intercept) ? intercept(request) : props;

    // Might need to bail from rendering completely
    if (!route) return null;
    if (route.to) return <Redirect route={route} />;

    const { component: RouteComponent, statusCode, props: componentProps, routes, render } = route;
    // Route is to be handled here, set statusCode
    injectStatusCode(routeProps.staticContext, statusCode);

    const children = Array.isArray(routes) ? <RouterManager routes={routes} /> : null;

    // Attempt to render
    if (isFunction(render)) return render({ ...routeProps, children });
    if (!RouteComponent) return children;
    return <RouteComponent {...routeProps} {...componentProps}>{children}</RouteComponent>;
  };

  return <RawRoute {...getMatchableRoute(getRouteProps(props))} render={renderProp} />;
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
