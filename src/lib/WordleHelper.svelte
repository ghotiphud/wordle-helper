<script lang="ts">
	import {
		filterWords,
		parseConstraints,
		scoreWordsByFrequency,
		getEliminationWords,
		type LetterFrequencies
	} from '$lib/wordle';

	let validWords: string[] = [];
	let wordBank: string[] = [];
	let filteredWords: string[] = [];
	let suggestedWords: { word: string; score: number; uniqueLetters: number }[] = [];
	let eliminationWords: { word: string; newLetters: string; score: number }[] = [];
	let letterFrequencies: LetterFrequencies | null = null;
	let loading = true;

	// Input bindings
	let correctLetters = ['', '', '', '', ''];
	let presentInput = '';
	let absentInput = '';

	// Handle input in letter boxes
	function handleLetterInput(index: number, event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value.slice(-1); // Take only the last character

		correctLetters[index] = value;
		correctLetters = correctLetters; // Trigger reactivity

		// Move to next box if a letter was entered
		if (value && index < 4) {
			const nextInput = document.getElementById(`letter-${index + 1}`) as HTMLInputElement;
			nextInput?.focus();
		}

		handleInput();
	}

	// Handle keydown for backspace navigation
	function handleLetterKeydown(index: number, event: KeyboardEvent) {
		if (event.key === 'Backspace' && !correctLetters[index] && index > 0) {
			// Move to previous box on backspace if current is empty
			const prevInput = document.getElementById(`letter-${index - 1}`) as HTMLInputElement;
			prevInput?.focus();
		}
	}

	// Load words on mount
	async function loadWords() {
		try {
			const [validRes, bankRes, freqRes] = await Promise.all([
				fetch('valid-words.csv'),
				fetch('word-bank.csv'),
				fetch('letter-frequencies.json')
			]);

			const validText = await validRes.text();
			const bankText = await bankRes.text();
			letterFrequencies = await freqRes.json();

			validWords = validText
				.trim()
				.split('\n')
				.map((w) => w.trim().toLowerCase());
			wordBank = bankText
				.trim()
				.split('\n')
				.map((w) => w.trim().toLowerCase());

			updateFilteredWords();
		} catch (error) {
			console.error('Failed to load words:', error);
		} finally {
			loading = false;
		}
	}

	function updateFilteredWords() {
		// Compute correctInput from correctLetters immediately (don't rely on reactive $:)
		const currentCorrectInput = correctLetters.map((l) => l.toLowerCase() || '.').join('');
		const result = parseConstraints(currentCorrectInput, presentInput, absentInput);

		// Filter word bank and valid words separately
		const filteredWordBank = filterWords(wordBank, result.constraints);
		const filteredValidWords = filterWords(validWords, result.constraints);

		// Combine for display and remove duplicates
		filteredWords = [...new Set([...filteredWordBank, ...filteredValidWords])];

		// Score and rank suggestions by letter frequency - only use word bank
		if (letterFrequencies && filteredWordBank.length > 0) {
			suggestedWords = scoreWordsByFrequency(filteredWordBank, letterFrequencies).slice(0, 10);
		} else {
			suggestedWords = [];
		}

		// Get elimination words - always use ALL words from both sources
		// Filter letter scores by letters in filteredWordBank (possible solutions)
		if (letterFrequencies) {
			const allWords = [...wordBank, ...validWords];

			// Build constraints from letters that appear in filteredWordBank
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const wordBankLetters = new Set<string>();
			for (const word of filteredWordBank) {
				for (const letter of word) {
					wordBankLetters.add(letter);
				}
			}

			eliminationWords = getEliminationWords(
				[...new Set(allWords)],
				filteredWordBank,
				result.constraints,
				letterFrequencies,
				10
			);
		} else {
			eliminationWords = [];
		}
	}

	function handleInput() {
		updateFilteredWords();
	}

	function clearAll() {
		correctLetters = ['', '', '', '', ''];
		presentInput = '';
		absentInput = '';
		updateFilteredWords();
	}

	// Load words when component mounts
	loadWords();
</script>

<div class="wordle-helper">
	<h1>Wordle Helper</h1>

	{#if loading}
		<p>Loading word lists...</p>
	{:else}
		<div class="inputs">
			<div class="input-group">
				<span class="input-label">Correct positions</span>
				<div class="letter-boxes" role="group" aria-label="Correct positions">
					{#each correctLetters as letter, index (index)}
						<input
							id="letter-{index}"
							type="text"
							maxlength="1"
							value={letter}
							on:input={(e) => handleLetterInput(index, e)}
							on:keydown={(e) => handleLetterKeydown(index, e)}
							class="letter-box"
						/>
					{/each}
				</div>
				<small>Type letters in the correct positions, leave empty for unknown</small>
			</div>

			<div class="input-group">
				<label for="present">Present letters (e.g., "ab")</label>
				<input
					id="present"
					type="text"
					bind:value={presentInput}
					on:input={handleInput}
					placeholder="ab"
				/>
				<small>Letters that must be in the word (but position is unknown)</small>
			</div>

			<div class="input-group">
				<label for="absent">Absent letters (e.g., "xyz")</label>
				<input
					id="absent"
					type="text"
					bind:value={absentInput}
					on:input={handleInput}
					placeholder="xyz"
				/>
			</div>
		</div>

		<button class="clear-btn" on:click={clearAll}>Clear All</button>

		{#if suggestedWords.length > 0}
			<div class="results suggestions">
				<h3>Top Suggestions ({suggestedWords.length})</h3>
				<div class="word-list">
					{#each suggestedWords as { word, score } (word)}
						<span class="word suggestion-word">{word} <small>({score})</small></span>
					{/each}
				</div>
			</div>
		{/if}

		{#if eliminationWords.length > 0}
			<div class="results elimination">
				<h3>Elimination Words ({eliminationWords.length})</h3>
				<div class="word-list">
					{#each eliminationWords as { word, newLetters } (word)}
						<span class="word elimination-word">{word} <small>({newLetters})</small></span>
					{/each}
				</div>
			</div>
		{/if}

		<div class="results">
			<h3>Matching Words ({filteredWords.length})</h3>
			{#if filteredWords.length > 0}
				<div class="word-list">
					{#each filteredWords.slice(0, 100) as word (word)}
						<span class="word">{word}</span>
					{/each}
					{#if filteredWords.length > 100}
						<span class="more">...and {filteredWords.length - 100} more</span>
					{/if}
				</div>
			{:else}
				<p class="no-results">No words match your criteria</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.wordle-helper {
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
	}

	.inputs {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.input-group label,
	.input-group .input-label {
		font-weight: bold;
		color: #333;
	}

	.input-group input {
		padding: 0.5rem;
		font-size: 1rem;
		border: 2px solid #d3d6da;
		border-radius: 4px;
		font-family: monospace;
	}

	.input-group input:focus {
		outline: none;
		border-color: #6aaa64;
	}

	.letter-boxes {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.letter-box {
		width: 3rem;
		height: 3rem;
		font-size: 1.5rem;
		text-align: center;
		text-transform: uppercase;
		font-weight: bold;
		border: 2px solid #d3d6da;
		border-radius: 4px;
		background-color: white;
	}

	.letter-box:focus {
		outline: none;
		border-color: #6aaa64;
		background-color: #f0f0f0;
	}

	.input-group small {
		color: #666;
		font-size: 0.8rem;
	}

	.clear-btn {
		background-color: #787c7e;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		margin-bottom: 1.5rem;
	}

	.clear-btn:hover {
		background-color: #5c5f61;
	}

	.results {
		background-color: #f6f7f8;
		padding: 1rem;
		border-radius: 8px;
	}

	.results h3 {
		margin-top: 0;
		color: #333;
	}

	.word-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.word {
		background-color: #6aaa64;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-family: monospace;
		font-size: 1.1rem;
	}

	.more {
		color: #666;
		font-style: italic;
		align-self: center;
	}

	.no-results {
		color: #787c7e;
		font-style: italic;
	}

	.suggestions {
		background-color: #e8f5e9;
		border: 2px solid #6aaa64;
	}

	.suggestions h3 {
		color: #2e7d32;
	}

	.suggestion-word {
		background-color: #2e7d32;
	}

	.suggestion-word small {
		font-size: 0.75rem;
		opacity: 0.8;
	}

	.elimination {
		background-color: #fff3e0;
		border: 2px solid #ff9800;
	}

	.elimination h3 {
		color: #e65100;
	}

	.elimination-word {
		background-color: #e65100;
	}

	.elimination-word small {
		font-size: 0.75rem;
		opacity: 0.9;
		text-transform: uppercase;
	}
</style>
