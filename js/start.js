((doc) => {
  'use strict';

  const params = new URLSearchParams(location.search.slice(1));
  if (params.has('mode')) {
    const mode = params.get('mode') ?? '';
    document.cookie = `mode=${mode}; path=/`;
  }
})(document);
