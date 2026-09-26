import { describe, it, expect } from 'vitest';
import { defaultPlacesRepository } from '../../src/adapters/places-repository.ts';

describe('Places Search & Fuzzy Autocomplete', () => {
  // Q1: 15 queries with messy real-world Egyptian spellings
  const testQueries = [
    { query: 'عبود', expectedId: 'cairo-abboud' },
    { query: 'موقف عبود', expectedId: 'cairo-abboud' },
    { query: 'رمسيس', expectedId: 'cairo-ramses' },
    { query: 'محطة مصر', expectedId: 'cairo-ramses' },
    { query: 'اسكندرية', expectedId: 'alex-moharam-bek' },
    { query: 'إسكندرية', expectedId: 'alex-moharam-bek' },
    { query: 'الاسكندريه', expectedId: 'alex-moharam-bek' },
    { query: 'سموحة', expectedId: 'alex-smouha' },
    { query: 'سموحه', expectedId: 'alex-smouha' },
    { query: 'الدقي', expectedId: 'giza-dokki' },
    { query: 'دقي', expectedId: 'giza-dokki' },
    { query: 'مصر الجديده', expectedId: 'cairo-heliopolis' },
    { query: 'روكسي', expectedId: 'cairo-heliopolis' },
    { query: 'المهندسين', expectedId: 'giza-mohandessin' },
    { query: 'التجمع', expectedId: 'cairo-tagamoa' },
    { query: 'التجمع الخامس', expectedId: 'cairo-tagamoa' },
    { query: 'اكتوبر', expectedId: 'giza-october' },
    { query: '٦ اكتوبر', expectedId: 'giza-october' },
    { query: 'طنطا', expectedId: 'gharbia-tanta' },
    { query: 'المحله', expectedId: 'gharbia-mahalla' },
    { query: 'المحلة الكبرى', expectedId: 'gharbia-mahalla' },
    { query: 'Mahalla', expectedId: 'gharbia-mahalla' },
    { query: 'مَحَطَّةُ مِصْرَ', expectedId: 'cairo-ramses' },
    { query: 'المنصوره', expectedId: 'dakahlia-mansoura' },
    { query: 'alex', expectedId: 'alex-moharam-bek' },
    { query: 'dokki', expectedId: 'giza-dokki' }
  ];

  for (const { query, expectedId } of testQueries) {
    it(`finds ${expectedId} for messy query: "${query}" in top 3`, () => {
      const results = defaultPlacesRepository.search(query, 3);
      expect(results.length).toBeGreaterThan(0);
      const ids = results.map((r) => r.id);
      expect(ids).toContain(expectedId);
    });
  }

  // Q2: Search benchmark on full dataset runs in < 10ms
  it('executes 1,000 searches with average latency < 2ms', () => {
    const queries = ['اسك', 'عبود', 'دقي', 'تجمع', 'طنطا', 'رمسيس', 'معادي', 'سموحة'];
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      const q = queries[i % queries.length]!;
      defaultPlacesRepository.search(q, 6);
    }
    const elapsed = performance.now() - start;
    const perCall = elapsed / 1000;
    expect(perCall).toBeLessThan(2.0); // Far below the 10ms target
  });

  it('returns popular places for empty query', () => {
    const popular = defaultPlacesRepository.search('');
    expect(popular.length).toBeGreaterThan(3);
    expect(popular.every((p) => p.isPopular)).toBe(true);
  });

  it('finds nearest place via GPS coordinates', () => {
    // Tahrir Square Cairo (30.0444, 31.2357) -> closest should be Ramses or Dokki (< 3 km)
    const nearest = defaultPlacesRepository.findNearest(30.0444, 31.2357, 10);
    expect(nearest).toBeDefined();
    expect(['cairo-ramses', 'giza-dokki']).toContain(nearest?.id);
  });
});
