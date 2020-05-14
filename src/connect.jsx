const RESOLVER_PROP_NAME = '__runResolverPromise__';

export const connectResolver = (getPromise, Component) => {
  // There is no point in implementing a real HOC since there is no way to have a component chain
  // with multiple `getPromise` methods. Simply override whatever the current value is.
  Component[RESOLVER_PROP_NAME] = getPromise;
  return Component;
};

export const getResolver = ({ component }) => {
  if (!component) return null;
  return component.resolver || component[RESOLVER_PROP_NAME];
};
