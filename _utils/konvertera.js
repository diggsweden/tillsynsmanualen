/**
 * Konvertera gammalt ärende till nytt format.
 *
 * @license CC-BY 4.0
 * @author Tommy Olsson
 */

const form = document.forms.convert;
form.case?.addEventListener('click', () => form.in.click());
form.in?.addEventListener(
  'change',
  () => (form.convert.disabled = '' === form.in.value)
);
form.addEventListener('submit', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const converter = new CaseConverter();
  upload(form.in.files[0])
    .then((original) => converter.convert(original))
    .then((result) => save(result, form.in.files[0].name))
    .then(([link, url]) => free(link, url))
    .catch((err) => showError(err));
});

/**
 * Frigör allokerade resurser.
 *
 * @param {HTMLAnchorElement} link Länkelement.
 * @param {string}            url  Genererad URL.
 */
function free(link, url) {
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Spara det konverterade ärendet till fil.
 *
 * @param {object} data Konverterade ärendedata.
 * @param {string} name Filnamnsförslag.
 */
async function save(data, name) {
  const file = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;

  link.click();
  return [link, url];
}

/**
 * Visa felmeddelande.
 *
 * @param {Error} error Felmeddelande att visa.
 */
function showError(error) {
  const status = document.querySelector('[role="status"]');
  status.textContent = error.message;
  console.error(error);
}

/**
 * Läs in angiven JSON-fil.
 *
 * @param {File} file Filinformation.
 * @return {Promise} Ett löfte som infrias med filinnehållet tolkat som JSON.
 */
function upload(file) {
  if ('application/json' === file.type) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const onLoad = (event) => {
        reader.removeEventListener('load', onLoad);
        try {
          resolve(JSON.parse(reader.result));
        } catch (err) {
          reject(new TypeError('Inte en JSON-fil', err));
        }
      };

      reader.addEventListener('load', onLoad);
      reader.readAsText(file);
    });
  }

  return Promise.reject(new TypeError('Inte en JSON-fil.'));
}

/**
 * Ärendekonverterare.
 */
class CaseConverter {
  /**
   * Konvertera ärendeobjekt i gammalt format.
   *
   * @param {object} source Ärendeobjekt att konvertera.
   * @return {object} Det konverterade ärendet.
   */
  convert(source) {
    const target = {};
    this.#caseClass(source, target);
    this.#caseNumber(source, target);
    this.#organization(source, target);
    this.#service(source, target);
    this.#file(source, target);
    this.#opened(source, target);

    if ('ComplaintCase' === target.class) {
      this.#date(source, target);
      this.#supervisor(source, target);
    } else if ('MonitoringCase' === target.class) {
      this.#schedule(source, target);
    }

    this.#entries(source, target);
    this.#audits(source, target);

    return target;
  }

  #audits(source, target) {
    if (Array.isArray(source.audits)) {
      target.audits = source.audits;
    } else if (!Array.isArray(source.auditList)) {
      return;
    }

    const copyArr = (s, t, p) => s[p] && s[p].length && (t[p] = s[p]);
    target.audits = [];
    for (const src of source.auditList) {
      const audit = {};
      this.#officer(src, audit);
      audit.started = src.started ?? 0;
      this.#colours(src, audit);
      null === src.failed && (audit.failed = src.failed);
      src.finished && (audit.finished = src.finished);
      src.version && (audit.version = src.version);
      copyArr(src, audit, 'injunctions');
      copyArr(src, audit, 'remarks');
      this.#samples(src, audit);
      target.audits.push(audit);
    }
  }

  #caseClass(source, target) {
    const types = {
      complaint: 'ComplaintCase',
      monitoring: 'MonitoringCase',
    };
    target.class =
      source.class ?? types[source.type ?? 'monitoring'] ?? 'MonitoringCase';
  }

  #caseNumber(source, target) {
    const matches = /^(\d{4})-(\d{1,4})$/.exec(source.caseNumber ?? '');
    if (null == matches) {
      throw new TypeError(`Ogiltigt ärendenummer: "${source.caseNumber}".`);
    }
    target.cn = Number(`${matches[1]}${matches[2].padStart(4, '0')}`);
  }

  #checks(source, target) {
    if ('object' !== typeof source.checks) return;

    const checks = (target.checks = []);

    for (const [id, src] of Object.entries(source.checks)) {
      const check = {
        class:
          'dependencies' in src
            ? 'DerivedCheck'
            : 'n' in src
              ? 'MultipleCheck'
              : 'SingleCheck',
        id,
      };
      if ('obs' in src) {
        check.obs = src.obs;
      } else if ('ok' in src) {
        check.ok = true;
      } else if ('mask' in src) {
        if (0 === src.mask) {
          check.ok = true;
        } else {
          check.m = (1 << src.n) - 1;
          check.f = src.mask;
        }
      } else if ('na' in src) {
        check.dis = true;
      }
      'dependencies' in src && (check.dep = src.dependencies);
      'n' in src && (check.n = src.n);
      checks.push(check);
    }
  }

  #colours(source, target) {
    const srcArr = source.colours;
    if (!Array.isArray(srcArr) || 0 === srcArr.length) return;
    target.colours = srcArr;
  }

  #date(source, target) {
    if ('string' !== typeof source.date) {
      target.date = 0;
    } else {
      target.date = new Date(source.date).getTime();
    }
  }

  #entries(source, target) {
    const srcArr = source.entries ?? source.logEntries;
    if (!srcArr || !Array.isArray(srcArr) || 0 === srcArr.length) return;

    const types = {
      'finish audit': 'audit finish',
      'start audit': 'audit start',
    };

    target.entries = [];
    for (const src of srcArr) {
      const data = src.data;
      const dir = src.dir ?? src.direction;
      const summary = src.summary;
      const text = src.text;
      const time = src.time ?? src.timestamp;
      const type = types[src.type] ?? src.type ?? 'other';

      const entry = { time, type };
      data && (entry.data = data);
      dir && (entry.dir = dir);
      summary && (entry.summary = summary);
      text && (entry.text = text);

      target.entries.push(entry);
    }
  }

  #file(source, target) {
    const file = source.file ?? source.filename;
    if ('string' !== typeof file) return;

    target.file = file;
  }

  #officer(source, target) {
    const src = source.officer;
    if ('object' !== typeof src) return;

    const email = src.email ?? '';
    const fName = src.fName ?? src.familyName ?? '';
    const gName = src.gName ?? src.givenName ?? '';
    const roles = src.roles ?? [];
    const tel = src.tel ?? src.telephone;

    const off = (target.officer = {});
    off.email = email;
    off.fName = fName;
    off.gName = gName;
    roles.length && (off.roles = roles);
    tel && (off.tel = tel);
  }

  #opened(source, target) {
    if ('string' !== typeof source.opened) {
      target.opened = 0;
    } else {
      target.opened = new Date(source.opened).getTime();
    }
  }

  #organization(source, target) {
    const src = source.org ?? source.organization;
    if ('object' !== typeof src) return;

    const abbr = src.abbr ?? src.abbreviation;
    const addr = src.addr ?? src.address;
    const email = src.email;
    const name = src.name;
    const regNo = src.regNo ?? src.registrationNumber;
    const tel = src.tel ?? src.telephone;

    const org = (target.org = {});
    abbr && (org.abbr = abbr);
    addr && (org.addr = addr);
    email && (org.email = email);
    name && (org.name = name);
    regNo && (org.regNo = regNo);
    tel && (org.tel = tel);
  }

  #requirements(source, target) {
    const srcArr = source.requirements;
    if (!Array.isArray(srcArr) || 0 === srcArr.length) return;

    const reqs = (target.req = []);

    for (const src of srcArr) {
      const req = {};
      req.clause = 'undefined' === src.clause ? '' : (src.clause ?? '');
      req.id = src.id ?? '';
      req.title = src.title ?? '';
      src.categories?.length && (req.cat = src.categories);
      src.contentTypes?.length && (req.content = src.contentTypes);
      src.externalNote && (req.extNote = src.externalNote);
      src.formats && (req.fmt = src.formats);
      src.internalNote && (req.intNote = src.internalNote);
      src.modes?.length && (req.mod = src.modes);
      src.platforms?.length && (req.platf = src.platforms);
      this.#checks(src, req);
      reqs.push(req);
    }
  }

  #samples(source, target) {
    const srcArr = source.byName;
    if (0 === srcArr.length) return;

    const types = {
      component: 'Component',
      document: 'NonWebDocument',
      screen: 'AppScreen',
      webpage: 'Webpage',
    };

    target.samples = [];

    for (const src of srcArr) {
      const sample = {};
      sample.category =
        'component' === src.type
          ? 'component'
          : Object.keys(source.samples).find((key) =>
              source.samples[key].includes(src.name)
            );
      sample.class = types[src.type] ?? 'Webpage';
      sample.name = src.name ?? '';
      src.content?.length && (sample.content = src.content);
      src.follows && (sample.follows = src.follows);
      src.note && (sample.note = src.note);
      src.serviceType && (sample.service = src.serviceType);
      src.parentType && (sample.parent = types[src.parentType]);
      src.default && (sample.default = true);
      src.commponents?.length && (sample.components = src.components);
      src.platform && (sample.platform = src.platform);
      src.format && (sample.format = src.format);
      src.url && (sample.url = src.url);
      this.#requirements(src, sample);
      target.samples.push(sample);
    }
  }

  #schedule(source, target) {
    const src = source.schedule;
    if ('object' !== typeof src) return;

    const schedule = (target.schedule = {});
    schedule.begins = new Date(src.begins ?? 0).getTime();
    schedule.case = src.case ?? src.caseNumber ?? '';
    schedule.date = new Date(src.date ?? 0).getTime();
    schedule.ends = new Date(src.ends ?? 0).getTime();

    this.#supervisor(src, schedule);
  }

  #service(source, target) {
    const src = source.service;
    if ('object' !== typeof src) return;

    const types = {
      app: 'MobileApp',
      website: 'Website',
    };
    const access = src.access ?? 'public';
    const auth = src.auth ?? src.authentication;
    const name = src.name ?? '';
    const os = src.os ?? src.operatingSystem;
    const type = types[src.type ?? 'website'] ?? 'Website';

    const service = (target.service = {});
    service.class = type;
    service.name = name;
    'public' !== access && (service.access = access);
    true === auth && (service.auth = true);
    os && (service.os = os);
  }

  #supervisor(source, target) {
    const src = source.supervisor;
    if ('object' !== typeof src) return;

    const email = src.email ?? '';
    const fName = src.fName ?? src.familyName ?? '';
    const gName = src.gName ?? src.givenName ?? '';
    const roles = src.roles ?? [];
    const tel = src.tel ?? src.telephone;

    const sup = (target.supervisor = {});
    sup.email = email;
    sup.fName = fName;
    sup.gName = gName;
    roles.length && (sup.roles = roles);
    tel && (sup.tel = tel);
  }
}
