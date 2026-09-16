import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type LocalUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  passwordHash: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
};

export type LocalPerson = {
  id: number;
  ownerUserId: number;
  name: string;
  displayName: string | null;
  category: "family" | "friends" | "relatives" | "others";
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalSharingLink = {
  id: number;
  personId: number;
  tokenHash: string;
  createdAt: string;
  revokedAt: string | null;
};

type LocalState = {
  users: LocalUser[];
  people: LocalPerson[];
  sharingLinks: LocalSharingLink[];
};

const isServerless = Boolean(
  process.env.NETLIFY ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.VERCEL
);
const dataDir = isServerless ? "/tmp/.data" : path.resolve(process.cwd(), ".data");
const dataPath = path.resolve(dataDir, "jarvis-local.json");

async function readState(): Promise<LocalState> {
  try {
    return JSON.parse(await readFile(dataPath, "utf8")) as LocalState;
  } catch {
    return { users: [], people: [], sharingLinks: [] };
  }
}

async function writeState(state: LocalState) {
  await mkdir(path.dirname(dataPath), { recursive: true });
  await writeFile(dataPath, JSON.stringify(state, null, 2), "utf8");
}

export async function getLocalUserByOpenId(openId: string) {
  const state = await readState();
  return state.users.find((user) => user.openId === openId);
}

export async function getLocalUserByEmail(email: string) {
  const state = await readState();
  return state.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
}

export async function insertLocalUser(input: Omit<LocalUser, "id" | "createdAt" | "updatedAt" | "lastSignedIn">) {
  const state = await readState();
  const now = new Date().toISOString();
  const user: LocalUser = { ...input, id: nextId(state.users), createdAt: now, updatedAt: now, lastSignedIn: now };
  state.users.push(user);
  await writeState(state);
  return user;
}

export async function listLocalPeople(ownerUserId: number) {
  const state = await readState();
  return state.people.filter((person) => person.ownerUserId === ownerUserId);
}

export async function insertLocalPerson(input: Omit<LocalPerson, "id" | "createdAt" | "updatedAt">) {
  const state = await readState();
  const now = new Date().toISOString();
  const person: LocalPerson = { ...input, id: nextId(state.people), createdAt: now, updatedAt: now };
  state.people.push(person);
  await writeState(state);
  return person;
}

export async function insertLocalSharingLink(input: Omit<LocalSharingLink, "id" | "createdAt" | "revokedAt">) {
  const state = await readState();
  const link: LocalSharingLink = { ...input, id: nextId(state.sharingLinks), createdAt: new Date().toISOString(), revokedAt: null };
  state.sharingLinks.push(link);
  await writeState(state);
  return link;
}

export async function revokeLocalSharingLink(linkId: number, personId: number) {
  const state = await readState();
  const link = state.sharingLinks.find((item) => item.id === linkId && item.personId === personId && item.revokedAt === null);
  if (link) link.revokedAt = new Date().toISOString();
  await writeState(state);
}

export async function getLocalPersonByTokenHash(tokenHash: string) {
  const state = await readState();
  const link = state.sharingLinks.find((item) => item.tokenHash === tokenHash && item.revokedAt === null);
  return link ? state.people.find((person) => person.id === link.personId) ?? null : null;
}

export async function deleteLocalPerson(personId: number, ownerUserId: number) {
  const state = await readState();
  state.people = state.people.filter((person) => !(person.id === personId && person.ownerUserId === ownerUserId));
  state.sharingLinks = state.sharingLinks.filter((link) => link.personId !== personId);
  await writeState(state);
}

function nextId(items: Array<{ id: number }>) {
  return items.reduce((highest, item) => Math.max(highest, item.id), 0) + 1;
}
