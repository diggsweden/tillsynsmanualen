/**
 * Enhetstestfall för information om offentlig aktör.
 *
 * @license CC-BY 4.0
 * @see Organization
 */

describe('Åtkomstmetoder och validering', () => {
  it.with(['', ''], [' digg ', 'DIGG'])(
    "returnerar förkortning '{0}' som '{1}'",
    (input, output) => {
      const org = new Organization();
      org.abbreviation = input;
      expect(org.abbreviation).toBe(output);
    }
  );

  it('returnerar trimmad adress', () => {
    const org = new Organization();
    org.address = '\t Box 14 \r\n\r\n 85102 Sundsvall \r\n';
    expect(org.address).toBe('Box 14\n85102 Sundsvall');
  });

  it('refuserar en ogiltig e-postadress', () => {
    const org = new Organization();
    expect
      .exception(() => (org.email = 'invalid'))
      .toBeAnInstanceOf(ValidationError);
  });

  it.with(['info@digg.se'], [''])(
    "returnerar en giltig e-postadress för '{0}'",
    (email) => {
      const org = new Organization();
      org.email = email;
      expect(org.email).toBe(email);
    }
  );

  it('returnerar trimmat namn', () => {
    const org = new Organization();
    org.name = ' Myndigheten för digital förvaltning ';
    expect(org.name).toBe('Myndigheten för digital förvaltning');
  });

  it('refuserar ett ogiltigt organisationsnummer', () => {
    const org = new Organization();
    expect
      .exception(() => (org.registrationNumber = 'invalid'))
      .toBeAnInstanceOf(ValidationError);
  });

  it.with(['', ''], ['20 21 00 6883', '202100-6883'])(
    "returnerar organisationsnummer '{0}' som '{1}'",
    (input, output) => {
      const org = new Organization();
      org.registrationNumber = input;
      expect(org.registrationNumber).toBe(output);
    }
  );

  it('refuserar ett ogiltigt telefonnummer', () => {
    const org = new Organization();
    expect
      .exception(() => (org.telephone = '11 44 00'))
      .toBeAnInstanceOf(ValidationError);
  });

  it.with(['', ''], [' 0771 - 114 400', '0771-11 44 00'])(
    "returnerar telefonnummer '{0}' som '{1}'",
    (input, output) => {
      const org = new Organization();
      org.telephone = input;
      expect(org.telephone).toBe(output);
    }
  );
});

describe('Omvandling', () => {
  let data;

  beforeEach(() => {
    data = {
      abbr: 'DIGG',
      addr: 'Box 14\n85102 Sundsvall',
      email: 'info@digg.se',
      name: 'Myndigheten för digital förvaltning',
      regNo: '202100-6883',
      tel: '0771-11 44 00',
    };
  });

  it('återskapar en instans från ett dataobjekt', () => {
    const org = new Organization(data);
    expect(org.abbreviation).toBe(data.abbr);
    expect(org.address).toBe(data.addr);
    expect(org.email).toBe(data.email);
    expect(org.name).toBe(data.name);
    expect(org.registrationNumber).toBe(data.regNo);
    expect(org.telephone).toBe(data.tel);
  });

  it('serialiserar en instans för lagring i databasen', () => {
    const org = new Organization(data);
    expect(org.serialize()).toEqual(data);
  });

  it('genererar ett objekt vid omvandling till JSON', () => {
    const org = new Organization(data);
    expect(org.toJSON()).toEqual(data);
  });
});

// Importera beroenden.
import { Organization } from '../../js/model/Organization.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it } from '../functions.js';
