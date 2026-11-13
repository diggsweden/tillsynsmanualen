/**
 * Enhetstestfall för länkstigen.
 *
 * @license CC-BY 4.0
 * @see BreadcrumbTrail
 */

let links;

// Skapa förutsättningar för varje test.
beforeEach(() => {
  links = [
    { title: 'Start', url: '../' },
    { title: 'Granska', url: '?page=start' },
  ];
});

it('länkar till start och granska', () => {
  const crumbs = new BreadcrumbTrail();
  expect(crumbs.links).toEqual(links);
});

it('tar bort granska', () => {
  const crumbs = new BreadcrumbTrail();
  links = [links[0]];
  crumbs.deleteRoot();
  expect(crumbs.links).toEqual(links);
});

it.with(['person', 'Personer'], ['schedule', 'Tillsynsplaner'])(
  'länkar till aktuell listningssida',
  (type, title) => {
    const crumbs = new BreadcrumbTrail();
    links.push({ title: title, url: `?page=list&type=${type}` });
    crumbs.list(type, title);
    expect(crumbs.links).toEqual(links);
  }
);

it('länkar till aktuellt ärende', () => {
  const caseID = 42;
  const caseNumber = '2020-1234';
  const crumbs = new BreadcrumbTrail();
  const org = 'Acme';
  const pc = `case=${caseID}`;
  const service = 'Test';
  links.push(
    { title: 'Ärenden', url: '?page=list&type=case' },
    { title: `${caseNumber} ${org} ${service}`, url: `?page=case&${pc}` }
  );
  crumbs.case(caseID, caseNumber, org, service);
  expect(crumbs.links).toEqual(links);
});

it('länkar till aktuell ärendelogg', () => {
  const caseID = 42;
  const caseNumber = '2020-1234';
  const crumbs = new BreadcrumbTrail();
  const org = 'Acme';
  const pc = `case=${caseID}`;
  const service = 'Test';
  links.push(
    { title: 'Ärenden', url: '?page=list&type=case' },
    { title: `${caseNumber} ${org} ${service}`, url: `?page=case&${pc}` },
    { title: 'Ärendelogg', url: `?page=log&${pc}` }
  );
  crumbs.case(caseID, caseNumber, org, service);
  crumbs.log(caseID);
  expect(crumbs.links).toEqual(links);
});

it('länkar till aktuell granskning', () => {
  const auditDate = '2020-09-23';
  const auditID = 13;
  const caseID = 42;
  const caseNumber = '2020-1234';
  const crumbs = new BreadcrumbTrail();
  const date = new Date(auditDate);
  const org = 'Acme';
  const pa = `audit=${auditID}`;
  const pc = `case=${caseID}`;
  const service = 'Test';
  links.push(
    { title: 'Ärenden', url: '?page=list&type=case' },
    { title: `${caseNumber} ${org} ${service}`, url: `?page=case&${pc}` },
    { title: `Granskning ${auditDate}`, url: `?page=audit&${pa}` }
  );
  crumbs.case(caseID, caseNumber, org, service);
  crumbs.audit(auditID, date);
  expect(crumbs.links).toEqual(links);
});

it('länkar till aktuellt stickprov', () => {
  const auditDate = '2020-09-23';
  const auditID = 13;
  const caseID = 42;
  const caseNumber = '2020-1234';
  const crumbs = new BreadcrumbTrail();
  const date = new Date(auditDate);
  const name = 'Test sample';
  const org = 'Acme';
  const sample = encodeURIComponent(name);
  const sampleID = 69;
  const pa = `audit=${auditID}`;
  const pc = `case=${caseID}`;
  const ps = `sample=${sampleID}`;
  const service = 'Test';
  links.push(
    { title: 'Ärenden', url: '?page=list&type=case' },
    { title: `${caseNumber} ${org} ${service}`, url: `?page=case&${pc}` },
    { title: `Granskning ${auditDate}`, url: `?page=audit&${pa}` },
    { title: name, url: `?page=sample&${ps}` }
  );
  crumbs.case(caseID, caseNumber, org, service);
  crumbs.audit(auditID, date);
  crumbs.sample(sampleID, name);
  expect(crumbs.links).toEqual(links);
});

it('länkar till aktuellt krav', () => {
  const auditDate = '2020-09-23';
  const auditID = 13;
  const caseID = 42;
  const caseNumber = '2020-1234';
  const crumbs = new BreadcrumbTrail();
  const date = new Date(auditDate);
  const id = 313;
  const name = 'Test sample';
  const org = 'Acme';
  const sample = encodeURIComponent(name);
  const sampleID = 69;
  const title = 'Requirement name';
  const pa = `audit=${auditID}`;
  const pc = `case=${caseID}`;
  const pr = `requirement=${id}`;
  const ps = `sample=${sampleID}`;
  const service = 'Test';
  links.push(
    { title: 'Ärenden', url: '?page=list&type=case' },
    { title: `${caseNumber} ${org} ${service}`, url: `?page=case&${pc}` },
    { title: `Granskning ${auditDate}`, url: `?page=audit&${pa}` },
    { title: name, url: `?page=sample&${ps}` },
    { title: title, url: `?page=requirement&${ps}&${pr}` }
  );
  crumbs.case(caseID, caseNumber, org, service);
  crumbs.audit(auditID, date);
  crumbs.sample(sampleID, name);
  crumbs.requirement(id, title);
  expect(crumbs.links).toEqual(links);
});

it('returnerar den aktuella sidans titel som angivits', () => {
  const crumbs = new BreadcrumbTrail();
  const title = 'Test';
  crumbs.current = title;
  expect(crumbs.current).toBe(title);
});

it('aviserar när länkstigen blir klar att visa', async () => {
  const crumbs = new BreadcrumbTrail();
  const title = 'Test';
  setTimeout(() => (crumbs.current = title), 0);
  await crumbs.completed();
  expect(crumbs.current).toBe(title);
});

it('aviserar direkt om aktuell sida redan är satt', async () => {
  const crumbs = new BreadcrumbTrail();
  const title = 'Test';
  crumbs.current = title;
  await crumbs.completed();
  expect(crumbs.current).toBe(title);
});

// Importera beroenden.
import { BreadcrumbTrail } from '../../js/view/BreadcrumbTrail.js';
import { beforeEach, expect, it } from '../functions.js';
