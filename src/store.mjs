import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './config.mjs';

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function comparisonKey(result) {
  return [result.hotelId, result.sourceId, result.checkIn, result.nights, result.roomType, result.mealPlan, result.cancellationPolicy].join('|');
}

export function attachChanges(results, previous) {
  const oldVerified = new Map(
    (previous?.results || []).filter((item) => item.status === 'VERIFIED').map((item) => [comparisonKey(item), item])
  );
  return results.map((result) => {
    if (result.status !== 'VERIFIED') return result;
    const old = oldVerified.get(comparisonKey(result));
    if (!old || old.currency !== result.currency) return { ...result, previousAmount: null, changeAmount: null, changePercent: null };
    const changeAmount = result.finalAmount - old.finalAmount;
    return {
      ...result,
      previousAmount: old.finalAmount,
      changeAmount,
      changePercent: old.finalAmount === 0 ? null : (changeAmount / old.finalAmount) * 100
    };
  });
}

export async function saveSnapshot(snapshot) {
  const dataDirectory = path.join(ROOT, 'data');
  const historyDirectory = path.join(dataDirectory, 'history');
  await mkdir(historyDirectory, { recursive: true });
  const previous = await readJsonIfExists(path.join(dataDirectory, 'latest.json'));
  snapshot.results = attachChanges(snapshot.results, previous);
  const stamp = snapshot.runStartedAt.replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
  await Promise.all([
    writeFile(path.join(dataDirectory, 'latest.json'), `${JSON.stringify(snapshot, null, 2)}\n`),
    writeFile(path.join(historyDirectory, `${stamp}.json`), `${JSON.stringify(snapshot, null, 2)}\n`)
  ]);
  return snapshot;
}
