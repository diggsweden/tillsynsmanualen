/**
 * En bookmarklet för att mäta flimrande ytor.
 *
 * Verktyget infogar en ram som motsvarar ungefär ungefär 10° av synfältet
 * på normalt betraktningsavstånd, förutsatt en normalstor bildskärm.
 * Användaren kan flytta ramen genom att hålla ned Ctrl-tangenten och dra
 * ramen med vänster musknapp nedtryckt, för att placera den så att den
 * omfattar en så stor del av det flimrande området som möjligt.
 *
 * Användaren kan sedan markera flimrande ytor genom att hålla ned vänster
 * musknapp, flytta pekaren tills den genererade rutan täcker ytan och
 * släppa upp musknappen. Markeringarnas sammanlagda proportion visas i
 * ramens nederkan och markeras med röd färg om de överstiger 25 %, vilket
 * ungefärligen motsvarar de 0,006 sr som används i WCAG 2.3.1.
 *
 * Musklick på procentindikatorn stänger verktyget.
 *
 * @license CC-BY 4.0
 */
((d) => {
  const E = (p, t) => p.appendChild(d.createElement(t)),
    L = (e, n, f) => e.addEventListener(n, f),
    P = (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    S = (e, p, v) => (e.style[p] = v),
    T = (e, t) => (e.textContent = t),
    Z = (e, o) => Object.entries(o).forEach(([p, v]) => S(e, p, v)),
    f = E(d.body, 'div'),
    c = E(f, 'div');
  let a = null,
    t = 0,
    x = 0,
    x0 = -1,
    x1 = -1,
    y = 0,
    y0 = -1,
    y1 = -1;
  Z(f, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '999',
    width: '341px',
    height: '256px',
    border: '4px solid #fc0',
    background: 'rgb(0,0,0,.1)',
    cursor: 'crosshair',
  });
  Z(c, {
    position: 'absolute',
    top: '100%',
    left: '50%',
    padding: '.5em 1em',
    background: '#090',
    color: '#fff',
    cursor: 'default',
    transform: 'translateX(-50%)',
  });
  T(c, '0 %');
  L(f, 'mousedown', (e) => {
    if (0 === e.button) {
      P(e);
      if (e.ctrlKey) {
        x0 = e.screenX;
        y0 = e.screenY;
        S(f, 'cursor', 'move');
      } else {
        x1 = e.clientX;
        y1 = e.clientY;
        a = E(f, 'div');
        Z(a, {
          position: 'absolute',
          top: `${y1 - f.offsetTop}px`,
          left: `${x1 - f.offsetLeft}px`,
          width: '0',
          height: '0',
          boxSizing: 'border-box',
          border: '1px dashed #000',
        });
      }
    }
  });
  L(f, 'mousemove', (e) => {
    if (-1 !== x0) {
      x += e.screenX - x0;
      y += e.screenY - y0;
      x0 = e.screenX;
      y0 = e.screenY;
      Z(f, { left: `${x}px`, top: `${y}px` });
    } else if (-1 !== x1) {
      const w = Math.max(0, e.clientX - x1),
        h = Math.max(0, e.clientY - y1);
      Z(a, { width: `${w}px`, height: `${h}px` });
    }
  });
  L(f, 'mouseup', (e) => {
    if (0 === e.button) {
      if (-1 !== x1) {
        t += a.offsetWidth * a.offsetHeight;
        p = Math.round((100 * t) / 87296);
        Z(a, { borderStyle: 'solid', background: '#fff' });
        S(c, 'background', p > 25 ? '#c00' : '#090');
        T(c, `${p} %`);
      }
      x0 = x1 = y0 = y1 = -1;
      a = null;
      S(f, 'cursor', 'crosshair');
    }
  });
  L(c, 'click', () => f.remove());
})(document);
