import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getLocalUserByEmail, insertLocalUser } from "./localStore";

const scrypt = promisify(scryptCallback);
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 64;

async function hashPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_BYTES)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [saltHex, keyHex] = storedHash.split(":");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function validatePassword(password: string) {
  if (password.length < 8 || password.length > 128) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Password must be 8 to 128 characters." });
  }
}

async function createSession(user: { openId: string; name: string | null }, ctx: { req: any; res: any }) {
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || "",
    expiresInMs: ONE_YEAR_MS,
  });
  ctx.res.cookie(COOKIE_NAME, sessionToken, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: ONE_YEAR_MS,
  });
}

export async function registerLocalUser(input: { name: string; email: string; password: string }, ctx: { req: any; res: any }) {
  validatePassword(input.password);
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name || !email) throw new TRPCError({ code: "BAD_REQUEST", message: "Name and email are required." });

  const db = await getDb();
  const existing = db
    ? await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    : await getLocalUserByEmail(email);
  if (Array.isArray(existing) ? existing[0] : existing) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });

  const openId = `local_${randomBytes(18).toString("hex")}`;
  if (db) {
    await db.insert(users).values({ openId, name, email, passwordHash: await hashPassword(input.password), loginMethod: "local" });
  } else {
    await insertLocalUser({ openId, name, email, passwordHash: await hashPassword(input.password), loginMethod: "local", role: "user" });
  }
  await createSession({ openId, name }, ctx);
  return { success: true } as const;
}

export async function loginLocalUser(input: { email: string; password: string }, ctx: { req: any; res: any }) {
  const db = await getDb();
  const email = input.email.trim().toLowerCase();
  const user = db
    ? (await db.select().from(users).where(eq(users.email, email)).limit(1))[0]
    : await getLocalUserByEmail(email);
  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
  }
  await createSession(user, ctx);
  return { success: true } as const;
}