/*
 * Lookit LWL 48-Trial Generator
 *
 * WORDS:
 * balloon, cap, sheet, glasses, collar, horn
 *
 * BLOCKS:
 * 1. Conventional: 24 trials
 *    - balloon1.png vs yokedWord1.png
 *    - balloon2.png vs yokedWord2.png
 *    - each image pairing occurs twice
 *
 * 2. Novel extension: 12 trials
 *    - balloon-ext.png vs yokedWord-ext.png
 *    - each word occurs twice
 *
 * 3. Challenge: 12 trials
 *    - balloon1.png vs balloon-ext.png
 *    - balloon2.png vs balloon-ext.png
 *
 * FEATURES:
 * - Six counterbalanced block orders
 * - Randomized trial order within each block
 * - One-to-one yoked foil assignment
 * - No word is yoked to itself
 * - Reproducible randomization
 * - Exact left/right target balance in every block
 */

export const WORDS = [
  "balloon",
  "cap",
  "sheet",
  "glasses",
  "collar",
  "horn"
];

/*
 * The filenames are generated automatically from each word.
 *
 * For example:
 *
 * balloon:
 *   balloon1.png
 *   balloon2.png
 *   balloon-ext.png
 *   balloon.mp3
 */
export const STIMULI = Object.fromEntries(
  WORDS.map((word) => [
    word,
    {
      conventional: [
        `${word}1.png`,
        `${word}2.png`
      ],
      extension: `${word}-ext.png`,
      audio: `${word}.mp3`
    }
  ])
);

/*
 * All six possible orders of the three condition blocks.
 */
export const CONDITION_ORDERS = [
  [
    "conventional",
    "novel_extension",
    "challenge"
  ],
  [
    "conventional",
    "challenge",
    "novel_extension"
  ],
  [
    "novel_extension",
    "conventional",
    "challenge"
  ],
  [
    "novel_extension",
    "challenge",
    "conventional"
  ],
  [
    "challenge",
    "conventional",
    "novel_extension"
  ],
  [
    "challenge",
    "novel_extension",
    "conventional"
  ]
];

/*
 * Seeded random-number generator.
 *
 * Using the same seed produces the same trial order, yoking,
 * and target-side assignments.
 */
export function mulberry32(seed) {
  let value = seed >>> 0;

  return function random() {
    value += 0x6D2B79F5;

    let result = value;

    result = Math.imul(
      result ^ (result >>> 15),
      result | 1
    );

    result ^= result + Math.imul(
      result ^ (result >>> 7),
      result | 61
    );

    return (
      (result ^ (result >>> 14)) >>> 0
    ) / 4294967296;
  };
}

/*
 * Convert a participant identifier into a stable number.
 *
 * Numeric participant IDs remain numeric.
 * Text participant IDs are converted to a numeric hash.
 */
export function participantIdToNumber(participantId) {
  const text = String(
    participantId ?? "0"
  ).trim();

  if (/^\d+$/.test(text)) {
    return Number(text) >>> 0;
  }

  let hash = 2166136261;

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/*
 * Fisher-Yates shuffle.
 */
export function shuffle(
  items,
  random = Math.random
) {
  const output = [...items];

  for (
    let index = output.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex = Math.floor(
      random() * (index + 1)
    );

    [
      output[index],
      output[swapIndex]
    ] = [
      output[swapIndex],
      output[index]
    ];
  }

  return output;
}

/*
 * Create a one-to-one yoked foil assignment.
 *
 * Each word receives exactly one other word as its foil.
 * Every word is used exactly once as a foil.
 * No word is paired with itself.
 *
 * Example:
 *
 * {
 *   balloon: "collar",
 *   cap: "horn",
 *   sheet: "glasses",
 *   glasses: "balloon",
 *   collar: "cap",
 *   horn: "sheet"
 * }
 */
export function createYoking(
  words = WORDS,
  random = Math.random
) {
  if (words.length < 2) {
    throw new Error(
      "At least two words are required."
    );
  }

  let foilWords;

  do {
    foilWords = shuffle(words, random);
  } while (
    foilWords.some(
      (foilWord, index) =>
        foilWord === words[index]
    )
  );

  return Object.fromEntries(
    words.map(
      (word, index) => [
        word,
        foilWords[index]
      ]
    )
  );
}

/*
 * Assign exactly half of the targets to the left and
 * half to the right.
 *
 * Conventional:
 *   12 left, 12 right
 *
 * Novel extension:
 *   6 left, 6 right
 *
 * Challenge:
 *   6 left, 6 right
 */
function assignBalancedSides(
  trials,
  random = Math.random
) {
  if (trials.length % 2 !== 0) {
    throw new Error(
      `Cannot exactly balance ${trials.length} trials.`
    );
  }

  const half = trials.length / 2;

  const targetSides = shuffle(
    [
      ...Array(half).fill("left"),
      ...Array(half).fill("right")
    ],
    random
  );

  return trials.map(
    (trial, index) => {
      const targetSide =
        targetSides[index];

      const targetIsLeft =
        targetSide === "left";

      return {
        ...trial,

        targetSide,

        leftImage: targetIsLeft
          ? trial.targetImage
          : trial.foilImage,

        rightImage: targetIsLeft
          ? trial.foilImage
          : trial.targetImage
      };
    }
  );
}

/*
 * Generate the 24 conventional trials.
 *
 * Each word has:
 *
 * word1.png vs yokedWord1.png
 * word2.png vs yokedWord2.png
 *
 * Each pairing occurs twice.
 *
 * 6 words × 2 images × 2 repetitions = 24 trials
 */
export function generateConventionalBlock({
  stimuli = STIMULI,
  yoking,
  random = Math.random
} = {}) {
  const resolvedYoking =
    yoking ?? createYoking(WORDS, random);

  const trials = [];

  for (const word of WORDS) {
    const foilWord =
      resolvedYoking[word];

    stimuli[word].conventional.forEach(
      (targetImage, imageIndex) => {
        const foilImage =
          stimuli[foilWord]
            .conventional[imageIndex];

        for (
          let repetition = 1;
          repetition <= 2;
          repetition += 1
        ) {
          trials.push({
            condition: "conventional",

            word,
            audio: stimuli[word].audio,

            targetImage,
            targetType: "conventional",

            foilWord,
            foilImage,
            foilType: "conventional",

            conventionalImageNumber:
              imageIndex + 1,

            repetition
          });
        }
      }
    );
  }

  const randomizedTrials =
    shuffle(trials, random);

  return assignBalancedSides(
    randomizedTrials,
    random
  );
}

/*
 * Generate the 12 novel-extension trials.
 *
 * Each trial pairs:
 *
 * word-ext.png vs yokedWord-ext.png
 *
 * Each word occurs twice.
 *
 * 6 words × 2 repetitions = 12 trials
 */
export function generateNovelExtensionBlock({
  stimuli = STIMULI,
  yoking,
  random = Math.random
} = {}) {
  const resolvedYoking =
    yoking ?? createYoking(WORDS, random);

  const trials = [];

  for (const word of WORDS) {
    const foilWord =
      resolvedYoking[word];

    for (
      let repetition = 1;
      repetition <= 2;
      repetition += 1
    ) {
      trials.push({
        condition: "novel_extension",

        word,
        audio: stimuli[word].audio,

        targetImage:
          stimuli[word].extension,

        targetType: "extension",

        foilWord,

        foilImage:
          stimuli[foilWord].extension,

        foilType: "extension",

        repetition
      });
    }
  }

  const randomizedTrials =
    shuffle(trials, random);

  return assignBalancedSides(
    randomizedTrials,
    random
  );
}

/*
 * Generate the 12 challenge trials.
 *
 * Each word receives:
 *
 * word1.png vs word-ext.png
 * word2.png vs word-ext.png
 *
 * challengeTarget controls which image is the target:
 *
 * "conventional":
 *   word1.png or word2.png is the target
 *   word-ext.png is the foil
 *
 * "extension":
 *   word-ext.png is the target
 *   word1.png or word2.png is the foil
 *
 * 6 words × 2 conventional images = 12 trials
 */
export function generateChallengeBlock({
  stimuli = STIMULI,
  random = Math.random,
  challengeTarget = "conventional"
} = {}) {
  if (
    challengeTarget !== "conventional" &&
    challengeTarget !== "extension"
  ) {
    throw new Error(
      'challengeTarget must be "conventional" or "extension".'
    );
  }

  const trials = [];

  for (const word of WORDS) {
    stimuli[word].conventional.forEach(
      (
        conventionalImage,
        imageIndex
      ) => {
        const conventionalIsTarget =
          challengeTarget ===
          "conventional";

        const targetImage =
          conventionalIsTarget
            ? conventionalImage
            : stimuli[word].extension;

        const foilImage =
          conventionalIsTarget
            ? stimuli[word].extension
            : conventionalImage;

        trials.push({
          condition: "challenge",

          word,
          audio: stimuli[word].audio,

          targetImage,

          targetType:
            conventionalIsTarget
              ? "conventional"
              : "extension",

          foilWord: word,
          foilImage,

          foilType:
            conventionalIsTarget
              ? "extension"
              : "conventional",

          conventionalImageNumber:
            imageIndex + 1,

          repetition: 1
        });
      }
    );
  }

  const randomizedTrials =
    shuffle(trials, random);

  return assignBalancedSides(
    randomizedTrials,
    random
  );
}

/*
 * Create the complete 48-trial experiment.
 *
 * participantId:
 *   Used to select one of the six block orders.
 *   It is also used as the default randomization seed.
 *
 * options:
 *
 * seed:
 *   Optional numeric seed. Supply this to reproduce a
 *   particular randomization exactly.
 *
 * challengeTarget:
 *   "conventional" or "extension"
 *
 * reuseYokingAcrossBlocks:
 *   true:
 *     Conventional and novel-extension blocks use the
 *     same yoked word pairings.
 *
 *   false:
 *     Conventional and novel-extension blocks receive
 *     separate yoked assignments.
 */
export function createParticipantTrials(
  participantId,
  {
    seed,
    challengeTarget = "conventional",
    reuseYokingAcrossBlocks = true
  } = {}
) {
  const participantNumber =
    participantIdToNumber(participantId);

  const resolvedSeed =
    Number.isInteger(seed)
      ? seed
      : participantNumber;

  const random =
    mulberry32(resolvedSeed);

  const blockOrderIndex =
    participantNumber %
    CONDITION_ORDERS.length;

  const blockOrder =
    CONDITION_ORDERS[
      blockOrderIndex
    ];

  const sharedYoking =
    createYoking(WORDS, random);

  const conventionalYoking =
    reuseYokingAcrossBlocks
      ? sharedYoking
      : createYoking(WORDS, random);

  const extensionYoking =
    reuseYokingAcrossBlocks
      ? sharedYoking
      : createYoking(WORDS, random);

  const blocks = {
    conventional:
      generateConventionalBlock({
        stimuli: STIMULI,
        yoking: conventionalYoking,
        random
      }),

    novel_extension:
      generateNovelExtensionBlock({
        stimuli: STIMULI,
        yoking: extensionYoking,
        random
      }),

    challenge:
      generateChallengeBlock({
        stimuli: STIMULI,
        random,
        challengeTarget
      })
  };

  const experimentTrials = [];

  let overallTrialNumber = 1;

  blockOrder.forEach(
    (condition, blockIndex) => {
      const block = blocks[condition];

      block.forEach(
        (
          trial,
          trialWithinBlockIndex
        ) => {
          experimentTrials.push({
            ...trial,

            participantId:
              String(participantId),

            seed: resolvedSeed,

            counterbalanceVersion:
              blockOrderIndex + 1,

            blockOrder:
              [...blockOrder],

            blockNumber:
              blockIndex + 1,

            trialWithinBlock:
              trialWithinBlockIndex + 1,

            trialNumber:
              overallTrialNumber
          });

          overallTrialNumber += 1;
        }
      );
    }
  );

  validateTrialList(
    experimentTrials
  );

  return experimentTrials;
}

/*
 * Check that the generated experiment has:
 *
 * - 48 trials total
 * - 24 conventional trials
 * - 12 novel-extension trials
 * - 12 challenge trials
 * - exact left/right balance in each block
 * - no identical target and foil images
 */
export function validateTrialList(
  trials
) {
  const expectedCounts = {
    conventional: 24,
    novel_extension: 12,
    challenge: 12
  };

  if (trials.length !== 48) {
    throw new Error(
      `Expected 48 trials, received ${trials.length}.`
    );
  }

  for (
    const [
      condition,
      expectedCount
    ] of Object.entries(
      expectedCounts
    )
  ) {
    const block = trials.filter(
      (trial) =>
        trial.condition === condition
    );

    if (
      block.length !== expectedCount
    ) {
      throw new Error(
        `${condition}: expected ${expectedCount} trials, received ${block.length}.`
      );
    }

    const leftTargetCount =
      block.filter(
        (trial) =>
          trial.targetSide === "left"
      ).length;

    const rightTargetCount =
      block.filter(
        (trial) =>
          trial.targetSide === "right"
      ).length;

    if (
      leftTargetCount !==
        expectedCount / 2 ||
      rightTargetCount !==
        expectedCount / 2
    ) {
      throw new Error(
        `${condition}: target sides are not exactly balanced.`
      );
    }
  }

  for (const trial of trials) {
    if (
      trial.targetImage ===
      trial.foilImage
    ) {
      throw new Error(
        `Trial ${trial.trialNumber} has identical target and foil images.`
      );
    }
  }

  return true;
}

/*
 * Example usage:
 *
 * const trials =
 *   createParticipantTrials(
 *     "participant-101",
 *     {
 *       challengeTarget:
 *         "conventional",
 *
 *       reuseYokingAcrossBlocks:
 *         true
 *     }
 *   );
 *
 * console.log(trials);
 */

/*
 * Example of accessing one trial:
 *
 * const currentTrial =
 *   trials[currentTrialIndex];
 *
 * currentTrial.leftImage
 * currentTrial.rightImage
 * currentTrial.audio
 * currentTrial.word
 * currentTrial.condition
 * currentTrial.targetSide
 */