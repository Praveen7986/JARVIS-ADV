import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { tracePeople, traceSharingLinks, type TracePerson } from "../drizzle/schema";
import { getDb } from "./db";
import { deleteLocalPerson, getLocalPersonByTokenHash, insertLocalPerson, insertLocalSharingLink, listLocalPeople, revokeLocalSharingLink } from "./localStore";

const TOKEN_BYTES = 32;

export function createTraceShareToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashTraceShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isTraceShareLinkActive(revokedAt: Date | null): boolean {
  return revokedAt === null;
}

export async function listTracePeople(ownerUserId: number) {
  const db = await getDb();
  if (!db) return listLocalPeople(ownerUserId);

  return db
    .select()
    .from(tracePeople)
    .where(eq(tracePeople.ownerUserId, ownerUserId));
}

export async function createTracePerson(input: {
  ownerUserId: number;
  name: string;
  displayName?: string;
  category: "family" | "friends" | "relatives" | "others";
  photoUrl?: string;
}) {
  const db = await getDb();
  if (!db) return insertLocalPerson({ ...input, displayName: input.displayName ?? null, photoUrl: input.photoUrl ?? null });

  const [result] = await db.insert(tracePeople).values(input);
  const rows = await db.select().from(tracePeople).where(eq(tracePeople.id, Number(result.insertId))).limit(1);
  return rows[0];
}

export async function createTraceSharingLink(personId: number, ownerUserId: number, baseUrl: string) {
  const db = await getDb();
  if (!db) {
    const people = await listLocalPeople(ownerUserId);
    if (!people.some((person) => person.id === personId)) throw new Error("Trace person not found");
    const token = createTraceShareToken();
    const link = await insertLocalSharingLink({ personId, tokenHash: hashTraceShareToken(token) });
    return { id: link.id, personId, url: new URL(`/trace/share/${token}`, baseUrl).toString() };
  }

  const person = await db
    .select({ id: tracePeople.id })
    .from(tracePeople)
    .where(and(eq(tracePeople.id, personId), eq(tracePeople.ownerUserId, ownerUserId)))
    .limit(1);
  if (!person[0]) throw new Error("Trace person not found");

  const token = createTraceShareToken();
  const [result] = await db.insert(traceSharingLinks).values({
    personId,
    tokenHash: hashTraceShareToken(token),
  });

  return {
    id: Number(result.insertId),
    personId,
    url: new URL(`/trace/share/${token}`, baseUrl).toString(),
  };
}

export async function revokeTraceSharingLink(linkId: number, personId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) {
    const people = await listLocalPeople(ownerUserId);
    if (!people.some((person) => person.id === personId)) throw new Error("Trace person not found");
    await revokeLocalSharingLink(linkId, personId);
    return;
  }

  const person = await db
    .select({ id: tracePeople.id })
    .from(tracePeople)
    .where(and(eq(tracePeople.id, personId), eq(tracePeople.ownerUserId, ownerUserId)))
    .limit(1);
  if (!person[0]) throw new Error("Trace person not found");

  await db
    .update(traceSharingLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(traceSharingLinks.id, linkId), eq(traceSharingLinks.personId, personId), isNull(traceSharingLinks.revokedAt)));
}

export async function resolveTraceSharingToken(token: string): Promise<TracePerson | null> {
  const db = await getDb();
  if (!db) return (await getLocalPersonByTokenHash(hashTraceShareToken(token))) as TracePerson | null;

  const rows = await db
    .select({ person: tracePeople })
    .from(traceSharingLinks)
    .innerJoin(tracePeople, eq(tracePeople.id, traceSharingLinks.personId))
    .where(and(eq(traceSharingLinks.tokenHash, hashTraceShareToken(token)), isNull(traceSharingLinks.revokedAt)))
    .limit(1);

  return rows[0]?.person ?? null;
}

export async function deleteTracePerson(personId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) {
    await deleteLocalPerson(personId, ownerUserId);
    return;
  }

  const person = await db.select({ id: tracePeople.id }).from(tracePeople).where(and(eq(tracePeople.id, personId), eq(tracePeople.ownerUserId, ownerUserId))).limit(1);
  if (!person[0]) throw new Error("Trace person not found");
  await db.delete(traceSharingLinks).where(eq(traceSharingLinks.personId, personId));
  await db.delete(tracePeople).where(eq(tracePeople.id, personId));
}