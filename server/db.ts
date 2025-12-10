import mysql from "mysql2/promise";
import { eq, and, desc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  availableSlots,
  events,
  participants,
  registrations,
  passwordResetTokens,
  InsertAvailableSlot,
  InsertEvent,
  InsertParticipant,
  InsertRegistration,
  InsertPasswordResetToken
} from "../drizzle/schema";
import { ENV } from './_core/env';

// Global cache
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (_db) return _db;

  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL is not defined");
    return null;
  }

  try {
    // mysql2 createPool accepts the connection string directly
    const poolConnection = mysql.createPool(process.env.DATABASE_URL);
    _db = drizzle(poolConnection);
    console.log("[Database] Successfully connected to database");
  } catch (error) {
    console.error("[Database] Failed to connect:", error);
    _db = null;
  }

  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  // Manus OAuth 사용자는 openId 필수, 일반 회원은 email 필수
  if (!user.openId && !user.email) {
    throw new Error("User openId or email is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      name: user.name,
      email: user.email,
    };

    if (user.openId) {
      values.openId = user.openId;
    }
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // openId가 있으면 openId로, 없으면 email로 upsert
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateUser(id: number, updates: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(updates).where(eq(users.id, id));
}

// ===== Available Slots =====
export async function getAvailableSlots() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(availableSlots);
}

export async function createAvailableSlot(slot: InsertAvailableSlot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(availableSlots).values(slot);
}

export async function deleteAvailableSlot(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(availableSlots).where(eq(availableSlots.id, id));
}

// ===== Events =====
export async function getAllEvents() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(events).orderBy(desc(events.createdAt));
}

export async function getApprovedEvents() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const eventsData = await db
    .select({
      event: events,
      registrationCount: count(registrations.id),
    })
    .from(events)
    .leftJoin(registrations, eq(events.id, registrations.eventId))
    .where(eq(events.status, 'approved'))
    .groupBy(events.id)
    .orderBy(desc(events.createdAt));

  const eventsWithCount = eventsData.map(row => ({
    ...row.event,
    _count: {
      registrations: Number(row.registrationCount) || 0,
    },
  }));

  return eventsWithCount;
}

export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      event: events,
      organizer: users,
      registrationCount: count(registrations.id),
    })
    .from(events)
    .leftJoin(users, eq(events.organizerId, users.id))
    .leftJoin(registrations, eq(events.id, registrations.eventId))
    .where(eq(events.id, id))
    .groupBy(events.id, users.id)
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    ...row.event,
    organizer: row.organizer,
    _count: {
      registrations: Number(row.registrationCount) || 0,
    },
  };
}

export async function getEventsByOrganizer(organizerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(events).where(eq(events.organizerId, organizerId)).orderBy(desc(events.createdAt));
}

export async function getEventsByOrganizerWithCount(organizerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      event: events,
      registrationCount: count(registrations.id),
    })
    .from(events)
    .leftJoin(registrations, eq(events.id, registrations.eventId))
    .where(eq(events.organizerId, organizerId))
    .groupBy(events.id)
    .orderBy(desc(events.createdAt));

  return result.map(row => ({
    ...row.event,
    _count: {
      registrations: Number(row.registrationCount) || 0,
    },
  }));
}

export async function createEvent(event: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(events).values(event);
}

export async function updateEvent(id: number, updates: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(events).set(updates).where(eq(events.id, id));
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 먼저 관련 registrations 삭제
  await db.delete(registrations).where(eq(registrations.eventId, id));

  // 그 다음 event 삭제
  return await db.delete(events).where(eq(events.id, id));
}

// ===== Participants =====
export async function upsertParticipant(participant: InsertParticipant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // userId가 있으면 userId로 찾기
  if (participant.userId) {
    const existing = await db
      .select()
      .from(participants)
      .where(eq(participants.userId, participant.userId))
      .limit(1);

    if (existing.length > 0) {
      // 기존 레코드 업데이트
      await db.update(participants).set(participant).where(eq(participants.userId, participant.userId));
      return existing[0];
    }
  }

  // 이메일로 찾기
  const existing = await db
    .select()
    .from(participants)
    .where(eq(participants.email, participant.email))
    .limit(1);

  if (existing.length > 0) {
    // 기존 레코드 업데이트
    await db.update(participants).set(participant).where(eq(participants.email, participant.email));
    return existing[0];
  }

  // 새 레코드 생성
  const result = await db.insert(participants).values(participant);
  // MySQL2 + Drizzle might return array or object depending on config
  const insertId = (result as any).insertId || (result as any)[0]?.insertId;

  if (insertId) {
    const newParticipant = await db
      .select()
      .from(participants)
      .where(eq(participants.id, insertId))
      .limit(1);
    return newParticipant[0];
  }

  return null;
}

export async function getParticipantById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(participants).where(eq(participants.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getParticipantByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(participants).where(eq(participants.email, email)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getParticipantByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(participants).where(eq(participants.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getParticipantsByEvent(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select({
      id: participants.id,
      name: participants.name,
      email: participants.email,
      phone: participants.phone,
      userId: participants.userId,
      createdAt: registrations.createdAt,
      user: users,
    })
    .from(registrations)
    .leftJoin(participants, eq(registrations.participantId, participants.id))
    .leftJoin(users, eq(participants.userId, users.id))
    .where(eq(registrations.eventId, eventId))
    .orderBy(registrations.createdAt);
}

// ===== Registrations =====
export async function createRegistration(registration: InsertRegistration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(registrations).values(registration);
}

export async function getRegistrationsByEvent(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select({
      id: registrations.id,
      eventId: registrations.eventId,
      participantId: registrations.participantId,
      createdAt: registrations.createdAt,
      participantName: participants.name,
      participantEmail: participants.email,
      participantPhone: participants.phone,
    })
    .from(registrations)
    .leftJoin(participants, eq(registrations.participantId, participants.id))
    .where(eq(registrations.eventId, eventId))
    .orderBy(registrations.createdAt);
}

export async function getRegistrationsByParticipant(participantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select({
      id: registrations.id,
      eventId: registrations.eventId,
      participantId: registrations.participantId,
      createdAt: registrations.createdAt,
      eventTitle: events.title,
      eventDate: events.date,
      eventTimeRange: events.timeRange,
      eventFee: events.fee,
    })
    .from(registrations)
    .leftJoin(events, eq(registrations.eventId, events.id))
    .where(eq(registrations.participantId, participantId))
    .orderBy(desc(registrations.createdAt));
}

export async function getRegistrationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // userId로 participant 찾기
  const participant = await getParticipantByUserId(userId);
  if (!participant) {
    return [];
  }

  return await db
    .select({
      id: registrations.id,
      eventId: registrations.eventId,
      participantId: registrations.participantId,
      createdAt: registrations.createdAt,
      eventTitle: events.title,
      eventDate: events.date,
      eventTimeRange: events.timeRange,
      eventFee: events.fee,
      eventIsConfirmed: events.isConfirmed,
      eventIsProposal: events.isProposal,
    })
    .from(registrations)
    .leftJoin(events, eq(registrations.eventId, events.id))
    .where(eq(registrations.participantId, participant.id))
    .orderBy(desc(registrations.createdAt));
}

export async function checkRegistrationExists(eventId: number, participantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(registrations)
    .where(and(eq(registrations.eventId, eventId), eq(registrations.participantId, participantId)))
    .limit(1);

  return result.length > 0;
}

export async function checkRegistrationExistsByUserId(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // userId로 participant 찾기
  const participant = await getParticipantByUserId(userId);
  if (!participant) {
    return false;
  }

  return await checkRegistrationExists(eventId, participant.id);
}

export async function deleteRegistration(eventId: number, participantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .delete(registrations)
    .where(and(eq(registrations.eventId, eventId), eq(registrations.participantId, participantId)));
}

export async function deleteRegistrationByUserId(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // userId로 participant 찾기
  const participant = await getParticipantByUserId(userId);
  if (!participant) {
    throw new Error("Participant not found");
  }

  return await deleteRegistration(eventId, participant.id);
}

// ========== Password Reset Functions ==========

/**
 * 재설정 토큰 생성
 */
export async function createResetToken(
  userId: number,
  token: string,
  expiresAt: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(passwordResetTokens)
    .values({
      userId,
      token,
      expiresAt,
    });

  return result;
}

/**
 * 토큰으로 재설정 토큰 조회
 */
export async function findResetToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);

  return result[0] || null;
}

/**
 * 토큰 무효화 (사용 완료 표시)
 */
export async function invalidateResetToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.token, token));
}

/**
 * 사용자의 모든 미사용 재설정 토큰 무효화
 */
export async function invalidateUserResetTokens(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(passwordResetTokens)
    .set({ used: true })
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.used, false)
      )
    );
}

/**
 * 사용자 비밀번호 업데이트
 */
export async function updateUserPassword(userId: number, hashedPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));
}
