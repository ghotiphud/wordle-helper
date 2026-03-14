export interface WordleConstraints {
	correct: (string | null)[]; // 5 positions, null if unknown
	present: Set<string>; // letters that must be in the word (but not necessarily at specific positions)
	absent: Set<string>; // letters not in the word
}

export interface ParseResult {
	constraints: WordleConstraints;
	conflicts: string[]; // letters that were in both included and excluded
}

export function filterWords(words: string[], constraints: WordleConstraints): string[] {
	return words.filter((word) => {
		// Check correctly positioned letters
		for (let i = 0; i < 5; i++) {
			const correctLetter = constraints.correct[i];
			if (correctLetter && word[i] !== correctLetter) {
				return false;
			}
		}

		// Check absent letters
		for (const letter of constraints.absent) {
			if (word.includes(letter)) {
				return false;
			}
		}

		// Check present letters (must be in word)
		for (const letter of constraints.present) {
			if (!word.includes(letter)) {
				return false;
			}
		}

		return true;
	});
}

export interface LetterFrequency {
	letter: string;
	count: number;
	percentage: number;
}

export interface LetterFrequencies {
	totalWords: number;
	overallFrequencies: LetterFrequency[];
	letterRanking: string;
}

export function scoreWordsByFrequency(
	words: string[],
	letterFrequencies: LetterFrequencies
): { word: string; score: number; uniqueLetters: number }[] {
	// Create a map of letter to frequency score
	const letterScores = new Map<string, number>();
	for (const freq of letterFrequencies.overallFrequencies) {
		letterScores.set(freq.letter.toLowerCase(), freq.percentage);
	}

	// Score each word
	const scored = words.map((word) => {
		const letters = word.toLowerCase().split('');
		const uniqueLetters = new Set(letters);

		// Score is sum of letter frequencies, with bonus for unique letters
		let score = 0;
		for (const letter of uniqueLetters) {
			score += letterScores.get(letter) || 0;
		}

		return {
			word,
			score: Math.round(score * 10) / 10, // Round to 1 decimal
			uniqueLetters: uniqueLetters.size
		};
	});

	// Sort by score (descending), then by unique letter count (descending)
	return scored.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		return b.uniqueLetters - a.uniqueLetters;
	});
}

export function getEliminationWords(
	allWords: string[],
	possibleWords: string[],
	constraints: WordleConstraints,
	letterFrequencies: LetterFrequencies,
	count: number = 10
): { word: string; newLetters: string; score: number }[] {
	// Create a set of all known letters (correct + present + absent)
	const knownLetters = new Set<string>();
	for (const letter of constraints.correct) {
		if (letter) knownLetters.add(letter);
	}
	for (const letter of constraints.present) {
		knownLetters.add(letter);
	}
	for (const letter of constraints.absent) {
		knownLetters.add(letter);
	}

	// Build set of letters that appear in possible words
	const possibleLetters = new Set<string>();
	for (const word of possibleWords) {
		for (const letter of word.toLowerCase()) {
			possibleLetters.add(letter);
		}
	}

	// Create a map of letter to frequency score, only for letters in possible words
	const letterScores = new Map<string, number>();
	for (const freq of letterFrequencies.overallFrequencies) {
		const letter = freq.letter.toLowerCase();
		if (possibleLetters.has(letter)) {
			letterScores.set(letter, freq.percentage);
		}
	}

	// Score words by how many unknown common letters they contain
	const scored = allWords.map((word) => {
		const letters = word.toLowerCase().split('');
		const uniqueLetters = new Set(letters);

		// Count unknown letters and their frequencies
		const newLetters: string[] = [];
		let score = 0;

		for (const letter of uniqueLetters) {
			if (!knownLetters.has(letter)) {
				newLetters.push(letter);
				score += letterScores.get(letter) || 0;
			}
		}

		return {
			word,
			newLetters: newLetters.join(''),
			score: Math.round(score * 10) / 10,
			newLetterCount: newLetters.length
		};
	});

	// Filter words that have at least 3 new letters, then sort by score
	return scored
		.filter((w) => w.newLetterCount >= 3)
		.sort((a, b) => b.score - a.score)
		.slice(0, count);
}

export function parseConstraints(correct: string, present: string, absent: string): ParseResult {
	// Parse correct positions (e.g., "a..e." -> ['a', null, null, 'e', null])
	const correctArray: (string | null)[] = [null, null, null, null, null];
	if (correct && correct.length === 5) {
		for (let i = 0; i < 5; i++) {
			const char = correct[i];
			if (char !== '.' && char !== ' ') {
				correctArray[i] = char.toLowerCase();
			}
		}
	}

	// Parse present letters (e.g., "ab" means 'a' and 'b' must be in the word)
	const presentSet = new Set<string>();
	if (present) {
		for (const char of present.toLowerCase()) {
			if (char >= 'a' && char <= 'z') {
				presentSet.add(char);
			}
		}
	}

	// Parse absent letters
	const absentSet = new Set<string>();
	if (absent) {
		for (const char of absent.toLowerCase()) {
			if (char >= 'a' && char <= 'z') {
				absentSet.add(char);
			}
		}
	}

	// Find and remove letters that are both present/absent (can't be both)
	// A letter in "correct" or "present" takes precedence over "absent"
	const conflicts: string[] = [];
	for (const letter of presentSet) {
		if (absentSet.has(letter)) {
			conflicts.push(letter);
			absentSet.delete(letter);
		}
	}
	for (let i = 0; i < 5; i++) {
		const letter = correctArray[i];
		if (letter && absentSet.has(letter)) {
			conflicts.push(letter);
			absentSet.delete(letter);
		}
	}

	return {
		constraints: {
			correct: correctArray,
			present: presentSet,
			absent: absentSet
		},
		conflicts
	};
}
