import { kv } from "@vercel/kv";

export const STATUSES = ["New", "Under review", "Planned", "Done", "Declined"];
export const CATEGORIES = ["New feature", "Improvement", "Other"];

const LIST = "solosafe:suggestions";
const rec = (id) => `solosafe:sug:${id}`;
const votesKey = (id) => `solosafe:sug:${id}:votes`;
const commentsKey = (id) => `solosafe:sug:${id}:comments`;
const commentRec = (cid) => `solosafe:sugc:${cid}`;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function load(id, me) {
  const [record, votes, cids] = await Promise.all([kv.get(rec(id)), kv.hgetall(votesKey(id)), kv.lrange(commentsKey(id), 0, -1)]);
  if (!record) return null;
  const comments = (await Promise.all((cids || []).map((cid) => kv.get(commentRec(cid))))).filter(Boolean);
  const tally = Object.values(votes || {}).map(Number);
  return {
    ...record,
    up: tally.filter((v) => v === 1).length,
    down: tally.filter((v) => v === -1).length,
    myVote: Number((votes || {})[me]) || 0,
    comments,
  };
}

export async function listSuggestions(me) {
  const ids = await kv.lrange(LIST, 0, -1);
  const all = await Promise.all((ids || []).map((id) => load(id, me)));
  return all.filter(Boolean);
}

export async function getSuggestion(id, me) {
  return load(String(id), me);
}

export async function createSuggestion({ name, title, body, category }) {
  const record = {
    id: newId(),
    name,
    title,
    body,
    category,
    status: "New",
    createdAt: new Date().toISOString(),
  };
  await kv.set(rec(record.id), record);
  await kv.lpush(LIST, record.id);
  return record;
}

export async function addComment(suggestionId, { name, text }) {
  const comment = { id: newId(), suggestionId, name, text, createdAt: new Date().toISOString() };
  await kv.set(commentRec(comment.id), comment);
  await kv.rpush(commentsKey(suggestionId), comment.id);
  return comment;
}

export async function getComment(cid) {
  return (await kv.get(commentRec(cid))) || null;
}

export async function deleteComment(suggestionId, cid) {
  await kv.lrem(commentsKey(suggestionId), 0, cid);
  await kv.del(commentRec(cid));
}

// value: 1 (good idea), -1 (not needed), 0 (remove my vote)
export async function setVote(id, name, value) {
  if (value === 0) await kv.hdel(votesKey(id), name);
  else await kv.hset(votesKey(id), { [name]: value });
}

export async function setStatus(id, status) {
  const record = await kv.get(rec(id));
  if (!record) return null;
  const next = { ...record, status };
  await kv.set(rec(id), next);
  return next;
}

export async function deleteSuggestion(id) {
  const cids = await kv.lrange(commentsKey(id), 0, -1);
  await Promise.all((cids || []).map((cid) => kv.del(commentRec(cid))));
  await Promise.all([kv.del(rec(id)), kv.del(votesKey(id)), kv.del(commentsKey(id)), kv.lrem(LIST, 0, id)]);
}
