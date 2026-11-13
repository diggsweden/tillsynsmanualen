/**
 * En bookmarklet för att utöka textavstånd.
 *
 * Vertkyget infogar ett `style`-element i dokumenthuvudet, med CSS-regler
 * som utökar tecken-, ord- och styckemellanrum samt radavstånd till de
 * gränser som anges av WCAG 1.4.12. Detta görs också i alla dokument som
 * bäddats in med `iframe`.
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
        '*{line-height:1.5!important;letter-spacing:0.12em!important;word-spacing:0.16em!important}p{margin-bottom:2em!important}';
    },
    i = 'digg-txt-spc',
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
