/**
 * Enhetstestfall för inställningslgaringen.
 *
 * @license CC-BY 4.0
 * @see SettingStorage
 */

it('kontrollerar om given nyckel finns i lagringsutrymmet', () => {
  // Mocka localStorage.
  const mockStorage = mock({
    getItem: (key) =>
      ({
        'digg.manual.foo': 'foo',
        'digg.manual.bar': 'bar',
      })[key] || null,
  });
  const settings = new SettingStorage(mockStorage);
  expect(settings.contains('not this', 'foo')).toBe(false);
  expect(settings.contains('foo', 'bar')).toBe(true);
});

it('läser data', () => {
  const key = 'foo';
  const value = 'bar';
  const mockStorage = mock({
    getItem: (fKey) => ({ [`digg.manual.${key}`]: value })[fKey],
  });
  const settings = new SettingStorage(mockStorage);
  expect(settings.read(key)).toBe(value);
});

it('raderar angiven nyckel', () => {
  // Mocka localStorage.
  const mockStorage = mock({ removeItem: () => {} });
  const key = 'foo';
  const settings = new SettingStorage(mockStorage);
  settings.remove(key);
  expect(mockStorage.removeItem)
    .toHaveBeenCalled.once()
    .with(`digg.manual.${key}`);
});

it('raderar alla nycklar', () => {
  // Mocka localStorage.
  const mockStorage = mock(
    {
      _keys: {
        'digg.manual.bar': 'bar',
        'digg.manual.foo': 'foo',
        other: 'keep this',
      },
      get length() {
        return Object.keys(mockStorage._keys).length;
      },
    },
    {
      key: (i) => Object.keys(mockStorage._keys)[i],
      removeItem: () => {},
    }
  );
  const settings = new SettingStorage(mockStorage);
  settings.clear();
  expect(mockStorage.removeItem)
    .toHaveBeenCalled.times(2)
    .with(['digg.manual.bar'], ['digg.manual.foo']);
});

it('sparar data med angiven nyckel', () => {
  const mockStorage = mock({ setItem: () => {} });
  const key = 'foo';
  const value = 'bar';
  const settings = new SettingStorage(mockStorage);
  settings.write(key, value);
  expect(mockStorage.setItem)
    .toHaveBeenCalled.once()
    .with(`digg.manual.${key}`, value);
});

// Importera beroenden.
import { SettingStorage } from '../../js/common/SettingStorage.js';
import { expect, it, mock } from '../functions.js';
