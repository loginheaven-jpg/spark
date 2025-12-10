import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 회원가입
 */
export async function registerUser(data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  accountNumber?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 이메일 중복 체크
  const existing = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
  if (existing.length > 0) {
    throw new Error("Email already exists");
  }

  // 비밀번호 해시
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // 사용자 생성
  const result = await db.insert(users).values({
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    password: hashedPassword,
    accountNumber: data.accountNumber || null,
    loginMethod: "local",
    role: "user",
    lastSignedIn: new Date(),
  });

  return result;
}

/**
 * 로그인 검증
 */
export async function verifyLogin(email: string, password: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 사용자 조회
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (result.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = result[0];

  // 로컬 계정이 아니면 에러
  if (user.loginMethod !== "local" || !user.password) {
    throw new Error("Invalid login method");
  }

  // 비밀번호 검증
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  // lastSignedIn 업데이트
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

  return user;
}

/**
 * 이메일로 사용자 조회
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
