import { Link } from "wouter";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-[#1A1A1A] text-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-semibold mb-4 text-[#b34b28]">TewahedoAnswers</h3>
            <p className="text-gray-300 mb-4">
              Your source for insights into the Ethiopian Orthodox Tewahedo Church traditions,
              theology, and practices. Connect with our community of faithful believers.
            </p>
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} TewahedoAnswers. All rights reserved.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4 text-[#b34b28]">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/">
                  <span className="text-gray-300 hover:text-white transition cursor-pointer">Home</span>
                </Link>
              </li>
              <li>
                <Link href="/ask">
                  <span className="text-gray-300 hover:text-white transition cursor-pointer">Ask a Question</span>
                </Link>
              </li>
              <li>
                <Link href="/questions">
                  <span className="text-gray-300 hover:text-white transition cursor-pointer">Browse Questions</span>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4 text-[#b34b28]">Categories</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/?category=Theology">
                  <span className="text-gray-300 hover:text-white transition cursor-pointer">Theology</span>
                </Link>
              </li>
              <li>
                <Link href="/?category=Spiritual%20Practices">
                  <span className="text-gray-300 hover:text-white transition cursor-pointer">Spiritual Practices</span>
                </Link>
              </li>
              <li>
                <Link href="/?category=Liturgy">
                  <span className="text-gray-300 hover:text-white transition cursor-pointer">Liturgy</span>
                </Link>
              </li>
              <li>
                <Link href="/?category=Saints">
                  <span className="text-gray-300 hover:text-white transition cursor-pointer">Saints</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="text-sm text-gray-400">
            <p>
              TewahedoAnswers is a community-driven platform for exploring the rich traditions and teachings of the Ethiopian Orthodox Tewahedo Church.
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <ul className="flex space-x-4">
              <li>
                <span className="text-gray-400 hover:text-white transition cursor-pointer">Terms</span>
              </li>
              <li>
                <span className="text-gray-400 hover:text-white transition cursor-pointer">Privacy</span>
              </li>
              <li>
                <span className="text-gray-400 hover:text-white transition cursor-pointer">Contact</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;