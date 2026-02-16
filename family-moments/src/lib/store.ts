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
  avatar: string = "\u{1F464}",
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

// --- Streak tracking ---
export function getStreakData(familyId: string) {
  const members = getFamilyMembers(familyId).filter((m) => !m.isPet);
  const allCheckins = getCheckInsByFamily(familyId);

  // Get unique dates each member checked in
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

  // Calculate individual streaks (consecutive days ending today or yesterday)
  const individualStreaks: Record<string, number> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const m of members) {
    const dates = memberCheckInDates[m.id];
    let streak = 0;
    const checkDate = new Date(today);

    // Check if they have a check-in today or yesterday to start counting
    const todayStr = checkDate.toISOString().slice(0, 10);
    const yesterdayD = new Date(checkDate);
    yesterdayD.setDate(yesterdayD.getDate() - 1);
    const yesterdayStr = yesterdayD.toISOString().slice(0, 10);

    if (!dates.has(todayStr) && !dates.has(yesterdayStr)) {
      individualStreaks[m.id] = 0;
      continue;
    }

    // If they haven't checked in today, start from yesterday
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

  // Family streak: days where ALL human members checked in
  let familyStreak = 0;
  const checkDate = new Date(today);

  // Check today first
  const todayStr = checkDate.toISOString().slice(0, 10);
  const allCheckedToday = members.every((m) => memberCheckInDates[m.id].has(todayStr));

  if (!allCheckedToday) {
    const yesterdayD = new Date(checkDate);
    yesterdayD.setDate(yesterdayD.getDate() - 1);
    const yesterdayStr = yesterdayD.toISOString().slice(0, 10);
    const allCheckedYesterday = members.every((m) => memberCheckInDates[m.id].has(yesterdayStr));
    if (!allCheckedYesterday) {
      familyStreak = 0;
    } else {
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
    { checkins: number; topEmotion: string; topEmoji: string; emotions: Record<string, number> }
  > = {};
  const emotionCounts: Record<string, number> = {};

  // Track daily participation for the week
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

    // Track daily participation
    const dateStr = c.createdAt.slice(0, 10);
    if (dailyParticipation[dateStr]) {
      dailyParticipation[dateStr].add(c.userId);
    }
  }

  // Find top emotion per member
  for (const stats of Object.values(memberStats)) {
    let topCount = 0;
    for (const [emotion, count] of Object.entries(stats.emotions)) {
      if (count > topCount) {
        topCount = count;
        stats.topEmotion = emotion;
      }
    }
  }

  // Find most checked-in member
  let mostActive = { userId: "", count: 0 };
  for (const [userId, stats] of Object.entries(memberStats)) {
    if (stats.checkins > mostActive.count) {
      mostActive = { userId, count: stats.checkins };
    }
  }

  // Find top emotion
  let topEmotion = { name: "None yet", count: 0, emoji: "" };
  for (const [name, count] of Object.entries(emotionCounts)) {
    if (count > topEmotion.count) {
      const checkin = weekCheckins.find((c) => c.emotion === name);
      topEmotion = { name, count, emoji: checkin?.emoji || "" };
    }
  }

  // Count media
  const photos = weekCheckins.filter((c) => c.photoUrl).length;
  const voiceNotes = weekCheckins.filter((c) => c.voiceNoteUrl).length;
  const videos = weekCheckins.filter((c) => c.videoUrl).length;

  // Days active: how many of the 7 days had at least 1 check-in from anyone
  const daysActive = Object.values(dailyParticipation).filter((s) => s.size > 0).length;

  // Total reactions and comments this week
  const totalReactions = weekCheckins.reduce((sum, c) => sum + c.reactions.length, 0);
  const totalComments = weekCheckins.reduce((sum, c) => sum + c.comments.length, 0);

  // Streak data
  const streakData = getStreakData(familyId);

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

// --- Seed demo data for development ---
export async function seedDemoData() {
  // Check if already seeded
  if (families.size > 0) return;

  const family = createFamily("Our Day Family");

  const dad = await createUser("Dad", "dad@family.com", "password123", family.id, "\u{1F468}");
  const mom = await createUser("Mom", "mom@family.com", "password123", family.id, "\u{1F469}");
  const son1 = await createUser("Son (Boston)", "son1@family.com", "password123", family.id, "\u{1F466}");
  const son2 = await createUser("Son (Chicago)", "son2@family.com", "password123", family.id, "\u{1F9D1}");
  const daughter = await createUser("Daughter", "daughter@family.com", "password123", family.id, "\u{1F467}");
  const dog = await createUser("Buddy", "buddy@family.com", "password123", family.id, "\u{1F415}", true, dad.id);

  // Create check-ins spread over the last few days for streak/recap data
  const now = new Date();

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
    const checkin = createCheckIn(data);
    const hour = 8 + Math.floor(Math.random() * 12);
    const d = new Date(now);
    d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    checkin.createdAt = d.toISOString();
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
    const checkin = createCheckIn(data);
    const hour = 8 + Math.floor(Math.random() * 12);
    const d = new Date(yesterday);
    d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    checkin.createdAt = d.toISOString();
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
    const checkin = createCheckIn(data);
    const hour = 8 + Math.floor(Math.random() * 12);
    const d = new Date(twoDaysAgo);
    d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    checkin.createdAt = d.toISOString();
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
    const checkin = createCheckIn(data);
    const hour = 8 + Math.floor(Math.random() * 12);
    const d = new Date(threeDaysAgo);
    d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    checkin.createdAt = d.toISOString();
  }

  // Add some reactions to today's check-ins
  const todayCheckinsArr = getCheckInsByFamily(family.id, now.toISOString().slice(0, 10));
  for (const c of todayCheckinsArr) {
    const reactors = [dad, mom, son1, son2, daughter].filter((u) => u.id !== c.userId);
    const emojis = ["\u2764\uFE0F", "\u{1F602}", "\u{1F525}", "\u{1F44F}", "\u{1F97A}", "\u{1F4AA}"];
    for (let i = 0; i < Math.min(2, reactors.length); i++) {
      addReaction(c.id, reactors[i].id, emojis[Math.floor(Math.random() * emojis.length)]);
    }
  }

  // Add some comments
  if (todayCheckinsArr.length >= 4) {
    addComment(todayCheckinsArr[0].id, mom.id, "So proud of us! Love this family \u{1F49C}");
    addComment(todayCheckinsArr[2].id, dad.id, "That's my boy! Knew you'd crush it \u{1F4AA}");
    addComment(todayCheckinsArr[3].id, mom.id, "It'll all work out sweetie. We believe in you!");
  }

  console.log(`[seed] Family "${family.name}" created with invite code: ${family.inviteCode}`);
  console.log(`[seed] Created check-ins across 4 days with reactions & comments`);
}
