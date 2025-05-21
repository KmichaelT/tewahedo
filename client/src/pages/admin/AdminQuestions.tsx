import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Question, Answer, InsertAnswer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { STATUS_COLORS } from "@/lib/constants";
import RichTextEditor from "@/components/RichTextEditor";
import ResponsiveQuestionList from "@/components/ResponsiveQuestionList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminQuestions() {
  const { toast } = useToast();
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<number | null>(null);
  const [answerQuestionId, setAnswerQuestionId] = useState<number | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [answerCategory, setAnswerCategory] = useState('');
  const [answerTags, setAnswerTags] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // Fetch questions
  const { data: questions, isLoading, error } = useQuery<Question[]>({
    queryKey: ['/api/admin/questions'],
  });
  
  // Update question mutation
  const updateMutation = useMutation({
    mutationFn: async (question: Question) => {
      console.log(`Updating question ${question.id}:`, question);
      return await apiRequest('PUT', `/api/admin/questions/${question.id}`, question);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      toast({
        title: "Question updated",
        description: "The question has been updated successfully.",
      });
      setEditQuestion(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error instanceof Error ? error.message : "There was an error updating the question.",
      });
    },
  });
  
  // Delete question mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log(`Deleting question ${id}`);
      return await apiRequest('DELETE', `/api/admin/questions/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      toast({
        title: "Question deleted",
        description: "The question has been deleted successfully.",
      });
      setDeleteQuestionId(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "There was an error deleting the question.",
      });
    },
  });
  
  // Create answer mutation
  const createAnswerMutation = useMutation({
    mutationFn: async (answerData: InsertAnswer) => {
      console.log('Creating answer:', answerData);
      return await apiRequest('POST', '/api/answers', answerData);
    },
    onSuccess: (data) => {
      // Get the question ID to invalidate specific queries
      const questionId = currentQuestion?.id || (data as Answer)?.questionId;
      
      // Reset form and auto-publish the question
      if (currentQuestion && currentQuestion.status !== 'published') {
        updateMutation.mutate({
          ...currentQuestion,
          status: 'published'
        });
      }
      
      // Reset form state
      setAnswerQuestionId(null);
      setAnswerContent('');
      setAnswerCategory('');
      setAnswerTags('');
      setEditingAnswerId(null);
      setCurrentQuestion(null);
      
      // Invalidate all related queries to ensure UI updates correctly
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      
      // Specifically invalidate the answers for this question
      if (questionId) {
        queryClient.invalidateQueries({ queryKey: [`/api/answers/${questionId}`] });
      }
      
      toast({
        title: "Answer Posted",
        description: "Your answer has been published successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to post answer",
      });
    }
  });
  
  // Update answer mutation
  const updateAnswerMutation = useMutation({
    mutationFn: async (data: { id: number, answer: Partial<Answer> }) => {
      console.log(`Updating answer ${data.id}:`, data.answer);
      return await apiRequest<Answer>('PUT', `/api/answers/${data.id}`, data.answer);
    },
    onSuccess: (data) => {
      // Get the relevant question ID for cache invalidation
      const questionId = currentQuestion?.id || data?.questionId;
      
      // Reset form state
      setAnswerQuestionId(null);
      setAnswerContent('');
      setAnswerCategory('');
      setAnswerTags('');
      setEditingAnswerId(null);
      setCurrentQuestion(null);
      
      // Invalidate all related queries to ensure UI updates correctly
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      
      // Specifically invalidate the answers for this question
      if (questionId) {
        queryClient.invalidateQueries({ queryKey: [`/api/answers/${questionId}`] });
      }
      
      toast({
        title: "Answer Updated",
        description: "Your answer has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update answer",
      });
    }
  });
  
  // Handle form change
  const handleEditFormChange = (field: keyof Question, value: any) => {
    if (editQuestion) {
      setEditQuestion({ ...editQuestion, [field]: value });
    }
  };
  
  // Handle save
  const handleSave = () => {
    if (editQuestion) {
      updateMutation.mutate(editQuestion);
    }
  };
  
  // Handle delete
  const handleDelete = () => {
    if (deleteQuestionId !== null) {
      deleteMutation.mutate(deleteQuestionId);
    }
  };
  
  // Fetch answers for the current question
  const fetchAnswers = async (questionId: number): Promise<Answer[]> => {
    try {
      const answers = await apiRequest<Answer[]>(`/api/answers/${questionId}`, 'GET');
      return answers || [];
    } catch (error) {
      console.error("Error fetching answers:", error);
      return [];
    }
  };
  
  // Handle answer question
  const handleAnswerQuestion = async (question: Question) => {
    setAnswerQuestionId(question.id);
    setCurrentQuestion(question);
    
    // If question already has answers or is published (implying it should have an answer), 
    // fetch and load the existing answer
    if (question.answers > 0 || question.status === 'published') {
      try {
        const answers = await fetchAnswers(question.id);
        if (answers && answers.length > 0) {
          // Take the first answer (usually there's only one official answer)
          const existingAnswer = answers[0];
          setAnswerContent(existingAnswer.content);
          setAnswerCategory(existingAnswer.category || '');
          setAnswerTags(existingAnswer.tags || '');
          setEditingAnswerId(existingAnswer.id);
          toast({
            title: "Editing Existing Answer",
            description: "Loaded the existing answer for editing"
          });
          return;
        }
      } catch (error) {
        console.error("Error loading existing answer:", error);
      }
    }
    
    // Reset the form if no existing answers or if fetching failed
    setAnswerContent('');
    setAnswerCategory('');
    setAnswerTags('');
    setEditingAnswerId(null);
  };
  
  // Handle submit answer
  const handleSubmitAnswer = () => {
    if (!answerContent.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Answer content cannot be empty",
      });
      return;
    }
    
    if (editingAnswerId) {
      // Update an existing answer
      updateAnswerMutation.mutate({
        id: editingAnswerId,
        answer: {
          content: answerContent,
          category: answerCategory || null,
          tags: answerTags || null,
          isRichText: true
        }
      });
    } else {
      // Create a new answer
      const answerData: InsertAnswer = {
        questionId: answerQuestionId as number,
        content: answerContent,
        author: "Admin", // Server will override with user info
        category: answerCategory || null,
        tags: answerTags || null,
        isRichText: true
      };
      
      createAnswerMutation.mutate(answerData);
    }
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toISOString().split("T")[0];
  };
  
  return (
    <>
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-accent">
          <h3 className="text-lg leading-6 font-medium text-secondary">Manage Questions</h3>
          <p className="mt-1 text-sm text-gray-500">Review, edit, and moderate submitted questions</p>
        </div>
        
        <div className="overflow-visible">
          <ResponsiveQuestionList
            questions={questions}
            isLoading={isLoading}
            error={error}
            setEditQuestion={setEditQuestion}
            handleAnswerQuestion={handleAnswerQuestion}
            setDeleteQuestionId={setDeleteQuestionId}
            formatDate={formatDate}
            STATUS_COLORS={STATUS_COLORS}
          />
        </div>
      </div>
      
      {/* Edit Question Dialog */}
      <Dialog open={!!editQuestion} onOpenChange={(open) => !open && setEditQuestion(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          
          {editQuestion && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="title">Question Title</Label>
                <Input
                  id="title"
                  value={editQuestion.title}
                  onChange={(e) => handleEditFormChange("title", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Question Details</Label>
                <Textarea
                  id="content"
                  rows={6}
                  value={editQuestion.content}
                  onChange={(e) => handleEditFormChange("content", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editQuestion.status}
                  onValueChange={(value) => handleEditFormChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={editQuestion.category || ''}
                  onChange={(e) => handleEditFormChange("category", e.target.value)}
                  placeholder="e.g. Faith and Doctrine, Liturgy, Church History"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={editQuestion.tags || ''}
                  onChange={(e) => handleEditFormChange("tags", e.target.value)}
                  placeholder="e.g. faith, prayer, saints, fasting"
                />
                <p className="text-xs text-gray-500">Separate multiple tags with commas</p>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex space-x-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-primary hover:bg-primary-hover text-white"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteQuestionId !== null} onOpenChange={(open) => !open && setDeleteQuestionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the question and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Answer Question Dialog */}
      <Dialog open={answerQuestionId !== null} onOpenChange={(open) => !open && setAnswerQuestionId(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {currentQuestion?.answers ? 'Update Answer' : 'Provide Answer'}
              {currentQuestion && <span className="block text-sm font-normal mt-1 text-gray-500">{currentQuestion.title}</span>}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <RichTextEditor
              value={answerContent}
              onChange={setAnswerContent}
              onCategoryChange={setAnswerCategory}
              onTagsChange={setAnswerTags}
              category={answerCategory}
              tags={answerTags}
            />
            
            <div className="mt-2 pt-2 border-t border-accent text-sm text-gray-500">
              <p>Note: Posting this answer will automatically publish the question.</p>
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              onClick={handleSubmitAnswer}
              disabled={createAnswerMutation.isPending}
              className="bg-primary hover:bg-primary-hover text-white"
            >
              {createAnswerMutation.isPending ? "Posting..." : "Post Answer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
