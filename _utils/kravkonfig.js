class ReqConfigController {
  #chkCount = 0;
  #cndCount = 0;
  #grpCount = 0;
  #reqCount = 0;
  #secCount = 0;
  #subCount = 0;

  async show(name, type) {
    if (null !== name) {
      if (!name.endsWith('.json')) {
        name += '.json';
      }
      document.getElementById('cfg').value = name;
      document.getElementById('type').value = type ?? 'webpage';
      try {
        const config = await this.#loadConfig(name);
        this.#hideInfo();
        this.#showConfig(config);
      } catch (err) {
        this.#showError(err);
      }
    }
  }

  #check(parent, text) {
    const p = $A(parent, $E('p'));
    p.className = 'check';
    const like = this.#icon(p, 'like');
    const unlike = this.#icon(p, 'unlike');
    const span = $A(p, $E('span'));
    span.innerHTML = text;
    return [like, unlike];
  }

  #hideInfo() {
    $('#info').hidden = true;
  }

  #icon(parent, id) {
    const span = $A(parent, $E('span'));
    const svg = $A(span, $S('svg'));
    const use = $A(svg, $S('use'));
    use.setAttributeNS(
      'http://www.w3.org/1999/xlink',
      'xlink:href',
      `../img/ikoner.svg#ico-${id}`
    );
    return span;
  }

  async #loadConfig(name) {
    const p = document.getElementById('info');
    p.innerText = 'Laddar konfiguration…';
    const url = `../js/config/requirements/${name}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new TypeError(`Kan inte ladda '${name}'.`);
    }
    try {
      return await response.json();
    } catch (err) {
      if (err instanceof SyntaxError) {
        const matches = /position (\d+)/.exec(err.message);
        if (null !== matches) {
          this.#showSyntaxError(url, Number(matches[1]));
        }
      }
      throw err;
    }
  }

  #meta(dl, label, content, missing) {
    const dt = $A(dl, $E('dt'));
    dt.innerText = label;
    const dd = $A(dl, $E('dd'));
    dd.innerText = content ?? `#${missing} saknas#`;
    this.#missingClass(dd, undefined !== content);
  }

  #missing(parent, text) {
    const p = $A(parent, $E('p'));
    p.innerText = `#${text} saknas#`;
    this.#missingClass(p, false);
  }

  #missingClass(element, condition) {
    if (!condition) {
      element.classList.add('missing');
    }
  }

  #renderCheck(config, chkID, parent, contentTypes) {
    ++this.#chkCount;
    const chkCfg = config.checks[chkID];
    if (undefined === chkCfg) {
      this.#missing(parent, `kontroll '${chkID}'`);
      parent.parentNode.open = true;
    } else if (!('texts' in chkCfg)) {
      console.warn(`'texts' missing, check ID '${chkID}'`);
      this.#missing(parent, 'texts');
    } else {
      const dl = $A(parent, $E('dl'));
      dl.className = 'meta';
      this.#meta(dl, 'ID', chkID);
      if (undefined !== contentTypes) {
        const map = config.contentTypes.reduce(
          (obj, { id, title }) => ((obj[id] = title), obj),
          {}
        );
        const text = contentTypes
          .map((t) => map[t] ?? '#okänd typ#')
          .join(', ');
        this.#meta(dl, 'Innehållstyper', text);
      }
      const icons = [];
      for (const text of chkCfg.texts) {
        icons.push(this.#check(parent, text));
      }
      if ('exceptions' in chkCfg) {
        const ul = $A(parent, $E('ul'));
        ul.className = 'exceptions';
        for (const text of chkCfg.exceptions) {
          const li = $A(ul, $E('li'));
          li.innerHTML = text;
        }
      }
      if ('observation' in chkCfg) {
        const p = $A(parent, $E('p'));
        p.innerText = chkCfg.observation;
        p.className = 'observation';
      }
      if ('sources' in chkCfg) {
        this.#meta(
          dl,
          'Omfattning',
          chkCfg.global
            ? 'stickprovet med dess ingående komponenter'
            : 'stickprovet'
        );
        const ul = $A(parent, $E('ul'));
        ul.className = 'sources';
        for (const id of chkCfg.sources) {
          const li = $A(ul, $E('li'));
          li.innerText = `${config.requirements[id]?.title ?? '#saknas#'} (${id})`;
        }
        for (const spans of icons) {
          spans[0].classList.add('disabled');
          spans[1].classList.add('disabled');
        }
      }
    }
  }

  #renderCondition(config, grpID, grpCfg, branch, parent) {
    ++this.#cndCount;
    const p = $A(parent, $E('p'));
    const spans = {
      yes: $A(p, $E('span')),
      no: $A(p, $E('span')),
      text: $A(p, $E('span')),
    };
    p.className = 'condition';
    spans.yes.innerText = 'Ja';
    spans.no.innerText = 'Nej';
    spans.text.innerHTML = grpCfg.precondition ?? 'Villkoret uppfyllt';
    spans[branch].className = 'selected';
    const div = $A(parent, $E('div'));
    div.className = 'conditional';
    for (const check of grpCfg[branch]) {
      if ('check' in check) {
        this.#renderCheck(config, check.check, div);
      } else if ('condition' in check) {
        this.#renderGroup(config, check.condition, div);
      } else {
        console.warn('check/condition saknas, grpID=', grpID);
        this.#missing(div, 'check/condition');
      }
    }
  }

  #renderGroup(config, grpID, parent) {
    ++this.#grpCount;
    const grpCfg = config.conditions[grpID];
    if (undefined === grpCfg) {
      this.#missing(parent, `grupp '${grpID}'`);
      parent.parentNode.open = true;
    } else if (!('yes' in grpCfg || 'no' in grpCfg)) {
      console.warn('yes/no saknas, grpID=', grpID);
      this.#missing(parent, 'yes/no');
    } else {
      if ('precondition' in grpCfg) {
        const p = $A(parent, $E('p'));
        p.className = 'condition';
        if ('yes' in grpCfg) {
          this.#renderCondition(config, grpID, grpCfg, 'yes', parent);
        }
        if ('no' in grpCfg) {
          this.#renderCondition(config, grpID, grpCfg, 'no', parent);
        }
      } else if ('sources' in grpCfg) {
        const ul = $A(parent, $E('ul'));
        ul.className = 'group sources';
        for (const id of grpCfg.sources) {
          const li = $A(ul, $E('li'));
          li.innerText = `${config.checks[id].texts[0]} (${id})`;
        }
        if ('yes' in grpCfg) {
          this.#renderCondition(config, grpID, grpCfg, 'yes', parent);
        }
        if ('no' in grpCfg) {
          this.#renderCondition(config, grpID, grpCfg, 'no', parent);
        }
      } else {
        console.warn('precondition/sources saknas, grpID=', grpID);
        this.#missing(parent, 'precondition/sources');
      }
    }
  }

  #renderRequirement(config, reqID, parent) {
    ++this.#reqCount;
    const reqCfg = config.requirements[reqID];
    const details = $A(parent, $E('details'));
    const summary = $A(details, $E('summary'));

    if (undefined === reqCfg) {
      summary.innerText = `#krav '${reqID}' saknas#`;
      this.#missingClass(summary, false);
    } else {
      const { title, reference } = reqCfg;
      summary.innerText = `${title ?? '#titel saknas#'} (${reference ?? ''})`;
      this.#missingClass(summary, 'title' in reqCfg);
      const content = $A(details, $E('div'));
      const dl = $A(content, $E('dl'));
      dl.className = 'meta';
      this.#meta(dl, 'ID', reqID);
      if (!reqCfg.pseudo) {
        this.#meta(dl, 'EN 301 549', reqCfg.reference, 'referens');
      }
      this.#meta(dl, 'Sektion', reqCfg.section, 'sektion');
      if ('subsection' in reqCfg) {
        this.#meta(dl, 'Undersektion', reqCfg.subsection);
      }
      if ('contentTypes' in reqCfg) {
        const map = config.contentTypes.reduce(
          (obj, { id, title }) => ((obj[id] = title), obj),
          {}
        );
        const text = reqCfg.contentTypes
          .map((t) => map[t] ?? '#okänd typ#')
          .join(', ');
        this.#meta(dl, 'Innehållstyper', text);
      }
      if ('formats' in reqCfg) {
        this.#meta(dl, 'Dokumentformat', reqCfg.formats.join(', '));
      }
      if ('platforms' in reqCfg) {
        this.#meta(dl, 'Plattformar', reqCfg.platforms.join(', '));
      }

      if (!reqCfg.pseudo) {
        this.#renderRequirementLink(reqID, reqCfg.title, content);
      }

      for (const check of reqCfg.checks ?? []) {
        if ('check' in check) {
          const ca = check.categories;
          const co = check.contentTypes;
          this.#renderCheck(config, check.check, content, co, ca);
        } else if ('condition' in check) {
          this.#renderGroup(config, check.condition, content);
        } else {
          console.warn('check/condition saknas, reqID=', reqID);
          this.#missing(content, 'check/condition');
        }
      }
    }
  }

  #renderRequirementLink(reqID, title, parent) {
    const p = $A(parent, $E('p'));
    const a = $A(p, $E('a'));
    const params = new URLSearchParams();
    params.append('cfg', document.getElementById('cfg').value);
    params.append('type', document.getElementById('type').value);
    params.append('req', reqID);
    a.href = `granska.html?${params}`;
    a.innerText = title;
    a.target = 'audit';
  }

  #renderSection(config, secCfg, parent, level) {
    const section = $A(parent, $E('section'));
    const heading = $A(section, $E(`h${level}`));
    heading.innerText = secCfg.title ?? '#titel saknas#';
    const span = $A(heading, $E('span'));
    const dl = $A(section, $E('dl'));
    dl.className = 'meta';
    this.#meta(dl, 'ID', secCfg.id, 'id');
    this.#missingClass(heading, 'title' in secCfg);

    if ('contentTypes' in secCfg) {
      const map = config.contentTypes.reduce(
        (obj, { id, title }) => ((obj[id] = title), obj),
        {}
      );
      const text = secCfg.contentTypes
        .map((t) => map[t] ?? '#okänd typ#')
        .join(', ');
      this.#meta(dl, 'Innehållstyper', text);
    }

    if ('categories' in secCfg) {
      const text = secCfg.categories.join(', ');
      this.#meta(dl, 'Urvalskategorier', text);
    }

    if (!('requirements' in secCfg || 'sections' in secCfg)) {
      const p = $A(section, $E('p'));
      p.innerText = "#har varken 'requirements' eller 'sections'#";
      this.#missingClass(p, false);
    }

    for (const id of secCfg.requirements ?? []) {
      this.#renderRequirement(config, id, section);
    }

    for (const sub of secCfg.sections ?? []) {
      ++this.#subCount;
      this.#renderSection(config, sub, section, level + 1);
    }
  }

  #showConfig(config) {
    const main = document.querySelector('main');
    for (const section of config.sections) {
      ++this.#secCount;
      this.#renderSection(config, section, main, 2);
    }
    this.#showStatistics(main);
  }

  #showError(err) {
    const p = $('#info');
    p.innerText = err.message;
    p.className = 'error';
    p.hidden = false;
  }

  #showStatistics(parent) {
    const h2 = $A(parent, $E('h2'));
    h2.innerText = 'Statistik';
    const dl = $A(parent, $E('dl'));
    dl.className = 'meta';
    this.#meta(dl, 'Sektioner', String(this.#secCount));
    this.#meta(dl, 'Undersektioner', String(this.#subCount));
    this.#meta(dl, 'Krav', String(this.#reqCount));
    this.#meta(dl, 'Grupper', String(this.#grpCount));
    this.#meta(dl, 'Villkor', String(this.#cndCount));
    this.#meta(dl, 'Kontroller', String(this.#chkCount));
  }

  async #showSyntaxError(url, position) {
    const response = await fetch(url);
    const text = await response.text();
    const start = text.lastIndexOf('\n', position);
    const end = text.indexOf('\n', position);
    const prologue = text.slice(Math.max(0, start - 100), start);
    const before = text.slice(start + 1, position);
    const after = text.slice(position, end);
    const epilogue = text.slice(end + 1, end + 100);
    const pre = $E('pre');
    pre.innerHTML =
      prologue + `<span class="error">${before}^${after}</span>` + epilogue;
    $A($('main'), pre);
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const $ = (s) => document.querySelector(s);
const $A = (p, c) => p.appendChild(c);
const $E = (t) => document.createElement(t);
const $S = (t) => document.createElementNS(SVG_NS, t);
const $T = (s) => document.createTextNode(s);

const ctrl = new ReqConfigController();
const param = new URLSearchParams(location.search.slice(1));
ctrl.show(param.get('cfg'), param.get('type'));
