// This file serves as a shared store for admin user data
// In a production app, this would be stored in a database

export interface AdminUser {
  email: string;
  addedBy: string;
  addedAt: Date;
}

// Hardcoded initial admin list
export const adminEmails: AdminUser[] = [
  { 
    email: "admin@tewahedanswers.com", 
    addedBy: "system", 
    addedAt: new Date(2023, 0, 1) 
  },
  { 
    email: "kmichaeltb@gmail.com",
    addedBy: "system",
    addedAt: new Date()
  },
  { 
    email: "michealbekele.data@gmail.com",
    addedBy: "system",
    addedAt: new Date()
  }
];

// Add a new admin email
export function addAdminEmail(email: string, addedBy: string = "system"): AdminUser {
  const newAdmin = {
    email,
    addedBy,
    addedAt: new Date()
  };
  
  // Check if email already exists
  if (!isAdminEmail(email)) {
    adminEmails.push(newAdmin);
  }
  
  return newAdmin;
}

// Remove an admin email
export function removeAdminEmail(email: string): boolean {
  const initialLength = adminEmails.length;
  const index = adminEmails.findIndex(admin => admin.email === email);
  
  if (index !== -1) {
    adminEmails.splice(index, 1);
    return true;
  }
  
  return false;
}

// Check if an email is an admin
export function isAdminEmail(email: string): boolean {
  return adminEmails.some(admin => admin.email === email);
}