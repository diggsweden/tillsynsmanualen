/**
 * Enhetstestfall för information om digitala tjänster.
 *
 * @license CC-BY 4.0
 * @see MobileApp
 * @see ServiceFactory
 * @see Website
 */

describe('Service', () => {
  it('returnerar autentiseringsflaggan', () => {
    const service = new Website();
    expect(service.authentication).toBe(false);
    service.authentication = true;
    expect(service.authentication).toBe(true);
  });

  it('returnerar det trimmade namnet', () => {
    const service = new Website();
    service.name = ' digg.se ';
    expect(service.name).toBe('digg.se');
  });
});

describe('MobileApp', () => {
  it("returnerar typen 'app'", () => {
    const app = new MobileApp();
    expect(app.type).toBe('app');
  });

  it('återskapar en instans från ett minimalt dataobjekt', () => {
    const data = {
      class: 'MobileApp',
      name: 'The App',
      os: 'Android',
    };
    const app = new MobileApp(data);
    expect(app).toBeAnInstanceOf(MobileApp);
    expect(app.authentication).toBe(false);
    expect(app.name).toBe(data.name);
    expect(app.operatingSystem).toBe(data.os);
  });

  it('återskapar en instans från ett maximalt dataobjekt', () => {
    const data = {
      auth: true,
      class: 'MobileApp',
      name: 'The App',
      os: 'Android',
    };
    const app = new MobileApp(data);
    expect(app).toBeAnInstanceOf(MobileApp);
    expect(app.authentication).toBe(data.auth);
    expect(app.name).toBe(data.name);
    expect(app.operatingSystem).toBe(data.os);
  });

  it('returnerar operativsystemet', () => {
    const app = new MobileApp();
    const os = 'Android';
    app.operatingSystem = os;
    expect(app.operatingSystem).toBe(os);
  });

  it('serialiserar en minimal app för lagring i databasen', () => {
    const app = new MobileApp();
    const name = 'Test';
    const os = 'Android';
    app.name = name;
    app.operatingSystem = os;
    expect(app.serialize()).toEqual({
      class: 'MobileApp',
      name,
      os,
    });
  });

  it('serialiserar en maximal app för lagring i databasen', () => {
    const app = new MobileApp();
    const auth = true;
    const name = 'Test';
    const os = 'Android';
    app.authentication = auth;
    app.name = name;
    app.operatingSystem = os;
    expect(app.serialize()).toEqual({
      auth,
      class: 'MobileApp',
      name,
      os,
    });
  });

  it('genererar ett objekt vid omvandling till JSON (minimalt)', () => {
    const app = new MobileApp();
    const name = 'Test';
    const os = 'Android';
    app.name = name;
    app.operatingSystem = os;
    expect(app.toJSON()).toEqual({
      class: 'MobileApp',
      name,
      os,
    });
  });

  it('genererar ett objekt vid omvandling till JSON (maximalt)', () => {
    const app = new MobileApp();
    const auth = true;
    const name = 'Test';
    const os = 'Android';
    app.authentication = auth;
    app.name = name;
    app.operatingSystem = os;
    expect(app.toJSON()).toEqual({
      auth,
      class: 'MobileApp',
      name,
      os,
    });
  });
});

describe('Website', () => {
  it("returnerar typen 'website'", () => {
    const app = new Website();
    expect(app.type).toBe('website');
  });

  it('återskapar en instans från ett minimalt dataobjekt', () => {
    const data = {
      class: 'Website',
      name: 'example.com',
    };
    const site = new Website(data);
    expect(site).toBeAnInstanceOf(Website);
    expect(site.access).toBe('public');
    expect(site.authentication).toBe(false);
    expect(site.name).toBe(data.name);
  });

  it('återskapar en instans från ett maximalt dataobjekt', () => {
    const data = {
      access: 'intranet',
      auth: true,
      class: 'Website',
      name: 'example.com',
    };
    const site = new Website(data);
    expect(site).toBeAnInstanceOf(Website);
    expect(site.access).toBe(data.access);
    expect(site.authentication).toBe(data.auth);
    expect(site.name).toBe(data.name);
  });

  it('refuserar en ogiltig åtkomsttyp', () => {
    const site = new Website();
    expect.exception(() => (site.access = 'invalid'));
  });

  it.with(
    ['extranet'],
    ['intranet'],
    ['public']
  )("returnerar åtkomsttypen '{0}'", (access) => {
    const site = new Website();
    site.access = access;
    expect(site.access).toBe(access);
  });

  it('serialiserar en minimal webbplats för lagring i databasen', () => {
    const name = 'Test';
    const site = new Website();
    site.name = name;
    expect(site.serialize()).toEqual({
      class: 'Website',
      name,
    });
  });

  it('serialiserar en maximal webbplats för lagring i databasen', () => {
    const access = 'intranet';
    const auth = true;
    const name = 'Test';
    const site = new Website();
    site.access = access;
    site.authentication = auth;
    site.name = name;
    expect(site.serialize()).toEqual({
      access,
      auth,
      class: 'Website',
      name,
    });
  });

  it('genererar ett objekt vid omvandling till JSON (minimalt)', () => {
    const site = new Website();
    const name = 'example.com';
    site.name = name;
    expect(site.toJSON()).toEqual({
      class: 'Website',
      name,
    });
  });

  it('genererar ett objekt vid omvandling till JSON (maximalt)', () => {
    const access = 'intranet';
    const auth = true;
    const name = 'Test';
    const site = new Website();
    site.access = access;
    site.authentication = auth;
    site.name = name;
    expect(site.toJSON()).toEqual({
      access,
      auth,
      class: 'Website',
      name,
    });
  });
});

describe('ServiceFactory', () => {
  it('refuserar att bygga med ogiltig typ av service', () => {
    const data = {
      class: 'invalid',
      name: 'test',
    };
    expect.exception(() => ServiceFactory.build(data));
  });

  it('bygger en instans av en mobil applikation', () => {
    const data = {
      auth: true,
      class: 'MobileApp',
      name: 'Test',
      os: 'Android',
    };
    const app = ServiceFactory.build(data);
    expect(app).toBeAnInstanceOf(MobileApp);
  });

  it('bygger en instans av en webbplats', () => {
    const data = {
      access: 'extranet',
      auth: true,
      class: 'Website',
      name: 'example.com',
    };
    const site = ServiceFactory.build(data);
    expect(site).toBeAnInstanceOf(Website);
  });
});

// Importera beroenden.
import { MobileApp, ServiceFactory, Website } from '../../js/model/service.js';
import { describe, expect, it } from '../functions.js';
