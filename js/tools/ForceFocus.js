/**
 * En bookmarklet för att göra fokusmarkeringen synlig.
 *
 * Vertkyget infogar ett `style`-element i dokumenthuvudet, med en CSS-regel
 * som lägger till en kraftig orange kontur vid fokus för alla element.
 * Detta görs också i alla dokument som bäddats in med `iframe`.
 *
 * Om elementet redan existerar tas det bort, så verktyget växlar mellan av
 * och på utan att kräva sidomladdning.
 *
 * @license CC-BY 4.0
 */
((d) => {
  const D = (f) => f.contentWindow.document,
    F = (d, c) => d.querySelectorAll('iframe').forEach((f) => c(f)),
    I = (d, i) => d.getElementById(i),
    R = (e) => e.remove(),
    S = (d, i) => {
      const z = d.head.appendChild(d.createElement('style'));
      z.id = i;
      z.textContent =
        'a:focus,*:focus{outline:4px solid #fa0 !important;outline-offset:1px !important}';
    },
    i = 'digg-force-focus',
    s = I(d, i);
  if (s) {
    R(s);
    F(d, (f) => {
      const o = D(f),
        z = I(o, i);
      if (z) R(z);
    });
  } else {
    S(d, i);
    F(d, (f) => {
      const o = D(f);
      S(o, i);
    });
  }
})(document);
