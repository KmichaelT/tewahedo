import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Question, Answer, Comment, InsertComment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThumbsUp, MessageSquare, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ReplyIcon } from "lucide-react";

export default function QuestionDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [location] = useLocation();
  const questionId = parseInt(location.split("/")[2]);

  // Fetch question details
  const { data: question, isLoading: questionLoading } = useQuery<Question>({
    queryKey: [`/api/questions/${questionId}`],
    enabled: !isNaN(questionId)
  });

  // Fetch answers for this question
  const { data: answers, isLoading: answersLoading } = useQuery<Answer[]>({
    queryKey: [`/api/answers/${questionId}`],
    enabled: !isNaN(questionId)
  });

  // State for tracking if the user has liked this question
  const [hasLiked, setHasLiked] = useState(false);
  
  // State for tracking which answers the user has liked
  const [likedAnswers, setLikedAnswers] = useState<Record<number, boolean>>({});
  
  // State for tracking which comments the user has liked
  const [likedComments, setLikedComments] = useState<Record<number, boolean>>({});
  
  // State for new comment
  const [commentText, setCommentText] = useState("");
  
  // State for tracking which comment we're replying to
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  
  // State to track the depth of the reply we're making
  const [replyDepth, setReplyDepth] = useState<number>(0);
  
  // Reference to the comment input field for focusing
  const commentInputRef = useRef<HTMLInputElement>(null);
  
  // Check if the user has liked this question (if they're authenticated)
  const { data: likeStatus } = useQuery<{liked: boolean}>({
    queryKey: [`/api/questions/${questionId}/liked`],
    enabled: !isNaN(questionId) && isAuthenticated
  });
  
  // Fetch comments for this question
  const { data: comments, isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: [`/api/questions/${questionId}/comments`],
    enabled: !isNaN(questionId)
  });
  
  // Check answer and comment like status when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Check answers like status
    if (answers?.length) {
      answers.forEach(answer => {
        fetch(`/api/answers/${answer.id}/liked`)
          .then(res => res.json())
          .then(data => {
            if (data.liked) {
              setLikedAnswers(prev => ({
                ...prev,
                [answer.id]: true
              }));
            }
          })
          .catch(err => console.error(`Error checking answer like status:`, err));
      });
    }
    
    // Check comments like status
    if (comments?.length) {
      comments.forEach(comment => {
        fetch(`/api/comments/${comment.id}/liked`)
          .then(res => res.json())
          .then(data => {
            if (data.liked) {
              setLikedComments(prev => ({
                ...prev,
                [comment.id]: true
              }));
            }
          })
          .catch(err => console.error(`Error checking comment like status:`, err));
      });
    }
  }, [isAuthenticated, answers, comments]);
  
  // Update hasLiked when likeStatus changes
  useEffect(() => {
    if (likeStatus?.liked) {
      setHasLiked(true);
    }
  }, [likeStatus]);
  
  // Like question mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      console.log(`Liking question ${questionId}`);
      return await apiRequest('POST', `/api/questions/${questionId}/like`, {});
    },
    onSuccess: () => {
      setHasLiked(true);
      // Update question data to reflect the new vote count
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}`] });
      toast({
        title: "Liked!",
        description: "Your like has been recorded"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to like the question",
        variant: "destructive"
      });
    }
  });
  
  // Unlike question mutation
  const unlikeMutation = useMutation({
    mutationFn: async () => {
      console.log(`Unliking question ${questionId}`);
      return await apiRequest('DELETE', `/api/questions/${questionId}/like`);
    },
    onSuccess: () => {
      setHasLiked(false);
      // Update question data to reflect the new vote count
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}`] });
      toast({
        title: "Unliked",
        description: "Your like has been removed"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unlike the question",
        variant: "destructive"
      });
    }
  });
  
  // Like answer mutation
  const likeAnswerMutation = useMutation({
    mutationFn: async (answerId: number) => {
      console.log(`Liking answer ${answerId}`);
      return await apiRequest('POST', `/api/answers/${answerId}/like`, {});
    },
    onSuccess: (_, answerId) => {
      // Update local state
      setLikedAnswers(prev => ({
        ...prev,
        [answerId]: true
      }));
      
      // Update answers data to reflect the new vote count
      queryClient.invalidateQueries({ queryKey: [`/api/answers/${questionId}`] });
      
      toast({
        title: "Liked!",
        description: "You liked this answer"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to like the answer",
        variant: "destructive"
      });
    }
  });
  
  // Unlike answer mutation
  const unlikeAnswerMutation = useMutation({
    mutationFn: async (answerId: number) => {
      console.log(`Unliking answer ${answerId}`);
      return await apiRequest('DELETE', `/api/answers/${answerId}/like`);
    },
    onSuccess: (_, answerId) => {
      // Update local state
      setLikedAnswers(prev => {
        const newState = { ...prev };
        delete newState[answerId];
        return newState;
      });
      
      // Update answers data to reflect the new vote count
      queryClient.invalidateQueries({ queryKey: [`/api/answers/${questionId}`] });
      
      toast({
        title: "Unliked",
        description: "Your like has been removed from this answer"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unlike the answer",
        variant: "destructive"
      });
    }
  });
  
  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      console.log(`Liking comment ${commentId}`);
      return await apiRequest('POST', `/api/comments/${commentId}/like`, {});
    },
    onSuccess: (_, commentId) => {
      // Update local state
      setLikedComments(prev => ({
        ...prev,
        [commentId]: true
      }));
      
      // Update comments data to reflect the new vote count
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}/comments`] });
      
      toast({
        title: "Liked!",
        description: "You liked this comment"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to like the comment",
        variant: "destructive"
      });
    }
  });
  
  // Unlike comment mutation
  const unlikeCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      console.log(`Unliking comment ${commentId}`);
      return await apiRequest('DELETE', `/api/comments/${commentId}/like`);
    },
    onSuccess: (_, commentId) => {
      // Update local state
      setLikedComments(prev => {
        const newState = { ...prev };
        delete newState[commentId];
        return newState;
      });
      
      // Update comments data to reflect the new vote count
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}/comments`] });
      
      toast({
        title: "Unliked",
        description: "Your like has been removed from this comment"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unlike the comment",
        variant: "destructive"
      });
    }
  });
  
  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (payload: { content: string, parentId?: number }) => {
      console.log(`Adding comment to question ${questionId}:`, payload);
      return await apiRequest('POST', `/api/questions/${questionId}/comments`, payload);
    },
    onSuccess: () => {
      setCommentText(""); // Clear input
      setReplyingTo(null); // Reset reply state
      setReplyDepth(0);
      // Refresh comments
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}/comments`] });
      // Update question data to reflect the new comment count
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}`] });
      toast({
        title: "Comment Added",
        description: "Your comment has been posted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive"
      });
    }
  });
  
  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      console.log(`Deleting comment ${commentId}`);
      return await apiRequest('DELETE', `/api/comments/${commentId}`);
    },
    onSuccess: (data: any) => {
      // Refresh comments
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}/comments`] });
      // Update question data to reflect the new comment count
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}`] });
      
      // Show success message with the count of deleted comments if replies were deleted too
      const replyCountMsg = data.replyCount 
        ? ` and ${data.replyCount} ${data.replyCount === 1 ? 'reply' : 'replies'}`
        : '';
        
      toast({
        title: "Comment Deleted",
        description: `Comment${replyCountMsg} has been removed successfully`
      });
    },
    onError: (error: any) => {
      // Attempt to extract the server error message if available
      let errorMessage = "Failed to delete comment";
      
      try {
        if (error.response && error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch (e) {
        console.error("Error parsing error message:", e);
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
  
  // Handle starting a reply to a comment
  const handleStartReply = (commentId: number, depth: number = 0) => {
    setReplyingTo(commentId);
    setReplyDepth(depth);
    setCommentText('');
    
    // Focus the input field
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
      }
    }, 100);
  };
  
  // Cancel replying
  const cancelReply = () => {
    setReplyingTo(null);
    setReplyDepth(0);
    setCommentText('');
  };
  
  // Handle add comment (or reply)
  const handleAddComment = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add comments",
        variant: "destructive"
      });
      return;
    }
    
    if (!commentText.trim()) {
      toast({
        title: "Empty Comment",
        description: "Please enter some text for your comment",
        variant: "destructive"
      });
      return;
    }
    
    const payload: any = { content: commentText };
    
    // If replying to a comment, include the parentId
    if (replyingTo !== null) {
      payload.parentId = replyingTo;
    }
    
    addCommentMutation.mutate(payload);
  };
  
  // Check if user can delete a comment
  const canDeleteComment = (comment: Comment): boolean => {
    if (!isAuthenticated || !user) return false;
    
    // Admins can delete any comment
    if (isAdmin) return true;
    
    // For regular users, we need to compare numeric IDs
    // Firebase uses string UIDs, but we store numeric IDs in the database
    // We need to convert the Firebase UID to a numeric ID using the same algorithm as the backend
    
    // Firebase UID to numeric ID conversion (must match server-side logic)
    const convertFirebaseUidToNumericId = (firebaseUid: string): number => {
      // Extract numeric characters and take first 9 digits (same as server)
      const numericPart = firebaseUid.replace(/[^0-9]/g, "").substring(0, 9);
      return parseInt(numericPart || "1", 10);
    };
    
    // Convert the current user's Firebase UID to a numeric ID
    const numericUserId = convertFirebaseUidToNumericId(user.id);
    
    // Compare with the comment's userId (which is already numeric)
    const isCommenter = comment.userId === numericUserId;
    
    // Check if comment is less than 1 hour old
    const commentAge = Date.now() - new Date(comment.date).getTime();
    const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds
    const isWithinTimeWindow = commentAge < ONE_HOUR_MS;
    
    console.log(`Can delete check:`, {
      commentId: comment.id,
      commentUserId: comment.userId,
      firebaseUid: user.id,
      numericUserId,
      isCommenter,
      isWithinTimeWindow,
      commentAge: `${(commentAge / (1000 * 60)).toFixed(2)} minutes`
    });
    
    // Regular users can only delete their own comments within 1 hour
    return isCommenter && isWithinTimeWindow;
  };
  
  // Handle delete comment
  const handleDeleteComment = (commentId: number) => {
    // Find the comment we're trying to delete for logging purposes
    const comment = comments?.find(c => c.id === commentId);
    if (comment) {
      // Log diagnostic information
      console.log('Attempting to delete comment:', {
        commentId,
        commentUserId: comment.userId, 
        currentUserId: user?.id,
        isAdmin,
        commentAge: Date.now() - new Date(comment.date).getTime(),
        commentDate: new Date(comment.date).toISOString(),
        canDelete: canDeleteComment(comment)
      });
    }
    
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };
  
  // Handle like button click for questions
  const handleLike = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to like questions",
        variant: "destructive"
      });
      return;
    }
    
    // Toggle like status
    if (hasLiked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };
  
  // Handle like button click for answers
  const handleAnswerLike = (answerId: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to like answers",
        variant: "destructive"
      });
      return;
    }
    
    // Toggle like status
    if (likedAnswers[answerId]) {
      unlikeAnswerMutation.mutate(answerId);
    } else {
      likeAnswerMutation.mutate(answerId);
    }
  };
  
  // Handle like button click for comments
  const handleCommentLike = (commentId: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to like comments",
        variant: "destructive"
      });
      return;
    }
    
    // Toggle like status
    if (likedComments[commentId]) {
      unlikeCommentMutation.mutate(commentId);
    } else {
      likeCommentMutation.mutate(commentId);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  if (questionLoading) {
    return (
      <div className="px-4 sm:px-0">
        <Card className="bg-white rounded-lg shadow-card mb-6">
          <CardContent className="p-6">
            <Skeleton className="h-8 w-3/4 mb-2" />
            <div className="flex items-center space-x-2 mb-4">
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="px-4 sm:px-0">
        <Card className="bg-white rounded-lg shadow-card">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-red-600 mb-2">Question Not Found</h2>
            <p className="text-gray-600">
              The question you're looking for does not exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      {/* 1. Question Card */}
      <Card className="bg-white rounded-lg shadow-card mb-6">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold text-secondary mb-2">{question.title}</h1>
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <span>Posted by {question.author} on {formatDate(question.date)}</span>
          </div>
          
          <div className="prose max-w-none text-text mb-6">
            <div dangerouslySetInnerHTML={{ __html: question.content }}></div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button 
                onClick={handleLike}
                className="flex items-center text-gray-500 hover:text-primary transition-colors"
              >
                <ThumbsUp className="h-5 w-5 mr-1" />
                <span>{question.votes}</span>
              </button>
              
              <div className="flex items-center text-gray-500">
                <MessageSquare className="h-5 w-5 mr-1" />
                <span>{answers?.length || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Official Answer Section */}
      {!answersLoading && answers && answers.length > 0 ? (
        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-bold">Official {answers.length > 1 ? 'Answers' : 'Answer'}</h2>
          {answers.map(answer => (
            <Card key={answer.id} className="bg-white rounded-lg shadow-card">
              <CardContent className="p-6">
                {answer.category && (
                  <div className="mb-2">
                    <span className="inline-block bg-primary/10 text-primary text-sm px-2 py-1 rounded">
                      {answer.category}
                    </span>
                    {answer.tags && (
                      <span className="ml-2 text-sm text-gray-500">
                        {answer.tags}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="prose max-w-none text-text">
                  {answer.isRichText ? (
                    <div dangerouslySetInnerHTML={{ __html: answer.content }} />
                  ) : (
                    <p>{answer.content}</p>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500">
                    Answered by {answer.author} on {formatDate(answer.date)}
                  </div>
                  <button 
                    onClick={() => handleAnswerLike(answer.id)}
                    className={`flex items-center ${likedAnswers[answer.id] ? 'text-primary' : 'text-gray-500'} hover:text-primary transition-colors`}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    <span>{answer.votes}</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : answersLoading ? (
        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-bold">Official Answer</h2>
          <Card className="bg-white rounded-lg shadow-card">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-1/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mb-8">
          <Card className="bg-white rounded-lg shadow-card">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No official answers yet.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Comments Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Comments ({question.comments || 0})</h2>
        
        {/* Top-level Comment Form - only show if not replying to a specific comment */}
        {replyingTo === null && (
          <div className="flex flex-col mb-4">
            <div className="flex items-center">
              <Input
                ref={commentInputRef}
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-grow mr-2"
                disabled={!isAuthenticated || addCommentMutation.isPending}
              />
              <Button 
                onClick={handleAddComment} 
                disabled={!isAuthenticated || !commentText.trim() || addCommentMutation.isPending}
                size="sm"
              >
                {addCommentMutation.isPending ? (
                  <span>Posting...</span>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* Comments List */}
        {commentsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-4">
            {/* Render top-level comments first */}
            {comments
              .filter(comment => !comment.parentId)
              .map((comment) => (
                <div key={comment.id} className="comment-thread">
                  {/* The main comment */}
                  <Card className="bg-white">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-grow">
                          <div className="flex items-center mb-1">
                            <span className="text-sm font-medium">{comment.author}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {new Date(comment.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: comment.content }}></div>
                          
                          <div className="flex items-center mt-2 space-x-2">
                            {/* Like button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCommentLike(comment.id)}
                              className={`h-6 px-2 text-xs ${likedComments[comment.id] ? 'text-primary' : 'text-gray-500'} hover:text-primary transition-colors`}
                              disabled={!isAuthenticated}
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              <span>{comment.votes?.toString() || "0"}</span>
                            </Button>
                            
                            {/* Reply button */}
                            {isAuthenticated && replyingTo !== comment.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleStartReply(comment.id, 1)}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Reply
                              </Button>
                            )}
                          </div>
                        </div>
                        {isAuthenticated && canDeleteComment(comment) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDeleteComment(comment.id)}
                            title={isAdmin ? "Delete comment (admin)" : "Delete your comment"}
                          >
                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Inline reply form for this comment */}
                  {replyingTo === comment.id && (
                    <div className="ml-6 mt-2 pl-4 border-l-2 border-gray-200 mb-4">
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between bg-gray-50 p-2 rounded mb-2">
                          <span className="text-sm">
                            Replying to {comment.author}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={cancelReply}
                            className="h-6 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                        <div className="flex items-center">
                          <Input
                            ref={commentInputRef}
                            placeholder="Add your reply..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="flex-grow mr-2"
                            disabled={addCommentMutation.isPending}
                          />
                          <Button 
                            onClick={handleAddComment} 
                            disabled={!commentText.trim() || addCommentMutation.isPending}
                            size="sm"
                          >
                            {addCommentMutation.isPending ? (
                              <span>Posting...</span>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-1" />
                                Reply
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Render child comments (replies) */}
                  {comments
                    .filter(reply => reply.parentId === comment.id)
                    .map(reply => (
                      <div 
                        key={reply.id} 
                        className="ml-6 mt-2 pl-4 border-l-2 border-gray-200"
                      >
                        <Card className="bg-white">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-grow">
                                <div className="flex items-center mb-1">
                                  <span className="text-sm font-medium">{reply.author}</span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {new Date(reply.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: reply.content }}></div>
                                
                                <div className="flex items-center mt-2 space-x-2">
                                  {/* Like button */}
                                  <Button 
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCommentLike(reply.id)}
                                    className={`h-6 px-2 text-xs ${likedComments[reply.id] ? 'text-primary' : 'text-gray-500'} hover:text-primary transition-colors`}
                                    disabled={!isAuthenticated}
                                  >
                                    <ThumbsUp className="h-3 w-3 mr-1" />
                                    <span>{reply.votes?.toString() || "0"}</span>
                                  </Button>
                                
                                  {/* Nested reply button */}
                                  {isAuthenticated && replyingTo !== reply.id && (reply.depth || 0) < 3 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => handleStartReply(reply.id, (reply.depth || 0) + 1)}
                                    >
                                      <MessageSquare className="h-3 w-3 mr-1" />
                                      Reply
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {isAuthenticated && canDeleteComment(reply) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDeleteComment(reply.id)}
                                  title={isAdmin ? "Delete comment (admin)" : "Delete your comment"}
                                >
                                  <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Inline reply form for this nested comment */}
                        {replyingTo === reply.id && (
                          <div className="ml-4 mt-2 pl-4 border-l-2 border-gray-200 mb-4">
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between bg-gray-50 p-2 rounded mb-2">
                                <span className="text-sm">
                                  Replying to {reply.author}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={cancelReply}
                                  className="h-6 px-2 text-xs"
                                >
                                  Cancel
                                </Button>
                              </div>
                              <div className="flex items-center">
                                <Input
                                  ref={commentInputRef}
                                  placeholder="Add your reply..."
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  className="flex-grow mr-2"
                                  disabled={addCommentMutation.isPending}
                                />
                                <Button 
                                  onClick={handleAddComment} 
                                  disabled={!commentText.trim() || addCommentMutation.isPending}
                                  size="sm"
                                >
                                  {addCommentMutation.isPending ? (
                                    <span>Posting...</span>
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4 mr-1" />
                                      Reply
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Render third-level and beyond replies */}
                        {comments
                          .filter(nestedReply => nestedReply.parentId === reply.id)
                          .map(nestedReply => (
                            <div 
                              key={nestedReply.id} 
                              className="ml-4 mt-2 pl-4 border-l-2 border-gray-200"
                            >
                              <Card className="bg-white">
                                <CardContent className="p-3">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-grow">
                                      <div className="flex items-center mb-1">
                                        <span className="text-sm font-medium">{nestedReply.author}</span>
                                        <span className="text-xs text-gray-500 ml-2">
                                          {new Date(nestedReply.date).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: nestedReply.content }}></div>
                                      
                                      <div className="flex items-center mt-2 space-x-2">
                                        {/* Like button */}
                                        <Button 
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleCommentLike(nestedReply.id)}
                                          className={`h-6 px-2 text-xs ${likedComments[nestedReply.id] ? 'text-primary' : 'text-gray-500'} hover:text-primary transition-colors`}
                                          disabled={!isAuthenticated}
                                        >
                                          <ThumbsUp className="h-3 w-3 mr-1" />
                                          <span>{nestedReply.votes?.toString() || "0"}</span>
                                        </Button>
                                        
                                        {/* Deeper nested reply button - only if not at max depth */}
                                        {isAuthenticated && replyingTo !== nestedReply.id && (nestedReply.depth || 0) < 3 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => handleStartReply(nestedReply.id, (nestedReply.depth || 0) + 1)}
                                          >
                                            <MessageSquare className="h-3 w-3 mr-1" />
                                            Reply
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    {isAuthenticated && canDeleteComment(nestedReply) && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleDeleteComment(nestedReply.id)}
                                        title={isAdmin ? "Delete comment (admin)" : "Delete your comment"}
                                      >
                                        <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                              
                              {/* Inline reply form for this deepest level comment */}
                              {replyingTo === nestedReply.id && (
                                <div className="ml-4 mt-2 pl-4 border-l-2 border-gray-200 mb-4">
                                  <div className="flex flex-col">
                                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded mb-2">
                                      <span className="text-sm">
                                        Replying to {nestedReply.author}
                                      </span>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={cancelReply}
                                        className="h-6 px-2 text-xs"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                    <div className="flex items-center">
                                      <Input
                                        ref={commentInputRef}
                                        placeholder="Add your reply..."
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        className="flex-grow mr-2"
                                        disabled={addCommentMutation.isPending}
                                      />
                                      <Button 
                                        onClick={handleAddComment} 
                                        disabled={!commentText.trim() || addCommentMutation.isPending}
                                        size="sm"
                                      >
                                        {addCommentMutation.isPending ? (
                                          <span>Posting...</span>
                                        ) : (
                                          <>
                                            <Send className="h-4 w-4 mr-1" />
                                            Reply
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    ))}
                </div>
              ))}
          </div>
        ) : (
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <p className="text-gray-500">No comments yet. Be the first to comment!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}