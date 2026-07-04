import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { exceedsDragThreshold } from '../js/ui/dragAndDrop.js';

describe('exceedsDragThreshold', () => {
  it('treats small movement as a tap', () => {
    assert.equal(exceedsDragThreshold(0, 0), false);
    assert.equal(exceedsDragThreshold(3, 4, 10), false);
  });

  it('treats larger movement as a drag', () => {
    assert.equal(exceedsDragThreshold(8, 8, 10), true);
  });
});
