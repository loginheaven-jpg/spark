import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // Manus OAuth용, 일반 회원은 null
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }), // 전화번호
  password: varchar("password", { length: 255 }), // 암호 (bcrypt 해시)
  accountNumber: varchar("accountNumber", { length: 100 }), // 계좌번호
  alwaysAvailable: boolean("alwaysAvailable").default(true).notNull(), // 항상 가능 여부
  loginMethod: varchar("loginMethod", { length: 64 }).default("local").notNull(), // local, manus
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 관리자가 설정한 사용 가능한 시간대
 */
export const availableSlots = mysqlTable("available_slots", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM
  endTime: varchar("endTime", { length: 5 }).notNull(), // HH:MM
  isAvailable: boolean("isAvailable").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AvailableSlot = typeof availableSlots.$inferSelect;
export type InsertAvailableSlot = typeof availableSlots.$inferInsert;

/**
 * 모임 테이블 (확정된 모임 + 모임 제안)
 * status: pending (제안, 관리자 승인 대기), approved (승인됨), rejected (거부됨)
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  organizerId: int("organizerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  keywords: varchar("keywords", { length: 255 }),
  instructorName: varchar("instructorName", { length: 100 }), // 모임주관자(강사) 이름
  fee: int("fee").default(0).notNull(),
  date: varchar("date", { length: 10 }),
  timeRange: varchar("timeRange", { length: 50 }),
  isProposal: int("isProposal").default(0).notNull(),
  minParticipants: int("minParticipants").default(0),
  maxParticipants: int("maxParticipants").default(0),
  isConfirmed: int("isConfirmed").default(0).notNull(),
  eventStatus: mysqlEnum("eventStatus", ["proposal", "scheduled", "confirmed"]).default("scheduled").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  materialUrl: varchar("materialUrl", { length: 500 }),
  materialContent: text("materialContent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"), // 소프트 삭제용 (null이면 활성)
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * 참여자 정보 (비회원 참여자)
 * localStorage에 저장된 정보와 동기화
 */
export const participants = mysqlTable("participants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // 로그인 사용자의 경우 users 테이블 ID 참조
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;

/**
 * 모임 참여 신청
 */
export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  participantId: int("participantId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;

/**
 * 비밀번호 재설정 토큰
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // users 테이블 참조
  token: varchar("token", { length: 255 }).notNull().unique(), // 재설정 토큰 (해시화 권장)
  expiresAt: timestamp("expiresAt").notNull(), // 토큰 만료 시간
  used: boolean("used").default(false).notNull(), // 사용 여부
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * 모임 후기
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(), // users 테이블 참조
  content: text("content").notNull(),
  rating: int("rating").default(5).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
