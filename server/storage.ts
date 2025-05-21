import { 
  users, User, InsertUser, UpsertUser,
  questions, Question, InsertQuestion,
  answers, Answer, InsertAnswer,
  comments, Comment, InsertComment,
  likes, Like, InsertLike,
  commentLikes, CommentLike, InsertCommentLike,
  answerLikes, AnswerLike, InsertAnswerLike,
  adminWhitelist, AdminWhitelistEntry
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // We're deprecating the whitelist feature in favor of direct user management
  // These methods remain for backward compatibility
  isEmailWhitelisted(email: string): Promise<boolean>;
  addEmailToWhitelist(email: string, addedBy?: string): Promise<AdminWhitelistEntry>;
  removeEmailFromWhitelist(email: string): Promise<boolean>;
  getWhitelistedEmails(): Promise<AdminWhitelistEntry[]>;
  
  // Question methods
  getQuestions(): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: number, question: Partial<Question>): Promise<Question | undefined>;
  deleteQuestion(id: number): Promise<boolean>;
  
  // Answer methods
  getAnswersByQuestionId(questionId: number): Promise<Answer[]>;
  getAnswerById(id: number): Promise<Answer | undefined>;
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  updateAnswer(id: number, answer: Partial<Answer>): Promise<Answer | undefined>;
  deleteAnswer(id: number): Promise<boolean>;
  
  // Comment methods
  getCommentsByQuestionId(questionId: number): Promise<Comment[]>;
  getCommentById(id: number): Promise<Comment | undefined>;
  getCommentReplies(commentId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;
  deleteCommentWithReplies(id: number): Promise<boolean>;
  
  // Question Like methods
  likeQuestion(data: InsertLike): Promise<Like>;
  unlikeQuestion(questionId: number, userId: number): Promise<boolean>;
  getLikesByQuestionId(questionId: number): Promise<Like[]>;
  hasUserLikedQuestion(questionId: number, userId: number): Promise<boolean>;
  
  // Comment Like methods
  likeComment(data: InsertCommentLike): Promise<CommentLike>;
  unlikeComment(commentId: number, userId: number): Promise<boolean>;
  getLikesByCommentId(commentId: number): Promise<CommentLike[]>;
  hasUserLikedComment(commentId: number, userId: number): Promise<boolean>;
  
  // Answer Like methods
  likeAnswer(data: InsertAnswerLike): Promise<AnswerLike>;
  unlikeAnswer(answerId: number, userId: number): Promise<boolean>;
  getLikesByAnswerId(answerId: number): Promise<AnswerLike[]>;
  hasUserLikedAnswer(answerId: number, userId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private questions: Map<number, Question>;
  private answers: Map<number, Answer>;
  private comments: Map<number, Comment>;
  private likes: Map<number, Like>;
  private userId: number;
  private questionId: number;
  private answerId: number;
  private commentId: number;
  private likeId: number;

  constructor() {
    this.users = new Map();
    this.questions = new Map();
    this.answers = new Map();
    this.comments = new Map();
    this.likes = new Map();
    this.commentLikes = new Map();
    this.answerLikes = new Map();
    this.userId = 1;
    this.questionId = 1;
    this.answerId = 1;
    this.commentId = 1;
    this.likeId = 1;
    this.commentLikeId = 1;
    this.answerLikeId = 1;
    
    // Initialize with admin user
    this.createUser({
      username: "admin",
      password: "password", // In a real app, this would be hashed
      email: "kmichaeltb@gmail.com",
      isAdmin: true,
    });
    
    // Initialize with regular user
    this.createUser({
      username: "memberuser",
      password: "password", 
      email: "member@tewahedanswers.com",
      isAdmin: false,
    });
    
    // Create a comprehensive sample question with answers and comments
    this.createQuestion({
      title: "What is the significance of the Ethiopian Orthodox Tewahedo Church's unique calendar?",
      content: "<p>I've noticed that the Ethiopian Orthodox Church follows a different calendar. Could someone explain its significance and how it differs from other Orthodox calendars? I'm particularly interested in the historical context and religious significance.</p><p>Also, how does this affect the celebration of holidays and religious events compared to other Orthodox churches?</p>",
      author: "HistoryBuff42",
    }).then(async (question) => {
      // Update it to published with some votes
      await this.updateQuestion(question.id, {
        status: "published",
        votes: 15,
        answers: 1,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      });
      
      // Add an official answer
      const answer = await this.createAnswer({
        questionId: question.id,
        content: "<p>The Ethiopian Orthodox Tewahedo Church follows the ancient Alexandrian calendar, which is based on the ancient Egyptian calendar modified by Coptic adjustments. Here are the key aspects:</p><ul><li>The Ethiopian calendar has 13 months – 12 months of 30 days each and a 13th month (Pagume) of 5 or 6 days (in leap year).</li><li>It is approximately 7-8 years behind the Gregorian calendar due to different calculations of the birth year of Christ.</li><li>Unlike Western calendars, the Ethiopian New Year begins on September 11th (or September 12th in leap years), marking the end of the rainy season.</li></ul><p>This calendar is deeply significant as it preserves ancient Christian traditions and reflects Ethiopia's unique historical development, largely isolated from Western Christian influences.</p><p>Major holidays like Christmas (Genna) and Epiphany (Timkat) are celebrated on different dates than in other Orthodox traditions. This creates a distinct rhythm to religious life that is uniquely Ethiopian.</p>",
        author: "Church Scholar",
        isRichText: true,
        category: "History",
        tags: "calendar,traditions,orthodox"
      });
      
      // Update the answer with votes
      await this.updateAnswer(answer.id, {
        votes: 10,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      });
      
      // Add comments to the question
      const comment1 = await this.createComment({
        questionId: question.id,
        content: "I've been curious about this too. I attended an Ethiopian Orthodox service recently and was confused by the date references.",
        author: "CuriousVisitor",
        userId: 2,
        depth: 0
      });
      
      const comment2 = await this.createComment({
        questionId: question.id,
        content: "My Ethiopian friend explained that they're currently in the year 2015. It was quite surprising!",
        author: "GlobalLearner",
        userId: 2,
        depth: 0
      });
      
      // Add a reply to the first comment
      await this.createComment({
        questionId: question.id,
        content: "Yes, the current Ethiopian year differs from the Gregorian calendar. It's fascinating how different cultures track time differently.",
        author: "HistoryBuff42",
        userId: 2,
        parentId: comment1.id,
        depth: 1
      });
      
      // Add another reply to create a deeper conversation
      await this.createComment({
        questionId: question.id,
        content: "I believe it's because they calculated the birth of Christ differently than the Western calendar makers did.",
        author: "Church Scholar",
        userId: 1,
        parentId: comment2.id,
        depth: 1
      });
    });
    
    // Create a second sample question
    this.createQuestion({
      title: "How do I understand the concept of faith in Orthodox Christianity?",
      content: "<p>I am a newcomer to Orthodox Christianity and I'm trying to understand how faith is conceptualized differently than in Western traditions.</p><p>Can someone explain the Orthodox perspective on faith versus works?</p>",
      author: "NewBeliever123",
    }).then(question => {
      this.updateQuestion(question.id, {
        status: "published",
        votes: 12,
        answers: 0,
        date: new Date("2023-10-15")
      });
    });
    
    // Create a third sample question
    this.createQuestion({
      title: "How should I prepare for my first Orthodox liturgy?",
      content: "<p>I plan to attend an Orthodox liturgy for the first time this Sunday. What should I expect and how should I prepare?</p>",
      author: "SpiritualSeeker",
    }).then(question => {
      this.updateQuestion(question.id, {
        status: "pending",
        votes: 5,
        answers: 0,
        date: new Date("2023-10-09")
      });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    
    // Make sure email and isAdmin have default values
    const userData = {
      ...user,
      email: user.email || '',
      isAdmin: typeof user.isAdmin === 'boolean' ? user.isAdmin : false
    };
    
    const newUser: User = { ...userData, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async setUserAdmin(userId: number, isAdmin: boolean): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      isAdmin,
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  // Question methods
  async getQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values());
  }
  
  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }
  
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const id = this.questionId++;
    // Extract fields from the question object
    const { title, content, author, category, tags } = question;
    
    const newQuestion: Question = { 
      id,
      title,
      content,
      author,
      date: new Date(),
      status: "pending",
      votes: 0,
      answers: 0,
      comments: 0,
      category: category || null,
      tags: tags || null
    };
    this.questions.set(id, newQuestion);
    return newQuestion;
  }
  
  async updateQuestion(id: number, questionUpdate: Partial<Question>): Promise<Question | undefined> {
    const question = this.questions.get(id);
    if (!question) return undefined;
    
    // If we're publishing a question, ensure it has at least one answer in its count
    if (questionUpdate.status === 'published' && question.answers === 0) {
      questionUpdate.answers = 1;
    }
    
    const updatedQuestion = { ...question, ...questionUpdate };
    this.questions.set(id, updatedQuestion);
    return updatedQuestion;
  }
  
  async deleteQuestion(id: number): Promise<boolean> {
    return this.questions.delete(id);
  }
  
  // Answer methods
  async getAnswersByQuestionId(questionId: number): Promise<Answer[]> {
    return Array.from(this.answers.values()).filter(
      answer => answer.questionId === questionId
    );
  }
  
  async getAnswerById(id: number): Promise<Answer | undefined> {
    return this.answers.get(id);
  }
  
  async createAnswer(answer: InsertAnswer): Promise<Answer> {
    // Check if this question already has an answer to avoid duplicates
    const existingAnswers = Array.from(this.answers.values()).filter(
      a => a.questionId === answer.questionId
    );
    
    // If there's already an answer, update it instead of creating a new one
    if (existingAnswers.length > 0) {
      const existingAnswer = existingAnswers[0];
      
      // Update the existing answer with new content
      const updatedAnswer: Answer = {
        ...existingAnswer,
        content: answer.content,
        date: new Date(), // Update the date to now
        category: answer.category || existingAnswer.category,
        tags: answer.tags || existingAnswer.tags,
        isRichText: answer.isRichText || existingAnswer.isRichText
      };
      
      this.answers.set(existingAnswer.id, updatedAnswer);
      
      // Make sure the question has the correct answer count
      const question = this.questions.get(answer.questionId);
      if (question && question.answers === 0) {
        this.updateQuestion(answer.questionId, {
          answers: 1
        });
      }
      
      return updatedAnswer;
    }
    
    // Otherwise create a new answer
    const id = this.answerId++;
    const newAnswer: Answer = {
      ...answer,
      id,
      date: new Date(),
      votes: 0,
      category: answer.category || null,
      tags: answer.tags || null,
      isRichText: answer.isRichText || false
    };
    this.answers.set(id, newAnswer);
    
    // Update question answer count
    const question = this.questions.get(answer.questionId);
    if (question) {
      this.updateQuestion(answer.questionId, {
        answers: 1 // Always set to 1 since we only allow 1 answer per question
      });
    }
    
    return newAnswer;
  }
  
  async updateAnswer(id: number, answerUpdate: Partial<Answer>): Promise<Answer | undefined> {
    const answer = this.answers.get(id);
    if (!answer) return undefined;
    
    const updatedAnswer = { ...answer, ...answerUpdate };
    this.answers.set(id, updatedAnswer);
    return updatedAnswer;
  }
  
  async deleteAnswer(id: number): Promise<boolean> {
    const answer = this.answers.get(id);
    if (!answer) return false;
    
    // Update question answer count
    const question = this.questions.get(answer.questionId);
    if (question) {
      this.updateQuestion(answer.questionId, {
        answers: Math.max(0, question.answers - 1)
      });
    }
    
    return this.answers.delete(id);
  }
  
  // Comment methods
  async getCommentsByQuestionId(questionId: number): Promise<Comment[]> {
    const comments = Array.from(this.comments.values()).filter(
      comment => comment.questionId === questionId
    );
    
    // Sort comments by date (newest first for top-level) and by parent relationship
    return comments.sort((a, b) => {
      // If both are top-level comments or both have the same parent
      if ((!a.parentId && !b.parentId) || (a.parentId === b.parentId)) {
        // Sort by date, newest first
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      
      // Group comments by parent ID (child comments should appear after their parents)
      if (!a.parentId) return -1; // Top level comments first
      if (!b.parentId) return 1;
      
      // Sort by depth otherwise
      const aDepth = a.depth || 0;
      const bDepth = b.depth || 0;
      return aDepth - bDepth;
    });
  }
  
  async getCommentById(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }
  
  async createComment(comment: InsertComment): Promise<Comment> {
    const id = this.commentId++;
    
    // Set default values for thread-related fields
    let depth = 0;
    let parentId = comment.parentId || null;
    
    // If this is a reply to another comment, increment the depth
    if (parentId !== null) {
      const parentComment = this.comments.get(parentId);
      if (parentComment) {
        depth = (parentComment.depth || 0) + 1;
      }
    }
    
    const newComment: Comment = {
      ...comment,
      id,
      date: new Date(),
      parentId,
      depth,
      votes: 0
    };
    
    this.comments.set(id, newComment);
    
    // Update the question's comment count
    const question = this.questions.get(comment.questionId);
    if (question) {
      this.updateQuestion(comment.questionId, {
        comments: question.comments + 1
      });
    }
    
    return newComment;
  }
  
  async getCommentById(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }
  
  async getCommentReplies(commentId: number): Promise<Comment[]> {
    // Find all comments that have this comment as a parent
    return Array.from(this.comments.values()).filter(
      comment => comment.parentId === commentId
    );
  }
  
  async deleteCommentWithReplies(id: number): Promise<boolean> {
    try {
      const comment = this.comments.get(id);
      if (!comment) return false;
      
      // Get all replies to this comment (direct and nested)
      const allReplies: number[] = [];
      const findReplies = (parentId: number) => {
        const replies = Array.from(this.comments.values())
          .filter(c => c.parentId === parentId)
          .map(c => c.id);
          
        if (replies.length > 0) {
          allReplies.push(...replies);
          // Recursively find nested replies
          replies.forEach(replyId => findReplies(replyId));
        }
      };
      
      // Start the recursive search for all nested replies
      findReplies(id);
      
      // Delete all replies first
      for (const replyId of allReplies) {
        this.comments.delete(replyId);
      }
      
      // Delete the original comment
      const deleted = this.comments.delete(id);
      
      // Update question comment count to reflect all deleted comments
      const totalDeleted = allReplies.length + 1; // original comment + all replies
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
  
  async updateComment(id: number, commentUpdate: Partial<Comment>): Promise<Comment | undefined> {
    const comment = await this.getCommentById(id);
    if (!comment) {
      return undefined;
    }
    
    const updatedComment = {
      ...comment,
      ...commentUpdate
    };
    
    this.comments.set(id, updatedComment);
    return updatedComment;
  }
  
  async deleteComment(id: number): Promise<boolean> {
    // For backward compatibility, route through the new method
    return this.deleteCommentWithReplies(id);
  }
  
  async updateComment(id: number, commentUpdate: Partial<Comment>): Promise<Comment | undefined> {
    const comment = await this.getCommentById(id);
    if (!comment) {
      return undefined;
    }
    
    const updatedComment = {
      ...comment,
      ...commentUpdate
    };
    
    this.comments.set(id, updatedComment);
    return updatedComment;
  }
  
  // Like methods
  async likeQuestion(data: InsertLike): Promise<Like> {
    // Check if this user already liked this question
    const existingLike = Array.from(this.likes.values()).find(
      like => like.questionId === data.questionId && like.userId === data.userId
    );
    
    // If already liked, return the existing like
    if (existingLike) {
      return existingLike;
    }
    
    // Create a new like
    const id = this.likeId++;
    const newLike: Like = {
      ...data,
      id,
      date: new Date()
    };
    
    this.likes.set(id, newLike);
    
    // Increment the question's vote count
    const question = this.questions.get(data.questionId);
    if (question) {
      this.updateQuestion(data.questionId, {
        votes: question.votes + 1
      });
    }
    
    return newLike;
  }
  
  async unlikeQuestion(questionId: number, userId: number): Promise<boolean> {
    // Find the like to remove
    const like = Array.from(this.likes.values()).find(
      like => like.questionId === questionId && like.userId === userId
    );
    
    if (!like) return false;
    
    // Decrement the question's vote count
    const question = this.questions.get(questionId);
    if (question) {
      this.updateQuestion(questionId, {
        votes: Math.max(0, question.votes - 1)
      });
    }
    
    return this.likes.delete(like.id);
  }
  
  async getLikesByQuestionId(questionId: number): Promise<Like[]> {
    return Array.from(this.likes.values()).filter(
      like => like.questionId === questionId
    );
  }
  
  async hasUserLikedQuestion(questionId: number, userId: number): Promise<boolean> {
    return !!Array.from(this.likes.values()).find(
      like => like.questionId === questionId && like.userId === userId
    );
  }
}

export class DatabaseStorage implements IStorage {
  // In-memory storage for data (these would be database-backed in production)
  private comments = new Map<number, Comment>();
  private commentLikes = new Map<number, CommentLike>();
  private commentLikeId = 1;
  private answerLikes = new Map<number, AnswerLike>();
  private answerLikeId = 1;
  private likes = new Map<number, Like>();
  private likeId = 1;
  
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    // This is kept for API compatibility but is not used with Firebase auth
    return undefined;
  }
  
  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }
  
  async upsertUser(data: UpsertUser): Promise<User> {
    console.log("upsertUser called with data:", data);
    
    try {
      // First check if user exists by ID
      const existingUserById = await this.getUser(data.id);
      
      // Also check by email as fallback
      const existingUserByEmail = !existingUserById ? await this.getUserByEmail(data.email) : null;
      
      if (existingUserById) {
        console.log("Found existing user by ID:", existingUserById);
        
        // IMPORTANT: For existing users, preserve their admin status unless they're the default admin
        const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
        const isDefaultAdmin = data.email === DEFAULT_ADMIN_EMAIL;
        
        // Update existing user but preserve admin status
        const [updatedUser] = await db
          .update(users)
          .set({
            // Only update non-admin fields unless user is default admin
            id: data.id,
            email: data.email,
            displayName: data.displayName,
            photoURL: data.photoURL,
            // Only set isAdmin to true for default admin, otherwise preserve existing status
            isAdmin: isDefaultAdmin ? true : existingUserById.isAdmin,
            updatedAt: new Date()
          })
          .where(eq(users.id, data.id))
          .returning();
          
        console.log("Updated user with preserved admin status:", updatedUser);
        return updatedUser;
      } else if (existingUserByEmail) {
        console.log("Found existing user by email:", existingUserByEmail);
        
        // IMPORTANT: For existing users, preserve their admin status unless they're the default admin
        const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
        const isDefaultAdmin = data.email === DEFAULT_ADMIN_EMAIL;
        
        // User exists with this email but different ID - complex case
        // This shouldn't normally happen, but let's handle it anyway
        const [updatedUser] = await db
          .update(users)
          .set({
            // Only update non-admin fields unless user is default admin
            id: data.id, 
            email: data.email,
            displayName: data.displayName,
            photoURL: data.photoURL,
            // Only set isAdmin to true for default admin, otherwise preserve existing status
            isAdmin: isDefaultAdmin ? true : existingUserByEmail.isAdmin,
            updatedAt: new Date()
          })
          .where(eq(users.email, data.email))
          .returning();
          
        console.log("Updated user by email:", updatedUser);
        return updatedUser;
      } else {
        // Create new user
        console.log("Creating new user:", data);
        
        // IMPORTANT: Only the default admin should have admin rights by default
        const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
        const isDefaultAdmin = data.email === DEFAULT_ADMIN_EMAIL;
        
        try {
          const [newUser] = await db
            .insert(users)
            .values({
              id: data.id,
              email: data.email,
              displayName: data.displayName,
              photoURL: data.photoURL,
              // Only default admin gets admin privileges, all others start as regular users
              isAdmin: isDefaultAdmin,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
            
          console.log("Created new user:", newUser);
          return newUser;
        } catch (insertErr) {
          console.error("Error inserting new user:", insertErr);
          
          // Fallback: Try one more time with onConflictDoUpdate
          // IMPORTANT: Preserve admin status for existing users
          const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
          const isDefaultAdmin = data.email === DEFAULT_ADMIN_EMAIL;
          
          // Get existing user to preserve admin status if possible
          const existingUser = await this.getUserByEmail(data.email);
          
          const [mergedUser] = await db
            .insert(users)
            .values({
              id: data.id,
              email: data.email,
              displayName: data.displayName,
              photoURL: data.photoURL,
              // Only default admin or existing admins should have admin status
              isAdmin: isDefaultAdmin || (existingUser?.isAdmin === true),
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .onConflictDoUpdate({
              target: users.id,
              set: {
                email: data.email,
                displayName: data.displayName,
                photoURL: data.photoURL,
                // Only update admin status for default admin
                isAdmin: isDefaultAdmin ? true : db.sql`COALESCE(${users.isAdmin}, FALSE)`,
                updatedAt: new Date()
              }
            })
            .returning();
            
          console.log("Merged user with conflict resolution:", mergedUser);
          return mergedUser;
        }
      }
    } catch (error) {
      console.error("Error in upsertUser:", error);
      throw error;
    }
  }
  
  async setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined> {
    try {
      console.log(`setUserAdmin called with userId=${userId} and isAdmin=${isAdmin}`);
      
      // First check if the user exists
      const existingUser = await this.getUser(userId);
      
      if (!existingUser) {
        console.log(`User with ID ${userId} not found in database, cannot update admin status`);
        return undefined;
      }
      
      console.log(`Found user in database:`, existingUser);
      
      // CRITICAL: Check if this is the default admin email (kmichaeltb@gmail.com) that cannot be modified
      // "kmichaeltbekele@gmail.com" is NOT a default admin and should be allowed to be modified
      if (existingUser.email === "kmichaeltb@gmail.com" && !isAdmin) {
        console.log(`Cannot modify admin status for default admin: ${existingUser.email}`);
        return existingUser; // Return existing user without modifications
      }
      
      // Now update the user
      const [updatedUser] = await db
        .update(users)
        .set({ 
          isAdmin,
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId))
        .returning();
      
      console.log(`User admin status updated, result:`, updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error setting user admin status:', error);
      console.error('Full error object:', error);
      return undefined;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.email);
  }
  
  // Admin whitelist methods
  async isEmailWhitelisted(email: string): Promise<boolean> {
    const [entry] = await db.select().from(adminWhitelist).where(eq(adminWhitelist.email, email));
    return !!entry;
  }
  
  async addEmailToWhitelist(email: string, addedBy: string = "system"): Promise<AdminWhitelistEntry> {
    const [entry] = await db
      .insert(adminWhitelist)
      .values({
        email,
        addedBy,
        addedAt: new Date()
      })
      .onConflictDoUpdate({
        target: adminWhitelist.email,
        set: { addedBy, addedAt: new Date() }
      })
      .returning();
    
    return entry;
  }
  
  async removeEmailFromWhitelist(email: string): Promise<boolean> {
    await db
      .delete(adminWhitelist)
      .where(eq(adminWhitelist.email, email));
    
    return true; // Successfully executed the command
  }
  
  async getWhitelistedEmails(): Promise<AdminWhitelistEntry[]> {
    return await db.select().from(adminWhitelist);
  }
  
  // MemStorage compatibility methods - these will be updated to use the database in a future iteration
  
  // Question methods - using memory storage for now
  private questions = new Map<number, Question>();
  private questionId = 1;
  
  async getQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values());
  }
  
  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }
  
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const id = this.questionId++;
    const newQuestion: Question = { 
      ...question, 
      id,
      date: new Date(), // Add the required date field
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
  
  async updateQuestion(id: number, questionUpdate: Partial<Question>): Promise<Question | undefined> {
    const question = this.questions.get(id);
    if (!question) return undefined;
    
    const updatedQuestion = { ...question, ...questionUpdate };
    this.questions.set(id, updatedQuestion);
    return updatedQuestion;
  }
  
  async deleteQuestion(id: number): Promise<boolean> {
    return this.questions.delete(id);
  }
  
  // Answer methods - using memory storage for now
  private answers = new Map<number, Answer>();
  private answerId = 1;
  
  async getAnswersByQuestionId(questionId: number): Promise<Answer[]> {
    return Array.from(this.answers.values()).filter(
      answer => answer.questionId === questionId
    );
  }
  
  async getAnswerById(id: number): Promise<Answer | undefined> {
    return this.answers.get(id);
  }
  
  async createAnswer(answer: InsertAnswer): Promise<Answer> {
    const id = this.answerId++;
    
    // Update question's answer count
    const question = await this.getQuestion(answer.questionId);
    if (question) {
      const updatedAnswer: Answer = {
        ...answer,
        id,
        date: new Date(),  // Add the required date field
        votes: 0,
        category: answer.category || null,
        tags: answer.tags || null,
        isRichText: answer.isRichText || null
      };
      
      console.log("Creating answer with question:", updatedAnswer);
      this.answers.set(id, updatedAnswer);
      
      // Update question status and answer count
      await this.updateQuestion(answer.questionId, {
        status: "published", // Auto-publish when answered
        answers: question.answers + 1
      });
      
      return updatedAnswer;
    }
    
    const newAnswer: Answer = {
      ...answer,
      id,
      date: new Date(),  // Add the required date field
      votes: 0,
      category: answer.category || null,
      tags: answer.tags || null,
      isRichText: answer.isRichText || null
    };
    
    console.log("Creating answer without question:", newAnswer);
    this.answers.set(id, newAnswer);
    return newAnswer;
  }
  
  async updateAnswer(id: number, answerUpdate: Partial<Answer>): Promise<Answer | undefined> {
    const answer = this.answers.get(id);
    if (!answer) return undefined;
    
    const updatedAnswer = { ...answer, ...answerUpdate };
    this.answers.set(id, updatedAnswer);
    return updatedAnswer;
  }
  
  async deleteAnswer(id: number): Promise<boolean> {
    const answer = this.answers.get(id);
    if (!answer) return false;
    
    // Update question's answer count
    const question = this.questions.get(answer.questionId);
    if (question) {
      this.updateQuestion(answer.questionId, {
        answers: Math.max(0, question.answers - 1)
      });
    }
    
    return this.answers.delete(id);
  }
  
  // Comment methods - using memory storage for now
  private comments = new Map<number, Comment>();
  private commentId = 1;
  
  async getCommentsByQuestionId(questionId: number): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(
      comment => comment.questionId === questionId
    );
  }
  
  async getCommentById(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }
  
  async getCommentReplies(commentId: number): Promise<Comment[]> {
    // Find all comments that have this comment as a parent
    return Array.from(this.comments.values()).filter(
      comment => comment.parentId === commentId
    );
  }
  
  async createComment(comment: InsertComment): Promise<Comment> {
    const id = this.commentId++;
    
    // Update question's comment count
    const question = this.questions.get(comment.questionId);
    if (question) {
      this.updateQuestion(comment.questionId, {
        comments: question.comments + 1
      });
    }
    
    const newComment: Comment = {
      ...comment,
      id,
      date: new Date(),
      parentId: comment.parentId || null,
      depth: comment.depth || null,
      votes: 0 // Initialize votes to zero
    };
    
    this.comments.set(id, newComment);
    return newComment;
  }

  async deleteCommentWithReplies(id: number): Promise<boolean> {
    try {
      const comment = this.comments.get(id);
      if (!comment) return false;
      
      // Get all replies to this comment (direct and nested)
      const allReplies: number[] = [];
      const findReplies = (parentId: number) => {
        const replies = Array.from(this.comments.values())
          .filter(c => c.parentId === parentId)
          .map(c => c.id);
          
        if (replies.length > 0) {
          allReplies.push(...replies);
          // Recursively find nested replies
          replies.forEach(replyId => findReplies(replyId));
        }
      };
      
      // Start the recursive search for all nested replies
      findReplies(id);
      
      console.log(`Deleting comment #${id} with ${allReplies.length} nested replies`);
      
      // Delete all replies first
      for (const replyId of allReplies) {
        this.comments.delete(replyId);
      }
      
      // Delete the original comment
      const deleted = this.comments.delete(id);
      
      // Update question comment count to reflect all deleted comments
      const totalDeleted = allReplies.length + 1; // original comment + all replies
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
  
  async deleteComment(id: number): Promise<boolean> {
    // For backward compatibility, route through the new method that also deletes replies
    return this.deleteCommentWithReplies(id);
  }
  
  // Question Like methods - using memory storage
  private likes = new Map<number, Like>();
  private likeId = 1;
  
  async likeQuestion(data: InsertLike): Promise<Like> {
    const id = this.likeId++;
    
    const newLike: Like = {
      ...data,
      id,
      date: new Date()
    };
    
    this.likes.set(id, newLike);
    
    // Increment the question's vote count
    const question = this.questions.get(data.questionId);
    if (question) {
      this.updateQuestion(data.questionId, {
        votes: question.votes + 1
      });
    }
    
    return newLike;
  }
  
  async unlikeQuestion(questionId: number, userId: number): Promise<boolean> {
    // Find the like to remove
    const like = Array.from(this.likes.values()).find(
      like => like.questionId === questionId && like.userId === userId
    );
    
    if (!like) return false;
    
    // Decrement the question's vote count
    const question = this.questions.get(questionId);
    if (question) {
      this.updateQuestion(questionId, {
        votes: Math.max(0, question.votes - 1)
      });
    }
    
    return this.likes.delete(like.id);
  }
  
  async getLikesByQuestionId(questionId: number): Promise<Like[]> {
    return Array.from(this.likes.values()).filter(
      like => like.questionId === questionId
    );
  }
  
  async hasUserLikedQuestion(questionId: number, userId: number): Promise<boolean> {
    return !!Array.from(this.likes.values()).find(
      like => like.questionId === questionId && like.userId === userId
    );
  }
  
  // Comment Like methods
  private commentLikes = new Map<number, CommentLike>();
  private commentLikeId = 1;
  
  async likeComment(data: InsertCommentLike): Promise<CommentLike> {
    console.log("DEBUG: likeComment called with data:", data);
    const id = this.commentLikeId++;
    
    const newLike: CommentLike = {
      ...data,
      id,
      date: new Date()
    };
    
    console.log("DEBUG: Setting new comment like in map:", newLike);
    this.commentLikes.set(id, newLike);
    
    // Update the comment's vote count
    console.log("DEBUG: Getting comment from storage:", data.commentId);
    const comment = this.comments.get(data.commentId);
    console.log("DEBUG: Retrieved comment:", comment);
    
    if (comment) {
      const currentVotes = comment.votes || 0;
      console.log("DEBUG: Current votes:", currentVotes);
      
      try {
        // Direct update instead of using updateComment method
        comment.votes = currentVotes + 1;
        this.comments.set(data.commentId, comment);
        console.log("DEBUG: Updated comment votes:", comment.votes);
      } catch (error) {
        console.error("DEBUG: Error updating comment votes:", error);
      }
    }
    
    return newLike;
  }
  
  async unlikeComment(commentId: number, userId: number): Promise<boolean> {
    console.log("DEBUG: unlikeComment called with", commentId, userId);
    // Find the like to remove
    const like = Array.from(this.commentLikes.values()).find(
      like => like.commentId === commentId && like.userId === userId
    );
    
    console.log("DEBUG: Found like to remove:", like);
    if (!like) return false;
    
    // Decrement the comment's vote count
    const comment = this.comments.get(commentId);
    console.log("DEBUG: Found comment to update:", comment);
    
    if (comment) {
      const currentVotes = comment.votes || 0;
      console.log("DEBUG: Current votes:", currentVotes);
      
      // Direct update instead of using updateComment method
      comment.votes = Math.max(0, currentVotes - 1);
      this.comments.set(commentId, comment);
      console.log("DEBUG: Updated comment votes:", comment.votes);
    }
    
    const result = this.commentLikes.delete(like.id);
    console.log("DEBUG: Result of deleting like:", result);
    return result;
  }
  
  async getLikesByCommentId(commentId: number): Promise<CommentLike[]> {
    return Array.from(this.commentLikes.values()).filter(
      like => like.commentId === commentId
    );
  }
  
  async hasUserLikedComment(commentId: number, userId: number): Promise<boolean> {
    return !!Array.from(this.commentLikes.values()).find(
      like => like.commentId === commentId && like.userId === userId
    );
  }
  
  // Answer Like methods
  private answerLikes = new Map<number, AnswerLike>();
  private answerLikeId = 1;
  
  async likeAnswer(data: InsertAnswerLike): Promise<AnswerLike> {
    const id = this.answerLikeId++;
    
    const newLike: AnswerLike = {
      ...data,
      id,
      date: new Date()
    };
    
    this.answerLikes.set(id, newLike);
    
    // Increment the answer's vote count if it has one
    const answer = this.answers.get(data.answerId);
    if (answer) {
      this.updateAnswer(data.answerId, {
        votes: answer.votes + 1
      });
    }
    
    return newLike;
  }
  
  async unlikeAnswer(answerId: number, userId: number): Promise<boolean> {
    // Find the like to remove
    const like = Array.from(this.answerLikes.values()).find(
      like => like.answerId === answerId && like.userId === userId
    );
    
    if (!like) return false;
    
    // Decrement the answer's vote count
    const answer = this.answers.get(answerId);
    if (answer) {
      this.updateAnswer(answerId, {
        votes: Math.max(0, answer.votes - 1)
      });
    }
    
    return this.answerLikes.delete(like.id);
  }
  
  async getLikesByAnswerId(answerId: number): Promise<AnswerLike[]> {
    return Array.from(this.answerLikes.values()).filter(
      like => like.answerId === answerId
    );
  }
  
  async hasUserLikedAnswer(answerId: number, userId: number): Promise<boolean> {
    return !!Array.from(this.answerLikes.values()).find(
      like => like.answerId === answerId && like.userId === userId
    );
  }
}

// Initialize the database storage
export const storage = new DatabaseStorage();
