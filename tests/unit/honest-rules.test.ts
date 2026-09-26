import { describe, it, expect } from 'vitest';
import { evaluateHonestRules } from '../../src/core/exposure/honest-rules.ts';

describe('Honest Output Policy Evaluation', () => {
  it('returns NIGHT when all points have negative elevation', () => {
    const nightSamples = [
      { elevation: -15, relativeAngle: 90 },
      { elevation: -25, relativeAngle: 95 },
      { elevation: -30, relativeAngle: 100 }
    ];
    const res = evaluateHonestRules(nightSamples, 0, 0);
    expect(res.type).toBe('NIGHT');
    if (res.type === 'NIGHT') {
      expect(res.textAr).toContain('مفيش شمس');
    }
  });

  it('returns OVERHEAD_SUN when elevation > 68° for over 70% of duration', () => {
    const overheadSamples = [
      { elevation: 75, relativeAngle: 40 },
      { elevation: 82, relativeAngle: 50 },
      { elevation: 84, relativeAngle: 60 },
      { elevation: 80, relativeAngle: 70 },
      { elevation: 60, relativeAngle: 80 } // 4 out of 5 = 80% > 68°
    ];
    const res = evaluateHonestRules(overheadSamples, 40, 50);
    expect(res.type).toBe('OVERHEAD_SUN');
    if (res.type === 'OVERHEAD_SUN') {
      expect(res.textAr).toContain('السقف حاميك');
    }
  });

  it('returns TIE when diff between sides is less than 10%', () => {
    const tieSamples = [
      { elevation: 35, relativeAngle: 80 },
      { elevation: 40, relativeAngle: 110 }
    ];
    const res = evaluateHonestRules(tieSamples, 52, 48); // Diff = 4% < 10%
    expect(res.type).toBe('TIE');
    if (res.type === 'TIE') {
      expect(res.textAr).toContain('زي بعض تقريباً');
    }
  });

  it('returns DETERMINISTIC winner when one side is clearly shaded', () => {
    const samples = [
      { elevation: 35, relativeAngle: 80 },
      { elevation: 40, relativeAngle: 75 }
    ];
    const resLeft = evaluateHonestRules(samples, 85, 15); // Left wins
    expect(resLeft.type).toBe('DETERMINISTIC');
    if (resLeft.type === 'DETERMINISTIC') {
      expect(resLeft.winner).toBe('left');
      expect(resLeft.diff).toBe(70);
    }

    const resRight = evaluateHonestRules(samples, 15, 85); // Right wins
    expect(resRight.type).toBe('DETERMINISTIC');
    if (resRight.type === 'DETERMINISTIC') {
      expect(resRight.winner).toBe('right');
      expect(resRight.diff).toBe(70);
    }
  });

  it('handles empty samples safely as NIGHT', () => {

    const res = evaluateHonestRules([], 0, 0);
    expect(res.type).toBe('NIGHT');
  });
});
