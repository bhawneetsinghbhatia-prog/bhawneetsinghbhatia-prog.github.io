import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './config.mjs';

function flags(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index].startsWith('--')) values[argv[index].slice(2)] = argv[index + 1];
  }
  return values;
}

function slug(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const args = flags(process.argv.slice(2));
if (!args.name || !args['official-url']) {
  console.error('Usage: npm run add-hotel -- --name "Hotel Name" --official-url "https://..." [--booking-url "https://..."] [--location "City, State, Country"]');
  process.exit(1);
}
const filePath = path.join(ROOT, 'config', 'hotels.json');
const hotels = JSON.parse(await readFile(filePath, 'utf8'));
const id = slug(args.name);
if (hotels.some((hotel) => hotel.id === id)) throw new Error(`Hotel already exists: ${id}`);
hotels.push({
  id,
  name: args.name,
  location: args.location || 'Udaipur, Rajasthan, India',
  enabled: true,
  officialUrl: args['official-url'],
  bookingUrl: args['booking-url'] || args['official-url']
});
await writeFile(filePath, `${JSON.stringify(hotels, null, 2)}\n`);
console.log(`Added ${args.name} to config/hotels.json`);
