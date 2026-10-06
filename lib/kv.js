import { kv } from "@vercel/kv";

const LIST_KEY = "solosafe:entries";
const entryKey = (id) => `solosafe:entry:${id}`;

export async function listEntries() {
  const ids = await kv.lrange(LIST_KEY, 0, -1);
  if (!ids || ids.length === 0) return [];
  const entries = await Promise.all(ids.map((id) => kv.get(entryKey(id))));
  return entries.filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getEntry(id) {
  return (await kv.get(entryKey(String(id)))) || null;
}

export async function addEntry(entry) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record = { id, ...entry, createdAt: new Date().toISOString() };
  await kv.set(entryKey(id), record);
  await kv.lpush(LIST_KEY, id);
  return record;
}

export async function saveEntry(record) {
  await kv.set(entryKey(record.id), record);
  return record;
}

export async function deleteEntry(id) {
  await kv.del(entryKey(id));
  await kv.lrem(LIST_KEY, 0, id);
}
