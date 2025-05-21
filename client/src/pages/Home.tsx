import { useQuery } from "@tanstack/react-query";
import { Question, Answer } from "@shared/schema";
import QuestionCard from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PlusCircle, Search, FilterX, SortAsc, SortDesc, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import HeroSection from "@/components/HeroSection";

export default function Home() {
  const { toast } = useToast();
  const { data: questions, isLoading, error } = useQuery<Question[]>({
    queryKey: ['/api/questions'],
  });

  // State for search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6); // Default to 6 items per page
  
  // Filtered and sorted questions
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  
  // Paginated questions
  const [paginatedQuestions, setPaginatedQuestions] = useState<Question[]>([]);
  
  // Get all answers to extract categories and tags
  const { data: allAnswers } = useQuery<Answer[]>({
    queryKey: ['/api/all-answers'],
    enabled: !!questions, // Only fetch answers after questions are loaded
  });
  
  // Extract unique categories from both questions and answers
  const allCategories = [
    // Categories from questions
    ...(questions?.filter(q => q.category && q.category.trim() !== '').map(q => q.category as string) || []),
    // Categories from answers
    ...(allAnswers?.filter(a => a.category && a.category.trim() !== '').map(a => a.category as string) || [])
  ];
  
  const uniqueCategories = Array.from(new Set(allCategories)).filter(Boolean) as string[];
  
  // Extract unique tags from both questions and answers
  const allQuestionsTagsArray = questions?.reduce((acc: string[], question) => {
    if (question.tags) {
      const tags = question.tags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');
      return [...acc, ...tags];
    }
    return acc;
  }, []) || [];
  
  const allAnswersTagsArray = allAnswers?.reduce((acc: string[], answer) => {
    if (answer.tags) {
      const tags = answer.tags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');
      return [...acc, ...tags];
    }
    return acc;
  }, []) || [];
  
  const allTags = [...allQuestionsTagsArray, ...allAnswersTagsArray];
  
  const uniqueTags = Array.from(new Set(allTags)).filter(tag => tag.trim() !== '');
  
  // Handle filtering and sorting when questions or filter criteria change
  useEffect(() => {
    if (!questions) return;
    
    let filtered = [...questions];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        q => 
          q.title.toLowerCase().includes(query) ||
          q.content.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(q => {
        // Check if question has the category
        if (q.category === categoryFilter) return true;
        
        // Check if any of the question's answers has the category
        const questionAnswers = allAnswers?.filter(a => a.questionId === q.id) || [];
        return questionAnswers.some(a => a.category === categoryFilter);
      });
    }
    
    // Apply tag filter
    if (tagFilter && tagFilter !== "all") {
      filtered = filtered.filter(q => {
        // Check if question has the tag
        if (q.tags) {
          const questionTags = q.tags.split(',').map((t: string) => t.trim());
          if (questionTags.includes(tagFilter)) return true;
        }
        
        // Check if any of the question's answers has the tag
        const questionAnswers = allAnswers?.filter(a => a.questionId === q.id) || [];
        return questionAnswers.some(a => {
          if (!a.tags) return false;
          const answerTags = a.tags.split(',').map((t: string) => t.trim());
          return answerTags.includes(tagFilter);
        });
      });
    }
    
    // Apply sorting
    if (sortBy === "latest") {
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortBy === "popular") {
      filtered.sort((a, b) => (b.votes + b.comments) - (a.votes + a.comments));
    }
    
    setFilteredQuestions(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [questions, allAnswers, searchQuery, categoryFilter, tagFilter, sortBy]);
  
  // Handle pagination
  useEffect(() => {
    if (!filteredQuestions.length) {
      setPaginatedQuestions([]);
      return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredQuestions.slice(startIndex, endIndex);
    
    setPaginatedQuestions(paginatedItems);
  }, [filteredQuestions, currentPage, itemsPerPage]);
  
  // Handle clear filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setTagFilter("all");
    setSortBy("latest");
  };
  
  const handleViewQuestion = (questionId: number) => {
    window.location.href = `/questions/${questionId}`;
  };

  return (
    <div className="px-4 sm:px-0">
      <HeroSection />
      
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold">Questions</h2>
          
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">
                  <div className="flex items-center">
                    <SortDesc className="mr-2 h-4 w-4" />
                    Latest
                  </div>
                </SelectItem>
                <SelectItem value="oldest">
                  <div className="flex items-center">
                    <SortAsc className="mr-2 h-4 w-4" />
                    Oldest
                  </div>
                </SelectItem>
                <SelectItem value="popular">
                  <div className="flex items-center">
                    <SortDesc className="mr-2 h-4 w-4" />
                    Most Popular
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] min-w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.length > 0 ? (
                  uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>  
                  ))
                ) : (
                  <SelectItem value="none" disabled>No categories available</SelectItem>
                )}
              </SelectContent>
            </Select>
            
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[180px] min-w-[180px]">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {uniqueTags.length > 0 ? (
                  uniqueTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>  
                  ))
                ) : (
                  <SelectItem value="none" disabled>No tags available</SelectItem>
                )}
              </SelectContent>
            </Select>
            
            {(searchQuery || (categoryFilter && categoryFilter !== "all") || (tagFilter && tagFilter !== "all") || sortBy !== "latest") && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="flex items-center"
              >
                <FilterX className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
        
        {/* Show active filters */}
        {(searchQuery || (categoryFilter && categoryFilter !== "all") || (tagFilter && tagFilter !== "all")) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1 text-white">
                Search: {searchQuery}
              </Badge>
            )}
            {categoryFilter && categoryFilter !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1 text-white">
                Category: {categoryFilter}
              </Badge>
            )}
            {tagFilter && tagFilter !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1 text-white">
                Tag: {tagFilter}
              </Badge>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-card p-6">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Failed to load questions. Please try again later.
        </div>
      ) : questions && questions.length > 0 ? (
        <>
          {filteredQuestions.length > 0 ? (
            <>
              <div className="mt-20 grid gap-6 md:grid-cols-2">
                {paginatedQuestions.map((question) => (
                  <QuestionCard 
                    key={question.id} 
                    question={question} 
                    onClick={() => handleViewQuestion(question.id)}
                  />
                ))}
              </div>
              
              {/* Pagination controls */}
              <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Items per page:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="6" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Page navigation */}
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredQuestions.length)} - {Math.min(currentPage * itemsPerPage, filteredQuestions.length)} of {filteredQuestions.length}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, Math.ceil(filteredQuestions.length / itemsPerPage)) }, (_, i) => {
                      // Show pages around current page
                      let pageToShow = i + 1;
                      if (Math.ceil(filteredQuestions.length / itemsPerPage) > 5) {
                        if (currentPage > 3) {
                          pageToShow = currentPage - 2 + i;
                        }
                        if (currentPage + 2 > Math.ceil(filteredQuestions.length / itemsPerPage)) {
                          pageToShow = Math.ceil(filteredQuestions.length / itemsPerPage) - 4 + i;
                        }
                      }
                      
                      if (pageToShow <= Math.ceil(filteredQuestions.length / itemsPerPage)) {
                        return (
                          <Button 
                            key={pageToShow}
                            variant={currentPage === pageToShow ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageToShow)}
                            className={`h-8 w-8 p-0 ${currentPage === pageToShow ? "bg-primary hover:bg-primary-hover text-white" : ""}`}
                          >
                            {pageToShow}
                          </Button>
                        );
                      }
                      return null;
                    })}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredQuestions.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(filteredQuestions.length / itemsPerPage)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-card p-6 text-center">
              <p className="text-gray-500 mb-4">No questions match your search criteria.</p>
              <Button variant="outline" onClick={handleClearFilters}>
                <FilterX className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-8 bg-white rounded-lg shadow-card">
          <p className="text-gray-500">No questions available. Be the first to ask!</p>
          <Link href="/ask">
            <Button className="mt-4 bg-primary hover:bg-primary-hover text-white">
              Ask a Question
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
