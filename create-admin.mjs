import { drizzle } from "drizzle-orm/mysql2";
import { users } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const db = drizzle(process.env.DATABASE_URL);

async function createAdmin() {
  const email = "loginheaven@gmail.com";
  const password = "1234qwer";
  const name = "관리자";
  
  // 비밀번호 해시
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // 기존 사용자 확인
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (existing.length > 0) {
    // 기존 사용자를 어드민으로 업데이트
    await db.update(users)
      .set({ role: "admin", password: hashedPassword })
      .where(eq(users.email, email));
    console.log("✅ 기존 사용자를 어드민으로 업데이트했습니다:", email);
  } else {
    // 새 어드민 사용자 생성
    await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      role: "admin",
    });
    console.log("✅ 새 어드민 계정을 생성했습니다:", email);
  }
  
  process.exit(0);
}

createAdmin().catch((error) => {
  console.error("❌ 어드민 계정 생성 실패:", error);
  process.exit(1);
});
