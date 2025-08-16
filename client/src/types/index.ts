// Guild member type definition
export interface GuildMember {
  id?: number;
  name: string;
  level?: number;
  class?: string;
  partyDic?: { [key: string]: { partyId: string; isPartyLeader: boolean } }; // Party dictionary, key is party type, value contains party ID and whether is party leader
  createdAt?: string; // Member creation time
  sort?: number; // Sort field
}

// AA information
export interface AAInfo {
  activity:string
  date: string;
  total_participants: number;
  participants: AAMemberData[];
}

// AA member data
export interface AAMemberData {
  name: string;
}

// GVG information
export interface GVGInfo {
  date: string;
  event_type: string;
  participants: GVGMemberData[];
  non_participants: GVGMemberData[];
}

// GVG member data
export interface GVGMemberData {
  name: string;
}

// KVM information
export interface KVMInfo {
  event_type: string;
  date: string;
  total_participants: number;
  non_participants: KVMMemberData[];
}

// KVM member data
export interface KVMMemberData {
  rank: number;
  name: string;
  position: string;
  points: number;
}

// Guild information type definition
export interface GuildInfo {
  id: string;
  name: string;
  level: number;
  memberCount: number;
  maxMembers: number;
  description?: string;
  leader: GuildMember;
}

// API response type
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Screenshot recognition result type
export interface ScreenshotResult {
  members: GuildMember[];
  timestamp: string;
  accuracy: number;
}

// OCR template related types
export interface OCRTemplate {
  id: string;
  name: string;
  module: 'kvm' | 'gvg' | 'aa' | 'guild';
  description?: string;
  template: TemplateStructure;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateStructure {
  fieldMapping: FieldMapping;
  parseRules: ParseRule[];
  outputFormat: OutputFormat;
}

export interface FieldMapping {
  [key: string]: FieldConfig;
}

export interface FieldConfig {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  defaultValue?: any;
  validation?: ValidationRule;
}

export interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: string[];
}

export interface ParseRule {
  name: string;
  type: 'line_pattern' | 'keyword_extraction' | 'position_based' | 'regex';
  config: ParseRuleConfig;
}

export interface ParseRuleConfig {
  pattern?: string;
  keywords?: string[];
  position?: {
    startLine?: number;
    endLine?: number;
    column?: number;
  };
  skipConditions?: string[];
  transform?: string;
}

export interface OutputFormat {
  type: 'kvm' | 'gvg' | 'aa' | 'guild';
  structure: any;
}

// ==================== Authentication related types ====================

// User information
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'owner' | 'editor' | 'viewer';
  createdAt: string;
  lastLoginAt?: string;
}

// Login form data
export interface LoginForm {
  username: string;
  password: string;
}

// Login response
export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: string;
}

// Authentication context
export interface AuthContext {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (loginData: LoginForm) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// Guild name resource type definition
export interface GuildNameResource {
  guildId: string;
  guildName: string;
  description: string;
  backgroundImage?: string; // Background image URL
  createdAt: string;
  updatedAt: string;
}

// Create guild name request type definition
export interface CreateGuildNameRequest {
  guildName: string;
  description?: string;
  backgroundImage?: string;
}

// Update guild name request type definition
export interface UpdateGuildNameRequest {
  guildName?: string;
  description?: string;
  backgroundImage?: string;
}