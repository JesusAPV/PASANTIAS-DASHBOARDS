import { describe, expect, it } from 'vitest';
import { num } from './parser.js';
describe('num() interpreta formatos numéricos de Excel/CSV', () => {
  it.each([
    [34355, 34355],
    ['34355', 34355],
    ['34,355', 34355],
    ['34.355', 34355],
    ['1,234,567', 1234567],
    ['0.4628', 0.4628],
    ['0,4628', 0.4628],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['-130', -130],
    ['-0.37', -0.37],
    ['12.5%', 12.5],
    ['7.730673316708', 7.730673316708],
    ['', undefined],
    [null, undefined],
    ['Agosto', undefined],
    ['n/a', undefined],
  ])('%s -> %s', (input, expected) => {
    expect(num(input)).toBe(expected);
  });
});
