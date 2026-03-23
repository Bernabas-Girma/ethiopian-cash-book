export type TransactionType = 'IN' | 'OUT';
export type TransactionSource = 'Cash' | 'CBE' | 'Telebirr' | 'Other';

export interface User {
  uid: string;
  username: string;
  displayName?: string;
  email: string;
  photoURL?: string;
  friends?: string[];
  phoneNumber?: string;
  hideEmail?: boolean;
  messagePrivacy?: 'everyone' | 'friends' | 'none';
}

export type ProfileRole = 'owner' | 'editor' | 'viewer';

export interface Profile {
  id: string;
  name: string;
  ownerId: string;
  members?: string[];
  roles?: Record<string, ProfileRole>;
  createdAt: any;
}

export interface Budget {
  id: string;
  profileId: string;
  category: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'annual';
  startDate: any;
  ownerId: string;
}

export interface Transaction {
  id: string;
  profileId: string;
  amount: number;
  type: TransactionType;
  source: TransactionSource;
  category: string;
  note: string;
  date: any;
  ownerId: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  updatedAt: any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  encryptedContent: string;
  recipientEncryptedKey: string; // Symmetric key encrypted with recipient's public key
  senderEncryptedKey: string; // Symmetric key encrypted with sender's public key
  iv: string; // Initialization vector for AES-GCM
  createdAt: any;
}

export interface UserKeys {
  uid: string;
  publicKey: string; // PEM or JWK format
  createdAt: any;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: any;
  completed: boolean;
  ownerId: string;
  createdAt: any;
}

export interface AuditLog {
  id: string;
  profileId: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  details: string;
  timestamp: any;
  transactionType?: 'IN' | 'OUT';
  amount?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'TRANSACTION' | 'REMINDER' | 'SYSTEM';
  read: boolean;
  createdAt: any;
  relatedId?: string;
}

export interface LanguageStrings {
  appName: string;
  cashIn: string;
  cashOut: string;
  balance: string;
  totalIn: string;
  totalOut: string;
  addTransaction: string;
  amount: string;
  category: string;
  source: string;
  note: string;
  save: string;
  cancel: string;
  profiles: string;
  addProfile: string;
  profileName: string;
  history: string;
  reports: string;
  settings: string;
  language: string;
  noTransactions: string;
  selectProfile: string;
  edit: string;
  delete: string;
  export: string;
  team: string;
  roles: {
    owner: string;
    editor: string;
    viewer: string;
  };
  budget: string;
  createBudget: string;
  weekly: string;
  monthly: string;
  quarterly: string;
  annual: string;
  profile: string;
  phoneNumber: string;
  hideEmail: string;
  chat: string;
  messages: string;
  typeMessage: string;
  noMessages: string;
  startChat: string;
  reminders: string;
  addReminder: string;
  title: string;
  dueDate: string;
  description: string;
  noReminders: string;
  notifications: string;
  noNotifications: string;
  markAllRead: string;
}

export const translations: Record<'en' | 'am', LanguageStrings> = {
  en: {
    appName: "Cash Book",
    cashIn: "Cash In",
    cashOut: "Cash Out",
    balance: "Balance",
    totalIn: "Total Cash in",
    totalOut: "Total Cash out",
    addTransaction: "Add Transaction",
    amount: "Amount",
    category: "Category",
    source: "Source",
    note: "Note",
    save: "Save",
    cancel: "Cancel",
    profiles: "Profiles",
    addProfile: "Add Profile",
    profileName: "Profile Name",
    history: "History",
    reports: "Reports",
    settings: "Settings",
    language: "Language",
    noTransactions: "No transactions yet",
    selectProfile: "Select Profile",
    edit: "Edit",
    delete: "Delete",
    export: "Export PDF",
    team: "Team",
    roles: {
      owner: "Owner",
      editor: "Editor",
      viewer: "Viewer"
    },
    budget: "Budget",
    createBudget: "Create Budget",
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    annual: "Annual",
    profile: "Profile",
    phoneNumber: "Phone Number",
    hideEmail: "Hide Email from others",
    chat: "Chat",
    messages: "Messages",
    typeMessage: "Type a message...",
    noMessages: "No messages yet",
    startChat: "Start Chat",
    reminders: "Reminders",
    addReminder: "Add Reminder",
    title: "Title",
    dueDate: "Due Date",
    description: "Description",
    noReminders: "No reminders yet",
    notifications: "Notifications",
    noNotifications: "No notifications",
    markAllRead: "Mark all as read"
  },
  am: {
    appName: "የሂሳብ መዝገብ",
    cashIn: "ገቢ",
    cashOut: "ወጪ",
    balance: "ቀሪ ሂሳብ",
    totalIn: "ጠቅላላ ገቢ (Cash in)",
    totalOut: "ጠቅላላ ወጪ (Cash out)",
    addTransaction: "ሂሳብ መዝግብ",
    amount: "መጠን",
    category: "ምድብ",
    source: "ምንጭ",
    note: "ማስታወሻ",
    save: "አስቀምጥ",
    cancel: "ሰርዝ",
    profiles: "መገለጫዎች",
    addProfile: "መገለጫ ጨምር",
    profileName: "የመገለጫ ስም",
    history: "ታሪክ",
    reports: "ሪፖርቶች",
    settings: "ቅንብሮች",
    language: "ቋንቋ",
    noTransactions: "ምንም መዝገብ የለም",
    selectProfile: "መገለጫ ይምረጡ",
    edit: "አስተካክል",
    delete: "ሰርዝ",
    export: "PDF ላክ",
    team: "ቡድን",
    roles: {
      owner: "ባለቤት",
      editor: "አዘጋጅ",
      viewer: "ተመልካች"
    },
    budget: "በጀት",
    createBudget: "በጀት ፍጠር",
    weekly: "ሳምንታዊ",
    monthly: "ወርሃዊ",
    quarterly: "ሩብ ዓመት",
    annual: "ዓመታዊ",
    profile: "መገለጫ",
    phoneNumber: "ስልክ ቁጥር",
    hideEmail: "ኢሜል ደብቅ",
    chat: "ውይይት",
    messages: "መልዕክቶች",
    typeMessage: "መልዕክት ይጻፉ...",
    noMessages: "ምንም መልዕክት የለም",
    startChat: "ውይይት ጀምር",
    reminders: "ማሳሰቢያዎች",
    addReminder: "ማሳሰቢያ ጨምር",
    title: "ርዕስ",
    dueDate: "ቀነ-ገደብ",
    description: "መግለጫ",
    noReminders: "ምንም ማሳሰቢያ የለም",
    notifications: "ማሳወቂያዎች",
    noNotifications: "ምንም ማሳወቂያ የለም",
    markAllRead: "ሁሉንም እንደተነበበ ምልክት አድርግ"
  }
};
