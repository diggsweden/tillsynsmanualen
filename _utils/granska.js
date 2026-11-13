class ReqAuditController {
  async show(configName, type, reqID) {
    if (!configName) {
      this.#showError("Ange stickprovskonfiguration (parameter 'cfg')");
      return;
    } else if (!type) {
      this.#showError("Ange stickprovstyp (parameter 'type')");
      return;
    } else if (!reqID) {
      this.#showError("Ange kravidentitet (parameter 'req')");
      return;
    }
    try {
      const sampCfg = await this.#loadSampleConfig(configName);
      const auditCfg = await this.#loadRequirementConfig(type, reqID);
      this.#hideStatus();
      this.#showConfig(sampCfg, auditCfg, reqID);
    } catch (err) {
      this.#showError(err.message);
    }
  }

  #action(cfg, parent) {
    const p = $A(parent, $E('p'));
    p.innerHTML = cfg.text ?? '#text saknas#';
    p.classList.add('action');
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

  #checks(sampCfg, reqCfg, reqID) {
    const section = document.querySelector('main > article > section');
    $A(section, $E('h2')).innerText = 'Kontroller';
    for (const check of reqCfg.checks ?? []) {
      if ('check' in check) {
        this.#showCheck(sampCfg.checks[check.check], section);
      } else if ('condition' in check) {
        this.#showGroup(sampCfg, check.condition, section);
      }
    }
  }

  #condition(sampCfg, grpID, grpCfg, branch, parent) {
    const p = $A(parent, $E('p'));
    const spans = {
      yes: $A(p, $E('span')),
      no: $A(p, $E('span')),
      text: $A(p, $E('span')),
    };
    p.className = 'condition';
    spans.yes.innerText = 'Ja';
    spans.no.innerText = 'Nej';
    spans.text.innerHTML = grpCfg.precondition ?? '(villkoret uppfyllt)';
    spans[branch].className = 'selected';
    if ('sources' in grpCfg) {
      spans.yes.classList.add('disabled');
      spans.no.classList.add('disabled');
    }
    const div = $A(parent, $E('div'));
    div.className = 'conditional';
    for (const check of grpCfg[branch]) {
      if ('check' in check) {
        this.#showCheck(sampCfg.checks[check.check], div);
      } else if ('condition' in check) {
        this.#showGroup(sampCfg, check.condition, div);
      }
    }
  }

  #definition(cfg, parent) {
    $A(parent, $E('p')).innerHTML =
      `<dfn>${cfg.term}</dfn>: ${cfg.description}`;
  }

  #details(cfg, parent) {
    const details = $A(parent, $E('details'));
    $A(details, $E('summary')).innerHTML = cfg.summary;
    for (const partCfg of cfg.content) {
      this.#infoPart(partCfg, details);
    }
  }

  #devTool(cfg) {
    const parts = ['<cite>Inspektören</cite>'];
    if ('tab' in cfg) parts.push(`fliken <samp>${cfg.tab}</samp>`);
    if ('pane' in cfg) parts.push(`panelen <samp>${cfg.pane}</samp>`);
    const p = $E('p');
    p.innerHTML = parts.join(', ');
    return p;
  }

  #examples(auditCfg) {
    if (!('examples' in auditCfg)) {
      return;
    }
    const section = document.querySelector('main > article > section');
    $A(section, $E('h2')).innerText = 'Exempel';
    const ul = $A(section, $E('ul'));
    for (const [key, examples] of Object.entries(auditCfg.examples)) {
      for (const e of examples) {
        const li = $A(ul, $E('li'));
        li.className = key;
        li.innerHTML = e;
      }
    }
  }

  #exceptions(auditCfg) {
    if (!('exceptions' in auditCfg)) {
      return;
    }
    const section = document.querySelector('main > article > section');
    $A(section, $E('h2')).innerText = 'Undantag';
    const ul = $A(section, $E('ul'));
    for (const e of auditCfg.exceptions) {
      $A(ul, $E('li')).innerHTML = e;
    }
  }

  #figure(cfg, parent) {
    const figure = $A(parent, $E('figure'));
    for (const partCfg of cfg.content) {
      this.#infoPart(partCfg, figure);
    }
    $A(figure, $E('figcaption')).innerHTML = cfg.caption;
  }

  #heading(title) {
    const h1 = document.querySelector('h1');
    h1.innerText = title;
  }

  #hideStatus() {
    const div = $('[role="status"]');
    div.innerText = '';
    div.className = '';
  }

  #how(auditCfg) {
    if ('methods' in auditCfg) {
      this.#methods(auditCfg.methods);
    } else if ('steps' in auditCfg) {
      this.#steps(auditCfg.steps);
    }
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

  #image(cfg, parent) {
    const img = $A(parent, $E('img'));
    img.src = `../img/${cfg.path}`;
    img.alt = cfg.alt;
  }

  #info(auditCfg) {
    if (!('info' in auditCfg)) {
      return;
    }
    const aside = document.querySelector('aside');
    $A(aside, $E('h2')).innerText = 'Mer information';
    for (const part of auditCfg.info) {
      this.#infoPart(part, aside);
    }
  }

  #infoPart(partCfg, parent) {
    ({
      action: (p, a) => this.#action(p, a),
      definition: (p, a) => this.#definition(p, a),
      details: (p, a) => this.#details(p, a),
      figure: (p, a) => this.#figure(p, a),
      image: (p, a) => this.#image(p, a),
      note: (p, a) => this.#note(p, a),
      olist: (p, a) => this.#olist(p, a),
      table: (p, a) => this.#table(p, a),
      text: (p, a) => this.#text(p, a),
      tip: (p, a) => this.#tip(p, a),
      ulist: (p, a) => this.#ulist(p, a),
      warning: (p, a) => this.#warning(p, a),
    })[partCfg.type](partCfg, parent);
  }

  #instruction(auditCfg) {
    if (!('instruction' in auditCfg)) {
      return;
    }
    const aside = document.querySelector('aside');
    $A(aside, $E('h2')).innerText = 'Tillämpningsanvisning';
    const a = $A($A(aside, $E('p')), $E('a'));
    a.href = `../granskning/tillampning.html#${auditCfg.instruction.id}`;
    a.innerText = auditCfg.instruction.title;
  }

  #links(auditCfg) {
    if (!('links' in auditCfg)) {
      return;
    }
    const aside = document.querySelector('aside');
    $A(aside, $E('h2')).innerText = 'Länkar';
    for (const link of auditCfg.links) {
      const a = $A($A(aside, $E('p')), $E('a'));
      a.href = link.url;
      a.innerText = link.title;
    }
  }

  async #loadRequirementConfig(type, id) {
    const div = document.querySelector('[role="status"]');
    div.innerText = 'Laddar granskningskonfiguration…';
    const url = `../js/config/requirements/${type}/${id}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new TypeError(`Kan inte ladda '${type}/${id}.json'.`);
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

  async #loadSampleConfig(name) {
    const div = document.querySelector('[role="status"]');
    div.innerText = 'Laddar kravkonfiguration…';
    const url = `../js/config/requirements/${name}`;
    const response = await fetch(url);
    return await response.json();
  }

  #methods(methods) {
    const section = document.querySelector('main > article > section');
    if (1 === methods.length) {
      $A(section, $E('h2')).innerText = 'Metod';
      $A(section, $E('p')).innerHTML = methods[0];
    } else {
      for (const [index, method] of methods.entries()) {
        $A(section, $E('h2')).innerText = `Metod ${index + 1}`;
        $A(section, $E('p')).innerHTML = method;
      }
    }
  }

  #note(cfg, parent) {
    const p = $A(parent, $E('p'));
    p.innerHTML = cfg.text ?? '#text saknas#';
    p.classList.add('note');
  }

  #olist(cfg, parent) {
    const ol = $A(parent, $E('ol'));
    for (const li of cfg.items) {
      $A(ol, $E('li')).innerHTML = li;
    }
  }

  #reference(reqCfg) {
    const aside = document.querySelector('aside');
    $A(aside, $E('h2')).innerText = 'Referens';
    $A(aside, $E('p')).innerText = reqCfg.reference;
  }

  #showCheck(chkCfg, parent) {
    if (chkCfg.texts.length > 1) {
      $A(parent, $E('p')).innerText =
        'Det räcker att ett av följande påstående är sant.';
    }

    const icons = [];
    for (const text of chkCfg.texts) {
      icons.push(this.#check(parent, text));
    }

    if ('exceptions' in chkCfg) {
      $A(parent, $E('h3')).innerText = 'Undantag';
      const ul = $A(parent, $E('ul'));
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
      $A(parent, $E('h3')).innerText = 'Härleds från';
      const ul = $A(parent, $E('ul'));
      for (const id of chkCfg.sources) {
        const li = $A(ul, $E('li'));
        li.innerText = id;
      }
      for (const spans of icons) {
        spans[0].classList.add('disabled');
        spans[1].classList.add('disabled');
      }
    }
  }

  #showGroup(sampCfg, grpID, parent) {
    const grpCfg = sampCfg.conditions[grpID];
    if ('precondition' in grpCfg) {
      const p = $A(parent, $E('p'));
      p.className = 'condition';
      if ('yes' in grpCfg) {
        this.#condition(sampCfg, grpID, grpCfg, 'yes', parent);
      }
      if ('no' in grpCfg) {
        this.#condition(sampCfg, grpID, grpCfg, 'no', parent);
      }
    } else if ('sources' in grpCfg) {
      $A(parent, $E('h3')).innerText = 'Härlett villkor från';
      const ul = $A(parent, $E('ul'));
      for (const id of grpCfg.sources) {
        const li = $A(ul, $E('li'));
        li.innerText = id;
      }
      if ('yes' in grpCfg) {
        this.#condition(sampCfg, grpID, grpCfg, 'yes', parent);
      }
      if ('no' in grpCfg) {
        this.#condition(sampCfg, grpID, grpCfg, 'no', parent);
      }
    }
  }

  #showConfig(sampCfg, auditCfg, reqID) {
    const reqCfg = sampCfg.requirements[reqID];
    this.#heading(reqCfg.title);
    this.#how(auditCfg);
    this.#exceptions(auditCfg);
    this.#examples(auditCfg);
    this.#checks(sampCfg, reqCfg, reqID);
    this.#tools(auditCfg);
    this.#links(auditCfg);
    this.#info(auditCfg);
    this.#instruction(auditCfg);
    this.#reference(reqCfg);
  }

  #showError(message) {
    const div = $('[role="status"]');
    div.innerText = message;
    div.className = 'error';
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

  #steps(steps) {
    const section = document.querySelector('main > article > section');
    $A(section, $E('h2')).innerText = 'Metod';
    const ol = $A(section, $E('ol'));
    for (const step of steps) {
      $A(ol, $E('li')).innerHTML = step;
    }
  }

  #table(cfg, parent) {
    const tbl = $A(parent, $E('table'));
    if ('caption' in cfg) {
      tbl.createCaption().innerHTML = cfg.caption;
    }
    const thead = tbl.createTHead();
    let tr = thead.insertRow();
    for (const th of cfg.headers) {
      $A(tr, $E('th')).innerHTML = th;
    }
    const tbody = tbl.createTBody();
    for (const row of cfg.rows) {
      tr = tbody.insertRow();
      for (const td of row) {
        tr.insertCell().innerHTML = td;
      }
    }
  }

  #text(cfg, parent) {
    const p = $A(parent, $E('p'));
    p.innerHTML = cfg.text ?? '#text saknas#';
  }

  #tip(cfg, parent) {
    const p = $A(parent, $E('p'));
    p.innerHTML = cfg.text ?? '#text saknas#';
    p.className = 'tip';
  }

  #tools(auditCfg) {
    if (!('tools' in auditCfg)) {
      return;
    }
    const aside = document.querySelector('aside');
    const $T = (t, c) => {
      const e = $E(t);
      e.innerHTML = c;
      return e;
    };
    $A(aside, $E('h2')).innerText = 'Verktyg';
    for (const cfg of auditCfg.tools) {
      $A(
        aside,
        {
          bookmarklet: (t) => $T('p', `Bookmarklet '${t.title}'`),
          DevTool: (t) => this.#devTool(t),
          external: (t) => $T('p', t.text),
          Flashbox: () => $T('p', 'Tillägget <cite>Flashbox</cite>'),
          ForceFocus: () => $T('p', 'Tillägget <cite>Force Focus</cite>'),
          module: (t) => $T('p', `Verktygsmodul: ${t.module}`),
          TextSpacing: () => $T('p', 'Tillägget <cite>Textavstånd</cite>'),
          WAVE: (t) => this.#wave(t),
          WebDeveloper: (t) => this.#webDeveloper(t),
        }[cfg.tool](cfg)
      );
    }
  }

  #ulist(cfg, parent) {
    const ul = $A(parent, $E('ul'));
    for (const li of cfg.items) {
      $A(ul, $E('li')).innerHTML = li;
    }
  }

  #warning(cfg, parent) {
    const p = $A(parent, $E('p'));
    p.innerHTML = cfg.text ?? '#text saknas#';
    p.className = 'warning';
  }

  #wave(cfg) {
    const parts = ['<cite>WAVE</cite>'];
    const samp = (t) => `<samp>${t}</samp>`;
    if ('tab' in cfg) parts.push(`fliken <samp>${cfg.tab}</samp>`);
    for (const msg of ['absent', 'present']) {
      const status = { absent: 'visas inte', present: 'visas' };
      if (msg in cfg) {
        const txt = cfg[msg].text
          ? samp(cfg[msg].text)
          : cfg[msg].texts.map((t) => samp(t)).join(', ');
        const sec = cfg[msg].section ? `under ${samp(cfg[msg].section)}` : '';
        parts.push(
          `”${txt}” ${status[msg]} ${sec} på fliken <samp>${cfg[msg].tab}</samp>`
        );
      }
    }
    const p = $E('p');
    p.innerHTML = parts.join(', ');
    return p;
  }

  #webDeveloper(cfg) {
    const parts = ['<cite>Web Developer</cite>'];
    if ('tab' in cfg) parts.push(`fliken <samp>${cfg.tab}</samp>`);
    if ('function' in cfg)
      parts.push(`funktionen <samp>${cfg.function}</samp>`);
    const p = $E('p');
    p.innerHTML = parts.join(', ');
    return p;
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const $ = (s) => document.querySelector(s);
const $A = (p, c) => p.appendChild(c);
const $E = (t) => document.createElement(t);
const $S = (t) => document.createElementNS(SVG_NS, t);

const ctrl = new ReqAuditController();
const param = new URLSearchParams(location.search.slice(1));
ctrl.show(param.get('cfg'), param.get('type'), param.get('req'));
