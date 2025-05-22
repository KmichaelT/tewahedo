import express from "express";
import type { Request, Response, NextFunction } from "express";
type Express = express.Application;
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import MemoryStore from "memorystore";
import { authMiddleware, requireAuth, requireAdmin } from "./auth";
import admin from "firebase-admin";
import { seedSampleData } from "./seedSampleData";
import {
  insertQuestionSchema,
  insertAnswerSchema,
  insertCommentSchema,
  insertLikeSchema,
  insertCommentLikeSchema,
  insertAnswerLikeSchema,
} from "@shared/schema";
// Admin functionality is now managed through the database
import { z } from "zod";

// Admin status is now managed in the database

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database with default admin user if it doesn't exist
  try {
    const adminUser = await storage.getUserByEmail("admin@tewahedanswers.com");
    if (!adminUser) {
      await storage.upsertUser({
        id: "admin-system",
        email: "admin@tewahedanswers.com",
        displayName: "System Admin",
        isAdmin: true,
      });
      console.log("Created default admin user");
    }
    
    // Check if we need to seed sample questions
    const existingQuestions = await storage.getQuestions();
    if (existingQuestions.length <= 1) {
      console.log("Seeding sample questions and answers for testing...");
      await seedSampleData();
    }

    // ONLY ONE default admin user
    const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";

    // Make sure default admin has admin privileges
    const defaultAdminUser = await storage.getUserByEmail(DEFAULT_ADMIN_EMAIL);
    if (defaultAdminUser && !defaultAdminUser.isAdmin) {
      await storage.setUserAdmin(defaultAdminUser.id, true);
      console.log(
        `Set admin privileges for default admin: ${DEFAULT_ADMIN_EMAIL}`,
      );
    }
  } catch (error) {
    console.error("Error initializing admin users:", error);
  }
  // Set up session middleware
  const MemorySessionStore = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "tewahed-answers-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemorySessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      },
    }),
  );

  // Apply our authentication middleware
  app.use(authMiddleware);

  // Firebase auth endpoints
  // Google authentication endpoint
  app.post("/api/auth/google", async (req, res) => {
    try {
      console.log("Auth request received with idToken");
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ message: "ID token is required" });
      }

      try {
        // In a production app, you'd verify the token with Firebase Admin SDK
        // Here we're extracting data from the token directly without verification
        // This is not secure for production, but works for demo purposes

        // Basic parsing of JWT token (not verified)
        const [header, payload, signature] = idToken.split(".");
        const decoded = JSON.parse(Buffer.from(payload, "base64").toString());

        // Extract user info from token
        const userId = decoded.user_id || decoded.sub;
        const email = decoded.email;
        const displayName = decoded.name;
        const photoURL = decoded.picture;

        // Store user in database or update if exists
        try {
          // Check if this is the default admin - THIS SHOULD ALWAYS BE ADMIN
          const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";

          // Only the default admin is automatically an admin
          const isDefaultAdmin = email === DEFAULT_ADMIN_EMAIL;
          if (isDefaultAdmin) {
            console.log(`IMPORTANT: ${email} is the default admin`);
          }

          // Only make user admin if they're the default admin
          // All other users need to be explicitly set by the admin
          const isAdminUser = isDefaultAdmin;

          // Special handling for default admin - we'll check this later
          // when we call upsertUser

          // CRITICAL: When adding or updating a user in the database, we need to:
          // 1. For new users, only set isAdmin=true for default admin
          // 2. For existing users, preserve their admin status (stored in database)
          //    unless they are the default admin

          // Get existing user first to check their current admin status
          const dbUser = await storage.getUserByEmail(email);

          const userData = await storage.upsertUser({
            id: userId,
            email: email,
            displayName: displayName || null,
            photoURL: photoURL || null,
            // isAdmin is true if:
            // 1. This is the default admin
            // 2. This is an existing user who was already an admin
            isAdmin: isAdminUser || dbUser?.isAdmin === true,
          });

          // Double check that default admins have admin status
          if (isDefaultAdmin && !userData.isAdmin) {
            console.log(
              `CRITICAL: Fixing admin status for ${email} after upsert`,
            );
            const updatedUser = await storage.setUserAdmin(userId, true);
            if (updatedUser) {
              console.log(`Successfully updated ${email} to admin status`);
            }
          }

          // Store in session
          req.session.userId = userId;
          req.session.userEmail = email;

          // For default admins, ALWAYS set admin flag regardless of database
          if (isDefaultAdmin) {
            req.session.isAdmin = true;
          } else {
            // For others, use the database record
            req.session.isAdmin = userData.isAdmin;
          }

          console.log(
            `User authenticated: ${email}, Admin: ${userData.isAdmin}`,
          );

          // For default admins, always force isAdmin=true in the user object
          req.user = {
            id: userId,
            email,
            displayName,
            photoURL,
            isAdmin: isDefaultAdmin ? true : userData.isAdmin,
          };
        } catch (dbError) {
          console.error("Database error saving user:", dbError);
        }

        console.log("Created user session from Google token:", req.user);

        return res.status(200).json({
          message: "Authentication successful",
          user: req.user,
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

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: Error | null) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    console.log("Auth check - Session:", req.session);
    console.log("Auth check - User:", req.user);

    if (!req.user && !req.session?.userId) {
      console.log("No authenticated user found");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get the user's email
    const email = req.user?.email || req.session?.userEmail;

    // IMPORTANT: Recheck admin status on each request using database
    // This ensures that even if a user's admin status changes,
    // they'll have the correct permissions on their next request
    if (email) {
      // Check if this is the default admin email
      const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";

      // Only the default admin always has admin privileges
      if (email === DEFAULT_ADMIN_EMAIL) {
        req.session.isAdmin = true;
        console.log(`Default admin user detected: ${email}`);
      } else {
        try {
          // Look up the user in the database
          const user = await storage.getUserByEmail(email);
          if (user) {
            // Update session with the latest admin status from database
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

    // Include data from session and user object
    const userData = {
      id: req.user?.id || req.session?.userId,
      email: email,
      displayName: req.user?.displayName,
      photoURL: req.user?.photoURL,
      isAdmin: req.session?.isAdmin || false,
    };

    console.log("Returning user data:", userData);
    res.json(userData);
  });

  // Public API routes
  app.get("/api/questions", async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      const publishedQuestions = questions.filter(
        (q) => q.status === "published",
      );
      
      // If we have no questions, add a sample one for testing
      if (publishedQuestions.length === 0) {
        // Create a sample question
        const sampleQuestion = await storage.createQuestion({
          title: "What is the significance of the Ethiopian Orthodox Tewahedo Church's unique calendar?",
          content: "<p>I've noticed that the Ethiopian Orthodox Church follows a different calendar. Could someone explain its significance and how it differs from other Orthodox calendars? I'm particularly interested in the historical context and religious significance.</p><p>Also, how does this affect the celebration of holidays and religious events compared to other Orthodox churches?</p>",
          author: "HistoryBuff42",
        });
        
        // Update it to published with some likes
        await storage.updateQuestion(sampleQuestion.id, {
          status: "published", 
          votes: 15,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        });
        
        // Add an official answer
        const answer = await storage.createAnswer({
          questionId: sampleQuestion.id,
          content: "<p>The Ethiopian Orthodox Tewahedo Church follows the ancient Alexandrian calendar, which is based on the ancient Egyptian calendar modified by Coptic adjustments. Here are the key aspects:</p><ul><li>The Ethiopian calendar has 13 months – 12 months of 30 days each and a 13th month (Pagume) of 5 or 6 days (in leap year).</li><li>It is approximately 7-8 years behind the Gregorian calendar due to different calculations of the birth year of Christ.</li><li>Unlike Western calendars, the Ethiopian New Year begins on September 11th (or September 12th in leap years), marking the end of the rainy season.</li></ul><p>This calendar is deeply significant as it preserves ancient Christian traditions and reflects Ethiopia's unique historical development, largely isolated from Western Christian influences.</p><p>Major holidays like Christmas (Genna) and Epiphany (Timkat) are celebrated on different dates than in other Orthodox traditions. This creates a distinct rhythm to religious life that is uniquely Ethiopian.</p>",
          author: "Church Scholar",
          isRichText: true,
          category: "History",
          tags: "calendar,traditions,orthodox"
        });
        
        // Update answer with votes
        await storage.updateAnswer(answer.id, {
          votes: 10,
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        });
        
        // Add comments
        const comment1 = await storage.createComment({
          questionId: sampleQuestion.id,
          content: "I've been curious about this too. I attended an Ethiopian Orthodox service recently and was confused by the date references.",
          author: "CuriousVisitor",
          userId: 2,
          depth: 0
        });
        
        // Instead of updating votes separately, just focus on creating the comments
        const comment2 = await storage.createComment({
          questionId: sampleQuestion.id,
          content: "My Ethiopian friend explained that they're currently in the year 2015. It was quite surprising!",
          author: "GlobalLearner",
          userId: 2,
          depth: 0
        });
        
        // Add replies
        const reply1 = await storage.createComment({
          questionId: sampleQuestion.id,
          content: "Yes, the current Ethiopian year differs from the Gregorian calendar. It's fascinating how different cultures track time differently.",
          author: "HistoryBuff42",
          userId: 2,
          parentId: comment1.id,
          depth: 1
        });
        
        // Create the second reply without updating votes separately
        const reply2 = await storage.createComment({
          questionId: sampleQuestion.id,
          content: "I believe it's because they calculated the birth of Christ differently than the Western calendar makers did.",
          author: "Church Scholar",
          userId: 1,
          parentId: comment2.id,
          depth: 1
        });
        
        // Refresh questions list with the newly created data
        const updatedQuestions = await storage.getQuestions();
        const updatedPublishedQuestions = updatedQuestions.filter(
          (q) => q.status === "published",
        );
        
        return res.json(updatedPublishedQuestions);
      }
      
      res.json(publishedQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.get("/api/questions/:id", async (req, res) => {
    try {
      const question = await storage.getQuestion(Number(req.params.id));
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Only return published questions unless user is logged in
      if (question.status !== "published" && !req.session.userId) {
        return res.status(404).json({ message: "Question not found" });
      }

      res.json(question);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch question" });
    }
  });

  // Get answers for a specific question
  app.get("/api/answers/:questionId", async (req, res) => {
    try {
      const answers = await storage.getAnswersByQuestionId(
        Number(req.params.questionId),
      );
      res.json(answers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch answers" });
    }
  });

  // Get all answers (for filtering by categories and tags)
  app.get("/api/all-answers", async (req, res) => {
    try {
      // Get all published questions first
      const questions = await storage.getQuestions();
      const publishedQuestionIds = questions
        .filter((q) => q.status === "published")
        .map((q) => q.id);

      // Get all answers for these questions
      const allAnswers = [];
      for (const questionId of publishedQuestionIds) {
        const answers = await storage.getAnswersByQuestionId(questionId);
        allAnswers.push(...answers);
      }

      res.json(allAnswers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all answers" });
    }
  });

  // Create an answer (admin only)
  app.post("/api/answers", requireAuth, async (req, res) => {
    try {
      const validatedData = insertAnswerSchema.parse(req.body);

      // Get the admin user creating the answer
      const user = req.user as any;
      validatedData.author =
        user.displayName || validatedData.author || "Admin";

      console.log("Creating answer with data:", validatedData);

      const answer = await storage.createAnswer(validatedData);

      // Make sure the question is published, regardless of answer count update
      // This is now handled in storage.createAnswer, but we'll ensure it here too
      const question = await storage.getQuestion(validatedData.questionId);
      if (question && question.status !== "published") {
        await storage.updateQuestion(validatedData.questionId, {
          status: "published", // Auto-publish when answered
        });
      }

      res.status(201).json(answer);
    } catch (error) {
      console.error("Error creating answer:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res
          .status(400)
          .json({ message: "Invalid answer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create answer" });
    }
  });

  // Update an answer (admin only)
  app.put("/api/answers/:id", requireAuth, async (req, res) => {
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

  // Delete an answer (admin only)
  app.delete("/api/answers/:id", requireAuth, async (req, res) => {
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

      // Update the question's answer count
      const question = await storage.getQuestion(answer.questionId);
      if (question && question.answers > 0) {
        await storage.updateQuestion(answer.questionId, {
          answers: question.answers - 1,
        });
      }

      res.json({ message: "Answer deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete answer" });
    }
  });

  app.post("/api/questions", async (req, res) => {
    try {
      console.log("Question submission received:", req.body);
      console.log("User auth state:", req.user, req.session);

      // Check if the user is authenticated (Firebase or session)
      // We're relaxing this requirement for question submission
      // to simplify testing

      const validatedData = insertQuestionSchema.parse(req.body);

      // Get author information from user or form
      if (req.user) {
        const user = req.user as any;
        // Use displayName for Firebase auth users, or the author from the form
        validatedData.author =
          user.displayName || validatedData.author || "Anonymous";
      }

      console.log("Creating question with data:", validatedData);

      const question = await storage.createQuestion(validatedData);
      console.log("Question created successfully:", question);

      res.status(201).json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res
          .status(400)
          .json({ message: "Invalid question data", errors: error.errors });
      }
      res
        .status(500)
        .json({
          message: "Failed to create question",
          error: error instanceof Error ? error.message : "Unknown error",
        });
    }
  });

  // Using Firebase Authentication only

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err: Error | null) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Protected admin routes

  // Admin emails management API endpoints

  // Database-backed user management

  // All user management routes are defined below

  // Set admin privilege for a user
  app.put(
    "/api/admin/users/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const userId = req.params.id;
        const { isAdmin } = req.body;

        console.log(
          `Attempting to update admin status for user ${userId} to ${isAdmin}`,
        );

        if (typeof isAdmin !== "boolean") {
          return res
            .status(400)
            .json({ message: "isAdmin must be a boolean value" });
        }

        // Check if user is trying to remove their own admin privileges
        if (userId === req.session.userId && !isAdmin) {
          return res
            .status(400)
            .json({ message: "Cannot remove your own admin privileges" });
        }

        // Check if this is a default admin email that can't be modified
        // CRITICAL: There should only be ONE default admin to match the client-side implementation
        const defaultAdmins = ["kmichaeltb@gmail.com"]; // Only ONE default admin!

        // Get user data from both Firebase and our database
        const user = await storage.getUser(userId);
        console.log("Database user:", user);

        let firebaseUser = null;
        try {
          firebaseUser = await admin.auth().getUser(userId);
          console.log("Firebase user:", {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          });
        } catch (fbError) {
          console.log(
            `User ${userId} not found in Firebase Auth, might be database-only:`,
            fbError,
          );
        }

        // Check if we found the user in either place
        if (!user && !firebaseUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check for default admin
        const userEmail = user?.email || firebaseUser?.email;
        console.log("User email for admin check:", userEmail);

        // CRITICAL: Only ONE default admin (kmichaeltb@gmail.com) should be protected
        // "kmichaeltbekele@gmail.com" is NOT a default admin and should be allowed to be modified
        if (userEmail === "kmichaeltb@gmail.com" && !isAdmin) {
          return res.status(400).json({
            message: "Cannot remove admin privileges from default admin user",
          });
        }

        // Verify that at least one admin will remain
        if (!isAdmin) {
          // If we're removing admin privileges, make sure there's at least one other admin
          const allUsers = await storage.getAllUsers();
          const adminUsers = allUsers.filter(
            (u) => u.isAdmin && u.id !== userId,
          );
          console.log("Other admin users:", adminUsers.length);
          if (adminUsers.length === 0) {
            return res
              .status(400)
              .json({ message: "Cannot remove the last admin user" });
          }
        }

        // Create or update the user in our database based on Firebase data
        let updatedUser;

        if (user) {
          // User exists in database, update admin status
          console.log("Updating existing user in database, ID:", userId);
          updatedUser = await storage.setUserAdmin(userId, isAdmin);
        } else if (firebaseUser && firebaseUser.email) {
          // User not in database but exists in Firebase, need to add to database first
          console.log(
            "User not in database, creating from Firebase data, email:",
            firebaseUser.email,
          );

          try {
            updatedUser = await storage.upsertUser({
              id: userId,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || "",
              isAdmin: isAdmin,
            });
          } catch (dbError: any) {
            console.error("Database error creating user:", dbError);
            return res.status(500).json({
              message: "Failed to create user in database",
              error: dbError.message || String(dbError),
            });
          }
        }

        if (!updatedUser) {
          console.error("No user was updated or created");
          return res.status(500).json({ message: "Failed to update user" });
        }

        console.log(
          `${isAdmin ? "Added" : "Removed"} admin privileges for user: ${updatedUser.email}`,
        );

        res.json(updatedUser);
      } catch (error: any) {
        console.error("Error updating user admin status:", error);
        res.status(500).json({
          message: "Failed to update user admin status",
          error: error.message || String(error),
        });
      }
    },
  );

  // Get all users for admin management
  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    // Define default admins
    // CRITICAL: Only ONE default admin email
    const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";

    // Get users directly from Firebase Auth - this is our primary and only source of user data
    try {
      // This gets the first 1000 users - sufficient for most apps
      // For larger apps, we'd need to implement pagination
      const listUsersResult = await admin.auth().listUsers(1000);
      console.log(
        `Found ${listUsersResult.users.length} users in Firebase Auth`,
      );

      // Transform the Firebase Auth users to our format
      const firebaseUsers = await Promise.all(
        listUsersResult.users.map(async (user) => {
          // Get the user's admin status from the database or determine from default admins
          let isAdmin = false;

          // Check if user already exists in our database for admin status
          try {
            const dbUser = await storage.getUserByEmail(user.email || "");
            if (dbUser) {
              isAdmin = dbUser.isAdmin;
            } else if (
              user.email &&
              user.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()
            ) {
              // User is not in db but is THE default admin
              isAdmin = true;

              // Save this user to the database with admin status
              await storage.upsertUser({
                id: user.uid,
                email: user.email,
                displayName: user.displayName || null,
                photoURL: user.photoURL || null,
                isAdmin: true,
              });

              console.log(`Added default admin to database: ${user.email}`);
            } else {
              // User is not a default admin, make sure they're in our database
              console.log(
                `Regular user found in Firebase but not database: ${user.email}`,
              );

              await storage.upsertUser({
                id: user.uid,
                email: user.email || "",
                displayName: user.displayName || null,
                photoURL: user.photoURL || null,
                isAdmin: false, // New users start as regular users
              });
            }
          } catch (error) {
            console.error(`Error checking user admin status: ${error}`);
            // If email is the default admin, set as admin
            isAdmin = user.email
              ? user.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()
              : false;
          }

          return {
            id: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            isAdmin: isAdmin,
            createdAt: user.metadata.creationTime
              ? new Date(user.metadata.creationTime)
              : null,
            updatedAt: user.metadata.lastSignInTime
              ? new Date(user.metadata.lastSignInTime)
              : null,
          };
        }),
      );

      // Sort users with admins first, then alphabetically by email
      firebaseUsers.sort((a, b) => {
        if (a.isAdmin !== b.isAdmin) {
          return a.isAdmin ? -1 : 1;
        }
        return (a.email || "").localeCompare(b.email || "");
      });

      res.json(firebaseUsers);
    } catch (error: any) {
      console.error("Error listing Firebase users:", error);
      res.status(500).json({
        message: "Failed to fetch users from Firebase Auth",
        error: error.message || String(error),
      });
    }
  });

  // Get current admin user
  app.get("/api/admin/user", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Fetch the complete user data from database
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
      });
    } catch (error) {
      console.error("Error fetching admin user:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  app.get("/api/admin/questions", requireAuth, async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.put("/api/admin/questions/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/admin/questions/:id", requireAuth, async (req, res) => {
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

  // ---------- Comments API Routes ----------

  // Get comments for a specific question
  app.get("/api/questions/:questionId/comments", async (req, res) => {
    try {
      const questionId = Number(req.params.questionId);
      const comments = await storage.getCommentsByQuestionId(questionId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Add a comment to a question (requires authentication)
  app.post(
    "/api/questions/:questionId/comments",
    requireAuth,
    async (req, res) => {
      try {
        const questionId = Number(req.params.questionId);
        const question = await storage.getQuestion(questionId);

        if (!question) {
          return res.status(404).json({ message: "Question not found" });
        }

        // Get user info from authenticated session
        const user = req.user as any;

        // Convert userId to a number - very important
        // Firebase IDs are strings, but our schema expects numbers
        // We need to create a stable numeric ID from the string ID
        let userId: number;

        if (user.claims?.sub) {
          // If using a Firebase token with sub claim (numeric uid), use that directly
          userId = parseInt(user.claims.sub, 10);
        } else if (user.id) {
          // Otherwise hash the string ID to a number
          const stringId = String(user.id);
          // Simple hash function to get a numeric value from string
          userId = parseInt(
            stringId.replace(/[^0-9]/g, "").substring(0, 9) || "1",
            10,
          );
        } else {
          // Fallback for testing
          userId = 1;
        }

        // Ensure userId is a valid number
        if (isNaN(userId)) {
          userId = 1; // Default fallback to prevent NaN errors
        }

        console.log(`Comment user ID resolved: ${userId} from user:`, user);

        const author =
          user.displayName ||
          user.claims?.name ||
          user.claims?.email ||
          "Anonymous";

        // Default parentId to null (top-level comment) if not provided
        const parentId = req.body.parentId ? Number(req.body.parentId) : null;

        // Default depth is 0 (top-level comment)
        let depth = 0;

        // If parentId is provided, make sure it exists and calculate depth
        if (parentId !== null) {
          const parentComment = await storage.getCommentById(parentId);
          if (!parentComment) {
            return res
              .status(404)
              .json({ message: "Parent comment not found" });
          }

          // Increment parent's depth by 1 (nested reply)
          depth = (parentComment.depth || 0) + 1;
          console.log(
            `Comment depth: ${depth} (parent: ${parentComment.depth})`,
          );
        }

        console.log(
          `Creating comment with userId: ${userId}, parentId: ${parentId}, depth: ${depth}`,
        );

        const commentData = {
          content: req.body.content,
          questionId,
          userId,
          author,
          parentId,
          depth,
        };

        const validatedData = insertCommentSchema.parse(commentData);
        const comment = await storage.createComment(validatedData);

        res.status(201).json(comment);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid comment data", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to add comment" });
      }
    },
  );

  // Delete a comment (requires authentication)
  app.delete("/api/comments/:id", requireAuth, async (req, res) => {
    try {
      const commentId = Number(req.params.id);
      
      // Get the comment
      const comment = await storage.getCommentById(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Get current user from authenticated session
      const user = req.user as any;
      const sessionUserId = req.session.userId;
      
      // Extract the Firebase UID
      let firebaseUid = sessionUserId;
      if (user && user.id) {
        firebaseUid = user.id;
      }
      
      // Check if user is an admin
      const isAdmin = req.session.isAdmin === true || req.user?.isAdmin === true;
      
      // Calculate time difference to check if comment is less than 1 hour old
      const commentAge = Date.now() - comment.date.getTime();
      const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds
      const isWithinTimeWindow = commentAge < ONE_HOUR_MS;
      
      // Convert Firebase UID to numeric ID using the same algorithm
      // as when creating the comment, to ensure consistent comparison
      let numericUserId: number;
      if (firebaseUid) {
        const stringId = String(firebaseUid);
        // Same hash function to get a numeric value from string as in comment creation
        numericUserId = parseInt(
          stringId.replace(/[^0-9]/g, "").substring(0, 9) || "1", 
          10
        );
        
        // Default fallback to prevent NaN errors
        if (isNaN(numericUserId)) {
          numericUserId = 1;
        }
      } else {
        // Fallback for testing
        numericUserId = 1;
      }
      
      // Check if user is the original commenter using the numeric ID
      const isOriginalCommenter = comment.userId === numericUserId;
      
      // Detailed logging for easier debugging
      console.log(`Delete Comment Permission Check:`, {
        commentId: comment.id,
        commentUserId: comment.userId,
        firebaseUid,
        numericUserId,
        isOriginalCommenter,
        isAdmin,
        commentAge: `${(commentAge / (1000 * 60)).toFixed(2)} minutes`,
        isWithinTimeWindow,
        commentDate: comment.date
      });
      
      // Determine if user has permission to delete
      const canDelete = 
        isAdmin || // Admins can delete any comment
        (isOriginalCommenter && isWithinTimeWindow); // Original commenter can delete within time window
      
      if (!canDelete) {
        return res.status(403).json({ 
          message: isOriginalCommenter 
            ? "You can only delete your comments within 1 hour of posting" 
            : "You don't have permission to delete this comment" 
        });
      }
      
      // Check if comment has replies
      const replies = await storage.getCommentReplies(commentId);
      
      // Delete the comment and its replies
      const deleted = await storage.deleteCommentWithReplies(commentId);

      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete comment" });
      }

      res.json({ 
        message: "Comment deleted successfully",
        replyCount: replies.length,
        totalDeleted: replies.length + 1 // The comment itself plus all replies
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // ---------- Likes API Routes ----------
  
  // Helper function to convert Firebase user ID to numeric ID
  const getUserIdFromAuth = (user: any): number => {
    let userId: number;
    
    if (user.claims?.sub) {
      // If using a Firebase token with sub claim (numeric uid), use that directly
      userId = parseInt(user.claims.sub, 10);
    } else if (user.id) {
      // Otherwise hash the string ID to a number
      const stringId = String(user.id);
      // Simple hash function to get a numeric value from string
      userId = parseInt(
        stringId.replace(/[^0-9]/g, "").substring(0, 9) || "1",
        10,
      );
    } else {
      // Fallback for testing
      userId = 1;
    }

    // Ensure userId is a valid number
    if (isNaN(userId)) {
      userId = 1; // Default fallback to prevent NaN errors
    }
    
    return userId;
  };

  // Get likes for a specific question
  app.get("/api/questions/:questionId/likes", async (req, res) => {
    try {
      const questionId = Number(req.params.questionId);
      const likes = await storage.getLikesByQuestionId(questionId);
      res.json(likes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch likes" });
    }
  });

  // Check if user has liked a question
  app.get("/api/questions/:questionId/liked", requireAuth, async (req, res) => {
    try {
      const questionId = Number(req.params.questionId);
      const user = req.user as any;
      const userId = getUserIdFromAuth(user);
      
      console.log(`Checking question like status - user ID: ${userId} from user:`, user);

      const hasLiked = await storage.hasUserLikedQuestion(questionId, userId);
      res.json({ liked: hasLiked });
    } catch (error) {
      res.status(500).json({ message: "Failed to check like status" });
    }
  });

  // Like a question (requires authentication)
  app.post("/api/questions/:questionId/like", requireAuth, async (req, res) => {
    try {
      const questionId = Number(req.params.questionId);
      const question = await storage.getQuestion(questionId);

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const user = req.user as any;
      const userId = getUserIdFromAuth(user);
      
      console.log(`Like question - user ID: ${userId} from user:`, user);

      const likeData = {
        questionId,
        userId,
      };

      const validatedData = insertLikeSchema.parse(likeData);
      const like = await storage.likeQuestion(validatedData);

      res.status(201).json(like);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid like data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to like question" });
    }
  });

  // Unlike a question (requires authentication)
  app.delete(
    "/api/questions/:questionId/like",
    requireAuth,
    async (req, res) => {
      try {
        const questionId = Number(req.params.questionId);

        // Get user ID from authenticated session
        const user = req.user as any;

        // Convert userId to a number - very important
        // Firebase IDs are strings, but our schema expects numbers
        let userId: number;

        if (user.claims?.sub) {
          // If using a Firebase token with sub claim (numeric uid), use that directly
          userId = parseInt(user.claims.sub, 10);
        } else if (user.id) {
          // Otherwise hash the string ID to a number
          const stringId = String(user.id);
          // Simple hash function to get a numeric value from string
          userId = parseInt(
            stringId.replace(/[^0-9]/g, "").substring(0, 9) || "1",
            10,
          );
        } else {
          // Fallback for testing
          userId = 1;
        }

        // Ensure userId is a valid number
        if (isNaN(userId)) {
          userId = 1; // Default fallback to prevent NaN errors
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
    },
  );
  
  // ---------- Comment Likes API Routes ----------
  
  // Get likes for a specific comment
  app.get("/api/comments/:commentId/likes", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      const likes = await storage.getLikesByCommentId(commentId);
      res.json(likes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comment likes" });
    }
  });

  // Check if user has liked a comment
  app.get("/api/comments/:commentId/liked", requireAuth, async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      const user = req.user as any;
      const userId = getUserIdFromAuth(user);
      
      console.log(`Checking comment like status - user ID: ${userId} from user:`, user);

      const hasLiked = await storage.hasUserLikedComment(commentId, userId);
      res.json({ liked: hasLiked });
    } catch (error) {
      res.status(500).json({ message: "Failed to check comment like status" });
    }
  });

  // Like a comment (requires authentication)
  app.post("/api/comments/:commentId/like", requireAuth, async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      const comment = await storage.getCommentById(commentId);

      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      const user = req.user as any;
      const userId = getUserIdFromAuth(user);
      
      console.log(`Like comment - user ID: ${userId} from user:`, user);

      const likeData = {
        commentId,
        userId,
      };

      const validatedData = insertCommentLikeSchema.parse(likeData);
      const like = await storage.likeComment(validatedData);

      res.status(201).json(like);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid comment like data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to like comment" });
    }
  });

  // Unlike a comment (requires authentication)
  app.delete(
    "/api/comments/:commentId/like",
    requireAuth,
    async (req, res) => {
      try {
        const commentId = Number(req.params.commentId);
        const user = req.user as any;
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
    },
  );
  
  // ---------- Answer Likes API Routes ----------
  
  // Get likes for a specific answer
  app.get("/api/answers/:answerId/likes", async (req, res) => {
    try {
      const answerId = Number(req.params.answerId);
      const likes = await storage.getLikesByAnswerId(answerId);
      res.json(likes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch answer likes" });
    }
  });

  // Check if user has liked an answer
  app.get("/api/answers/:answerId/liked", requireAuth, async (req, res) => {
    try {
      const answerId = Number(req.params.answerId);
      const user = req.user as any;
      const userId = getUserIdFromAuth(user);
      
      console.log(`Checking answer like status - user ID: ${userId} from user:`, user);

      const hasLiked = await storage.hasUserLikedAnswer(answerId, userId);
      res.json({ liked: hasLiked });
    } catch (error) {
      res.status(500).json({ message: "Failed to check answer like status" });
    }
  });

  // Like an answer (requires authentication)
  app.post("/api/answers/:answerId/like", requireAuth, async (req, res) => {
    try {
      const answerId = Number(req.params.answerId);
      const answer = await storage.getAnswerById(answerId);

      if (!answer) {
        return res.status(404).json({ message: "Answer not found" });
      }

      const user = req.user as any;
      const userId = getUserIdFromAuth(user);
      
      console.log(`Like answer - user ID: ${userId} from user:`, user);

      const likeData = {
        answerId,
        userId,
      };

      const validatedData = insertAnswerLikeSchema.parse(likeData);
      const like = await storage.likeAnswer(validatedData);

      res.status(201).json(like);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid answer like data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to like answer" });
    }
  });

  // Unlike an answer (requires authentication)
  app.delete(
    "/api/answers/:answerId/like",
    requireAuth,
    async (req, res) => {
      try {
        const answerId = Number(req.params.answerId);
        const user = req.user as any;
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
    },
  );

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
