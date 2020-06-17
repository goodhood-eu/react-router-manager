react-router-manager
====================

React Router server side rendering with data fetching. This module is based on [react-router-config](https://github.com/ReactTraining/react-router/tree/master/packages/react-router-config) and expands on the same concepts. The goal is to create a one stop solution for routing and data fetching on both client and server. It is particularly useful for people migrating from [redial](https://github.com/markdalgleish/redial).

## Installation

```
npm install --save react-router-manager
```

## Usage

There are 2 distinct stages to working with this library, the first is data fetching and the second is rendering. In order for both to work you need to create "route configs". These configs allow for both routing and data fetching to work. Please use them for every route that needs to fetch data.

**IMPORTANT**: the utilities here default to `exact: true` for route matching, which is the opposite of what Route components in React Router do. Partial matching is prone to errors and creates more issues than it solves. Override it on per route basis if needed.


### Route configs
A route config is an array of objects like this:

```js
[
  // A Route
  {
    // The only difference with default Route paths is that you need
    // to use "*" for match-all data fetching and intercept functions.
    path: '/stuff/:id?',

    // This will be called both before the route data is fetched and before the route is rendered.
    // It allows you to completely rewrite the route object and return different components
    // or redirect conditionally. Return a new route configuration object here.
    // Anything except `path` and `intercept` can be returned (overriden).
    intercept: ({ match, location, route }) => {
      // Returning null will prevent fetching and rendering of the entire subtree.
      if (!isAuthorized()) return null;

      // Simply return a Route or a Redirect configuration object.
      if (match.params.id === '0') return { to: '/otherstuff' };
      return { component: MyComponent };
    },

    // These props will be passed on to the component and also available in the data fetching function
    props: {
      type: 'awesome',
    },

    // Component to render
    component: MyComponent,

    // You may create your own render function if you wish. It will receive the usual arguments
    // along with `children` which is the rendered nested routes for this route (or null).
    // NOTE: This way data fetching will not work for this route as it relies on `component` prop.
    render: ({ match, location, history, staticContext, children }) => {
      return <MyComponent>{children}</MyComponent>;
    }

    // Useful for handling 404s, but you can use it in any case.
    statusCode: 404,

    // You can nest routes like this.
    routes: [
      // {...}
    ],

    // Any other props you would pass to a Route
    // We default this to `true` unlike the React Router. Pass `false` to override.
    exact: false,
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

  // To use syntax like this also use a `.filter` function at the end
  myCondition && {
    from: '/old',
    to: '/new',
  },

  //...
]
// Use this if you had any conditions, any falsy values in these arrays will get filtered out
.filter(Boolean)
```
Every route must have either `component`, `render` or `intercept` for rendering. For data fetching to work `component` is required. Everything else is optional.

### Connecting components

To specify a data fetching function you need to create a static `resolver` method:

```js
// You can return either a promise or an array of promises
MyComponent.resolver = ({ match, route }) => ([
  getMyAsyncDataAndReturnPromise(match.params, route.props.type),
  andAnotherPromise(match.params),
]);
export default MyComponent;
```

### runResolver
When you are ready to collect your promises and fetch the data use `runResolver`:

```js
import { runResolver } from './modules/resolver';
const routes = [/* routes config */];
const { location } = history;

// By default each static resolver method gets { match, route, location } object as an argument.
// You can modify that object here as you wish.
const getLocals = (request) => ({ ...request, store: reduxStore })

// You get back an array of promises to resolve as you will
Promise.all(runResolver(routes, location, getLocals));
```

You might want to use `Promise.allSettled` on the server side to wait for every promise to resolve or reject. Or you can go for a "fail early" approach with `Promise.all` everywhere. Returning an array gives you that choice.

### RouterManager or renderRoutes
This simply renders the route configuration for you. This is the default export and you can use it as a function or as a component. Pass directly into React Router like this:

```js
import RouterManager from 'react-router-manager';
import { Router } from 'react-router';
import { createBrowserHistory } from 'history';
import { hydrate } from 'react-dom';

const routes = [/* routes config */];

hydrate(
  <Router history={createBrowserHistory()}><RouterManager routes={routes} /></Router>,
  document.getElementById('root')
);
```

Alternatively:

```js
import renderRoutes from 'react-router-manager';
// ...
hydrate(
  <Router history={createBrowserHistory()}>{renderRoutes({ routes })}</Router>,
  document.getElementById('root')
);
```

### Utility functions

These are used internally, but you might want to use them too.

### injectStatusCode
```js
import { injectStatusCode } from 'react-router-manager';

const MyComponent = (props) => {
  // Simply injects statusCode when static context is available. Use in any Component where
  // route information is available.
  injectStatusCode(props.staticContext, 403);
  //...
};

```

### RouteStatus
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

### Route
You can use it as a function or as a component.

```js
import { Route } from 'react-router-manager';

// Will simply render a single route
return <Route path="/stuff/:id?" component={MyComponent} />;
```

Alternatively:

```js
import { Route as renderRoute } from 'react-router-manager';

// Will simply render a single route
return renderRoute({ path: '/stuff/:id?', component: MyComponent });
```

### Redirect
You can use it as a function or as a component.

```js
import { Redirect } from 'react-router-manager';

// Will simply render a single redirect
return <Redirect from="/this/:id" to="/that/:id" />;
```

Alternatively:

```js
import { Redirect as renderRedirect } from 'react-router-manager';

// Will simply render a single route
return renderRedirect({ from: '/this/:id', to: '/that/:id' });
```

## A complete example

On the client side:
```js
import React from 'react';
import { render, hydrate } from 'react-dom';

import { Router } from 'react-router';
import { createBrowserHistory } from 'history';
import RouterManager, { runResolver } from 'react-router-manager';

import routes from './routes';


// You may want to disable prerendering during development
const isAppPrerendered = global.__APP_PRERENDERED__;

const renderPage = (history, routes) => {
  const content = <Router history={history}><RouterManager routes={routes} /></Router>

  const renderer = isAppPrerendered ? hydrate : render;
  return renderer(content, document.getElementById('main'));
};

const startRouter = (store, history) => {
  let shouldFetch = !isAppPrerendered;

  const handleFetch = (location) => {
    if (shouldFetch) runResolver(routes, location);
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
import React from 'react';
import { renderToString } from 'react-dom/server';

import { StaticRouter } from 'react-router';
import { createLocation } from 'history';
import RouterManager, { runResolver } from 'react-router-manager';

import routes from './client/routes';


const renderContent = (routes, context, location) => {
  const content = (
    <StaticRouter {...{ context, location }}><RouterManager routes={routes} /></StaticRouter>
  );
  return renderToString(content);
};

export default (req, res) => {
  const location = createLocation(req.url);

  const matchPage = (result, error) => {
    const data = error ? {} : result;
    const context = {};
    const content = renderContent(routes, context, req.url);

    if (context.url) return res.redirect(context.statusCode || 301, context.url);
    // In your template serialize data into `__APP_PRERENDERED__`;
    res.status(context.statusCode || 200).render('index', { data, content });
  };

  const handleError = (error) => {
    console.error(`Request ${req.url} failed to fetch data:`, error);
    matchPage(null, error);
  };

  runResolver(routes, location).then(matchPage).catch(handleError);
};
```
