import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface RouterContextValue {
  pathname: string;
  search: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue>({
  pathname: '/',
  search: '',
  navigate: () => {},
});

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [locationState, setLocationState] = useState(() => ({
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
  }));

  useEffect(() => {
    const onPopState = () => {
      setLocationState({
        pathname: window.location.pathname || '/',
        search: window.location.search || '',
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to.startsWith('http://') || to.startsWith('https://')) {
      window.location.href = to;
      return;
    }
    const url = new URL(to, window.location.origin);
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', `${url.pathname}${url.search}`);
    setLocationState({
      pathname: url.pathname || '/',
      search: url.search || '',
    });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return (
    <RouterContext.Provider value={{ pathname: locationState.pathname, search: locationState.search, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}

export function setPageSeo(title: string, description: string) {
  document.title = title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', description);
}
