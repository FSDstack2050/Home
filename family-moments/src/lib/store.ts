// In-memory store (replace with a real database in production)
// This persists during the server process lifetime

import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  familyId: string;
  avatar: string;
  isPet: boolean;
  caretakerId?: string; // for pet profiles, who manages them
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

// --- In-memory data ---
const families: Map<string, Family> = new Map();
const users: Map<string, User> = new Map();
const checkins: Map<string, CheckIn> = new Map();

// --- Family operations ---
export function createFamily(name: string): Family {
  const family: Family = {
    id: uuidv4(),
    name,
    inviteCode: uuidv4().slice(0, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
  };
  families.set(family.id, family);
  return family;
}

export function getFamilyByInviteCode(code: string): Family | undefined {
  for (const family of families.values()) {
    if (family.inviteCode === code.toUpperCase()) return family;
  }
  return undefined;
}

export function getFamilyById(id: string): Family | undefined {
  return families.get(id);
}

// --- User operations ---
export async function createUser(
  name: string,
  email: string,
  password: string,
  familyId: string,
  avatar: string = "👤",
  isPet: boolean = false,
  caretakerId?: string
): Promise<User> {
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    id: uuidv4(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    familyId,
    avatar,
    isPet,
    caretakerId,
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);
  return user;
}

export function getUserByEmail(email: string): User | undefined {
  for (const user of users.values()) {
    if (user.email === email.toLowerCase()) return user;
  }
  return undefined;
}

export function getUserById(id: string): User | undefined {
  return users.get(id);
}

export function getFamilyMembers(familyId: string): User[] {
  const members: User[] = [];
  for (const user of users.values()) {
    if (user.familyId === familyId) members.push(user);
  }
  return members;
}

// --- Check-in operations ---
export function createCheckIn(data: {
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
}): CheckIn {
  const checkin: CheckIn = {
    id: uuidv4(),
    ...data,
    createdAt: new Date().toISOString(),
    reactions: [],
    comments: [],
  };
  checkins.set(checkin.id, checkin);
  return checkin;
}

export function getCheckInsByFamily(familyId: string, date?: string): CheckIn[] {
  const familyUserIds = new Set(
    getFamilyMembers(familyId).map((u) => u.id)
  );
  const result: CheckIn[] = [];
  for (const checkin of checkins.values()) {
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

export function getCheckInsByUser(userId: string, limit?: number): CheckIn[] {
  const result: CheckIn[] = [];
  for (const checkin of checkins.values()) {
    if (checkin.userId === userId) result.push(checkin);
  }
  result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return limit ? result.slice(0, limit) : result;
}

export function getCheckInById(id: string): CheckIn | undefined {
  return checkins.get(id);
}

export function addReaction(
  checkinId: string,
  userId: string,
  emoji: string
): Reaction | null {
  const checkin = checkins.get(checkinId);
  if (!checkin) return null;
  // Remove existing reaction from this user
  checkin.reactions = checkin.reactions.filter((r) => r.userId !== userId);
  const reaction: Reaction = {
    id: uuidv4(),
    userId,
    emoji,
    createdAt: new Date().toISOString(),
  };
  checkin.reactions.push(reaction);
  return reaction;
}

export function addComment(
  checkinId: string,
  userId: string,
  text: string
): Comment | null {
  const checkin = checkins.get(checkinId);
  if (!checkin) return null;
  const comment: Comment = {
    id: uuidv4(),
    userId,
    text,
    createdAt: new Date().toISOString(),
  };
  checkin.comments.push(comment);
  return comment;
}

// --- Weekly recap ---
export function getWeeklyRecap(familyId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const members = getFamilyMembers(familyId);
  const weekCheckins = getCheckInsByFamily(familyId).filter(
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
    { checkins: number; topEmotion: string; topEmoji: string }
  > = {};
  const emotionCounts: Record<string, number> = {};

  for (const c of weekCheckins) {
    if (quadrantCounts[c.quadrant] !== undefined) {
      quadrantCounts[c.quadrant]++;
    }
    emotionCounts[c.emotion] = (emotionCounts[c.emotion] || 0) + 1;
    if (!memberStats[c.userId]) {
      memberStats[c.userId] = { checkins: 0, topEmotion: c.emotion, topEmoji: c.emoji };
    }
    memberStats[c.userId].checkins++;
  }

  // Find most checked-in member
  let mostActive = { userId: "", count: 0 };
  for (const [userId, stats] of Object.entries(memberStats)) {
    if (stats.checkins > mostActive.count) {
      mostActive = { userId, count: stats.checkins };
    }
  }

  // Find top emotion
  let topEmotion = { name: "None yet", count: 0 };
  for (const [name, count] of Object.entries(emotionCounts)) {
    if (count > topEmotion.count) {
      topEmotion = { name, count };
    }
  }

  // Count media
  const photos = weekCheckins.filter((c) => c.photoUrl).length;
  const voiceNotes = weekCheckins.filter((c) => c.voiceNoteUrl).length;
  const videos = weekCheckins.filter((c) => c.videoUrl).length;

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
      stats: memberStats[m.id] || { checkins: 0, topEmotion: "N/A", topEmoji: "❓" },
    })),
    media: { photos, voiceNotes, videos },
    period: {
      from: weekAgo.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    },
  };
}

// --- Seed demo data for development ---
export async function seedDemoData() {
  // Check if already seeded
  if (families.size > 0) return;

  const family = createFamily("The Family");

  const dad = await createUser("Dad", "dad@family.com", "password123", family.id, "👨");
  const mom = await createUser("Mom", "mom@family.com", "password123", family.id, "👩");
  const son1 = await createUser("Son (Boston)", "son1@family.com", "password123", family.id, "👦");
  const son2 = await createUser("Son (Chicago)", "son2@family.com", "password123", family.id, "🧑");
  const daughter = await createUser("Daughter", "daughter@family.com", "password123", family.id, "👧");
  const dog = await createUser("Buddy", "buddy@family.com", "password123", family.id, "🐕", true, dad.id);

  // Create some sample check-ins
  const sampleCheckins = [
    { userId: dad.id, emotion: "Grateful", quadrant: "high-energy-pleasant", emoji: "🙏", location: "Home", withWhom: ["Mom", "Daughter"], activity: "Family dinner together" },
    { userId: mom.id, emotion: "Calm", quadrant: "low-energy-pleasant", emoji: "😌", location: "Home", withWhom: ["Dad", "Daughter"], activity: "Reading a book in the garden" },
    { userId: son1.id, emotion: "Excited", quadrant: "high-energy-pleasant", emoji: "🤩", location: "Boston University", withWhom: ["Roommates"], activity: "Aced my midterm exam!" },
    { userId: son2.id, emotion: "Nervous", quadrant: "high-energy-unpleasant", emoji: "😬", location: "High School", withWhom: ["Friends"], activity: "College acceptance letters coming soon" },
    { userId: daughter.id, emotion: "Playful", quadrant: "high-energy-pleasant", emoji: "😜", location: "Home", withWhom: ["Mom", "Dad"], activity: "Playing in the backyard" },
    { userId: dog.id, emotion: "Excited", quadrant: "high-energy-pleasant", emoji: "🤩", location: "Dog Park", withWhom: ["Dad"], activity: "Chasing squirrels and making friends" },
  ];

  for (const data of sampleCheckins) {
    createCheckIn(data);
  }

  console.log(`[seed] Family "${family.name}" created with invite code: ${family.inviteCode}`);
  console.log(`[seed] Created ${sampleCheckins.length} sample check-ins`);
}
