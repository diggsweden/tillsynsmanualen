/**
 * Enhetstestfall för databastransaktioner.
 *
 * @license CC-BY 4.0
 * @see Transaction
 */

describe('Objektlager', () => {
  it('hämtar angivet objektlager', () => {
    // Hjälpklass för att verifiera instansiering.
    class MockObjectStore {
      data;
      constructor(arg) {
        this.data = arg;
      }
    }

    const data = 'bar';
    const name = 'foo';
    const tx = mock({ objectStore: (name) => data });
    const transaction = new Transaction(tx);
    const store = transaction.objectStore(name, MockObjectStore);

    expect(tx.objectStore).toHaveBeenCalled.with(name);
    expect(store.data).toBe(data);
  });
});

describe('Avsluta transaktion', () => {
  let idbTransaction;

  // Skapa förutsättningarna för varje test.
  beforeEach(() => {
    idbTransaction = mock(
      {
        listeners: {},
      },
      {
        addEventListener(type, func) {
          idbTransaction.listeners[type] = func;
        },
      }
    );
  });

  it('inväntar färdig transaktion', async () => {
    const data = 'test';
    const transaction = new Transaction(idbTransaction);

    setTimeout(() => idbTransaction.listeners.complete('foo'), 0);

    const result = await transaction.complete(data);
    expect(result).toBe(data);
    expect(idbTransaction.addEventListener)
      .toHaveBeenCalled.times(3)
      .with(
        ['abort', expect.anyFunction()],
        ['error', expect.anyFunction()],
        ['complete', expect.anyFunction()]
      );
  });

  it('inväntar avbruten transaktion', async () => {
    const transaction = new Transaction(idbTransaction);

    setTimeout(() => idbTransaction.listeners.abort(), 0);

    expect.failure(() => transaction.complete('foo'));
  });

  it('inväntar misslyckad transaktion', async () => {
    const error = 'ERROR';
    const transaction = new Transaction(idbTransaction);

    setTimeout(
      () =>
        idbTransaction.listeners.error({
          target: { error },
        }),
      0
    );

    expect.failure(() => transaction.complete('foo'));
  });
});

// Importera beroenden.
import { Transaction } from '../../js/db/Transaction.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';
