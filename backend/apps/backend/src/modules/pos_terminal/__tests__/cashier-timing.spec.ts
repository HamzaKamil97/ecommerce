import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('verifyCashierPin timing-safe not-found path', () => {
  it('source includes the DUMMY_PIN_HASH and DUMMY_PIN_SALT constants', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../service.ts'),
      'utf-8',
    );
    expect(src).toMatch(/DUMMY_PIN_HASH/);
    expect(src).toMatch(/DUMMY_PIN_SALT/);
  });
});
