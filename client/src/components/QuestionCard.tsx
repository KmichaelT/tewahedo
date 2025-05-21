import { ThumbsUp, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Question } from "@shared/schema";
import { Separator } from "@/components/ui/separator"
interface QuestionCardProps {
  question: Question;
  onClick?: (questionId: number) => void;
}

export default function QuestionCard({ question, onClick }: QuestionCardProps) {
  const truncateContent = (content: string, maxLength = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const formatDate = (date: Date) => {
    return new Date(date).toISOString().split("T")[0];
  };

  return (
<Card className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-start">
          <div className="text-gray-500">
          {question.author}
          </div>
          <div className="text-gray-500">
             {formatDate(question.date)}
          </div>
        </div>
        <Separator className="my-4" />
        <h3 className="text-lg font-semibold text-secondary mb-2">{question.title}</h3>
        <p className="text-text mb-4">{truncateContent(question.content)}</p>
        <div className="mt-auto"> 
          <div className="flex justify-between items-center gap-8 mt-4">
            <div className="text-gray-500">
              {onClick && (
                <Button 
                  variant="link" 
                  className="text-primary hover:text-primary-hover h-4 p-0" 
                  onClick={(e) => {
                    e.preventDefault();
                    onClick(question.id);
                  }}
                >
                  View Answers
                </Button>
              )}
            </div>
            <div className="text-gray-500">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <ThumbsUp className="h-4 w-4 text-primary mr-1" />
                  <span>{question.votes}</span>
                </div>
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 text-primary mr-1" />
                  <span>{question.answers}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
