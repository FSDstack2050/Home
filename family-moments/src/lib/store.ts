// Data store with Neon Postgres persistence (falls back to in-memory for local dev)

import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

// --- Interfaces ---

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  familyId: string;
  avatar: string;
  isPet: boolean;
  caretakerId?: string;
  createdAt: string;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export interface CheckIn {
  id: string;
  userId: string;
  emotion: string;
  quadrant: string;
  emoji: string;
  location: string;
  withWhom: string[];
  activity: string;
  photoUrl?: string;
  videoUrl?: string;
  voiceNoteUrl?: string;
  createdAt: string;
  reactions: Reaction[];
  comments: Comment[];
}

export interface Reaction {
  id: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface ResetToken {
  token: string;
  email: string;
  expiresAt: number;
}

// --- Database connection ---

const DB_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

function getSql(): NeonQueryFunction<false, false> | null {
  if (!DB_URL) return null;
  return neon(DB_URL);
}

let dbInitialized = false;

async function ensureDb(): Promise<NeonQueryFunction<false, false> | null> {
  const sql = getSql();
  if (!sql) return null;
  if (dbInitialized) return sql;

  await sql`CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    family_id TEXT NOT NULL REFERENCES families(id),
    avatar TEXT DEFAULT '👤',
    is_pet BOOLEAN DEFAULT FALSE,
    caretaker_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    emotion TEXT NOT NULL,
    quadrant TEXT NOT NULL,
    emoji TEXT NOT NULL,
    location TEXT NOT NULL,
    with_whom JSONB DEFAULT '[]',
    activity TEXT NOT NULL,
    photo_url TEXT,
    video_url TEXT,
    voice_note_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS reactions (
    id TEXT PRIMARY KEY,
    checkin_id TEXT NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(checkin_id, user_id)
  )`;

  await sql`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    checkin_id TEXT NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS reset_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at BIGINT NOT NULL
  )`;

  dbInitialized = true;
  return sql;
}

// --- Row converters ---

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    familyId: row.family_id as string,
    avatar: row.avatar as string,
    isPet: row.is_pet as boolean,
    caretakerId: (row.caretaker_id as string) || undefined,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

function rowToFamily(row: Record<string, unknown>): Family {
  return {
    id: row.id as string,
    name: row.name as string,
    inviteCode: row.invite_code as string,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

function rowToCheckIn(
  row: Record<string, unknown>,
  reactions: Reaction[] = [],
  comments: Comment[] = []
): CheckIn {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    emotion: row.emotion as string,
    quadrant: row.quadrant as string,
    emoji: row.emoji as string,
    location: row.location as string,
    withWhom: (row.with_whom as string[]) || [],
    activity: row.activity as string,
    photoUrl: (row.photo_url as string) || undefined,
    videoUrl: (row.video_url as string) || undefined,
    voiceNoteUrl: (row.voice_note_url as string) || undefined,
    createdAt: (row.created_at as Date).toISOString(),
    reactions,
    comments,
  };
}

function rowToReaction(row: Record<string, unknown>): Reaction {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    emoji: row.emoji as string,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

function rowToComment(row: Record<string, unknown>): Comment {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    text: row.text as string,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

// --- In-memory fallback ---

const memFamilies: Map<string, Family> = new Map();
const memUsers: Map<string, User> = new Map();
const memCheckins: Map<string, CheckIn> = new Map();
const memResetTokens: Map<string, ResetToken> = new Map();

// --- Family operations ---

export async function createFamily(name: string): Promise<Family> {
  const id = uuidv4();
  const inviteCode = uuidv4().slice(0, 8).toUpperCase();
  const createdAt = new Date().toISOString();

  const sql = await ensureDb();
  if (sql) {
    await sql`INSERT INTO families (id, name, invite_code, created_at)
      VALUES (${id}, ${name}, ${inviteCode}, ${createdAt})`;
  }

  const family: Family = { id, name, inviteCode, createdAt };
  if (!sql) memFamilies.set(id, family);
  return family;
}

export async function getFamilyByInviteCode(code: string): Promise<Family | undefined> {
  const sql = await ensureDb();
  if (sql) {
    const rows = await sql`SELECT * FROM families WHERE invite_code = ${code.toUpperCase()}`;
    return rows.length > 0 ? rowToFamily(rows[0]) : undefined;
  }
  for (const family of memFamilies.values()) {
    if (family.inviteCode === code.toUpperCase()) return family;
  }
  return undefined;
}

export async function getFamilyById(id: string): Promise<Family | undefined> {
  const sql = await ensureDb();
  if (sql) {
    const rows = await sql`SELECT * FROM families WHERE id = ${id}`;
    return rows.length > 0 ? rowToFamily(rows[0]) : undefined;
  }
  return memFamilies.get(id);
}

// --- User operations ---

export async function createUser(
  name: string,
  email: string,
  password: string,
  familyId: string,
  avatar: string = "\u{1F464}",
  isPet: boolean = false,
  caretakerId?: string
): Promise<User> {
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();

  const sql = await ensureDb();
  if (sql) {
    await sql`INSERT INTO users (id, name, email, password_hash, family_id, avatar, is_pet, caretaker_id, created_at)
      VALUES (${id}, ${name}, ${email.toLowerCase()}, ${passwordHash}, ${familyId}, ${avatar}, ${isPet}, ${caretakerId || null}, ${createdAt})`;
  }

  const user: User = {
    id, name, email: email.toLowerCase(), passwordHash, familyId, avatar, isPet, caretakerId, createdAt,
  };
  if (!sql) memUsers.set(id, user);
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const sql = await ensureDb();
  if (sql) {
    const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
    return rows.length > 0 ? rowToUser(rows[0]) : undefined;
  }
  for (const user of memUsers.values()) {
    if (user.email === email.toLowerCase()) return user;
  }
  return undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const sql = await ensureDb();
  if (sql) {
    const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
    return rows.length > 0 ? rowToUser(rows[0]) : undefined;
  }
  return memUsers.get(id);
}

export async function getFamilyMembers(familyId: string): Promise<User[]> {
  const sql = await ensureDb();
  if (sql) {
    const rows = await sql`SELECT * FROM users WHERE family_id = ${familyId}`;
    return rows.map(rowToUser);
  }
  const members: User[] = [];
  for (const user of memUsers.values()) {
    if (user.familyId === familyId) members.push(user);
  }
  return members;
}

// --- Check-in operations ---

export async function createCheckIn(data: {
  userId: string;
  emotion: string;
  quadrant: string;
  emoji: string;
  location: string;
  withWhom: string[];
  activity: string;
  photoUrl?: string;
  videoUrl?: string;
  voiceNoteUrl?: string;
}): Promise<CheckIn> {
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  const sql = await ensureDb();
  if (sql) {
    await sql`INSERT INTO checkins (id, user_id, emotion, quadrant, emoji, location, with_whom, activity, photo_url, video_url, voice_note_url, created_at)
      VALUES (${id}, ${data.userId}, ${data.emotion}, ${data.quadrant}, ${data.emoji}, ${data.location}, ${JSON.stringify(data.withWhom)}, ${data.activity}, ${data.photoUrl || null}, ${data.videoUrl || null}, ${data.voiceNoteUrl || null}, ${createdAt})`;
  }

  const checkin: CheckIn = {
    id, ...data, createdAt, reactions: [], comments: [],
  };
  if (!sql) memCheckins.set(id, checkin);
  return checkin;
}

async function loadCheckInExtras(sql: NeonQueryFunction<false, false>, checkinIds: string[]): Promise<{ reactions: Map<string, Reaction[]>; comments: Map<string, Comment[]> }> {
  const reactionsMap = new Map<string, Reaction[]>();
  const commentsMap = new Map<string, Comment[]>();

  if (checkinIds.length === 0) return { reactions: reactionsMap, comments: commentsMap };

  const reactionsRows = await sql`SELECT * FROM reactions WHERE checkin_id = ANY(${checkinIds}) ORDER BY created_at`;
  for (const row of reactionsRows) {
    const cid = row.checkin_id as string;
    if (!reactionsMap.has(cid)) reactionsMap.set(cid, []);
    reactionsMap.get(cid)!.push(rowToReaction(row));
  }

  const commentsRows = await sql`SELECT * FROM comments WHERE checkin_id = ANY(${checkinIds}) ORDER BY created_at`;
  for (const row of commentsRows) {
    const cid = row.checkin_id as string;
    if (!commentsMap.has(cid)) commentsMap.set(cid, []);
    commentsMap.get(cid)!.push(rowToComment(row));
  }

  return { reactions: reactionsMap, comments: commentsMap };
}

export async function getCheckInsByFamily(familyId: string, date?: string): Promise<CheckIn[]> {
  const sql = await ensureDb();
  if (sql) {
    let rows;
    if (date) {
      rows = await sql`
        SELECT c.* FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE u.family_id = ${familyId}
          AND c.created_at::date = ${date}::date
        ORDER BY c.created_at DESC`;
    } else {
      rows = await sql`
        SELECT c.* FROM checkins c
        JOIN users u ON c.user_id = u.id
        WHERE u.family_id = ${familyId}
        ORDER BY c.created_at DESC`;
    }
    const ids = rows.map((r) => r.id as string);
    const { reactions, comments } = await loadCheckInExtras(sql, ids);
    return rows.map((row) =>
      rowToCheckIn(row, reactions.get(row.id as string) || [], comments.get(row.id as string) || [])
    );
  }

  // In-memory fallback
  const familyUserIds = new Set(
    (await getFamilyMembers(familyId)).map((u) => u.id)
  );
  const result: CheckIn[] = [];
  for (const checkin of memCheckins.values()) {
    if (!familyUserIds.has(checkin.userId)) continue;
    if (date) {
      const checkinDate = checkin.createdAt.slice(0, 10);
      if (checkinDate !== date) continue;
    }
    result.push(checkin);
  }
  return result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getCheckInsByUser(userId: string, limit?: number): Promise<CheckIn[]> {
  const sql = await ensureDb();
  if (sql) {
    const rows = limit
      ? await sql`SELECT * FROM checkins WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}`
      : await sql`SELECT * FROM checkins WHERE user_id = ${userId} ORDER BY created_at DESC`;
    const ids = rows.map((r) => r.id as string);
    const { reactions, comments } = await loadCheckInExtras(sql, ids);
    return rows.map((row) =>
      rowToCheckIn(row, reactions.get(row.id as string) || [], comments.get(row.id as string) || [])
    );
  }

  const result: CheckIn[] = [];
  for (const checkin of memCheckins.values()) {
    if (checkin.userId === userId) result.push(checkin);
  }
  result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return limit ? result.slice(0, limit) : result;
}

export async function getCheckInById(id: string): Promise<CheckIn | undefined> {
  const sql = await ensureDb();
  if (sql) {
    const rows = await sql`SELECT * FROM checkins WHERE id = ${id}`;
    if (rows.length === 0) return undefined;
    const { reactions, comments } = await loadCheckInExtras(sql, [id]);
    return rowToCheckIn(rows[0], reactions.get(id) || [], comments.get(id) || []);
  }
  return memCheckins.get(id);
}

export async function addReaction(
  checkinId: string,
  userId: string,
  emoji: string
): Promise<Reaction | null> {
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  const sql = await ensureDb();
  if (sql) {
    // Check checkin exists
    const checkin = await sql`SELECT id FROM checkins WHERE id = ${checkinId}`;
    if (checkin.length === 0) return null;
    // Upsert: remove existing reaction from this user, then insert
    await sql`DELETE FROM reactions WHERE checkin_id = ${checkinId} AND user_id = ${userId}`;
    await sql`INSERT INTO reactions (id, checkin_id, user_id, emoji, created_at)
      VALUES (${id}, ${checkinId}, ${userId}, ${emoji}, ${createdAt})`;
    return { id, userId, emoji, createdAt };
  }

  const checkin = memCheckins.get(checkinId);
  if (!checkin) return null;
  checkin.reactions = checkin.reactions.filter((r) => r.userId !== userId);
  const reaction: Reaction = { id, userId, emoji, createdAt };
  checkin.reactions.push(reaction);
  return reaction;
}

export async function addComment(
  checkinId: string,
  userId: string,
  text: string
): Promise<Comment | null> {
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  const sql = await ensureDb();
  if (sql) {
    const checkin = await sql`SELECT id FROM checkins WHERE id = ${checkinId}`;
    if (checkin.length === 0) return null;
    await sql`INSERT INTO comments (id, checkin_id, user_id, text, created_at)
      VALUES (${id}, ${checkinId}, ${userId}, ${text}, ${createdAt})`;
    return { id, userId, text, createdAt };
  }

  const checkin = memCheckins.get(checkinId);
  if (!checkin) return null;
  const comment: Comment = { id, userId, text, createdAt };
  checkin.comments.push(comment);
  return comment;
}

// --- Streak tracking ---

export async function getStreakData(familyId: string) {
  const members = (await getFamilyMembers(familyId)).filter((m) => !m.isPet);
  const allCheckins = await getCheckInsByFamily(familyId);

  const memberCheckInDates: Record<string, Set<string>> = {};
  for (const m of members) {
    memberCheckInDates[m.id] = new Set();
  }
  for (const c of allCheckins) {
    const dateStr = c.createdAt.slice(0, 10);
    if (memberCheckInDates[c.userId]) {
      memberCheckInDates[c.userId].add(dateStr);
    }
  }

  const individualStreaks: Record<string, number> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const m of members) {
    const dates = memberCheckInDates[m.id];
    let streak = 0;
    const checkDate = new Date(today);

    const todayStr = checkDate.toISOString().slice(0, 10);
    const yesterdayD = new Date(checkDate);
    yesterdayD.setDate(yesterdayD.getDate() - 1);
    const yesterdayStr = yesterdayD.toISOString().slice(0, 10);

    if (!dates.has(todayStr) && !dates.has(yesterdayStr)) {
      individualStreaks[m.id] = 0;
      continue;
    }

    if (!dates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (dates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    individualStreaks[m.id] = streak;
  }

  let familyStreak = 0;
  const checkDate = new Date(today);

  const todayStr = checkDate.toISOString().slice(0, 10);
  const allCheckedToday = members.every((m) => memberCheckInDates[m.id].has(todayStr));

  if (!allCheckedToday) {
    const yesterdayD = new Date(checkDate);
    yesterdayD.setDate(yesterdayD.getDate() - 1);
    const yesterdayStr = yesterdayD.toISOString().slice(0, 10);
    const allCheckedYesterday = members.every((m) => memberCheckInDates[m.id].has(yesterdayStr));
    if (allCheckedYesterday) {
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const dateStr = checkDate.toISOString().slice(0, 10);
        const allChecked = members.every((m) => memberCheckInDates[m.id].has(dateStr));
        if (allChecked) {
          familyStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
  } else {
    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const allChecked = members.every((m) => memberCheckInDates[m.id].has(dateStr));
      if (allChecked) {
        familyStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    familyStreak,
    individualStreaks,
    memberStreaks: members.map((m) => ({
      userId: m.id,
      name: m.name,
      avatar: m.avatar,
      streak: individualStreaks[m.id] || 0,
    })),
  };
}

// --- Weekly recap ---

export async function getWeeklyRecap(familyId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const members = await getFamilyMembers(familyId);
  const allCheckins = await getCheckInsByFamily(familyId);
  const weekCheckins = allCheckins.filter(
    (c) => new Date(c.createdAt) >= weekAgo
  );

  const quadrantCounts: Record<string, number> = {
    "high-energy-pleasant": 0,
    "high-energy-unpleasant": 0,
    "low-energy-pleasant": 0,
    "low-energy-unpleasant": 0,
  };
  const memberStats: Record<
    string,
    { checkins: number; topEmotion: string; topEmoji: string; emotions: Record<string, number> }
  > = {};
  const emotionCounts: Record<string, number> = {};

  const dailyParticipation: Record<string, Set<string>> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyParticipation[d.toISOString().slice(0, 10)] = new Set();
  }

  for (const c of weekCheckins) {
    if (quadrantCounts[c.quadrant] !== undefined) {
      quadrantCounts[c.quadrant]++;
    }
    emotionCounts[c.emotion] = (emotionCounts[c.emotion] || 0) + 1;

    if (!memberStats[c.userId]) {
      memberStats[c.userId] = { checkins: 0, topEmotion: c.emotion, topEmoji: c.emoji, emotions: {} };
    }
    memberStats[c.userId].checkins++;
    memberStats[c.userId].emotions[c.emotion] = (memberStats[c.userId].emotions[c.emotion] || 0) + 1;

    const dateStr = c.createdAt.slice(0, 10);
    if (dailyParticipation[dateStr]) {
      dailyParticipation[dateStr].add(c.userId);
    }
  }

  for (const stats of Object.values(memberStats)) {
    let topCount = 0;
    for (const [emotion, count] of Object.entries(stats.emotions)) {
      if (count > topCount) {
        topCount = count;
        stats.topEmotion = emotion;
      }
    }
  }

  let mostActive = { userId: "", count: 0 };
  for (const [userId, stats] of Object.entries(memberStats)) {
    if (stats.checkins > mostActive.count) {
      mostActive = { userId, count: stats.checkins };
    }
  }

  let topEmotion = { name: "None yet", count: 0, emoji: "" };
  for (const [name, count] of Object.entries(emotionCounts)) {
    if (count > topEmotion.count) {
      const checkin = weekCheckins.find((c) => c.emotion === name);
      topEmotion = { name, count, emoji: checkin?.emoji || "" };
    }
  }

  const photos = weekCheckins.filter((c) => c.photoUrl).length;
  const voiceNotes = weekCheckins.filter((c) => c.voiceNoteUrl).length;
  const videos = weekCheckins.filter((c) => c.videoUrl).length;
  const daysActive = Object.values(dailyParticipation).filter((s) => s.size > 0).length;
  const totalReactions = weekCheckins.reduce((sum, c) => sum + c.reactions.length, 0);
  const totalComments = weekCheckins.reduce((sum, c) => sum + c.comments.length, 0);
  const streakData = await getStreakData(familyId);

  return {
    totalCheckins: weekCheckins.length,
    totalMembers: members.length,
    quadrantCounts,
    topEmotion,
    mostActive: {
      user: members.find((m) => m.id === mostActive.userId),
      count: mostActive.count,
    },
    memberStats: members.map((m) => ({
      user: m,
      stats: memberStats[m.id] || { checkins: 0, topEmotion: "N/A", topEmoji: "\u2753" },
    })),
    media: { photos, voiceNotes, videos },
    period: {
      from: weekAgo.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    },
    daysActive,
    totalReactions,
    totalComments,
    familyStreak: streakData.familyStreak,
    memberStreaks: streakData.memberStreaks,
  };
}

// --- Password reset operations ---

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function createResetToken(email: string): Promise<string | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  const token = uuidv4();
  const expiresAt = Date.now() + RESET_TOKEN_EXPIRY_MS;

  const sql = await ensureDb();
  if (sql) {
    await sql`INSERT INTO reset_tokens (token, email, expires_at)
      VALUES (${token}, ${user.email}, ${expiresAt})`;
  } else {
    memResetTokens.set(token, { token, email: user.email, expiresAt });
  }
  return token;
}

export async function validateResetToken(token: string): Promise<ResetToken | null> {
  const sql = await ensureDb();
  if (sql) {
    const rows = await sql`SELECT * FROM reset_tokens WHERE token = ${token}`;
    if (rows.length === 0) return null;
    const entry: ResetToken = {
      token: rows[0].token as string,
      email: rows[0].email as string,
      expiresAt: Number(rows[0].expires_at),
    };
    if (Date.now() > entry.expiresAt) {
      await sql`DELETE FROM reset_tokens WHERE token = ${token}`;
      return null;
    }
    return entry;
  }

  const entry = memResetTokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memResetTokens.delete(token);
    return null;
  }
  return entry;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const entry = await validateResetToken(token);
  if (!entry) return false;
  const user = await getUserByEmail(entry.email);
  if (!user) return false;

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const sql = await ensureDb();
  if (sql) {
    await sql`UPDATE users SET password_hash = ${passwordHash} WHERE email = ${entry.email}`;
    await sql`DELETE FROM reset_tokens WHERE token = ${token}`;
  } else {
    user.passwordHash = passwordHash;
    memResetTokens.delete(token);
  }
  return true;
}

// --- Seed demo data ---

let memSeeded = false;

export async function seedDemoData() {
  const sql = await ensureDb();

  if (sql) {
    // Check if already seeded in DB
    const existing = await sql`SELECT COUNT(*) as count FROM families`;
    if (Number(existing[0].count) > 0) return;
  } else {
    if (memSeeded) return;
    memSeeded = true;
  }

  const family = await createFamily("Our Day Family");

  const dad = await createUser("Dad", "dad@family.com", "password123", family.id, "\u{1F468}");
  const mom = await createUser("Mom", "mom@family.com", "password123", family.id, "\u{1F469}");
  const son1 = await createUser("Son (Boston)", "son1@family.com", "password123", family.id, "\u{1F466}");
  const son2 = await createUser("Son (Chicago)", "son2@family.com", "password123", family.id, "\u{1F9D1}");
  const daughter = await createUser("Daughter", "daughter@family.com", "password123", family.id, "\u{1F467}");
  const dog = await createUser("Buddy", "buddy@family.com", "password123", family.id, "\u{1F415}", true, dad.id);

  const now = new Date();

  // Helper to create a checkin with a specific date
  async function createDatedCheckIn(
    data: Parameters<typeof createCheckIn>[0],
    baseDate: Date,
  ) {
    const checkin = await createCheckIn(data);
    const hour = 8 + Math.floor(Math.random() * 12);
    const d = new Date(baseDate);
    d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    const newCreatedAt = d.toISOString();

    if (sql) {
      await sql`UPDATE checkins SET created_at = ${newCreatedAt} WHERE id = ${checkin.id}`;
    }
    checkin.createdAt = newCreatedAt;
    return checkin;
  }

  // --- Today's check-ins ---
  const todayCheckins = [
    { userId: dad.id, emotion: "Grateful", quadrant: "high-energy-pleasant", emoji: "\u{1F64F}", location: "Home", withWhom: ["Mom", "Daughter"], activity: "Family dinner together - loving these moments before everyone scatters!" },
    { userId: mom.id, emotion: "Calm", quadrant: "low-energy-pleasant", emoji: "\u{1F60C}", location: "Home", withWhom: ["Dad", "Daughter"], activity: "Reading a book in the garden while the sun sets" },
    { userId: son1.id, emotion: "Excited", quadrant: "high-energy-pleasant", emoji: "\u{1F929}", location: "Boston University", withWhom: ["Roommates"], activity: "Aced my midterm exam! Celebrating with the crew" },
    { userId: son2.id, emotion: "Nervous", quadrant: "high-energy-unpleasant", emoji: "\u{1F62C}", location: "High School", withWhom: ["Friends"], activity: "College acceptance letters coming soon... trying to stay chill" },
    { userId: daughter.id, emotion: "Playful", quadrant: "high-energy-pleasant", emoji: "\u{1F61C}", location: "Home", withWhom: ["Mom", "Dad"], activity: "Playing in the backyard with chalk - drew a huge family portrait!" },
    { userId: dog.id, emotion: "Excited", quadrant: "high-energy-pleasant", emoji: "\u{1F929}", location: "Dog Park", withWhom: ["Dad"], activity: "Chasing squirrels and making new friends at the park" },
  ];
  for (const data of todayCheckins) {
    await createDatedCheckIn(data, now);
  }

  // --- Yesterday's check-ins ---
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayCheckins = [
    { userId: dad.id, emotion: "Motivated", quadrant: "high-energy-pleasant", emoji: "\u{1F4AA}", location: "Office", withWhom: ["Colleagues"], activity: "Big presentation went great. Boss loved it!" },
    { userId: mom.id, emotion: "Warm", quadrant: "low-energy-pleasant", emoji: "\u{1F31E}", location: "Kitchen", withWhom: ["Daughter"], activity: "Baked cookies together. House smells amazing." },
    { userId: son1.id, emotion: "Tired", quadrant: "low-energy-unpleasant", emoji: "\u{1F634}", location: "Dorm", withWhom: ["Solo"], activity: "All-nighter studying for midterm. Worth it though." },
    { userId: son2.id, emotion: "Hopeful", quadrant: "high-energy-pleasant", emoji: "\u{1F31F}", location: "Home", withWhom: ["Mom", "Dad"], activity: "Worked on my college essay. Think it's pretty good!" },
    { userId: daughter.id, emotion: "Cheerful", quadrant: "high-energy-pleasant", emoji: "\u{1F60A}", location: "School", withWhom: ["Best Friend"], activity: "Art class was so fun. Made a clay dinosaur!" },
  ];
  for (const data of yesterdayCheckins) {
    await createDatedCheckIn(data, yesterday);
  }

  // --- 2 days ago ---
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoCheckins = [
    { userId: dad.id, emotion: "Content", quadrant: "low-energy-pleasant", emoji: "\u{1F642}", location: "Home", withWhom: ["Mom"], activity: "Quiet evening watching a documentary together" },
    { userId: mom.id, emotion: "Energized", quadrant: "high-energy-pleasant", emoji: "\u26A1", location: "Yoga Studio", withWhom: ["Friends"], activity: "Morning yoga class. Feeling refreshed!" },
    { userId: son1.id, emotion: "Adventurous", quadrant: "high-energy-pleasant", emoji: "\u{1F5FA}\uFE0F", location: "Downtown Boston", withWhom: ["College Friends"], activity: "Explored a new ramen place near campus. 10/10." },
    { userId: daughter.id, emotion: "Amused", quadrant: "high-energy-pleasant", emoji: "\u{1F602}", location: "Home", withWhom: ["Buddy"], activity: "Teaching Buddy new tricks. He can almost sit!" },
  ];
  for (const data of twoDaysAgoCheckins) {
    await createDatedCheckIn(data, twoDaysAgo);
  }

  // --- 3 days ago ---
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoCheckins = [
    { userId: dad.id, emotion: "Proud", quadrant: "high-energy-pleasant", emoji: "\u{1F3C6}", location: "Home", withWhom: ["Son (Chicago)"], activity: "Helped with college applications. So proud of this kid." },
    { userId: mom.id, emotion: "Nostalgic", quadrant: "low-energy-pleasant", emoji: "\u{1F4F7}", location: "Home", withWhom: ["Solo"], activity: "Found old photo albums. Time flies so fast..." },
    { userId: son2.id, emotion: "Determined", quadrant: "high-energy-pleasant", emoji: "\u{1F3AF}", location: "Library", withWhom: ["Study Group"], activity: "Final round of college app edits. Hitting submit soon!" },
  ];
  for (const data of threeDaysAgoCheckins) {
    await createDatedCheckIn(data, threeDaysAgo);
  }

  // Add reactions to today's check-ins
  const todayCheckinsArr = await getCheckInsByFamily(family.id, now.toISOString().slice(0, 10));
  for (const c of todayCheckinsArr) {
    const reactors = [dad, mom, son1, son2, daughter].filter((u) => u.id !== c.userId);
    const emojis = ["\u2764\uFE0F", "\u{1F602}", "\u{1F525}", "\u{1F44F}", "\u{1F97A}", "\u{1F4AA}"];
    for (let i = 0; i < Math.min(2, reactors.length); i++) {
      await addReaction(c.id, reactors[i].id, emojis[Math.floor(Math.random() * emojis.length)]);
    }
  }

  // Add comments
  if (todayCheckinsArr.length >= 4) {
    await addComment(todayCheckinsArr[0].id, mom.id, "So proud of us! Love this family \u{1F49C}");
    await addComment(todayCheckinsArr[2].id, dad.id, "That's my boy! Knew you'd crush it \u{1F4AA}");
    await addComment(todayCheckinsArr[3].id, mom.id, "It'll all work out sweetie. We believe in you!");
  }

  console.log(`[seed] Family "${family.name}" created with invite code: ${family.inviteCode}`);
  console.log(`[seed] Created check-ins across 4 days with reactions & comments`);
}
