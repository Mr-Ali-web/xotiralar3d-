import { pgTable, text, boolean, integer, bigint, jsonb, unique } from 'drizzle-orm/pg-core';
export const profiles = pgTable('profiles', {
 id: text().primaryKey(), name: text().notNull(), banned: boolean().notNull().default(false), lastSeen: bigint('last_seen',{mode:'number'}).notNull(),
});
export const houses = pgTable('houses', {
 id: text().primaryKey(), owner: text().notNull().unique().references(()=>profiles.id), name: text().notNull(), hidden: boolean().notNull().default(false),
 rooms: jsonb().$type<any[]>().notNull(), song: text(), visits: integer().notNull().default(0),
});
export const wishes = pgTable('wishes', {
 id: text().primaryKey(), uid: text().notNull().references(()=>profiles.id), text: text().notNull(), at: bigint({mode:'number'}).notNull(),
});
export const guests = pgTable('guests', {
 id: text().primaryKey(), h: text().notNull().references(()=>houses.id,{onDelete:'cascade'}), uid: text().notNull().references(()=>profiles.id), text: text().notNull(), at: bigint({mode:'number'}).notNull(),
});
export const votes = pgTable('votes', {
 id: text().primaryKey(), kind: text().notNull(), target: text().notNull(), uid: text().notNull().references(()=>profiles.id),
}, t=>[unique().on(t.kind,t.target,t.uid)]);
export const news = pgTable('news', { id:text().primaryKey(), t:text().notNull(), b:text().notNull(), img:text().notNull(), at:bigint({mode:'number'}).notNull() });
export const songs = pgTable('songs', { id:text().primaryKey(), t:text().notNull(), a:text().notNull(), url:text().notNull(), category:text().notNull() });
export const reports = pgTable('reports', { id:text().primaryKey(), kind:text().notNull(), target:text().notNull(), uid:text().notNull().references(()=>profiles.id), text:text().notNull(), resolved:boolean().notNull().default(false) });
export const audit = pgTable('audit', { id:text().primaryKey(), by:text().notNull(), action:text().notNull(), target:text().notNull(), at:bigint({mode:'number'}).notNull() });
export const notifications = pgTable('notifications', { id:text().primaryKey(), uid:text().notNull().references(()=>profiles.id), text:text().notNull(), read:boolean().notNull().default(false), at:bigint({mode:'number'}).notNull() });
export const visits = pgTable('visits', { id:text().primaryKey(), h:text().notNull().references(()=>houses.id,{onDelete:'cascade'}), uid:text().notNull().references(()=>profiles.id) },t=>[unique().on(t.h,t.uid)]);
