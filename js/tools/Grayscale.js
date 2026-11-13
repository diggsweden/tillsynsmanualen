/**
 * En bookmarklet för att visa webbsidan i gråskala.
 *
 * Vertkyget togglar webbläsarfiltret "grayscale", för att emulera akromatopsi
 * (total färgblindhet) och påvisa information som går förlorad utan färg-
 * seende.
 *
 * Anpassat efter ett bookmarklet av Paul J. Adam.
 *
 * @see {@link https://www.pauljadam.com/bookmarklets.html|Paul J. Adam}
 * @license CC-BY 4.0
 */
((d, w) => {
  const s = d.body.style;
  const i = (i) => {
    (s.filter = i), (s.webkitFilter = i);
  };
  w.isGrayscale
    ? (i('none'), (w.isGrayscale = !1))
    : (i('grayscale(1)'), (w.isGrayscale = !0));
})(document, window);
