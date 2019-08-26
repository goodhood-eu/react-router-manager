react-router-manager
====================

React Router server side rendering with data fetching. This module is heavily based on [react-router-config](https://github.com/ReactTraining/react-router/tree/master/packages/react-router-config) and expands on the same concept. The goal is to create a one stop solution to fetching data and routing on both client and server side when working with React Components. It is particularly useful for people migrating from [redial](https://github.com/markdalgleish/redial).

### Installation

```
npm install --save react-router-manager
```

### Usage

There are 2 distinct stages to working with this library, the first is data loading and the second is routing. In order for both to work you need to create "route configs". These configs allow for both routing and data fetching to work. Please use them for every route that needs to fetch data.


#### Route configs
A route config is an array of objects like this:

```js
[
  // A simple route
  {
    // The only difference with default Route paths is that you need
    // to use "*" for match-all data fetching and onEnter checks.
    path: '/stuff/:id?',

    // This will be called before the route is rendered and allows to add checks for path parameters
    // as well as authentication checks
    onEnter: ({ match, location, history, staticContext }) => {
      // Simply return a new path or a Redirect configuration object.
      // When a falsy value is returned the route is handled normally.
      if (match.params.id === '0') return '/stuff/31337';
    },

    // These props will be passed on to the component and also available in the data fetching function
    props: {
      type: 'awesome',
    },

    // Component to render
    component: MyComponent,

    // You may create your own render function if you wish. It will receive the usual arguments along with
    // `nestedRoutes` which is the rendered nested routes for this route or undefined
    render: ({ match, location, history, staticContext, nestedRoutes }) => {
      return <MyComponent>{nestedRoutes}</MyComponent>;
    }

    // Useful for handling 404s, but you can use it in any case.
    statusCode: 404,

    // You can create nested routes like this.
    routes: [
      // {...}
    ],

    // Any other props you would pass to a Route
    // We set this to `true` by default unlike the React Router. Pass `false` to override.
    exact: true,
    // ...
  },

  // A redirect
  {
    // Set this statusCode for the redirect
    statusCode: 302,

    // Any other props you would pass to a Redirect
    from: '/this/:id',
    to: '/that/:id',
    // ...
  },

  // Any falsy values in these arrays are ignored
  myCondition && {
    from: '/old',
    to: '/new',
  },

  //...
]
```
Every route must have either `component`, `render` or `onEnter`. For data fetching to work `component` is required. Everything else is optional.

#### connectResolver

To specify a data fetching function you simply wrap your component in a `connectResolver` like in a HOC.

```js
import { connectResolver } from 'react-router-manager';
const MyComponent = (props) => {
  //...
};

const getResolver = ({ match, route }) => getMyAsyncDataAndReturnPromise();

export default connectResolver(getResolver, MyComponent);
```

Alternatively simply create a static `resolver` method:

```js
MyComponent.resolver = ({ match, route }) => (
  getMyAsyncDataAndReturnPromise(match.params, route.props.type)
);
export default MyComponent;
```

#### runResolver
When you are ready to collect your promises and fetch the data use `runResolver`:

```js
import { runResolver } from './modules/resolver';
const routes = [/* routes config */];
const pathname = history.location.pathname; // for example

// By default each `getResolver` function gets { match, route } object as an argument.
// You can modify that object here as you wish.
const getLocals = (details) => ({ ...details, store: reduxStore })

// Once this promise is resolved it will get an array of resolved getResolver promises as an argument.
const promise = runResolver(routes, pathname, getLocals);

```

#### renderRoutes
This simply renders the route configuration for you. Pass directly into React Router like this:

```js
import { renderRoutes } from 'react-router-manager';
import { Router } from 'react-router';
import { createBrowserHistory } from 'history';
import { hydrate } from 'react-dom';

const routes = [/* routes config */];

hydrate(
  <Router history={createBrowserHistory()}>{renderRoutes(routes)}</Router>,
  document.getElementById('root')
);
```

### Utility functions

These are used internally, but you might want to use them too..

#### injectStatusCode
```js
import { injectStatusCode } from 'react-router-manager';

const MyComponent = (props) => {
  // Simply injects statusCode when static context is available. Use in any Component where
  // route information is connected: a component rendered by a Route or wrapped in withRouter
  injectStatusCode(props.staticContext, 403);
  //...
};

```

#### RouteStatus
```js
import { RouteStatus } from 'react-router-manager';

const MyComponent = (props) => {
  return (
    // This is essentially the same as injectStatusCode but in a Route object form.
    <RouteStatus statusCode={403}>
      {/* content */}
    </RouteStatus>
  );
};
```

#### renderRoute
```js
import { renderRoute } from 'react-router-manager';
const route = {
  path: '/stuff/:id?',
  component: MyComponent,
};

// Will simply render a single route
const renderedRoute = renderRoute(route);
```

#### renderRedirect
```js
import { renderRedirect } from 'react-router-manager';

const route =   {
  from: '/this/:id',
  to: '/that/:id',
},
// Will simply render a single redirect
const renderedRedirect = renderRedirect(route);
```

### A complete example

On the client side:
```js
import React from 'react';
import { render, hydrate } from 'react-dom';

import { Router } from 'react-router';
import { createBrowserHistory } from 'history';
import { runResolver, renderRoutes } from 'react-router-manager';

import routes from './routes';


// You may want to disable prerendering during development
const isAppPrerendered = global.__APP_PRERENDERED__;

const renderPage = (history, routes) => {
  const content = <Router history={history}>{renderRoutes(routes)}</Router>

  const renderer = isAppPrerendered ? hydrate : render;
  return renderer(content, document.getElementById('main'));
};

const startRouter = (store, history) => {
  let shouldFetch = !isAppPrerendered;

  const handleFetch = (location) => {
    const { pathname } = location;
    const getLocals = (details) => ({ ...details, location });
    if (shouldFetch) runResolver(routes, pathname, getLocals);
    shouldFetch = true;
  };

  // This allows to fetch data after navigation. You may use a different strategy if you wish.
  history.listen(handleFetch);
  handleFetch(history.location);

  renderPage(store, history, routes);
};

// Call setup functions. First setup store, then initialize router.
const history = createBrowserHistory();
startRouter(store, history);
```

An expressjs middleware on the server side:

```js
const React = require('react');
const { renderToString } = require('react-dom/server');

const { StaticRouter } = require('react-router');
const { createLocation } = require('history');
const { runResolver, renderRoutes } = require('react-router-manager');

const routes = require('./client/routes');


const renderContent = ({ routes, context, location }) => {
  const content = React.createElement(StaticRouter, { context, location }, renderRoutes(routes));
  return renderToString(content);
};

const renderPage = (res, context, data, content) => {

};

module.exports = (req, res) => {
  const location = createLocation(req.url);

  const handleError = (error) => {
    console.error(`Request ${req.url} failed to fetch data:`, error);
    res.status(500).render('index');
  };

  const getLocals = (details) => ({ ...details, store, location });

  const matchPage = (data) => {
    const context = {};
    const content = renderContent({ routes, context, location: req.url });

    if (context.url) return res.redirect(context.statusCode || 301, context.url);
    // In your template serialize data into `__APP_PRERENDERED__`;
    res.status(context.statusCode || 200).render('index', { data, content });
  };

  runResolver(routes, req.path, getLocals).then(matchPage).catch(handleError);
};
```
