import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin whitelist to store emails that should be granted admin access
export const adminWhitelist = pgTable("admin_whitelist", {
  email: text("email").primaryKey().notNull(),
  addedBy: text("added_by").notNull().default("system"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertAdminWhitelistSchema = createInsertSchema(adminWhitelist);

export type AdminWhitelistEntry = typeof adminWhitelist.$inferSelect;
export type InsertAdminWhitelistEntry = typeof adminWhitelist.$inferInsert;

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Firebase UID
  email: text("email").unique().notNull(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  displayName: true,
  photoURL: true,
  isAdmin: true,
});

// For upsert operations
export const upsertUserSchema = insertUserSchema.extend({
  id: z.string(),
  email: z.string().email(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  status: text("status").notNull().default("pending"),
  votes: integer("votes").notNull().default(0),
  answers: integer("answers").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  category: text("category"),
  tags: text("tags"),
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  title: true,
  content: true,
  author: true,
  status: true,
  votes: true,
  answers: true,
  comments: true,
  category: true,
  tags: true,
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  votes: integer("votes").notNull().default(0),
  category: text("category"),
  tags: text("tags"),
  isRichText: boolean("is_rich_text").default(true),
});

export const insertAnswerSchema = createInsertSchema(answers).pick({
  questionId: true,
  content: true,
  author: true,
  category: true,
  tags: true,
  isRichText: true,
});

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

// Comment schema for questions
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  userId: integer("user_id").notNull(),
  parentId: integer("parent_id"), // Null for top-level comments, otherwise references another comment
  depth: integer("depth").default(0), // 0 for top-level, increases for nested replies
  votes: integer("votes").notNull().default(0), // Number of likes on this comment
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  questionId: true,
  content: true,
  author: true,
  userId: true,
  parentId: true,
  depth: true,
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

// Likes schema to track user likes on questions
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertLikeSchema = createInsertSchema(likes).pick({
  questionId: true,
  userId: true,
});

export type Like = typeof likes.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;

// Comment likes schema
export const commentLikes = pgTable("comment_likes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertCommentLikeSchema = createInsertSchema(commentLikes).pick({
  commentId: true,
  userId: true,
});

export type CommentLike = typeof commentLikes.$inferSelect;
export type InsertCommentLike = z.infer<typeof insertCommentLikeSchema>;

// Answer likes schema
export const answerLikes = pgTable("answer_likes", {
  id: serial("id").primaryKey(),
  answerId: integer("answer_id").notNull(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertAnswerLikeSchema = createInsertSchema(answerLikes).pick({
  answerId: true,
  userId: true,
});

export type AnswerLike = typeof answerLikes.$inferSelect;
export type InsertAnswerLike = z.infer<typeof insertAnswerLikeSchema>;
