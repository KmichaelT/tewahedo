import { Card, CardContent } from "@/components/ui/card";

export default function About() {
  return (
    <div className="px-4 sm:px-0">
      <Card className="bg-white rounded-lg shadow-card">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold mb-6">About TewahedAnswers</h1>
          
          <div className="prose max-w-none text-text">
            <p className="mb-4">
              TewahedAnswers is a platform dedicated to providing answers to questions about Orthodox Christianity, 
              with a particular focus on the Ethiopian Orthodox Tewahedo Church and its traditions, practices, and teachings.
            </p>
            
            <p className="mb-4">
              Our mission is to create a respectful and informative space where seekers, believers, and the curious 
              can ask questions and receive thoughtful, well-researched answers from our community of knowledgeable contributors.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">How It Works</h2>
            <p className="mb-4">
              1. <strong>Ask a Question:</strong> Anyone can submit a question through our platform.
            </p>
            <p className="mb-4">
              2. <strong>Review Process:</strong> Our team reviews questions to ensure they meet our community guidelines.
            </p>
            <p className="mb-4">
              3. <strong>Published Questions:</strong> Approved questions are published on the site for the community to answer.
            </p>
            <p className="mb-4">
              4. <strong>Expert Answers:</strong> Knowledgeable community members and verified experts provide answers.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">Our Guidelines</h2>
            <p className="mb-4">
              We aim to maintain a respectful, accurate, and helpful environment. All questions and answers should:
            </p>
            <ul className="list-disc pl-5 mb-4">
              <li>Be respectful of different traditions and interpretations</li>
              <li>Avoid political controversies unrelated to theological matters</li>
              <li>Be clear, specific, and on-topic</li>
              <li>Cite sources when presenting historical or theological information</li>
              <li>Avoid personal attacks or inflammatory language</li>
            </ul>
            
            <p className="mt-6">
              TewahedAnswers is maintained by volunteers who are passionate about Orthodox Christian theology, 
              history, and tradition. While we strive for accuracy, we encourage users to verify information 
              through authoritative sources and consultation with clergy or theological scholars.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
