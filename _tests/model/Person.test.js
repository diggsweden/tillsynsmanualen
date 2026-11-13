/**
 * Enhetstestfall för personer (granskare, tillsynsansvariga).
 *
 * @license CC-BY 4.0
 * @see Person
 */

describe('Åtkomstmetoder och validering', () => {
  it('refuserar en ogiltig e-postadress', () => {
    const person = new Person();
    expect
      .exception(() => (person.email = 'invalid'))
      .toBeAnInstanceOf(ValidationError);
  });

  it.with([''], ['julia.jurist@digg.se'])(
    "returnerar en giltig e-postadress för '{0}'",
    (email) => {
      const person = new Person();
      person.email = email;
      expect(person.email).toBe(email);
    }
  );

  it('refuserar ett tomt efternamn', () => {
    const person = new Person();
    expect
      .exception(() => (person.familyName = ' '))
      .toBeAnInstanceOf(ValidationError);
  });

  it('returnerar ett trimmat giltigt efternamn', () => {
    const name = ' Jurist ';
    const person = new Person();
    person.familyName = name;
    expect(person.familyName).toBe(name.trim());
  });

  it('refuserar ett tomt förnamn', () => {
    const person = new Person();
    expect
      .exception(() => (person.givenName = ' '))
      .toBeAnInstanceOf(ValidationError);
  });

  it('returnerar angiven identitet', () => {
    const id = 42;
    const person = new Person();
    person.id = id;
    expect(person.id).toBe(id);
  });

  it('ignorerar försök att ändra identitet', () => {
    const id = 42;
    const person = new Person();
    person.id = id;
    person.id = 69; // Ska ignoreras.
    expect(person.id).toBe(id);
  });

  it('returnerar ett trimmat giltigt förrnamn', () => {
    const name = ' Jane ';
    const person = new Person();
    person.givenName = name;
    expect(person.givenName).toBe(name.trim());
  });

  it("returnerar namn som 'Efternamn, Förnamn'", () => {
    const familyName = 'Jurist';
    const givenName = 'Julia';
    const person = new Person();
    person.givenName = givenName;
    person.familyName = familyName;
    expect(person.name).toBe(`${familyName}, ${givenName}`);
  });

  it('lägger till och tar bort roller', () => {
    const person = new Person();
    expect(person.hasRole('officer')).toBe(false);
    expect(person.hasRole('supervisor')).toBe(false);
    expect(person.roles.length).toBe(0);

    // Lägg till två roller och verifiera.
    person.addRole('supervisor');
    person.addRole('officer');
    person.addRole('officer'); // Ska ignoreras.

    expect(person.hasRole('officer')).toBe(true);
    expect(person.hasRole('supervisor')).toBe(true);
    expect(person.roles.length).toBe(2);

    // Ta bort en roll och verifiera.
    person.deleteRole('supervisor');
    person.deleteRole('supervisor'); // Ska ignoreras.

    expect(person.hasRole('officer')).toBe(true);
    expect(person.hasRole('supervisor')).toBe(false);
    expect(person.roles.length).toBe(1);
  });

  it('refuserar ett ogiltigt telefonnummer', () => {
    const person = new Person();
    expect
      .exception(() => (person.telephone = '11 44 00'))
      .toBeAnInstanceOf(ValidationError);
  });

  it('returnerar ett formaterat giltigt telefonnummer', () => {
    const person = new Person();
    person.telephone = ' 0771 - 114 400 ';
    expect(person.telephone).toEqual('0771-11 44 00');
  });
});

describe('Omvandling', () => {
  let data;

  beforeEach(() => {
    data = {
      email: 'julia.jurist@example.com',
      fName: 'Jurist',
      gName: 'Julia',
      roles: ['supervisor'],
      tel: '0123-45 67 89',
    };
  });

  it('återskapar en instans från ett dataobjekt', () => {
    const person = new Person(data);
    expect(person).toBeAnInstanceOf(Person);
    expect(person.email).toBe(data.email);
    expect(person.familyName).toBe(data.fName);
    expect(person.givenName).toBe(data.gName);
    expect(person.roles).toEqual(data.roles);
    expect(person.telephone).toBe(data.tel);
  });

  it('serialiserar en instans för lagring i databasen', () => {
    const person = new Person(data);
    expect(person.serialize()).toEqual(data);
  });

  it('genererar ett objekt vid omvandling till JSON', () => {
    const person = new Person(data);
    expect(person.toJSON()).toEqual(data);
  });

  it("omvandlar till sträng som 'Förnamn Efternamn'", () => {
    const familyName = 'Jurist';
    const givenName = 'Julia';
    const person = new Person();
    person.givenName = givenName;
    person.familyName = familyName;
    expect(person.toString()).toBe(`${givenName} ${familyName}`);
  });
});

// Importera beroenden.
import { Person } from '../../js/model/Person.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it } from '../functions.js';
