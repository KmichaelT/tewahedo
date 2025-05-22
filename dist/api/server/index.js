// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var adminWhitelist = pgTable("admin_whitelist", {
  email: text("email").primaryKey().notNull(),
  addedBy: text("added_by").notNull().default("system"),
  addedAt: timestamp("added_at").notNull().defaultNow()
});
var insertAdminWhitelistSchema = createInsertSchema(adminWhitelist);
var users = pgTable("users", {
  id: text("id").primaryKey(),
  // Firebase UID
  email: text("email").unique().notNull(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  displayName: true,
  photoURL: true,
  isAdmin: true
});
var upsertUserSchema = insertUserSchema.extend({
  id: z.string(),
  email: z.string().email()
});
var questions = pgTable("questions", {
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
  tags: text("tags")
});
var insertQuestionSchema = createInsertSchema(questions).pick({
  title: true,
  content: true,
  author: true,
  status: true,
  votes: true,
  answers: true,
  comments: true,
  category: true,
  tags: true
});
var answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  votes: integer("votes").notNull().default(0),
  category: text("category"),
  tags: text("tags"),
  isRichText: boolean("is_rich_text").default(true)
});
var insertAnswerSchema = createInsertSchema(answers).pick({
  questionId: true,
  content: true,
  author: true,
  category: true,
  tags: true,
  isRichText: true
});
var comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  userId: integer("user_id").notNull(),
  parentId: integer("parent_id"),
  // Null for top-level comments, otherwise references another comment
  depth: integer("depth").default(0),
  // 0 for top-level, increases for nested replies
  votes: integer("votes").notNull().default(0)
  // Number of likes on this comment
});
var insertCommentSchema = createInsertSchema(comments).pick({
  questionId: true,
  content: true,
  author: true,
  userId: true,
  parentId: true,
  depth: true
});
var likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull().defaultNow()
});
var insertLikeSchema = createInsertSchema(likes).pick({
  questionId: true,
  userId: true
});
var commentLikes = pgTable("comment_likes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull().defaultNow()
});
var insertCommentLikeSchema = createInsertSchema(commentLikes).pick({
  commentId: true,
  userId: true
});
var answerLikes = pgTable("answer_likes", {
  id: serial("id").primaryKey(),
  answerId: integer("answer_id").notNull(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull().defaultNow()
});
var insertAnswerLikeSchema = createInsertSchema(answerLikes).pick({
  answerId: true,
  userId: true
});

// server/db.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import path from "path";
var envPath = path.resolve(process.cwd(), ".env");
config({ path: envPath });
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  throw new Error("DATABASE_URL environment variable is required");
}
var sql = neon(process.env.DATABASE_URL);
var db = drizzle({ client: sql });
if (process.env.NODE_ENV !== "production") {
  console.log("Database connection established");
}

// server/storage.ts
import { eq } from "drizzle-orm";
var DatabaseStorage = class {
  // In-memory storage for data (these would be database-backed in production)
  comments = /* @__PURE__ */ new Map();
  commentLikes = /* @__PURE__ */ new Map();
  commentLikeId = 1;
  answerLikes = /* @__PURE__ */ new Map();
  answerLikeId = 1;
  likes = /* @__PURE__ */ new Map();
  likeId = 1;
  // User methods
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async getUserByUsername(username) {
    return void 0;
  }
  async createUser(data) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }
  async upsertUser(data) {
    console.log("upsertUser called with data:", data);
    try {
      const existingUserById = await this.getUser(data.id);
      const existingUserByEmail = !existingUserById ? await this.getUserByEmail(data.email) : null;
      if (existingUserById) {
        console.log("Found existing user by ID:", existingUserById);
        const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
        const isDefaultAdmin = data.email === DEFAULT_ADMIN_EMAIL;
        const [updatedUser] = await db.update(users).set({
          // Only update non-admin fields unless user is default admin
          id: data.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          // Only set isAdmin to true for default admin, otherwise preserve existing status
          isAdmin: isDefaultAdmin ? true : existingUserById.isAdmin,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(users.id, data.id)).returning();
        console.log("Updated user with preserved admin status:", updatedUser);
        return updatedUser;
      } else if (existingUserByEmail) {
        console.log("Found existing user by email:", existingUserByEmail);
        const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
        const isDefaultAdmin = data.email === DEFAULT_ADMIN_EMAIL;
        const [updatedUser] = await db.update(users).set({
          // Only update non-admin fields unless user is default admin
          id: data.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          // Only set isAdmin to true for default admin, otherwise preserve existing status
          isAdmin: isDefaultAdmin ? true : existingUserByEmail.isAdmin,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(users.email, data.email)).returning();
        console.log("Updated user by email:", updatedUser);
        return updatedUser;
      } else {
        console.log("Creating new user:", data);
        const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
        const isDefaultAdmin = data.email === DEFAULT_ADMIN_EMAIL;
        try {
          const [newUser] = await db.insert(users).values({
            id: data.id,
            email: data.email,
            displayName: data.displayName,
            photoURL: data.photoURL,
            // Only default admin gets admin privileges, all others start as regular users
            isAdmin: isDefaultAdmin,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).returning();
          console.log("Created new user:", newUser);
          return newUser;
        } catch (insertErr) {
          console.error("Error inserting new user:", insertErr);
          const DEFAULT_ADMIN_EMAIL2 = "kmichaeltb@gmail.com";
          const isDefaultAdmin2 = data.email === DEFAULT_ADMIN_EMAIL2;
          const existingUser = await this.getUserByEmail(data.email);
          const [mergedUser] = await db.insert(users).values({
            id: data.id,
            email: data.email,
            displayName: data.displayName,
            photoURL: data.photoURL,
            // Only default admin or existing admins should have admin status
            isAdmin: isDefaultAdmin2 || existingUser?.isAdmin === true,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).onConflictDoUpdate({
            target: users.id,
            set: {
              email: data.email,
              displayName: data.displayName,
              photoURL: data.photoURL,
              // Only update admin status for default admin
              isAdmin: isDefaultAdmin2 ? true : db.sql`COALESCE(${users.isAdmin}, FALSE)`,
              updatedAt: /* @__PURE__ */ new Date()
            }
          }).returning();
          console.log("Merged user with conflict resolution:", mergedUser);
          return mergedUser;
        }
      }
    } catch (error) {
      console.error("Error in upsertUser:", error);
      throw error;
    }
  }
  async setUserAdmin(userId, isAdmin) {
    try {
      console.log(`setUserAdmin called with userId=${userId} and isAdmin=${isAdmin}`);
      const existingUser = await this.getUser(userId);
      if (!existingUser) {
        console.log(`User with ID ${userId} not found in database, cannot update admin status`);
        return void 0;
      }
      console.log(`Found user in database:`, existingUser);
      if (existingUser.email === "kmichaeltb@gmail.com" && !isAdmin) {
        console.log(`Cannot modify admin status for default admin: ${existingUser.email}`);
        return existingUser;
      }
      const [updatedUser] = await db.update(users).set({
        isAdmin,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.id, userId)).returning();
      console.log(`User admin status updated, result:`, updatedUser);
      return updatedUser;
    } catch (error) {
      console.error("Error setting user admin status:", error);
      console.error("Full error object:", error);
      return void 0;
    }
  }
  async getAllUsers() {
    return await db.select().from(users).orderBy(users.email);
  }
  // Admin whitelist methods
  async isEmailWhitelisted(email) {
    const [entry] = await db.select().from(adminWhitelist).where(eq(adminWhitelist.email, email));
    return !!entry;
  }
  async addEmailToWhitelist(email, addedBy = "system") {
    const [entry] = await db.insert(adminWhitelist).values({
      email,
      addedBy,
      addedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: adminWhitelist.email,
      set: { addedBy, addedAt: /* @__PURE__ */ new Date() }
    }).returning();
    return entry;
  }
  async removeEmailFromWhitelist(email) {
    await db.delete(adminWhitelist).where(eq(adminWhitelist.email, email));
    return true;
  }
  async getWhitelistedEmails() {
    return await db.select().from(adminWhitelist);
  }
  // MemStorage compatibility methods - these will be updated to use the database in a future iteration
  // Question methods - using memory storage for now
  questions = /* @__PURE__ */ new Map();
  questionId = 1;
  async getQuestions() {
    return Array.from(this.questions.values());
  }
  async getQuestion(id) {
    return this.questions.get(id);
  }
  async createQuestion(question) {
    const id = this.questionId++;
    const newQuestion = {
      ...question,
      id,
      date: /* @__PURE__ */ new Date(),
      // Add the required date field
      status: "pending",
      votes: 0,
      answers: 0,
      comments: 0,
      // Ensure category and tags are never undefined
      category: question.category || null,
      tags: question.tags || null
    };
    console.log("Creating question in storage:", newQuestion);
    this.questions.set(id, newQuestion);
    return newQuestion;
  }
  async updateQuestion(id, questionUpdate) {
    const question = this.questions.get(id);
    if (!question) return void 0;
    const updatedQuestion = { ...question, ...questionUpdate };
    this.questions.set(id, updatedQuestion);
    return updatedQuestion;
  }
  async deleteQuestion(id) {
    return this.questions.delete(id);
  }
  // Answer methods - using memory storage for now
  answers = /* @__PURE__ */ new Map();
  answerId = 1;
  async getAnswersByQuestionId(questionId) {
    return Array.from(this.answers.values()).filter(
      (answer) => answer.questionId === questionId
    );
  }
  async getAnswerById(id) {
    return this.answers.get(id);
  }
  async createAnswer(answer) {
    const id = this.answerId++;
    const question = await this.getQuestion(answer.questionId);
    if (question) {
      const updatedAnswer = {
        ...answer,
        id,
        date: /* @__PURE__ */ new Date(),
        // Add the required date field
        votes: 0,
        category: answer.category || null,
        tags: answer.tags || null,
        isRichText: answer.isRichText || null
      };
      console.log("Creating answer with question:", updatedAnswer);
      this.answers.set(id, updatedAnswer);
      await this.updateQuestion(answer.questionId, {
        status: "published",
        // Auto-publish when answered
        answers: question.answers + 1
      });
      return updatedAnswer;
    }
    const newAnswer = {
      ...answer,
      id,
      date: /* @__PURE__ */ new Date(),
      // Add the required date field
      votes: 0,
      category: answer.category || null,
      tags: answer.tags || null,
      isRichText: answer.isRichText || null
    };
    console.log("Creating answer without question:", newAnswer);
    this.answers.set(id, newAnswer);
    return newAnswer;
  }
  async updateAnswer(id, answerUpdate) {
    const answer = this.answers.get(id);
    if (!answer) return void 0;
    const updatedAnswer = { ...answer, ...answerUpdate };
    this.answers.set(id, updatedAnswer);
    return updatedAnswer;
  }
  async deleteAnswer(id) {
    const answer = this.answers.get(id);
    if (!answer) return false;
    const question = this.questions.get(answer.questionId);
    if (question) {
      this.updateQuestion(answer.questionId, {
        answers: Math.max(0, question.answers - 1)
      });
    }
    return this.answers.delete(id);
  }
  // Comment methods - using memory storage for now
  comments = /* @__PURE__ */ new Map();
  commentId = 1;
  async getCommentsByQuestionId(questionId) {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.questionId === questionId
    );
  }
  async getCommentById(id) {
    return this.comments.get(id);
  }
  async getCommentReplies(commentId) {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.parentId === commentId
    );
  }
  async createComment(comment) {
    const id = this.commentId++;
    const question = this.questions.get(comment.questionId);
    if (question) {
      this.updateQuestion(comment.questionId, {
        comments: question.comments + 1
      });
    }
    const newComment = {
      ...comment,
      id,
      date: /* @__PURE__ */ new Date(),
      parentId: comment.parentId || null,
      depth: comment.depth || null,
      votes: 0
      // Initialize votes to zero
    };
    this.comments.set(id, newComment);
    return newComment;
  }
  async deleteCommentWithReplies(id) {
    try {
      const comment = this.comments.get(id);
      if (!comment) return false;
      const allReplies = [];
      const findReplies = (parentId) => {
        const replies = Array.from(this.comments.values()).filter((c) => c.parentId === parentId).map((c) => c.id);
        if (replies.length > 0) {
          allReplies.push(...replies);
          replies.forEach((replyId) => findReplies(replyId));
        }
      };
      findReplies(id);
      console.log(`Deleting comment #${id} with ${allReplies.length} nested replies`);
      for (const replyId of allReplies) {
        this.comments.delete(replyId);
      }
      const deleted = this.comments.delete(id);
      const totalDeleted = allReplies.length + 1;
      const question = this.questions.get(comment.questionId);
      if (question) {
        this.updateQuestion(comment.questionId, {
          comments: Math.max(0, question.comments - totalDeleted)
        });
      }
      return deleted;
    } catch (error) {
      console.error("Error deleting comment with replies:", error);
      return false;
    }
  }
  async deleteComment(id) {
    return this.deleteCommentWithReplies(id);
  }
  // Question Like methods - using memory storage
  likes = /* @__PURE__ */ new Map();
  likeId = 1;
  async likeQuestion(data) {
    const id = this.likeId++;
    const newLike = {
      ...data,
      id,
      date: /* @__PURE__ */ new Date()
    };
    this.likes.set(id, newLike);
    const question = this.questions.get(data.questionId);
    if (question) {
      this.updateQuestion(data.questionId, {
        votes: question.votes + 1
      });
    }
    return newLike;
  }
  async unlikeQuestion(questionId, userId) {
    const like = Array.from(this.likes.values()).find(
      (like2) => like2.questionId === questionId && like2.userId === userId
    );
    if (!like) return false;
    const question = this.questions.get(questionId);
    if (question) {
      this.updateQuestion(questionId, {
        votes: Math.max(0, question.votes - 1)
      });
    }
    return this.likes.delete(like.id);
  }
  async getLikesByQuestionId(questionId) {
    return Array.from(this.likes.values()).filter(
      (like) => like.questionId === questionId
    );
  }
  async hasUserLikedQuestion(questionId, userId) {
    return !!Array.from(this.likes.values()).find(
      (like) => like.questionId === questionId && like.userId === userId
    );
  }
  // Comment Like methods
  commentLikes = /* @__PURE__ */ new Map();
  commentLikeId = 1;
  async likeComment(data) {
    console.log("DEBUG: likeComment called with data:", data);
    const id = this.commentLikeId++;
    const newLike = {
      ...data,
      id,
      date: /* @__PURE__ */ new Date()
    };
    console.log("DEBUG: Setting new comment like in map:", newLike);
    this.commentLikes.set(id, newLike);
    console.log("DEBUG: Getting comment from storage:", data.commentId);
    const comment = this.comments.get(data.commentId);
    console.log("DEBUG: Retrieved comment:", comment);
    if (comment) {
      const currentVotes = comment.votes || 0;
      console.log("DEBUG: Current votes:", currentVotes);
      try {
        comment.votes = currentVotes + 1;
        this.comments.set(data.commentId, comment);
        console.log("DEBUG: Updated comment votes:", comment.votes);
      } catch (error) {
        console.error("DEBUG: Error updating comment votes:", error);
      }
    }
    return newLike;
  }
  async unlikeComment(commentId, userId) {
    console.log("DEBUG: unlikeComment called with", commentId, userId);
    const like = Array.from(this.commentLikes.values()).find(
      (like2) => like2.commentId === commentId && like2.userId === userId
    );
    console.log("DEBUG: Found like to remove:", like);
    if (!like) return false;
    const comment = this.comments.get(commentId);
    console.log("DEBUG: Found comment to update:", comment);
    if (comment) {
      const currentVotes = comment.votes || 0;
      console.log("DEBUG: Current votes:", currentVotes);
      comment.votes = Math.max(0, currentVotes - 1);
      this.comments.set(commentId, comment);
      console.log("DEBUG: Updated comment votes:", comment.votes);
    }
    const result = this.commentLikes.delete(like.id);
    console.log("DEBUG: Result of deleting like:", result);
    return result;
  }
  async getLikesByCommentId(commentId) {
    return Array.from(this.commentLikes.values()).filter(
      (like) => like.commentId === commentId
    );
  }
  async hasUserLikedComment(commentId, userId) {
    return !!Array.from(this.commentLikes.values()).find(
      (like) => like.commentId === commentId && like.userId === userId
    );
  }
  // Answer Like methods
  answerLikes = /* @__PURE__ */ new Map();
  answerLikeId = 1;
  async likeAnswer(data) {
    const id = this.answerLikeId++;
    const newLike = {
      ...data,
      id,
      date: /* @__PURE__ */ new Date()
    };
    this.answerLikes.set(id, newLike);
    const answer = this.answers.get(data.answerId);
    if (answer) {
      this.updateAnswer(data.answerId, {
        votes: answer.votes + 1
      });
    }
    return newLike;
  }
  async unlikeAnswer(answerId, userId) {
    const like = Array.from(this.answerLikes.values()).find(
      (like2) => like2.answerId === answerId && like2.userId === userId
    );
    if (!like) return false;
    const answer = this.answers.get(answerId);
    if (answer) {
      this.updateAnswer(answerId, {
        votes: Math.max(0, answer.votes - 1)
      });
    }
    return this.answerLikes.delete(like.id);
  }
  async getLikesByAnswerId(answerId) {
    return Array.from(this.answerLikes.values()).filter(
      (like) => like.answerId === answerId
    );
  }
  async hasUserLikedAnswer(answerId, userId) {
    return !!Array.from(this.answerLikes.values()).find(
      (like) => like.answerId === answerId && like.userId === userId
    );
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import session from "express-session";
import MemoryStore from "memorystore";

// server/auth.ts
import admin from "firebase-admin";
if (!admin.apps.length) {
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./attached_assets/tewahedoanswers-eac01-firebase-adminsdk-fbsvc-effcf15a33.json";
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      projectId: "tewahedoanswers-eac01",
      storageBucket: "tewahedoanswers-eac01.firebasestorage.app"
    });
    console.log("Firebase Admin SDK initialized successfully with service account from file");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    console.error("Attempting to initialize without service account...");
    try {
      admin.initializeApp({
        projectId: "tewahedoanswers-eac01",
        storageBucket: "tewahedoanswers-eac01.firebasestorage.app"
      });
      console.log("Firebase Admin SDK initialized without service account");
    } catch (fallbackError) {
      console.error("Failed to initialize Firebase Admin SDK:", fallbackError);
      throw fallbackError;
    }
  }
}
var authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Auth check - Session:", req.session);
      console.log("Auth check - User:", req.user);
      if (req.session && req.session.userId) {
        try {
          const user = await storage.getUser(req.session.userId);
          if (user) {
            const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
            const isDefaultAdmin = user.email === DEFAULT_ADMIN_EMAIL;
            const isAdmin = isDefaultAdmin || user.isAdmin;
            req.session.isAdmin = isAdmin;
            req.session.userEmail = user.email;
            req.user = {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              isAdmin
            };
            console.log(`Session user loaded: ${user.email}, isAdmin: ${isAdmin}`);
          } else {
            console.log("No authenticated user found");
          }
        } catch (dbError) {
          console.error("Error loading user from session:", dbError);
        }
        return next();
      }
      console.log("No authenticated user found");
      return next();
    }
    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      try {
        const email = decodedToken.email;
        if (email) {
          const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
          let isAdmin = email === DEFAULT_ADMIN_EMAIL;
          const dbUser = await storage.getUserByEmail(email);
          if (dbUser) {
            isAdmin = isAdmin || dbUser.isAdmin;
          }
          req.user = {
            id: decodedToken.uid,
            email,
            displayName: decodedToken.name || null,
            photoURL: decodedToken.picture || null,
            isAdmin
          };
          if (req.session) {
            req.session.userId = decodedToken.uid;
            req.session.userEmail = email;
            req.session.isAdmin = isAdmin;
          }
          console.log(`Auth middleware - user: ${email}, isAdmin: ${isAdmin}`);
        } else {
          req.user = {
            id: decodedToken.uid,
            email: null,
            displayName: decodedToken.name || null,
            photoURL: decodedToken.picture || null,
            isAdmin: false
          };
          if (req.session) {
            req.session.userId = decodedToken.uid;
          }
        }
      } catch (dbError) {
        console.error("Error checking admin status:", dbError);
        req.user = {
          id: decodedToken.uid,
          email: decodedToken.email || null,
          displayName: decodedToken.name || null,
          photoURL: decodedToken.picture || null
        };
        if (req.session) {
          req.session.userId = decodedToken.uid;
        }
      }
    } catch (tokenError) {
      console.error("Token verification error:", tokenError);
    }
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    next();
  }
};
var requireAuth = (req, res, next) => {
  if (req.user) {
    return next();
  }
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Authentication required" });
};
var requireAdmin = async (req, res, next) => {
  try {
    console.log("Checking admin access for session:", req.session);
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const userEmail = req.session.userEmail || req.user?.email;
    const userId = req.session.userId;
    if (!userEmail) {
      return res.status(401).json({ message: "User email not found" });
    }
    const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
    if (userEmail === DEFAULT_ADMIN_EMAIL) {
      console.log(`Default admin detected: ${userEmail}`);
      if (req.session) {
        req.session.isAdmin = true;
      }
      if (req.user) {
        req.user.isAdmin = true;
      }
      try {
        const user = await storage.getUserByEmail(userEmail);
        if (user) {
          if (!user.isAdmin) {
            await storage.setUserAdmin(user.id, true);
            console.log(`Updated ${userEmail} to admin in database`);
          }
        } else if (userId) {
          const userById = await storage.getUser(userId);
          if (userById && !userById.isAdmin) {
            await storage.setUserAdmin(userById.id, true);
            console.log(`Updated user by ID ${userId} to admin in database`);
          }
        }
      } catch (dbError) {
        console.error("Error updating admin status in database:", dbError);
      }
      console.log(`Admin access granted to default admin: ${userEmail}`);
      return next();
    }
    if (req.session.isAdmin === true) {
      console.log("Admin access granted via session to:", req.session.userEmail);
      return next();
    }
    if (req.user && req.user.isAdmin === true) {
      console.log("Admin access granted via user object to:", req.user.email);
      return next();
    }
    try {
      const user = await storage.getUserByEmail(userEmail);
      if (user && user.isAdmin) {
        console.log(`Admin access granted after database check: ${userEmail}`);
        if (req.session) {
          req.session.isAdmin = true;
        }
        if (req.user) {
          req.user.isAdmin = true;
        }
        return next();
      }
    } catch (dbError) {
      console.error("Error looking up admin status in database:", dbError);
    }
    console.log("Admin access denied for:", userEmail);
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({ message: "Server error checking admin status" });
  }
};

// server/routes.ts
import admin2 from "firebase-admin";

// server/seedSampleData.ts
var sampleQuestions = [
  {
    title: "What is the role of fasting in the Ethiopian Orthodox Tewahedo tradition?",
    content: "<p>I'm interested in learning about the fasting traditions of the Ethiopian Orthodox Tewahedo Church. How many fasting days are there in the year? What are the rules during fasting periods? And how does this compare to fasting in other Orthodox traditions?</p>",
    author: "NewBeliever23",
    status: "published",
    category: "Spiritual Practices",
    tags: "fasting,traditions,spiritual discipline"
  },
  {
    title: "What is the significance of the tabot in Ethiopian Orthodox churches?",
    content: "<p>I've read that Ethiopian Orthodox churches contain a tabot, which is a replica of the Ark of the Covenant. What is the spiritual and historical significance of the tabot? How is it used in worship, and why is it so central to Ethiopian Orthodox tradition?</p>",
    author: "HistoryExplorer",
    status: "published",
    category: "Church Architecture",
    tags: "tabot,ark of covenant,sacred objects"
  },
  {
    title: "How does the Ethiopian Orthodox Church view the Holy Trinity?",
    content: "<p>I'm studying different Christian denominations' understanding of the Trinity. Could someone explain the Ethiopian Orthodox Tewahedo Church's theological position on the Holy Trinity? Are there any unique aspects or emphases in how the Trinity is understood?</p>",
    author: "TheologyStudent",
    status: "published",
    category: "Theology",
    tags: "trinity,doctrine,theology"
  },
  {
    title: "What saints are particularly venerated in the Ethiopian Orthodox tradition?",
    content: "<p>I'm curious about which saints hold special importance in the Ethiopian Orthodox Tewahedo Church. Are there saints who are uniquely Ethiopian? How does saint veneration differ from other Orthodox traditions?</p>",
    author: "FaithJourney",
    status: "published",
    category: "Saints",
    tags: "saints,veneration,Ethiopian saints"
  },
  {
    title: "Can someone explain the Ethiopian Orthodox position on Christology?",
    content: "<p>I understand that the Ethiopian Orthodox Church is part of the Oriental Orthodox family and holds to miaphysite Christology. Could someone explain this theological position in detail? How does it differ from Chalcedonian Christology of Eastern Orthodox and Catholic churches?</p>",
    author: "TheologyBuff",
    status: "published",
    category: "Theology",
    tags: "christology,doctrine,miaphysitism"
  },
  {
    title: "What is the meaning behind the elaborate cross designs in Ethiopian Orthodox art?",
    content: "<p>I've been fascinated by the beautiful and complex cross designs in Ethiopian Orthodox art and architecture. What is the symbolism behind these intricate cross patterns? Do different designs have different meanings?</p>",
    author: "ArtAppreciator",
    status: "published",
    category: "Art and Symbolism",
    tags: "crosses,art,symbolism"
  },
  {
    title: "What is the process for becoming a deacon or priest in the Ethiopian Orthodox Church?",
    content: "<p>I'm interested in learning about the ordination process in the Ethiopian Orthodox tradition. What are the requirements for becoming a deacon or priest? What kind of training is involved? Are married men allowed to become priests?</p>",
    author: "VocationExplorer",
    status: "published",
    category: "Clergy",
    tags: "ordination,priesthood,vocations"
  },
  {
    title: "How are the sacraments (mysteries) practiced in the Ethiopian Orthodox Church?",
    content: "<p>I'd like to understand how the Ethiopian Orthodox Church practices the holy sacraments. How many sacraments are recognized? Are there any differences in how baptism, communion, confession, etc. are approached compared to other Orthodox traditions?</p>",
    author: "SacramentalLife",
    status: "published",
    category: "Sacraments",
    tags: "baptism,eucharist,holy mysteries"
  },
  {
    title: "What is the Ethiopian Orthodox teaching about life after death?",
    content: "<p>I'm interested in learning about the Ethiopian Orthodox Church's teachings on what happens after death. What are the beliefs about heaven, hell, judgment, and prayer for the departed? Are there any distinctive elements compared to other Christian traditions?</p>",
    author: "EschatologyStudent",
    status: "published",
    category: "Afterlife",
    tags: "heaven,hell,prayer for dead"
  },
  {
    title: "What languages are used in Ethiopian Orthodox worship and why?",
    content: "<p>I know that Ge'ez is an ancient liturgical language of the Ethiopian Orthodox Church, but I'm wondering what other languages are used in services today. How much of the liturgy remains in Ge'ez versus Amharic or other languages? What is the significance of preserving Ge'ez in worship?</p>",
    author: "LanguageLover",
    status: "published",
    category: "Liturgy",
    tags: "Ge'ez,languages,worship"
  }
];
var sampleAnswers = [
  // Answer for fasting question
  {
    questionTitle: "What is the role of fasting in the Ethiopian Orthodox Tewahedo tradition?",
    content: "<p>Fasting is a central spiritual discipline in the Ethiopian Orthodox Tewahedo Church, with more fasting days than perhaps any other Christian tradition. Here are the key aspects:</p><ul><li>Ethiopian Orthodox Christians observe approximately 180-250 fasting days per year, depending on one's level of piety and observance.</li><li>The main fasting periods include the 55-day Fast of Lent (Hudade or Abiy Tsom), the Fast of the Apostles (10-40 days), the Fast of the Prophets (43 days), and the Fast of Nineveh (3 days).</li><li>During fasting periods, adherents abstain from all animal products (meat, dairy, eggs) and generally eat only one meal per day, after 3 pm or after the liturgy is complete.</li><li>Wednesday and Friday are regular weekly fasting days throughout the year.</li></ul><p>This extensive fasting tradition exceeds what is typical in Eastern Orthodox churches and is considered a profound expression of devotion and spiritual discipline in the Ethiopian tradition.</p>",
    author: "Father Yohannes",
    isRichText: true,
    category: "Spiritual Practices",
    tags: "fasting,traditions,spiritual discipline"
  },
  // Answer for tabot question
  {
    questionTitle: "What is the significance of the tabot in Ethiopian Orthodox churches?",
    content: "<p>The tabot holds profound significance in the Ethiopian Orthodox tradition and is the most sacred object in the church. Here's an explanation of its importance:</p><ul><li>The tabot is a consecrated wooden tablet that represents the Ark of the Covenant and the Tablets of Law given to Moses.</li><li>Every Ethiopian Orthodox church must have a tabot to be considered consecrated, as it represents the divine presence of God.</li><li>Only ordained priests may touch the tabot, and it is typically kept hidden from public view in the church's inner sanctuary (Holy of Holies or Meqdes).</li><li>During the annual Timkat (Epiphany) celebration, the tabot is removed from the church, wrapped in ornate cloth, and carried in procession to water, symbolizing Christ's baptism in the Jordan River.</li></ul><p>The centrality of the tabot in Ethiopian Orthodoxy reflects Ethiopia's historical connection to ancient Israel and the belief that the original Ark of the Covenant resides in Axum, Ethiopia. This belief is foundational to Ethiopian Orthodox identity and represents the covenant relationship between God and the Ethiopian people.</p>",
    author: "Church Scholar",
    isRichText: true,
    category: "Church Architecture",
    tags: "tabot,ark of covenant,sacred objects"
  },
  // Answer for Trinity question
  {
    questionTitle: "How does the Ethiopian Orthodox Church view the Holy Trinity?",
    content: "<p>The Ethiopian Orthodox Tewahedo Church holds a traditional understanding of the Holy Trinity that aligns with ancient Christian formulations while incorporating unique cultural expressions. Key aspects include:</p><ul><li>The Church fully affirms the Nicene-Constantinopolitan understanding of the Trinity: one God in three persons (Father, Son, and Holy Spirit), consubstantial and co-eternal.</li><li>The term 'Tewahedo' itself (meaning 'unified' or 'made one') primarily refers to Christology but reflects the Church's emphasis on divine unity within the Trinity.</li><li>Ethiopian Orthodox iconography often depicts the Trinity in distinctive ways, such as three identical figures or three faces on one head, emphasizing their unity of essence.</li><li>The liturgy contains numerous Trinitarian doxologies and prayers, with frequent use of three-fold repetitions.</li></ul><p>A distinctive feature of Ethiopian Orthodox Trinitarian expression is found in religious poetry (especially the Mezmurat or hymns), which uses rich analogies from nature and daily life to express the mystery of the Three-in-One. The Trinity is commonly compared to the sun (one entity with light, heat, and the orb itself) in Ethiopian theological teaching.</p>",
    author: "Deacon Tewodros",
    isRichText: true,
    category: "Theology",
    tags: "trinity,doctrine,theology"
  },
  // Answer for saints question
  {
    questionTitle: "What saints are particularly venerated in the Ethiopian Orthodox tradition?",
    content: "<p>Saint veneration is richly developed in the Ethiopian Orthodox tradition, featuring both universal Christian saints and uniquely Ethiopian holy figures. Key aspects include:</p><ul><li>The Virgin Mary (known as Mariam) holds supreme veneration, with numerous feast days and a special monthly commemoration.</li><li>The Nine Saints (\u1270\u1235\u12D3\u1271 \u1245\u12F1\u1233\u1295) who came from Syria in the 5th-6th centuries are highly venerated for establishing monasticism and spreading Christianity in Ethiopia.</li><li>Uniquely Ethiopian saints include Abune Tekle Haymanot, Yared (creator of sacred music), and King Lalibela (who built the famous rock-hewn churches).</li><li>St. George (Kidus Giorgis) has extraordinary popularity and is considered a patron saint of Ethiopia, with churches dedicated to him throughout the country.</li></ul><p>Ethiopian Orthodox saint veneration is distinguished by its integration with indigenous culture, resulting in distinctive iconography, feast celebrations, and devotional practices. Saints' stories are preserved in the Synaxarium (Senkessar) and frequently commemorated during the liturgy. Many Ethiopian saints are associated with miraculous healings, and their relics and burial places are important pilgrimage sites.</p>",
    author: "Church Scholar",
    isRichText: true,
    category: "Saints",
    tags: "saints,veneration,Ethiopian saints"
  },
  // Answer for Christology question
  {
    questionTitle: "Can someone explain the Ethiopian Orthodox position on Christology?",
    content: "<p>The Ethiopian Orthodox Tewahedo Church holds to miaphysite Christology, which is central to its theological identity. Here's an explanation of this position:</p><ul><li>The term 'Tewahedo' means 'unified' or 'made one,' referring to the belief in the perfect union of Christ's divinity and humanity.</li><li>Ethiopian Orthodox Christology affirms that after the Incarnation, Christ has one united nature (miaphysis) that is both fully divine and fully human, without separation, confusion, alteration, or division.</li><li>This differs from Chalcedonian Christology (of Eastern Orthodox and Catholic traditions), which describes Christ as having two natures (divine and human) in one person.</li><li>The Ethiopian Church rejected the Council of Chalcedon (451 CE) alongside other Oriental Orthodox churches, viewing its formulation as potentially undermining the complete unity of Christ.</li></ul><p>It's important to note that modern ecumenical dialogues have recognized that both traditions affirm the fullness of Christ's humanity and divinity, with differences being largely terminological rather than substantive. The Ethiopian emphasis on unity reflects a deeply held conviction that salvation requires the complete union of humanity with divinity in the person of Christ.</p>",
    author: "Father Yohannes",
    isRichText: true,
    category: "Theology",
    tags: "christology,doctrine,miaphysitism"
  },
  // Answer for cross designs question
  {
    questionTitle: "What is the meaning behind the elaborate cross designs in Ethiopian Orthodox art?",
    content: "<p>Ethiopian Orthodox crosses are among the most distinctive and elaborate in Christian tradition, rich with symbolism and meaning:</p><ul><li>The interlaced patterns in Ethiopian crosses often represent eternity and the infinite nature of God, with no beginning or end.</li><li>Most Ethiopian crosses feature equal-length arms, sometimes with flared ends, symbolizing the light of Christ spreading in all directions.</li><li>Many designs include a net-like or lattice pattern, representing Christ as the fisher of men or the concept of salvation.</li><li>The number of points or decorative elements often has specific meaning: twelve points for the apostles, four for the evangelists, or three representing the Trinity.</li></ul><p>Different regions of Ethiopia have developed their own distinctive cross styles. For example, the Lalibela region is known for processional crosses with circular or semi-circular patterns, while Axum is known for hand crosses with geometric precision. The cross design tradition continues to evolve, with contemporary artisans creating new variations while maintaining traditional symbolism.</p><p>Beyond being religious symbols, these crosses serve as powerful cultural identifiers and artistic expressions that have become emblematic of Ethiopian Christian identity worldwide.</p>",
    author: "Art Historian",
    isRichText: true,
    category: "Art and Symbolism",
    tags: "crosses,art,symbolism"
  },
  // Answer for ordination question
  {
    questionTitle: "What is the process for becoming a deacon or priest in the Ethiopian Orthodox Church?",
    content: "<p>The ordination process in the Ethiopian Orthodox Tewahedo Church follows ancient traditions with specific requirements:</p><ul><li>Deacons (Diyakon) are typically ordained from a young age (often as children), beginning their service as assistants in the liturgy. They must memorize liturgical texts and learn sacred chants.</li><li>To become a priest (Qes), a candidate must:</li><ul><li>Be at least 30 years of age</li><li>Demonstrate thorough knowledge of liturgical practices and scriptural texts</li><li>Be married (prior to ordination, as priests cannot marry after ordination)</li><li>Be recommended by the community and ecclesiastical authorities</li><li>Pass examinations on theology, liturgy, and church canons</li></ul><li>If a priest's wife dies, he cannot remarry but may become a monk. Some priests choose celibacy from the beginning and live a more ascetic life.</li></ul><p>The ordination ceremony involves the laying on of hands by a bishop, anointment, and investing with clerical vestments. Education traditionally occurred through the church school system (beginning with memorization of Ge'ez texts, often without understanding their meaning), though formal theological seminaries now exist alongside traditional training.</p><p>A distinctive feature of Ethiopian Orthodox priesthood is the combination of formalized ritual knowledge with the practical care of the parish community. Priests are deeply integrated into community life, serving not only as liturgical leaders but as counselors, mediators, and guardians of tradition.</p>",
    author: "Father Yohannes",
    isRichText: true,
    category: "Clergy",
    tags: "ordination,priesthood,vocations"
  },
  // Answer for sacraments question
  {
    questionTitle: "How are the sacraments (mysteries) practiced in the Ethiopian Orthodox Church?",
    content: "<p>The Ethiopian Orthodox Tewahedo Church recognizes seven sacraments (mysteries or \u121D\u1225\u1322\u122B\u1275/mist'irat). Here's how they are practiced:</p><ul><li><strong>Baptism (\u1325\u121D\u1240\u1275/T'imqet)</strong>: Performed through triple immersion, typically 40 days after birth for boys and 80 days for girls. Adults undergo a period of catechesis before baptism.</li><li><strong>Confirmation (\u12AD\u122D\u1235\u1275\u1293/Kristina)</strong>: Administered immediately after baptism through anointing with holy myron (oil).</li><li><strong>Eucharist (\u1245\u12F1\u1235 \u1241\u122D\u1263\u1295/Qidus Qurban)</strong>: The central sacrament, believed to be the true body and blood of Christ. Communicants must be baptized, confirmed, and in a state of ritual purity. Preparation includes fasting from the previous evening.</li><li><strong>Penance (\u1295\u1235\u1210/Nisiha)</strong>: Confession is made to a priest who assigns appropriate penance and offers absolution.</li><li><strong>Holy Orders (\u12AD\u1205\u1290\u1275/Kihinet)</strong>: Ordination to the various ranks of ministry, conferred by a bishop through the laying on of hands.</li><li><strong>Matrimony (\u130B\u1265\u127B/Gabcha)</strong>: A solemn covenant blessed by the Church; divorce is permitted only under specific circumstances.</li><li><strong>Unction of the Sick (\u12E8\u1215\u1218\u121D\u1270\u129E\u127D \u1245\u1265\u12D3\u1275)</strong>: Anointing with oil for healing of body and soul.</li></ul><p>Distinctive features of Ethiopian sacramental practice include the use of the tabot (altar tablet) in the Eucharistic liturgy, the prominence of Ge'ez language in sacramental formulas, and elaborate ritual elements that reflect the church's ancient traditions. Most Ethiopian Orthodox churches celebrate the Divine Liturgy only in the morning hours, and communion is typically offered with a spoon directly into the mouth of the faithful.</p>",
    author: "Deacon Tewodros",
    isRichText: true,
    category: "Sacraments",
    tags: "baptism,eucharist,holy mysteries"
  },
  // Answer for afterlife question 
  {
    questionTitle: "What is the Ethiopian Orthodox teaching about life after death?",
    content: "<p>The Ethiopian Orthodox Tewahedo Church holds traditional Christian views on the afterlife with some distinctive emphases:</p><ul><li>Upon death, the soul undergoes a particular judgment determining its immediate state of blessing or suffering.</li><li>The righteous souls rest in a state of preliminary bliss (often described as Abraham's Bosom or Paradise), while the unrighteous experience preliminary suffering.</li><li>A distinctive feature is the belief in toll-houses (\u1218\u1245\u1220\u134D\u1275/meqseft), where demons challenge the soul's passage based on sins committed in life, countered by angels defending the soul.</li><li>The Church strongly emphasizes prayer for the dead, believing intercession can improve the condition of souls awaiting the final judgment.</li><li>The Fetha Nagast (Law of Kings) contains detailed teachings about the intermediate state of souls.</li></ul><p>On the Last Day, the Ethiopian Orthodox Church teaches the general resurrection of all people, followed by Christ's final judgment. The righteous will inherit eternal glory in the renewed heaven and earth, while the unrighteous face eternal separation from God.</p><p>Distinctive practices related to these beliefs include elaborate funeral services, commemoration of the dead on the 3rd, 7th, 40th days and annually after death, and the major feast of Tazkar (memorial) services. The Church calendar includes several days dedicated to all departed souls when special prayers are offered.</p>",
    author: "Father Yohannes",
    isRichText: true,
    category: "Afterlife",
    tags: "heaven,hell,prayer for dead"
  },
  // Answer for liturgical languages question
  {
    questionTitle: "What languages are used in Ethiopian Orthodox worship and why?",
    content: "<p>The linguistic landscape of Ethiopian Orthodox worship is rich and layered, balancing ancient tradition with accessibility:</p><ul><li><strong>Ge'ez</strong> remains the primary liturgical language, especially for the Eucharistic liturgy (Qeddase) and other sacramental texts. It is an ancient Semitic language that ceased to be spoken conversationally around the 10th-14th centuries but continues as a sacred language similar to Latin in Roman Catholicism.</li><li><strong>Amharic</strong> is increasingly used for sermons, Scripture readings, and congregational prayers to ensure understanding. In many churches, the Scriptures are read first in Ge'ez (maintaining tradition) and then in Amharic (for comprehension).</li><li><strong>Local languages</strong> such as Tigrinya, Oromo, and others are now utilized in regions where these are the primary spoken languages, particularly for preaching and teaching.</li></ul><p>The preservation of Ge'ez in worship serves several important purposes:</p><ul><li>It maintains historical continuity with the ancient church</li><li>It preserves the precise theological formulations of the early church fathers</li><li>It fosters a sense of the sacred and transcendent in worship</li><li>It serves as a unifying element across different regions and language groups</li></ul><p>In recent decades, there has been an increased effort to teach Ge'ez to clergy and interested laity, ensuring the language's survival. Meanwhile, the gradual incorporation of vernacular languages represents an adaptation to contemporary needs while maintaining the core traditional elements of worship.</p>",
    author: "Linguistic Scholar",
    isRichText: true,
    category: "Liturgy",
    tags: "Ge'ez,languages,worship"
  }
];
async function seedSampleData() {
  console.log("Starting to add sample questions and answers...");
  try {
    const existingQuestions = await storage.getQuestions();
    const existingTitles = new Set(existingQuestions.map((q) => q.title));
    let questionCount = 0;
    let answerCount = 0;
    for (const questionData of sampleQuestions) {
      if (existingTitles.has(questionData.title)) {
        console.log(`Question "${questionData.title}" already exists, skipping.`);
        continue;
      }
      const votes = Math.floor(Math.random() * 20);
      const comments3 = Math.floor(Math.random() * 5);
      const newQuestion = await storage.createQuestion({
        title: questionData.title,
        content: questionData.content,
        author: questionData.author,
        status: questionData.status || "published",
        votes,
        answers: 0,
        // Will be updated when answer is added
        comments: comments3,
        category: questionData.category || null,
        tags: questionData.tags || null
      });
      console.log(`Added question: ${newQuestion.title} (ID: ${newQuestion.id})`);
      questionCount++;
      const matchingAnswer = sampleAnswers.find((a) => a.questionTitle === questionData.title);
      if (matchingAnswer) {
        const answerData = {
          questionId: newQuestion.id,
          content: matchingAnswer.content,
          author: matchingAnswer.author,
          isRichText: matchingAnswer.isRichText,
          category: matchingAnswer.category || null,
          tags: matchingAnswer.tags || null
        };
        const newAnswer = await storage.createAnswer(answerData);
        console.log(`Added answer for question ID ${newQuestion.id}`);
        answerCount++;
        await storage.updateQuestion(newQuestion.id, {
          answers: 1,
          status: "published"
          // Ensure the question is published if it has an answer
        });
      }
    }
    console.log(`Successfully added ${questionCount} questions and ${answerCount} answers.`);
  } catch (error) {
    console.error("Error adding sample data:", error);
  }
}

// server/routes.ts
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  try {
    const adminUser = await storage.getUserByEmail("admin@tewahedanswers.com");
    if (!adminUser) {
      await storage.upsertUser({
        id: "admin-system",
        email: "admin@tewahedanswers.com",
        displayName: "System Admin",
        isAdmin: true
      });
      console.log("Created default admin user");
    }
    const existingQuestions = await storage.getQuestions();
    if (existingQuestions.length <= 1) {
      console.log("Seeding sample questions and answers for testing...");
      await seedSampleData();
    }
    const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
    const defaultAdminUser = await storage.getUserByEmail(DEFAULT_ADMIN_EMAIL);
    if (defaultAdminUser && !defaultAdminUser.isAdmin) {
      await storage.setUserAdmin(defaultAdminUser.id, true);
      console.log(
        `Set admin privileges for default admin: ${DEFAULT_ADMIN_EMAIL}`
      );
    }
  } catch (error) {
    console.error("Error initializing admin users:", error);
  }
  const MemorySessionStore = MemoryStore(session);
  app2.use(
    session({
      secret: process.env.SESSION_SECRET || "tewahed-answers-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemorySessionStore({
        checkPeriod: 864e5
        // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1e3
        // 1 week
      }
    })
  );
  app2.use(authMiddleware);
  app2.post("/api/auth/google", async (req, res) => {
    try {
      console.log("Auth request received with idToken");
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ message: "ID token is required" });
      }
      try {
        const [header, payload, signature] = idToken.split(".");
        const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
        const userId = decoded.user_id || decoded.sub;
        const email = decoded.email;
        const displayName = decoded.name;
        const photoURL = decoded.picture;
        try {
          const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
          const isDefaultAdmin = email === DEFAULT_ADMIN_EMAIL;
          if (isDefaultAdmin) {
            console.log(`IMPORTANT: ${email} is the default admin`);
          }
          const isAdminUser = isDefaultAdmin;
          const dbUser = await storage.getUserByEmail(email);
          const userData = await storage.upsertUser({
            id: userId,
            email,
            displayName: displayName || null,
            photoURL: photoURL || null,
            // isAdmin is true if:
            // 1. This is the default admin
            // 2. This is an existing user who was already an admin
            isAdmin: isAdminUser || dbUser?.isAdmin === true
          });
          if (isDefaultAdmin && !userData.isAdmin) {
            console.log(
              `CRITICAL: Fixing admin status for ${email} after upsert`
            );
            const updatedUser = await storage.setUserAdmin(userId, true);
            if (updatedUser) {
              console.log(`Successfully updated ${email} to admin status`);
            }
          }
          req.session.userId = userId;
          req.session.userEmail = email;
          if (isDefaultAdmin) {
            req.session.isAdmin = true;
          } else {
            req.session.isAdmin = userData.isAdmin;
          }
          console.log(
            `User authenticated: ${email}, Admin: ${userData.isAdmin}`
          );
          req.user = {
            id: userId,
            email,
            displayName,
            photoURL,
            isAdmin: isDefaultAdmin ? true : userData.isAdmin
          };
        } catch (dbError) {
          console.error("Database error saving user:", dbError);
        }
        console.log("Created user session from Google token:", req.user);
        return res.status(200).json({
          message: "Authentication successful",
          user: req.user
        });
      } catch (tokenError) {
        console.error("Token parsing error:", tokenError);
        return res.status(400).json({ message: "Invalid token format" });
      }
    } catch (error) {
      console.error("Auth error:", error);
      return res.status(500).json({ message: "Authentication failed" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/auth/user", async (req, res) => {
    console.log("Auth check - Session:", req.session);
    console.log("Auth check - User:", req.user);
    if (!req.user && !req.session?.userId) {
      console.log("No authenticated user found");
      return res.status(401).json({ message: "Unauthorized" });
    }
    const email = req.user?.email || req.session?.userEmail;
    if (email) {
      const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
      if (email === DEFAULT_ADMIN_EMAIL) {
        req.session.isAdmin = true;
        console.log(`Default admin user detected: ${email}`);
      } else {
        try {
          const user = await storage.getUserByEmail(email);
          if (user) {
            req.session.isAdmin = user.isAdmin;
          } else {
            req.session.isAdmin = false;
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          req.session.isAdmin = false;
        }
      }
    }
    const userData = {
      id: req.user?.id || req.session?.userId,
      email,
      displayName: req.user?.displayName,
      photoURL: req.user?.photoURL,
      isAdmin: req.session?.isAdmin || false
    };
    console.log("Returning user data:", userData);
    res.json(userData);
  });
  app2.get("/api/questions", async (req, res) => {
    try {
      const questions3 = await storage.getQuestions();
      const publishedQuestions = questions3.filter(
        (q) => q.status === "published"
      );
      if (publishedQuestions.length === 0) {
        const sampleQuestion = await storage.createQuestion({
          title: "What is the significance of the Ethiopian Orthodox Tewahedo Church's unique calendar?",
          content: "<p>I've noticed that the Ethiopian Orthodox Church follows a different calendar. Could someone explain its significance and how it differs from other Orthodox calendars? I'm particularly interested in the historical context and religious significance.</p><p>Also, how does this affect the celebration of holidays and religious events compared to other Orthodox churches?</p>",
          author: "HistoryBuff42"
        });
        await storage.updateQuestion(sampleQuestion.id, {
          status: "published",
          votes: 15,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3)
          // 7 days ago
        });
        const answer = await storage.createAnswer({
          questionId: sampleQuestion.id,
          content: "<p>The Ethiopian Orthodox Tewahedo Church follows the ancient Alexandrian calendar, which is based on the ancient Egyptian calendar modified by Coptic adjustments. Here are the key aspects:</p><ul><li>The Ethiopian calendar has 13 months \u2013 12 months of 30 days each and a 13th month (Pagume) of 5 or 6 days (in leap year).</li><li>It is approximately 7-8 years behind the Gregorian calendar due to different calculations of the birth year of Christ.</li><li>Unlike Western calendars, the Ethiopian New Year begins on September 11th (or September 12th in leap years), marking the end of the rainy season.</li></ul><p>This calendar is deeply significant as it preserves ancient Christian traditions and reflects Ethiopia's unique historical development, largely isolated from Western Christian influences.</p><p>Major holidays like Christmas (Genna) and Epiphany (Timkat) are celebrated on different dates than in other Orthodox traditions. This creates a distinct rhythm to religious life that is uniquely Ethiopian.</p>",
          author: "Church Scholar",
          isRichText: true,
          category: "History",
          tags: "calendar,traditions,orthodox"
        });
        await storage.updateAnswer(answer.id, {
          votes: 10,
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1e3)
          // 5 days ago
        });
        const comment1 = await storage.createComment({
          questionId: sampleQuestion.id,
          content: "I've been curious about this too. I attended an Ethiopian Orthodox service recently and was confused by the date references.",
          author: "CuriousVisitor",
          userId: 2,
          depth: 0
        });
        const comment2 = await storage.createComment({
          questionId: sampleQuestion.id,
          content: "My Ethiopian friend explained that they're currently in the year 2015. It was quite surprising!",
          author: "GlobalLearner",
          userId: 2,
          depth: 0
        });
        const reply1 = await storage.createComment({
          questionId: sampleQuestion.id,
          content: "Yes, the current Ethiopian year differs from the Gregorian calendar. It's fascinating how different cultures track time differently.",
          author: "HistoryBuff42",
          userId: 2,
          parentId: comment1.id,
          depth: 1
        });
        const reply2 = await storage.createComment({
          questionId: sampleQuestion.id,
          content: "I believe it's because they calculated the birth of Christ differently than the Western calendar makers did.",
          author: "Church Scholar",
          userId: 1,
          parentId: comment2.id,
          depth: 1
        });
        const updatedQuestions = await storage.getQuestions();
        const updatedPublishedQuestions = updatedQuestions.filter(
          (q) => q.status === "published"
        );
        return res.json(updatedPublishedQuestions);
      }
      res.json(publishedQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });
  app2.get("/api/questions/:id", async (req, res) => {
    try {
      const question = await storage.getQuestion(Number(req.params.id));
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      if (question.status !== "published" && !req.session.userId) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json(question);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch question" });
    }
  });
  app2.get("/api/answers/:questionId", async (req, res) => {
    try {
      const answers3 = await storage.getAnswersByQuestionId(
        Number(req.params.questionId)
      );
      res.json(answers3);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch answers" });
    }
  });
  app2.get("/api/all-answers", async (req, res) => {
    try {
      const questions3 = await storage.getQuestions();
      const publishedQuestionIds = questions3.filter((q) => q.status === "published").map((q) => q.id);
      const allAnswers = [];
      for (const questionId of publishedQuestionIds) {
        const answers3 = await storage.getAnswersByQuestionId(questionId);
        allAnswers.push(...answers3);
      }
      res.json(allAnswers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all answers" });
    }
  });
  app2.post("/api/answers", requireAuth, async (req, res) => {
    try {
      const validatedData = insertAnswerSchema.parse(req.body);
      const user = req.user;
      validatedData.author = user.displayName || validatedData.author || "Admin";
      console.log("Creating answer with data:", validatedData);
      const answer = await storage.createAnswer(validatedData);
      const question = await storage.getQuestion(validatedData.questionId);
      if (question && question.status !== "published") {
        await storage.updateQuestion(validatedData.questionId, {
          status: "published"
          // Auto-publish when answered
        });
      }
      res.status(201).json(answer);
    } catch (error) {
      console.error("Error creating answer:", error);
      if (error instanceof z2.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid answer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create answer" });
    }
  });
  app2.put("/api/answers/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const answer = await storage.updateAnswer(id, req.body);
      if (!answer) {
        return res.status(404).json({ message: "Answer not found" });
      }
      res.json(answer);
    } catch (error) {
      res.status(500).json({ message: "Failed to update answer" });
    }
  });
  app2.delete("/api/answers/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const answer = await storage.getAnswerById(id);
      if (!answer) {
        return res.status(404).json({ message: "Answer not found" });
      }
      const deleted = await storage.deleteAnswer(id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete answer" });
      }
      const question = await storage.getQuestion(answer.questionId);
      if (question && question.answers > 0) {
        await storage.updateQuestion(answer.questionId, {
          answers: question.answers - 1
        });
      }
      res.json({ message: "Answer deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete answer" });
    }
  });
  app2.post("/api/questions", async (req, res) => {
    try {
      console.log("Question submission received:", req.body);
      console.log("User auth state:", req.user, req.session);
      const validatedData = insertQuestionSchema.parse(req.body);
      if (req.user) {
        const user = req.user;
        validatedData.author = user.displayName || validatedData.author || "Anonymous";
      }
      console.log("Creating question with data:", validatedData);
      const question = await storage.createQuestion(validatedData);
      console.log("Question created successfully:", question);
      res.status(201).json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      if (error instanceof z2.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid question data", errors: error.errors });
      }
      res.status(500).json({
        message: "Failed to create question",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.put(
    "/api/admin/users/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const userId = req.params.id;
        const { isAdmin } = req.body;
        console.log(
          `Attempting to update admin status for user ${userId} to ${isAdmin}`
        );
        if (typeof isAdmin !== "boolean") {
          return res.status(400).json({ message: "isAdmin must be a boolean value" });
        }
        if (userId === req.session.userId && !isAdmin) {
          return res.status(400).json({ message: "Cannot remove your own admin privileges" });
        }
        const defaultAdmins = ["kmichaeltb@gmail.com"];
        const user = await storage.getUser(userId);
        console.log("Database user:", user);
        let firebaseUser = null;
        try {
          firebaseUser = await admin2.auth().getUser(userId);
          console.log("Firebase user:", {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName
          });
        } catch (fbError) {
          console.log(
            `User ${userId} not found in Firebase Auth, might be database-only:`,
            fbError
          );
        }
        if (!user && !firebaseUser) {
          return res.status(404).json({ message: "User not found" });
        }
        const userEmail = user?.email || firebaseUser?.email;
        console.log("User email for admin check:", userEmail);
        if (userEmail === "kmichaeltb@gmail.com" && !isAdmin) {
          return res.status(400).json({
            message: "Cannot remove admin privileges from default admin user"
          });
        }
        if (!isAdmin) {
          const allUsers = await storage.getAllUsers();
          const adminUsers = allUsers.filter(
            (u) => u.isAdmin && u.id !== userId
          );
          console.log("Other admin users:", adminUsers.length);
          if (adminUsers.length === 0) {
            return res.status(400).json({ message: "Cannot remove the last admin user" });
          }
        }
        let updatedUser;
        if (user) {
          console.log("Updating existing user in database, ID:", userId);
          updatedUser = await storage.setUserAdmin(userId, isAdmin);
        } else if (firebaseUser && firebaseUser.email) {
          console.log(
            "User not in database, creating from Firebase data, email:",
            firebaseUser.email
          );
          try {
            updatedUser = await storage.upsertUser({
              id: userId,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || "",
              isAdmin
            });
          } catch (dbError) {
            console.error("Database error creating user:", dbError);
            return res.status(500).json({
              message: "Failed to create user in database",
              error: dbError.message || String(dbError)
            });
          }
        }
        if (!updatedUser) {
          console.error("No user was updated or created");
          return res.status(500).json({ message: "Failed to update user" });
        }
        console.log(
          `${isAdmin ? "Added" : "Removed"} admin privileges for user: ${updatedUser.email}`
        );
        res.json(updatedUser);
      } catch (error) {
        console.error("Error updating user admin status:", error);
        res.status(500).json({
          message: "Failed to update user admin status",
          error: error.message || String(error)
        });
      }
    }
  );
  app2.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
    try {
      const listUsersResult = await admin2.auth().listUsers(1e3);
      console.log(
        `Found ${listUsersResult.users.length} users in Firebase Auth`
      );
      const firebaseUsers = await Promise.all(
        listUsersResult.users.map(async (user) => {
          let isAdmin = false;
          try {
            const dbUser = await storage.getUserByEmail(user.email || "");
            if (dbUser) {
              isAdmin = dbUser.isAdmin;
            } else if (user.email && user.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
              isAdmin = true;
              await storage.upsertUser({
                id: user.uid,
                email: user.email,
                displayName: user.displayName || null,
                photoURL: user.photoURL || null,
                isAdmin: true
              });
              console.log(`Added default admin to database: ${user.email}`);
            } else {
              console.log(
                `Regular user found in Firebase but not database: ${user.email}`
              );
              await storage.upsertUser({
                id: user.uid,
                email: user.email || "",
                displayName: user.displayName || null,
                photoURL: user.photoURL || null,
                isAdmin: false
                // New users start as regular users
              });
            }
          } catch (error) {
            console.error(`Error checking user admin status: ${error}`);
            isAdmin = user.email ? user.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() : false;
          }
          return {
            id: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            isAdmin,
            createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime) : null,
            updatedAt: user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null
          };
        })
      );
      firebaseUsers.sort((a, b) => {
        if (a.isAdmin !== b.isAdmin) {
          return a.isAdmin ? -1 : 1;
        }
        return (a.email || "").localeCompare(b.email || "");
      });
      res.json(firebaseUsers);
    } catch (error) {
      console.error("Error listing Firebase users:", error);
      res.status(500).json({
        message: "Failed to fetch users from Firebase Auth",
        error: error.message || String(error)
      });
    }
  });
  app2.get("/api/admin/user", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      console.error("Error fetching admin user:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });
  app2.get("/api/admin/questions", requireAuth, async (req, res) => {
    try {
      const questions3 = await storage.getQuestions();
      res.json(questions3);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });
  app2.put("/api/admin/questions/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const question = await storage.getQuestion(id);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      const updatedQuestion = await storage.updateQuestion(id, req.body);
      res.json(updatedQuestion);
    } catch (error) {
      res.status(500).json({ message: "Failed to update question" });
    }
  });
  app2.delete("/api/admin/questions/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await storage.deleteQuestion(id);
      if (!deleted) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete question" });
    }
  });
  app2.get("/api/questions/:questionId/comments", async (req, res) => {
    try {
      const questionId = Number(req.params.questionId);
      const comments3 = await storage.getCommentsByQuestionId(questionId);
      res.json(comments3);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  app2.post(
    "/api/questions/:questionId/comments",
    requireAuth,
    async (req, res) => {
      try {
        const questionId = Number(req.params.questionId);
        const question = await storage.getQuestion(questionId);
        if (!question) {
          return res.status(404).json({ message: "Question not found" });
        }
        const user = req.user;
        let userId;
        if (user.claims?.sub) {
          userId = parseInt(user.claims.sub, 10);
        } else if (user.id) {
          const stringId = String(user.id);
          userId = parseInt(
            stringId.replace(/[^0-9]/g, "").substring(0, 9) || "1",
            10
          );
        } else {
          userId = 1;
        }
        if (isNaN(userId)) {
          userId = 1;
        }
        console.log(`Comment user ID resolved: ${userId} from user:`, user);
        const author = user.displayName || user.claims?.name || user.claims?.email || "Anonymous";
        const parentId = req.body.parentId ? Number(req.body.parentId) : null;
        let depth = 0;
        if (parentId !== null) {
          const parentComment = await storage.getCommentById(parentId);
          if (!parentComment) {
            return res.status(404).json({ message: "Parent comment not found" });
          }
          depth = (parentComment.depth || 0) + 1;
          console.log(
            `Comment depth: ${depth} (parent: ${parentComment.depth})`
          );
        }
        console.log(
          `Creating comment with userId: ${userId}, parentId: ${parentId}, depth: ${depth}`
        );
        const commentData = {
          content: req.body.content,
          questionId,
          userId,
          author,
          parentId,
          depth
        };
        const validatedData = insertCommentSchema.parse(commentData);
        const comment = await storage.createComment(validatedData);
        res.status(201).json(comment);
      } catch (error) {
        if (error instanceof z2.ZodError) {
          return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to add comment" });
      }
    }
  );
  app2.delete("/api/comments/:id", requireAuth, async (req, res) => {
    try {
      const commentId = Number(req.params.id);
      const comment = await storage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      const user = req.user;
      const sessionUserId = req.session.userId;
      let firebaseUid = sessionUserId;
      if (user && user.id) {
        firebaseUid = user.id;
      }
      const isAdmin = req.session.isAdmin === true || req.user?.isAdmin === true;
      const commentAge = Date.now() - comment.date.getTime();
      const ONE_HOUR_MS = 60 * 60 * 1e3;
      const isWithinTimeWindow = commentAge < ONE_HOUR_MS;
      let numericUserId;
      if (firebaseUid) {
        const stringId = String(firebaseUid);
        numericUserId = parseInt(
          stringId.replace(/[^0-9]/g, "").substring(0, 9) || "1",
          10
        );
        if (isNaN(numericUserId)) {
          numericUserId = 1;
        }
      } else {
        numericUserId = 1;
      }
      const isOriginalCommenter = comment.userId === numericUserId;
      console.log(`Delete Comment Permission Check:`, {
        commentId: comment.id,
        commentUserId: comment.userId,
        firebaseUid,
        numericUserId,
        isOriginalCommenter,
        isAdmin,
        commentAge: `${(commentAge / (1e3 * 60)).toFixed(2)} minutes`,
        isWithinTimeWindow,
        commentDate: comment.date
      });
      const canDelete = isAdmin || // Admins can delete any comment
      isOriginalCommenter && isWithinTimeWindow;
      if (!canDelete) {
        return res.status(403).json({
          message: isOriginalCommenter ? "You can only delete your comments within 1 hour of posting" : "You don't have permission to delete this comment"
        });
      }
      const replies = await storage.getCommentReplies(commentId);
      const deleted = await storage.deleteCommentWithReplies(commentId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete comment" });
      }
      res.json({
        message: "Comment deleted successfully",
        replyCount: replies.length,
        totalDeleted: replies.length + 1
        // The comment itself plus all replies
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });
  const getUserIdFromAuth = (user) => {
    let userId;
    if (user.claims?.sub) {
      userId = parseInt(user.claims.sub, 10);
    } else if (user.id) {
      const stringId = String(user.id);
      userId = parseInt(
        stringId.replace(/[^0-9]/g, "").substring(0, 9) || "1",
        10
      );
    } else {
      userId = 1;
    }
    if (isNaN(userId)) {
      userId = 1;
    }
    return userId;
  };
  app2.get("/api/questions/:questionId/likes", async (req, res) => {
    try {
      const questionId = Number(req.params.questionId);
      const likes3 = await storage.getLikesByQuestionId(questionId);
      res.json(likes3);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch likes" });
    }
  });
  app2.get("/api/questions/:questionId/liked", requireAuth, async (req, res) => {
    try {
      const questionId = Number(req.params.questionId);
      const user = req.user;
      const userId = getUserIdFromAuth(user);
      console.log(`Checking question like status - user ID: ${userId} from user:`, user);
      const hasLiked = await storage.hasUserLikedQuestion(questionId, userId);
      res.json({ liked: hasLiked });
    } catch (error) {
      res.status(500).json({ message: "Failed to check like status" });
    }
  });
  app2.post("/api/questions/:questionId/like", requireAuth, async (req, res) => {
    try {
      const questionId = Number(req.params.questionId);
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      const user = req.user;
      const userId = getUserIdFromAuth(user);
      console.log(`Like question - user ID: ${userId} from user:`, user);
      const likeData = {
        questionId,
        userId
      };
      const validatedData = insertLikeSchema.parse(likeData);
      const like = await storage.likeQuestion(validatedData);
      res.status(201).json(like);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid like data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to like question" });
    }
  });
  app2.delete(
    "/api/questions/:questionId/like",
    requireAuth,
    async (req, res) => {
      try {
        const questionId = Number(req.params.questionId);
        const user = req.user;
        let userId;
        if (user.claims?.sub) {
          userId = parseInt(user.claims.sub, 10);
        } else if (user.id) {
          const stringId = String(user.id);
          userId = parseInt(
            stringId.replace(/[^0-9]/g, "").substring(0, 9) || "1",
            10
          );
        } else {
          userId = 1;
        }
        if (isNaN(userId)) {
          userId = 1;
        }
        console.log(`Unlike post - user ID: ${userId} from user:`, user);
        const removed = await storage.unlikeQuestion(questionId, userId);
        if (!removed) {
          return res.status(404).json({ message: "Like not found" });
        }
        res.json({ message: "Question unliked successfully" });
      } catch (error) {
        res.status(500).json({ message: "Failed to unlike question" });
      }
    }
  );
  app2.get("/api/comments/:commentId/likes", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      const likes3 = await storage.getLikesByCommentId(commentId);
      res.json(likes3);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comment likes" });
    }
  });
  app2.get("/api/comments/:commentId/liked", requireAuth, async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      const user = req.user;
      const userId = getUserIdFromAuth(user);
      console.log(`Checking comment like status - user ID: ${userId} from user:`, user);
      const hasLiked = await storage.hasUserLikedComment(commentId, userId);
      res.json({ liked: hasLiked });
    } catch (error) {
      res.status(500).json({ message: "Failed to check comment like status" });
    }
  });
  app2.post("/api/comments/:commentId/like", requireAuth, async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      const comment = await storage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      const user = req.user;
      const userId = getUserIdFromAuth(user);
      console.log(`Like comment - user ID: ${userId} from user:`, user);
      const likeData = {
        commentId,
        userId
      };
      const validatedData = insertCommentLikeSchema.parse(likeData);
      const like = await storage.likeComment(validatedData);
      res.status(201).json(like);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid comment like data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to like comment" });
    }
  });
  app2.delete(
    "/api/comments/:commentId/like",
    requireAuth,
    async (req, res) => {
      try {
        const commentId = Number(req.params.commentId);
        const user = req.user;
        const userId = getUserIdFromAuth(user);
        console.log(`Unlike comment - user ID: ${userId} from user:`, user);
        const removed = await storage.unlikeComment(commentId, userId);
        if (!removed) {
          return res.status(404).json({ message: "Comment like not found" });
        }
        res.json({ message: "Comment unliked successfully" });
      } catch (error) {
        res.status(500).json({ message: "Failed to unlike comment" });
      }
    }
  );
  app2.get("/api/answers/:answerId/likes", async (req, res) => {
    try {
      const answerId = Number(req.params.answerId);
      const likes3 = await storage.getLikesByAnswerId(answerId);
      res.json(likes3);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch answer likes" });
    }
  });
  app2.get("/api/answers/:answerId/liked", requireAuth, async (req, res) => {
    try {
      const answerId = Number(req.params.answerId);
      const user = req.user;
      const userId = getUserIdFromAuth(user);
      console.log(`Checking answer like status - user ID: ${userId} from user:`, user);
      const hasLiked = await storage.hasUserLikedAnswer(answerId, userId);
      res.json({ liked: hasLiked });
    } catch (error) {
      res.status(500).json({ message: "Failed to check answer like status" });
    }
  });
  app2.post("/api/answers/:answerId/like", requireAuth, async (req, res) => {
    try {
      const answerId = Number(req.params.answerId);
      const answer = await storage.getAnswerById(answerId);
      if (!answer) {
        return res.status(404).json({ message: "Answer not found" });
      }
      const user = req.user;
      const userId = getUserIdFromAuth(user);
      console.log(`Like answer - user ID: ${userId} from user:`, user);
      const likeData = {
        answerId,
        userId
      };
      const validatedData = insertAnswerLikeSchema.parse(likeData);
      const like = await storage.likeAnswer(validatedData);
      res.status(201).json(like);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid answer like data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to like answer" });
    }
  });
  app2.delete(
    "/api/answers/:answerId/like",
    requireAuth,
    async (req, res) => {
      try {
        const answerId = Number(req.params.answerId);
        const user = req.user;
        const userId = getUserIdFromAuth(user);
        console.log(`Unlike answer - user ID: ${userId} from user:`, user);
        const removed = await storage.unlikeAnswer(answerId, userId);
        if (!removed) {
          return res.status(404).json({ message: "Answer like not found" });
        }
        res.json({ message: "Answer unliked successfully" });
      } catch (error) {
        res.status(500).json({ message: "Failed to unlike answer" });
      }
    }
  );
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var __dirname = path2.dirname(fileURLToPath(import.meta.url));
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(__dirname, "client", "src"),
      "@shared": path2.resolve(__dirname, "shared"),
      "@assets": path2.resolve(__dirname, "attached_assets")
    }
  },
  root: path2.resolve(__dirname, "client"),
  build: {
    outDir: path2.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
import { fileURLToPath as fileURLToPath2 } from "url";
var __dirname2 = path3.dirname(fileURLToPath2(import.meta.url));
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var allowCrossDomain = (req, res, next) => {
  const origin = req.headers.origin;
  if (process.env.NODE_ENV === "production") {
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [];
    if (origin && (origin.includes("vercel.app") || allowedOrigins.includes(origin))) {
      res.header("Access-Control-Allow-Origin", origin);
    } else {
      res.header("Access-Control-Allow-Origin", "*");
    }
  } else {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  }
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.header("Access-Control-Allow-Credentials", "true");
  if ("OPTIONS" === req.method) {
    res.sendStatus(200);
  } else {
    next();
  }
};
var app = express2();
app.use(allowCrossDomain);
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT || 3e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
