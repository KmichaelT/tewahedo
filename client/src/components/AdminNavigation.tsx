import { useLocation, Link } from "wouter";
import { DEFAULT_ADMIN_TABS } from "@/lib/constants";

interface AdminNavigationProps {
  activeTab: string;
}

export default function AdminNavigation({ activeTab }: AdminNavigationProps) {
  const [location, setLocation] = useLocation();
  
  const handleTabChange = (tab: string) => {
    setLocation(`/admin/${tab}`);
  };
  
  return (
    <div className="bg-white shadow-sm rounded-lg mb-6">
      <nav className="flex border-b border-accent">
        {DEFAULT_ADMIN_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-6 py-4 text-center font-medium ${
              activeTab === tab
                ? "bg-primary text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
    </div>
  );
}
