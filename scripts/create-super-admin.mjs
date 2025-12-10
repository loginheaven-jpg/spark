import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

async function createSuperAdmin() {
  const email = "loginheaven@gmail.com";
  const password = "1234qwer";
  const name = "Super Admin";

  try {
    // 기존 계정 확인
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existing.length > 0) {
      console.log("슈퍼 어드민 계정이 이미 존재합니다.");
      console.log("비밀번호를 업데이트합니다...");
      
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.update(users)
        .set({ 
          password: hashedPassword,
          role: "admin",
          loginMethod: "local"
        })
        .where(eq(users.email, email));
      
      console.log("✅ 슈퍼 어드민 계정이 업데이트되었습니다.");
    } else {
      // 새 계정 생성
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await db.insert(users).values({
        name,
        email,
        password: hashedPassword,
        loginMethod: "local",
        role: "admin",
        lastSignedIn: new Date(),
      });
      
      console.log("✅ 슈퍼 어드민 계정이 생성되었습니다.");
    }
    
    console.log(`이메일: ${email}`);
    console.log(`비밀번호: ${password}`);
    
  } catch (error) {
    console.error("❌ 슈퍼 어드민 계정 생성 실패:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

createSuperAdmin();
