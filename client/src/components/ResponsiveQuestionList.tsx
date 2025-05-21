// Responsive Question List component
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Header component for desktop view
const ListHeader = () => (
  <div className="hidden md:grid md:grid-cols-5 bg-accent-2 p-3 rounded-t-lg">
    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider col-span-2">
      Question
    </div>
    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
      Status
    </div>
    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
      Category/Tags
    </div>
    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
      Actions
    </div>
  </div>
);

// Loading skeleton
const LoadingSkeleton = () =>
  Array(3)
    .fill(0)
    .map((_, i) => (
      <div key={i} className="bg-white p-4 border-b border-accent">
        <div className="flex flex-col md:grid md:grid-cols-5 gap-2 md:gap-4 items-start">
          <div className="w-full col-span-2 space-y-2">
            <Skeleton className="h-5 w-full md:w-64 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex flex-col w-full md:w-auto">
            <span className="text-xs font-medium text-gray-500 uppercase md:hidden mb-1">
              Status
            </span>
            <div className="flex">
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col w-full md:w-auto">
            <span className="text-xs font-medium text-gray-500 uppercase md:hidden mb-1">
              Category/Tags
            </span>
            <Skeleton className="h-4 w-32 mb-2" />
            <div className="flex gap-1">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col w-full md:w-auto md:ml-auto">
            <span className="text-xs font-medium text-gray-500 uppercase md:hidden mb-1">
              Actions
            </span>
            <div className="flex gap-2 md:justify-end">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      </div>
    ));

// Question item component
const QuestionItem = ({
  question,
  setEditQuestion,
  handleAnswerQuestion,
  setDeleteQuestionId,
  formatDate,
  STATUS_COLORS,
}) => (
  <div className="bg-white p-4 border-b border-accent hover:bg-accent-2 transition-colors">
    <div className="flex flex-col md:grid md:grid-cols-5 gap-4 items-start">
      <div className="w-full col-span-2">
        <div className="text-sm font-medium text-secondary line-clamp-2">
          {question.title}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {question.author} - {formatDate(question.date)}
        </div>
        <div className="flex items-center mt-2 md:hidden">
          <span className="text-sm text-gray-500 mr-2">
            Votes: {question.votes}
          </span>
        </div>
      </div>

      <div className="flex flex-col w-full md:w-auto">
        <span className="text-xs font-medium text-gray-500 uppercase md:hidden mb-1">
          Status
        </span>
        <div className="flex">
          <span
            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[question.status]}`}
          >
            {question.status}
          </span>
        </div>
      </div>

      <div className="flex flex-col w-full md:w-auto">
        <span className="text-xs font-medium text-gray-500 uppercase md:hidden mb-1">
          Category/Tags
        </span>
        <div className="flex flex-col gap-1">
          {question.category ? (
            <span className="text-sm font-medium text-secondary">
              {question.category}
            </span>
          ) : (
            <span className="text-sm text-gray-400 italic">No category</span>
          )}

          {question.tags ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {question.tags.split(",").map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-accent-2 rounded-full text-xs text-gray-600"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic">No tags</span>
          )}
        </div>
      </div>

      <div className="flex flex-col w-full md:w-auto md:ml-auto">
        <span className="text-xs font-medium text-gray-500 uppercase md:hidden mb-1">
          Actions
        </span>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button
            variant="link"
            className="text-primary hover:text-primary-hover p-1 h-auto"
            onClick={() => setEditQuestion(question)}
          >
            Edit
          </Button>
          <Button
            variant="link"
            className="text-green-600 hover:text-green-800 p-1 h-auto"
            onClick={() => handleAnswerQuestion(question)}
          >
            {question.answers > 0 || question.status === "published"
              ? "Update"
              : "Answer"}
          </Button>
          <Button
            variant="link"
            className="text-red-600 hover:text-red-900 p-1 h-auto"
            onClick={() => setDeleteQuestionId(question.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  </div>
);

// Error message component
const ErrorMessage = ({ message }) => (
  <div className="px-6 py-4 text-center text-red-600">
    {message || "Failed to load questions. Please try again."}
  </div>
);

// Empty state component
const EmptyState = () => (
  <div className="px-6 py-4 text-center text-gray-500">
    No questions available
  </div>
);

// Main component
const ResponsiveQuestionList = ({
  isLoading,
  error,
  questions,
  setEditQuestion,
  handleAnswerQuestion,
  setDeleteQuestionId,
  formatDate,
  STATUS_COLORS,
}) => {
  return (
    <div className="border border-accent rounded-lg overflow-hidden">
      <ListHeader />

      <div className="divide-y divide-accent">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorMessage message="Failed to load questions. Please try again." />
        ) : questions && questions.length > 0 ? (
          questions.map((question) => (
            <QuestionItem
              key={question.id}
              question={question}
              setEditQuestion={setEditQuestion}
              handleAnswerQuestion={handleAnswerQuestion}
              setDeleteQuestionId={setDeleteQuestionId}
              formatDate={formatDate}
              STATUS_COLORS={STATUS_COLORS}
            />
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

export default ResponsiveQuestionList;
