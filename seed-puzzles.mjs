import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const samplePuzzles = [
  {
    date: '2025-11-01',
    question: 'I have cities but no houses, forests but no trees, and water but no fish. What am I?',
    type: 'riddle',
    answer: 'map',
    location: 'The Great Wall of China',
    latitude: '40.4319',
    longitude: '116.5704',
    hint: 'Think about something you use for navigation'
  },
  {
    date: '2025-11-02',
    question: 'What has hands but cannot clap?',
    type: 'riddle',
    answer: 'clock',
    location: 'Big Ben, London',
    latitude: '51.4975',
    longitude: '-0.1357',
    hint: 'It tells you the time'
  },
  {
    date: '2025-11-03',
    question: 'What can travel around the world while staying in a corner?',
    type: 'riddle',
    answer: 'stamp',
    location: 'Statue of Liberty, New York',
    latitude: '40.6892',
    longitude: '-74.0445',
    hint: 'You put it on mail'
  },
  {
    date: '2025-11-04',
    question: 'What gets wet while drying?',
    type: 'riddle',
    answer: 'towel',
    location: 'Niagara Falls, Canada',
    latitude: '43.0896',
    longitude: '-79.0849',
    hint: 'You use it after a bath'
  },
  {
    date: '2025-11-05',
    question: 'What has a head and a tail but no body?',
    type: 'riddle',
    answer: 'coin',
    location: 'Colosseum, Rome',
    latitude: '41.8902',
    longitude: '12.4924',
    hint: 'You flip it to make decisions'
  },
  {
    date: '2025-11-06',
    question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?',
    type: 'riddle',
    answer: 'echo',
    location: 'Grand Canyon, Arizona',
    latitude: '36.1069',
    longitude: '-112.1129',
    hint: 'You hear it in mountains'
  },
  {
    date: '2025-11-07',
    question: 'What has a neck but no head?',
    type: 'riddle',
    answer: 'bottle',
    location: 'Eiffel Tower, Paris',
    latitude: '48.8584',
    longitude: '2.2945',
    hint: 'You drink from it'
  },
  {
    date: '2025-11-08',
    question: 'What can run but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?',
    type: 'riddle',
    answer: 'river',
    location: 'Amazon Rainforest, Brazil',
    latitude: '-3.4653',
    longitude: '-62.2159',
    hint: 'It flows through nature'
  },
];

try {
  for (const puzzle of samplePuzzles) {
    await connection.execute(
      `INSERT INTO puzzles (date, question, type, answer, location, latitude, longitude, hint) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        puzzle.date,
        puzzle.question,
        puzzle.type,
        puzzle.answer,
        puzzle.location,
        puzzle.latitude,
        puzzle.longitude,
        puzzle.hint
      ]
    );
    console.log(`✓ Added puzzle for ${puzzle.date}`);
  }
  console.log('\n✓ All puzzles seeded successfully!');
} catch (error) {
  console.error('Error seeding puzzles:', error);
} finally {
  await connection.end();
}
