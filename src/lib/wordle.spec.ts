import { describe, it, expect } from 'vitest';
import {
	filterWords,
	parseConstraints,
	getEliminationWords,
	type LetterFrequencies
} from './wordle';

describe('parseConstraints', () => {
	it('should parse correct positions', () => {
		const result = parseConstraints('a..e.', '', '');
		expect(result.constraints.correct).toEqual(['a', null, null, 'e', null]);
		expect(result.conflicts).toEqual([]);
	});

	it('should parse present letters', () => {
		const result = parseConstraints('', 'ab', '');
		expect(result.constraints.present).toEqual(new Set(['a', 'b']));
	});

	it('should parse absent letters', () => {
		const result = parseConstraints('', '', 'xyz');
		expect(result.constraints.absent).toEqual(new Set(['x', 'y', 'z']));
	});

	it('should handle empty inputs', () => {
		const result = parseConstraints('', '', '');
		expect(result.constraints.correct).toEqual([null, null, null, null, null]);
		expect(result.constraints.present.size).toBe(0);
		expect(result.constraints.absent.size).toBe(0);
	});
});

describe('filterWords', () => {
	const testWords = ['apple', 'beach', 'crane', 'dream', 'eagle'];

	it('should filter by correct positions', () => {
		const constraints = {
			correct: ['a', null, null, null, null] as (string | null)[],
			present: new Set<string>(),
			absent: new Set<string>()
		};
		const result = filterWords(testWords, constraints);
		expect(result).toEqual(['apple']);
	});

	it('should filter by absent letters', () => {
		const constraints = {
			correct: [null, null, null, null, null] as (string | null)[],
			present: new Set<string>(),
			absent: new Set<string>(['x'])
		};
		const result = filterWords(testWords, constraints);
		// All words should pass since none have 'x'
		expect(result).toEqual(testWords);
	});

	it('should filter by present letters', () => {
		const constraints = {
			correct: [null, null, null, null, null] as (string | null)[],
			present: new Set<string>(['a']),
			absent: new Set<string>()
		};
		const result = filterWords(testWords, constraints);
		// Words containing 'a': apple, beach, crane, dream, eagle
		expect(result).toEqual(['apple', 'beach', 'crane', 'dream', 'eagle']);
	});

	it('should combine multiple constraints', () => {
		const constraints = {
			correct: [null, 'r', null, null, null] as (string | null)[],
			present: new Set<string>(['e']),
			absent: new Set<string>(['z'])
		};
		const result = filterWords(testWords, constraints);
		// crane: 'r' at pos 1, contains 'e' ✓
		// dream: 'r' at pos 1, contains 'e' ✓
		expect(result).toEqual(['crane', 'dream']);
	});

	it('should return empty array when no words match', () => {
		const constraints = {
			correct: ['z', 'z', 'z', 'z', 'z'] as (string | null)[],
			present: new Set<string>(),
			absent: new Set<string>()
		};
		const result = filterWords(testWords, constraints);
		expect(result).toEqual([]);
	});

	it('should not allow letters to be both present and absent', () => {
		// If 'a' is in present, it should be removed from absent
		const result = parseConstraints('', 'a', 'ab');
		expect(result.constraints.present).toEqual(new Set(['a']));
		expect(result.constraints.absent).toEqual(new Set(['b'])); // 'a' removed from absent
		expect(result.conflicts).toEqual(['a']);
	});

	it('should not allow correct letters to be absent', () => {
		// If 'a' is in correct position, it should be removed from absent
		const result = parseConstraints('a....', '', 'ab');
		expect(result.constraints.correct).toEqual(['a', null, null, null, null]);
		expect(result.constraints.absent).toEqual(new Set(['b'])); // 'a' removed from absent
		expect(result.conflicts).toEqual(['a']);
	});
});

describe('getEliminationWords', () => {
	const testWords = ['apple', 'beach', 'crane', 'dream', 'eagle'];
	const mockFrequencies: LetterFrequencies = {
		totalWords: 2315,
		overallFrequencies: [
			{ letter: 'E', count: 1233, percentage: 10.7 },
			{ letter: 'A', count: 979, percentage: 8.5 },
			{ letter: 'R', count: 899, percentage: 7.8 },
			{ letter: 'O', count: 754, percentage: 6.5 },
			{ letter: 'T', count: 729, percentage: 6.3 }
		],
		letterRanking: 'EAROT'
	};

	it('should suggest words with many unknown common letters', () => {
		const constraints = {
			correct: [null, null, null, null, null] as (string | null)[],
			present: new Set<string>(),
			absent: new Set<string>(['a']) // 'a' is already known to be absent
		};
		// possibleWords determines which letters are considered for scoring
		const possibleWords = ['beach', 'crane', 'dream'];
		const result = getEliminationWords(testWords, possibleWords, constraints, mockFrequencies, 10);

		// Should prefer words without 'a'
		expect(result.length).toBeGreaterThan(0);
		// All results should have at least 3 new letters (newLetters string length)
		for (const word of result) {
			expect(word.newLetters.length).toBeGreaterThanOrEqual(3);
		}
	});

	it('should return empty array when no words have enough new letters', () => {
		const constraints = {
			correct: [null, null, null, null, null] as (string | null)[],
			present: new Set<string>(['a', 'b', 'c', 'd', 'e']),
			absent: new Set<string>()
		};
		const possibleWords = ['apple'];
		const result = getEliminationWords(['apple'], possibleWords, constraints, mockFrequencies, 10);
		expect(result).toEqual([]);
	});
});
