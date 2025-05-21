import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, LogOut } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.png";

export default function Navbar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, login, logout, isLoading, isAdmin } = useAuth();

  const navItems = [
    { name: "Ask Question", href: "/ask" },
    { name: "About", href: "/about" },
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const isActive = (path: string) => {
    return location === path || (path !== "/" && location.startsWith(path));
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <img 
                src={logoImage} 
                alt="TewahedAnswers Logo" 
                className="h-10 w-auto my-2"
              />
            </Link>
          </div>
          
          <div className="flex items-center">
            {/* Navigation items - Only visible on desktop */}
            <div className="hidden sm:flex sm:space-x-4 mr-4">
              {navItems.map((item) => (
                <Link key={item.name} href={item.href}>
                  <span className={`inline-flex items-center px-3 py-1 border-b-2 ${
                    isActive(item.href)
                      ? "border-primary text-primary font-medium"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  } cursor-pointer`}>
                    {item.name}
                  </span>
                </Link>
              ))}
            </div>
            
            {/* Auth buttons - Only visible on desktop */}
            <div className="hidden sm:flex sm:items-center">
              {isLoading ? (
                <Button variant="outline" size="sm" disabled>
                  Loading...
                </Button>
              ) : isAuthenticated ? (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Link href="/admin/questions">
                      <Button variant={isActive("/admin") ? "default" : "outline"} size="sm">
                        Admin
                      </Button>
                    </Link>
                  )}
                  <div className="flex flex-col items-end mr-2">
                    <span className="text-sm font-medium">{user?.displayName}</span>
                    {isAdmin && (
                      <span className="text-xs text-primary">Administrator</span>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => logout()}
                    className="flex items-center gap-1"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Button 
                  variant={isActive("/login") ? "default" : "outline"} 
                  size="sm"
                  onClick={() => login()}
                >
                  Login with Google
                </Button>
              )}
            </div>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <Button
              variant="ghost"
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${mobileMenuOpen ? "block" : "hidden"} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href}>
              <span onClick={() => setMobileMenuOpen(false)} className={`block pl-3 pr-4 py-2 border-l-4 ${
                isActive(item.href)
                  ? "bg-accent-2 border-primary text-primary font-medium"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-accent-2 hover:border-gray-300"
              } text-base font-medium cursor-pointer`}>
                {item.name}
              </span>
            </Link>
          ))}
          {isLoading ? (
            <div className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-gray-400 text-base font-medium w-full text-left">
              Loading...
            </div>
          ) : isAuthenticated ? (
            <>
              <div className="px-4 py-2 text-sm">
                <div className="font-medium">{user?.displayName}</div>
                {isAdmin && (
                  <div className="text-xs text-primary">Administrator</div>
                )}
              </div>
              
              {isAdmin && (
                <Link href="/admin/questions">
                  <span onClick={() => setMobileMenuOpen(false)} className={`block pl-3 pr-4 py-2 border-l-4 ${
                    isActive("/admin")
                      ? "bg-accent-2 border-primary text-primary font-medium"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-accent-2 hover:border-gray-300"
                  } text-base font-medium cursor-pointer`}>
                    Admin
                  </span>
                </Link>
              )}
              
              <button 
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-gray-600 hover:text-gray-900 hover:bg-accent-2 hover:border-gray-300 text-base font-medium w-full text-left flex items-center gap-2"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <button 
              className={`block pl-3 pr-4 py-2 border-l-4 ${
                isActive("/login")
                  ? "bg-accent-2 border-primary text-primary font-medium"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-accent-2 hover:border-gray-300"
              } text-base font-medium cursor-pointer w-full text-left`}
              onClick={() => {
                setMobileMenuOpen(false);
                login();
              }}
            >
              Login with Google
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
