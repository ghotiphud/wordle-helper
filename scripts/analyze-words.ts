#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wordBankPath = join(__dirname, '..', 'static', 'word-bank.csv');
const outputPath = join(__dirname, '..', 'static', 'letter-frequencies.json');

const words = readFileSync(wordBankPath, 'utf-8')
	.trim()
	.split('\n')
	.map((w) => w.trim().toLowerCase());

// Count letter frequencies
const letterCounts = new Map<string, number>();
const positionCounts = Array.from({ length: 5 }, () => new Map<string, number>());

for (const word of words) {
	for (let i = 0; i < word.length; i++) {
		const letter = word[i];
		// Overall frequency
		letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
		// Position-specific frequency
		positionCounts[i].set(letter, (positionCounts[i].get(letter) || 0) + 1);
	}
}

// Sort by frequency
const sortedLetters = Array.from(letterCounts.entries()).sort((a, b) => b[1] - a[1]);

console.log(`Word Bank Analysis: ${words.length} words\n`);

console.log('Overall Letter Frequencies:');
console.log('===========================');
for (const [letter, count] of sortedLetters) {
	const percentage = ((count / (words.length * 5)) * 100).toFixed(1);
	const bar = '█'.repeat(Math.round(count / 50));
	console.log(
		`${letter.toUpperCase()}: ${count.toString().padStart(4)} (${percentage.padStart(4)}%) ${bar}`
	);
}

console.log('\n\nPosition-Specific Frequencies:');
console.log('=============================');
for (let pos = 0; pos < 5; pos++) {
	console.log(`\nPosition ${pos + 1}:`);
	const sortedPos = Array.from(positionCounts[pos].entries()).sort((a, b) => b[1] - a[1]);
	for (const [letter, count] of sortedPos.slice(0, 10)) {
		const percentage = ((count / words.length) * 100).toFixed(1);
		console.log(
			`  ${letter.toUpperCase()}: ${count.toString().padStart(4)} (${percentage.padStart(4)}%)`
		);
	}
}

// Best starting words (most common letters)
console.log('\n\nLetter Frequency Ranking:');
console.log('=========================');
const ranking = sortedLetters.map(([letter]) => letter.toUpperCase()).join('');
console.log(ranking);

// Prepare JSON output
const jsonOutput = {
	totalWords: words.length,
	overallFrequencies: sortedLetters.map(([letter, count]) => ({
		letter: letter.toUpperCase(),
		count,
		percentage: parseFloat(((count / (words.length * 5)) * 100).toFixed(1))
	})),
	positionFrequencies: positionCounts.map((posMap, index) => ({
		position: index + 1,
		letters: Array.from(posMap.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([letter, count]) => ({
				letter: letter.toUpperCase(),
				count,
				percentage: parseFloat(((count / words.length) * 100).toFixed(1))
			}))
	})),
	letterRanking: ranking
};

// Write to JSON file
writeFileSync(outputPath, JSON.stringify(jsonOutput, null, 2));
console.log(`\n\nJSON output written to: ${outputPath}`);
