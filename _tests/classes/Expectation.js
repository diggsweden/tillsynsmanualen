/**
 * Representerar en förväntning som kan infrias eller avvisas.
 *
 * Instansieras via funktionen `expect()`.
 *
 * En instanas av klassen kan representera ett värde (faktiskt utfall) som kan
 * jämföras med ett förväntat värde, eller en mockfunktion vars anrop kan
 * utvärderas.
 *
 * @license CC-BY 4.0
 * @see expect
 */
export class Expectation {
  // Privata fält.
  #actual;
  #calls = false;
  #inversion = false;

  /**
   * Konstruera en förväntningsinstans.
   *
   * @param {*} arg Faktiskt utfall att jämföra eller utvärdera.
   */
  constructor(arg) {
    this.#actual = arg;
  }

  /**
   * Verifiera att en mockfunktion anropats minst en gång.
   *
   * Åtkomstmetoden `toHaveBeenCalled()` måste ha anropats före anropet till
   * denna metod.
   *
   * @example
   * expect(mock.func).toHaveBeenCalled.atLeasOnce()
   *
   * @see #toHaveBeenCalledTimes
   * @return {this}
   * @throws {TypeError}          Ogiltigt anrop.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  atLeastOnce() {
    this.#toHaveBeenCalledTimes(1, -1);
    return this;
  }

  /**
   * Verifiera att en mockfunktion aldrig anropats.
   *
   * Åtkomstmetoden `toHaveBeenCalled()` måste ha anropats före anropet till
   * denna metod.
   *
   * @example
   * expect(mock.func).toHaveBeenCalled.never()
   *
   * @see #toHaveBeenCalledTimes
   * @return {this}
   * @throws {TypeError}          Ogiltigt anrop.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  never() {
    this.#toHaveBeenCalledTimes(0);
    return this;
  }

  /**
   * Åtkomstmetod för invertering.
   *
   * Inverterar efterföljande verifieringsmetoder som `toBe()` eller `with()`.
   *
   * @return {this}
   */
  get not() {
    this.#inversion = !this.#inversion;
    return this;
  }

  /**
   * Verifiera att en mockfunktion anropats exakt en gång.
   *
   * Åtkomstmetoden `toHaveBeenCalled()` måste ha anropats före anropet till
   * denna metod.
   *
   * @example
   * expect(mock.func).toHaveBeenCalled.once()
   *
   * @see #toHaveBeenCalledTimes
   * @return {this}
   * @throws {TypeError}          Ogiltigt anrop.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  once() {
    this.#toHaveBeenCalledTimes(1);
    return this;
  }

  /**
   * Verifiera att en mockfunktion anropats exakt angivet antal gånger.
   *
   * Åtkomstmetoden `toHaveBeenCalled()` måste ha anropats före anropet till
   * denna metod.
   *
   * @example
   * expect(mock.func).toHaveBeenCalled.once()
   *
   * @see #toHaveBeenCalledTimes
   * @param {number} count Förväntat antal anrop.
   * @return {this}
   * @throws {TypeError}          Ogiltigt anrop.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  times(count) {
    this.#toHaveBeenCalledTimes(count);
    return this;
  }

  /**
   * Jämför identitet.
   *
   * Kontrollera om det faktiska utfallet är identiskt (strikt lika med) den
   * angivna förväntningen, med hänsyn taget till eventuell invertering.
   *
   * Kasta ett undantag om förväntningen inte infrias.
   *
   * Observera att strikt likhet inte är uppfylld för två olika objekt eller
   * vektorer (även om de har exakt samma fält eller värden).
   *
   * @param {*} expected Förväntning att jämföra det faktiska utfallet med.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  toBe(expected) {
    if (!this.#compare(expected, this.#actual)) {
      if (this.#inversion) {
        throw new ExpectationFailure(
          'Värdet borde inte matcha ej förväntat värde.',
          { unexpected: expected }
        );
      } else {
        throw new ExpectationFailure('Värdet borde matcha förväntat värde.', {
          expected,
          actual: this.#actual,
        });
      }
    }
  }

  /**
   * Jämför klass.
   *
   * Kontrollera om det faktiska utfallet är en instans av angiven klass, med
   * hänsyn taget till eventuell invertering.
   *
   * Kasta ett undantag om förväntningen inte infrias.
   *
   * @param {class} expectedClass Förväntad klass för det faktiska utfallet.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  toBeAnInstanceOf(expectedClass) {
    if (!this.#compare(true, this.#actual instanceof expectedClass)) {
      if (this.#inversion) {
        throw new ExpectationFailure(
          'Värdet borde inte vara en instans av ej förväntad klass.',
          { unexpected: expectedClass.name }
        );
      } else {
        throw new ExpectationFailure(
          'Värdet borde vara en instans av förväntad klass.',
          { expected: expectedClass.name, actual: this.#actual }
        );
      }
    }
  }

  /**
   * Jämför icke-strikt likhet.
   *
   * Kontrollera att det faktiska utfallet är (icke-strikt) likvärdigt med den
   * angivna förväntningen, med hänsyn tagen till eventuell invertering där
   * det är meningsfullt.
   *
   * Kasta ett undantag om förväntningen inte infrias.
   *
   * @param {*} expected Förväntning att jämföra det faktiska utfallet med.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  toEqual(expected) {
    if (!this.#compare(expected, this.#actual, false)) {
      if (this.#inversion) {
        throw new ExpectationFailure(
          'Värdet borde inte vara ej förväntat värde.',
          { unexpected: expected }
        );
      } else {
        throw new ExpectationFailure('Värdet borde matcha förväntat värde.', {
          expected,
          actual: this.#actual,
        });
      }
    }
  }

  /**
   * Försätt instansen i anropsverifieringsläge.
   *
   * Förbered instansen på anrop till metoder som `times()` och `with()`.
   *
   * @example
   * expect(mock.func).toHaveBeenCalled.once().with(42)
   *
   * @return {this}
   */
  get toHaveBeenCalled() {
    this.#calls = true;
    return this;
  }

  /**
   * Jämför med ett reguljärt uttryck.
   *
   * Kontrollera att det faktiska utfallet matchar det angivna reguljära
   * uttrycket, med hänsyn tagen till eventuell invertering.
   *
   * Kasta ett undantag om förväntningen inte infrias.
   *
   * @param {regexp} expr Reguljärt uttryck  att jämföra utfallet med.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  toMatch(expr) {
    if (expr.test(this.#actual)) {
      if (this.#inversion) {
        throw new ExpectationFailure(
          'Värdet borde inte matcha ej förväntat värde.',
          { unexpected: expr.toString() }
        );
      }
    } else {
      throw new ExpectationFailure('Värdet borde matcha förväntat värde.', {
        expected: expr.toString(),
        actual: this.#actual,
      });
    }
  }

  /**
   * Verifiera att en mockfunktion anropats med förväntade argument.
   *
   * Åtkomstmetoden `toHaveBeenCalled()` måste ha anropats före anropet till
   * denna metod.
   *
   * Kasta ett undantag om förväntningen inte infrias, om åtkomstmetoden
   * `toHaveBeenCalled()` inte anropats, eller om argumentet till konstruktorn
   * inte är en mockfunktion.
   *
   * @example
   * mock.func("foo", 42)
   * expect(mock.func).toHaveBeenCalled.with("foo", 42)
   *
   * @example
   * mock.func("foo", 42)
   * mock.func("bar", 13)
   * expect(mock.func).toHaveBeenCalled.with(["foo", 42], ["bar", 13])
   *
   * @param {...*} args Förväntade argument.
   * @throws {TypeError}          Ogiltigt anrop.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  with(...args) {
    if (!this.#calls) {
      throw new TypeError('with() får bara anropas efter toHaveBeenCalled.');
    }

    if ('function' !== typeof this.#actual || !('_calls' in this.#actual)) {
      throw new TypeError('with() får bara anropas för mockfunktioner.');
    }

    if (1 === this.#actual._calls.length) {
      // Mockmetoden anropades en gång.
      this.#checkArgsForOneCall(...args);
    } else {
      // Mockmetoden anropades flera gånger (eller aldrig).
      this.#checkArgsForManyCalls(...args);
    }
  }

  /**
   * Kontrollera antal argument i ett anrop till en mockfunktion.
   *
   * Om antalet inte stämmer, med hänsyn taget till eventuell invertering,
   * kasta ett undantag.
   *
   * @private
   * @param {array}  expected     Förväntade argument.
   * @param {array}  actual       Faktiska argument.
   * @param {number} [invocation] Anropsnummer (0-baserat).
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #checkArgCount(expected, actual, invocation) {
    if (!this.#compare(expected.length, actual.length)) {
      const e = expected.length;
      const a = this.#actual._calls[0].length;
      const n =
        undefined === invocation
          ? `${this.#actual.name}()`
          : `Anrop #${invocation + 1} till ${this.#actual.name}()`;

      if (this.#inversion) {
        throw new ExpectationFailure(
          `${n} föväntades inte anropas med dessa argument.`,
          { actual: args }
        );
      } else {
        throw new ExpectationFailure(
          `${n} anropades inte med förväntat antal argument.`,
          { expected: e, actual: a }
        );
      }
    }
  }

  /**
   * Verifiera att en mockfunktion anropats en gång med förväntade argument.
   *
   * @private
   * @param {...*} args Förväntade argument.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #checkArgsForOneCall(...args) {
    const actual = this.#actual._calls[0];
    this.#checkArgCount(args, actual);
    for (let index = 0; index < args.length; ++index) {
      if (!this.#compare(args[index], actual[index], false)) {
        const n = `${this.#actual.name}()`;
        if (this.#inversion) {
          throw new ExpectationFailure(
            `Argument ${index + 1} till ${n} ` +
              `borde inte vara ej förväntat värde.`,
            { unexpected: args[index] }
          );
        } else {
          throw new ExpectationFailure(
            `Argument ${index + 1} till ${n} borde matcha ` +
              'det förväntade värdet',
            { expected: args[index], actual: actual[index] }
          );
        }
      }
    }
  }

  /**
   * Verifiera att en mockfunktion anropats flera gånger med förväntade
   * argument.
   *
   * @private
   * @param {...*} args Förväntade argument.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #checkArgsForManyCalls(...args) {
    if (args.length !== this.#actual._calls.length && !this.#inversion) {
      const n = `${this.#actual.name}()`;
      const e = args.length;
      const a = this.#actual._calls.length;
      throw new ExpectationFailure(
        `${this.#actual.name}() borde ha anropats ` +
          'med förväntat antal argument (eller antal anrop).',
        { expected: e, actual: a }
      );
    }

    args.forEach((invArgs, invocation) => {
      const actual = this.#actual._calls[invocation];
      this.#checkArgCount(invArgs, actual, invocation);
      for (let index = 0; index < invArgs.length; ++index) {
        if (!this.#compare(invArgs[index], actual[index], false)) {
          const n = `anrop ${invocation + 1} till ` + `${this.#actual.name}()`;
          if (this.#inversion) {
            throw new ExpectationFailure(
              `Argument ${index + 1} vid ${n} ` +
                'borde inte vara ej förväntat värde.',
              { unexpected: invArgs[index] }
            );
          } else {
            throw new ExpectationFailure(
              `Argument ${index + 1} vid ${n} borde matcha ` +
                'det förväntade värdet',
              { expected: invArgs[index], actual: actual[index] }
            );
          }
        }
      }
    });
  }

  /**
   * Jämför två värden, men hänsyn taget till eventuell invertering.
   *
   * @private
   * @param {*}       expected Förväntat värde.
   * @param {*}       actual   Faktiskt utfall.
   * @param {boolean} strict   Använd strikt jämförelse?
   * @return {boolean}
   */
  #compare(expected, actual, strict = true) {
    if (!strict) {
      // Icke-strikt jämförelse.
      this.#diff(expected, actual);
      return true;
    }

    return this.#inversion ? expected !== actual : expected === actual;
  }

  /**
   * Hitta skillnaden mellan förväntat värde och faktiskt utfall.
   *
   * Kontrollera typ och innehåll.
   *
   * @private
   * @param {*} expected Förväntat värde.
   * @param {*} actual   Faktiskt utfall.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #diff(expected, actual) {
    this.#diffNull(expected, actual) ||
      this.#diffArray(expected, actual) ||
      this.#diffDate(expected, actual) ||
      this.#diffRegEx(expected, actual) ||
      this.#diffObject(expected, actual) ||
      this.#diffString(expected, actual) ||
      this.#diffScalar(expected, actual) ||
      this.#diffType(expected, actual);
  }

  /**
   * Kontrollera skillnaden mellan två vektorer.
   *
   * @private
   * @param {*} expected Förväntat värde.
   * @param {*} actual   Faktiskt utfall.
   * @return {boolean}
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #diffArray(expected, actual) {
    if (!Array.isArray(expected)) {
      return false;
    }

    if (!Array.isArray(actual)) {
      throw new ExpectationFailure('Värdetypen motsvarar inte förväntad typ.', {
        expected: 'array',
        actual,
      });
    }

    if (expected.length !== actual.length) {
      if (this.#inversion) {
        return true;
      }

      const a = actual.length;
      const e = expected.length;
      throw new ExpectationFailure(
        'Vektorlängden motsvarar inte förväntad längd.',
        { expected, actual }
      );
    }

    for (let index = 0; index < expected.length; ++index) {
      if (!this.#compare(expected[index], actual[index], false)) {
        try {
          this.#diff(expected[index], actual[index]);
        } catch (err) {
          throw new ExpectationFailure(`Index [${index}]: ${err.message}`, {
            expected: expected[index],
            actual: actual[index],
          });
        }
      }
    }

    return true;
  }

  /**
   * Kontrollera om två värden representerar samma datum.
   *
   * Varje värde kan vara en `Date`-instans eller en sträng eller ett heltal
   * som är ett acceptabelt argument till `Date`-konstruktorn.
   *
   * @private
   * @param {*} expected Förväntat värde.
   * @param {*} actual   Faktiskt utfall.
   * @return {boolean}
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #diffDate(expected, actual) {
    const ctor = (o) => (o ? o.constructor.name : '');
    const date = (d) => d?.toISOString();
    let expDate;

    if ('Date' === ctor(expected)) {
      // Förväntat värde är en `Date`-instans.
      expDate = expected;

      if ('Date' !== ctor(actual)) {
        // Faktiskt utfall är inte en `Date`-instans.
        throw new ExpectationFailure('Värdet borde vara ett datum.', {
          expected: date(expected),
          actual,
        });
      }
    } else if ('Date' === ctor(actual)) {
      // Faktiskt utfall är en `Date`-instans, men inte förväntat värde.
      expDate = new Date(expected);
      if ('Invalid Date' === expDate.toString()) {
        // Förväntat värde är inte ett giltigt datum.
        throw new ExpectationFailure(
          'Värdetypen motsvarar inte förväntad typ.',
          { expected, actual }
        );
      }
    } else {
      return false;
    }

    // Både `expDate` och `actual` är `Date`-instanser.
    if (!this.#compare(expDate.getTime(), actual.getTime())) {
      // Datumen representerar inte samma tidpunkt.
      if (this.#inversion) {
        throw new ExpectationFailure(
          'Datumet borde inte vara ej förväntat datum.',
          { unexpected: expected }
        );
      } else {
        throw new ExpectationFailure(
          'Datumet motsvarar inte förväntat datum.',
          { expected: date(expected), actual: date(actual) }
        );
      }
    }

    return true;
  }

  /**
   * Kontrollera om två DOM-noder är lika.
   *
   * Det går inte att jämföra `Node`-instanser egenskap för egenskap, eftersom
   * det leder till oändlig rekursion. Därför gör vi en förenklad jämförelse
   * där vi bara tittar på nodnamn och angivna attribut.
   *
   * @private
   * @param {*} expected Förväntat värde.
   * @param {*} actual   Faktiskt utfall.
   * @return {boolean}
   * @throws {TypeError}          Ogiltigt anrop.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #diffNode(expected, actual) {
    if (!(expected instanceof Node)) {
      return false;
    }

    if (!(actual instanceof Node)) {
      throw new ExpectationFailure('Värdet är inte en `Node`-instans.', {
        expected,
        actual,
      });
    }

    if (this.#inversion) {
      throw new TypeError(
        'Inverterad jämförelse av noder är inte meningsfull.'
      );
    }

    // Instanserna ska vara av samma nodklass.
    const ctor = (o) => o.constructor.name;
    if (!this.#compare(ctor(expected), ctor(actual))) {
      throw new ExpectationFailure(
        `Typen '${actual.constructor.name}' motsvarar inte förväntad ` +
          ` typ '${expected.constructor.name}'.`,
        { expected, actual }
      );
    }

    // Jämför underordnade noder.
    const ch = (o) => o.childNodes.length;
    if (!this.#compare(ch(expected), ch(actual))) {
      throw new ExpectationFailure(
        `Antalet undernoder (${ch(actual)}) motsvarar inte förväntat ` +
          `antal ${ch(expected)}.`,
        { expected, actual }
      );
    }

    Array.from(expected.childNodes).forEach((child, index) =>
      this.#diffNode(child, actual.childNodes[index])
    );

    // För `Element`-noder: jämför attributen.
    if (expected instanceof Element) {
      const attr = (o) => o.attributes.length;
      if (!this.#compare(attr(expected), attr(actual))) {
        throw new ExpectationFailure(
          `Antalet attribut (${attr(actual)}) motsvarar inte ` +
            `förväntat antal ${attr(expected)}.`,
          { expected, actual }
        );
      }

      for (let index = 0; i < attr(expected); ++index) {
        const e = expected.attributes.item(index);
        const a = actual.attributes.getNamedItem(e.name);
        if (!this.#compare(e.value, a.value)) {
          throw new ExpectationFailure(
            `Värdet '${a.value}' för attributet '${a.name}' ` +
              ` motsvarar inte förväntat värde '${e.value}'.`,
            { expected, actual }
          );
        }
      }
    }

    return true;
  }

  /**
   * Kontrollera om två värden båda är `null`.
   *
   * @private
   * @param {*} expected Förväntat värde.
   * @param {*} actual   Faktiskt utfall.
   * @return {boolean}
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #diffNull(expected, actual) {
    if (null != expected) {
      return false;
    }

    if (this.#inversion && null == actual) {
      throw new ExpectationFailure("Värdet borde inte vara 'null'.");
    } else if (!this.#inversion && null != actual) {
      throw new ExpectationFailure('Värdet motsvarar inte förväntat värde.', {
        expected: null,
        actual,
      });
    }

    return true;
  }

  /**
   * Kontrollera att två objekt har samma fält.
   *
   * Metoden jämför inte om objekten är instanser av samma klass. Detta för
   * att kunna jämföra generiska objekt med instanser av specifika klasser.
   *
   * @private
   * @param {*} expected Förväntat värde.
   * @param {*} actual   Faktiskt utfall.
   * @return {boolean}
   * @throws {TypeError}          Ogiltigt anrop.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #diffObject(expected, actual) {
    if ('object' !== typeof expected) {
      return false;
    }

    if (this.#inversion) {
      throw new TypeError(
        'Inverterad jämförelse av objekt är inte meningsfull.'
      );
    }

    if (expected instanceof Node) {
      return this.#diffNode(expected, actual);
    } else {
      // Jämför förväntade objektfält.
      for (const prop in expected) {
        if (!(prop in actual)) {
          throw new ExpectationFailure(
            `Objektet saknar det förväntade fältet '${prop}'.`,
            { expected, actual }
          );
        }

        if (!this.#compare(expected[prop], actual[prop], false)) {
          throw new ExpectationFailure(
            `Värdet '${actual[prop]}' för fältet '${prop}' ` +
              'motsvarar inte förväntat värde ' +
              `'${expected[prop]}'.`,
            { expected, actual }
          );
        }
      }

      // Kontroller att det faktiska utfallet inte har fält som saknas
      // i det förväntade värdet.
      const own = (o, p) => o.hasOwnProperty(p);
      Object.getOwnPropertyNames(actual).forEach((prop) => {
        if (own(actual, prop) && !(prop in expected)) {
          throw new ExpectationFailure(
            `Värdet borde inte innehålla fältet '${prop}'.`,
            { expected, actual }
          );
        }
      });
    }

    return true;
  }

  /**
   * Kontrollera om utfallet matchar ett reguljärt uttryck.
   *
   * @private
   * @param {regexp} expected Reguljäart uttryck.
   * @param {*}      actual   Faktiskt utfall.
   * @return {boolean}
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #diffRegEx(expected, actual) {
    const ctor = (o) => (o ? o.constructor.name : '');
    if ('RegExp' !== ctor(expected)) return false;

    if (expected.test(actual)) {
      // Utfallet matchar det reguljära uttrycket.
      if (this.#inversion) {
        throw new ExpectationFailure(
          'Värdet borde inte matcha ej förväntat mönster.',
          { unexpected: expected.toString() }
        );
      }
    } else {
      throw new ExpectationFailure('Värdet matchar inte förväntat mönster.', {
        expected: expected.toString(),
        actual,
      });
    }

    return true;
  }

  /**
   * Kontrollera att två skalärer har motsvarande värden.
   *
   * @private
   * @param {*} expected Förväntat värde.
   * @param {*} actual   Faktiskt utfall.
   * @return {boolean}
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #diffScalar(expected, actual) {
    const scl = (v) => ['boolean', 'number', 'string'].includes(typeof v);
    if (!scl(expected) || !scl(actual)) {
      return false;
    }

    const cmp = this.#inversion ? (a, b) => a != b : (a, b) => a == b;
    if (!cmp(expected, actual)) {
      if (this.#inversion) {
        throw new ExpectationFailure('Ej förväntat värde.', {
          unexpected: expected,
        });
      } else {
        throw new ExpectationFailure('Värdet motsvarar inte förväntat värde.', {
          expected,
          actual,
        });
      }
    }

    // Fortsätt alltid efter denna kontroll.
    return false;
  }

  /**
   * Kontrollera att två strängar har samma värde.
   *
   * @private
   * @param {*} expected Förväntat värde.
   * @param {*} actual   Faktiskt utfall.
   * @return {boolean}
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #diffString(expected, actual) {
    const ns = (s) => 'string' !== typeof s;
    if (ns(expected) || ns(actual) || this.#compare(expected, actual)) {
      return false;
    }

    if (this.#inversion) {
      throw new ExpectationFailure('Ej förväntat strängvärde.', {
        unexpected: expected,
      });
    } else if (expected.length !== actual.length) {
      const len = Math.min(expected.length, actual.length);
      throw new ExpectationFailure(
        'Strängen skiljer sig från förväntad sträng från ' + `position ${len}.`,
        { expected, actual }
      );
    } else {
      const len = Math.min(expected.length, actual.length);
      for (let i = 0; i < len; ++i) {
        if (expected[i] !== actual[i]) {
          throw new ExpectationFailure(
            'Strängen skiljer sig från förväntad sträng på ' + `position ${i}.`,
            { expected, actual }
          );
        }
      }
    }

    return true;
  }

  /**
   * Kontrollera att två värden har samma datatyp.
   *
   * @private
   * @param {*} expected Förväntat värde.
   * @param {*} actual   Faktiskt utfall.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #diffType(expected, actual) {
    if (!this.#compare(typeof expected, typeof actual)) {
      if (this.#inversion) {
        throw new ExpectationFailure('Ej förväntad värdetyp.', {
          unexpected: typeof expected,
        });
      } else {
        throw new ExpectationFailure(
          'Värdetypen motsvarar inte förväntad typ.',
          { expected: typeof expected, actual: typeof actual }
        );
      }
    }
  }

  /**
   * Verifiera att en mockfunktion anropats angivet antal gånger.
   *
   * Om `max` är -1 görs ingen kontroll av den övre gränsen.
   *
   * Kasta ett undantag om förväntningen inte infrias, om åtkomstmetoden
   * `toHaveBeenCalled()` inte anropats, eller om argumentet till konstruktorn
   * inte är en mockfunktion.
   *
   * @private
   * @param {number} min   Förväntat (lägsta) antal anrop.
   * @param {number} [max] Förväntat högsta antal anrop.
   * @throws {TypeError}          Ogiltigt anrop.
   * @throws {ExpectationFailure} Förväntningen uppfylldes inte.
   */
  #toHaveBeenCalledTimes(min, max = min) {
    if (!this.#calls) {
      throw new TypeError('with() får bara anropas efter toHaveBeenCalled.');
    }

    if ('function' !== typeof this.#actual || !('_calls' in this.#actual)) {
      throw new TypeError(
        '#toHaveBeenCalledTimes får bara anropas för mockfunktioner.'
      );
    }

    if (min < 0) {
      throw new TypeError(
        'Argument #1 till #toHaveBeenCalledTimes() får inte vara negativt.'
      );
    }

    const actual = this.#actual._calls.length;
    let ok = actual >= min && (-1 === max || actual <= max);
    if (this.#inversion) {
      ok = !ok;
    }

    if (!ok) {
      const n = this.#actual._name;
      const pr = new Intl.PluralRules('sv');
      const t = { one: 'gång', other: 'gånger' };
      if (this.#inversion) {
        const e =
          max === min
            ? `${min} ${t[pr.select(min)]}`
            : max < 0
              ? `${min} ${t[pr.select(min)]} eller mer`
              : `${min}–${max} gånger`;
        throw new ExpectationFailure(
          `${n} borde inte ha anropats ${e} ` +
            `(faktiskt antal: ${$actual} ${t[pr.select(actual)]}).`
        );
      } else {
        const e =
          max === min ? min : max < 0 ? `minst ${min}` : `${min}–${max}`;
        throw new ExpectationFailure(
          `${n} anropades ${actual} ${t[pr.select(actual)]} ` +
            `(förväntat antal: ${e}).`
        );
      }
    }
  }
}

/**
 * Undantagsklass för avvisade förväntningar.
 *
 * Kastas av instanser av klassen `Exception` när en förväntning avvisas.
 *
 * @license CC-BY 4.0
 * @see Error
 */
export class ExpectationFailure extends Error {
  // Privata fält.
  #values;

  /**
   * Konstruera en undantagsinstans.
   *
   * Argumentet `values` kan vara ett objekt med noll eller flera av följande
   * fält:
   * - `actual`    : faktiskt utfall
   * - `expected`  : förväntat värde
   * - `unexpected`: icke förväntat värde.
   *
   * @param {string} message  Felmeddelande.
   * @param {object} [values] Värden.
   */
  constructor(message, values = {}) {
    super(message);
    this.#values = values;
    this.name = this.constructor.name;
    this.stack = new Error(message).stack;
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    const v = (lead, n) =>
      n in this.#values ? `\n${lead}: ${this.#format(this.#values[n])}` : '';
    return (
      this.message +
      v('++++ Förväntat', 'expected') +
      v('---- Ej förväntat', 'unexpected') +
      v('---- Faktiskt', 'actual')
    );
  }

  /**
   * Formatera ett värde som ska visas.
   *
   * @private
   * @param {*} value Värde att formatera.
   * @return {string}
   */
  #format(value) {
    return {
      boolean: (v) => String(v),
      function: (v) => `${v.name}()`,
      number: (v) => String(v),
      object: (v) => this.#formatObject(v),
      string: (v) => `"${v}"`,
      undefined: (v) => 'undefined',
    }[typeof value](value);
  }

  /**
   * Formatera ett objekt som ska visas.
   *
   * @private
   * @param {object} obj Objekt att formatera.
   * @return {string}
   */
  #formatObject(obj) {
    if (null === obj) return 'null';

    let result;
    switch (obj.constructor.name) {
      case 'Array':
        result = '[' + obj.map((v) => this.#format(v)).join(', ') + ']';
        break;

      case 'Date':
        result += obj.toLocaleString('sv');
        break;

      case 'Promise':
      case 'RegExp':
      case 'Symbol':
        result = obj.constructor.name;
        break;

      default:
        let count = 0;
        result = `${obj.constructor.name} {`;
        for (const [key, value] of Object.entries(obj)) {
          count++ > 0 && (result += ',');
          result += `\n  ${key}: ${this.#format(value)}`;
        }
        result += '\n}';
        break;
    }

    return result;
  }
}
