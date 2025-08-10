// Guild member type definition
export interface GuildMember {
  id: number;
  name: string;
  level?: number;
  class?: string;
  partyDic?: { [key: string]: { partyId: string; isPartyLeader: boolean } }; // Party dictionary, key is party type, value contains party ID and whether is party leader
  createdAt?: string; // Member creation time
  sort?: number; // Sort field
}

// Guild info type definition
export interface GuildInfo {
  id: string;
  name: string;
  level: number;
  memberCount: number;
  maxMembers: number;
  description?: string;
}

// Guild name resource type definition
export interface GuildNameResource {
  guildId: string;
  guildName: string;
  description: string; // Guild description
  backgroundImage?: string; // Background image URL
  createdAt: string;
  updatedAt: string;
}

// Create guild name resource request
export interface CreateGuildNameRequest {
  guildId: string;
  guildName: string;
  description?: string;
  backgroundImage?: string;
}

// Update guild name resource request
export interface UpdateGuildNameRequest {
  guildName?: string;
  description?: string;
  backgroundImage?: string;
}

// Party type definition
export interface Party {
  id: string;
  name: string;
  type: string;
  groupId?: string; // Group ID (optional)
  leaderId?: number; // Leader member ID
  memberIds: number[]; // Member ID list (5 positions, 0 means empty)
  createdAt: string;
  updatedAt: string;
}

// Group type definition
export interface Group {
  id: string;
  name: string;
  type: 'kvm' | 'gvg'; // Group type
  description?: string;
  partyIds: string[]; // Party ID list (max 5)
  createdAt: string;
  updatedAt: string;
}

// Create Party request
export interface CreatePartyRequest {
  name: string;
  type: string;
  groupId?: string; // Group ID (optional)
  leaderId?: number;
  memberIds?: number[];
}

// Update Party request
export interface UpdatePartyRequest {
  id: string;
  name?: string;
  type: string;
  leaderId?: number;
  memberIds?: number[];
}

// Create Group request
export interface CreateGroupRequest {
  name: string;
  type: 'kvm' | 'gvg'; // Group type
  description?: string;
}

// Update Group request
export interface UpdateGroupRequest {
  id: string;
  name?: string;
  type?: 'kvm' | 'gvg'; // Group type
  description?: string;
}

// Party details (including member details)
export interface PartyWithMembers {
  id: string;
  name: string;
  type: string; // Party type
  groupId?: string; // Group ID (optional)
  leaderId?: number; // Leader member ID
  memberIds: number[]; // Member ID list (5 positions, 0 means empty)
  leader?: GuildMember;
  members: GuildMember[];
  createdAt: string;
  updatedAt: string;
}

// Group details (including Party details)
export interface GroupWithParties {
  id: string;
  name: string;
  type: 'kvm' | 'gvg'; // Group type
  description?: string;
  parties: PartyWithMembers[];
  totalMembers: number;
  createdAt: string;
  updatedAt: string;
}

// Assign member to Party request
export interface AssignMemberToPartyRequest {
  memberId: number;
  partyId: string;
  partyType?: string; // Party type, for multi-type party support
  isLeader?: boolean;
  slotIndex?: number; // Specify assigned position (0-4)
}

// Remove member from Party request
export interface RemoveMemberFromPartyRequest {
  memberId: number;
  partyId: string;
  partyType?: string; // Party type, for multi-type party support
}

// Swap member positions request
export interface SwapMembersRequest {
  member1Id: number;
  member1PartyId: string;
  member1SlotIndex: number;
  member2Id: number;
  member2PartyId: string;
  member2SlotIndex: number;
  partyType: string; // Party type, for multi-type party support
}

// API response type
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ==================== User Authentication Related Types ====================

// User information
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// Login request
export interface LoginRequest {
  username: string;
  password: string;
}

// Login response
export interface LoginResponse {
  user: {
    id: string;
    username: string;
    role: string;
  };
  token: string;
  refreshToken: string;
  expiresIn: string;
}

// Refresh token request
export interface RefreshTokenRequest {
  refreshToken: string;
}

// JWT payload
export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Create user request
export interface CreateUserRequest {
  username: string;
  password: string;
  role?: 'admin' | 'user';
}

// Update user request
export interface UpdateUserRequest {
  password?: string;
  role?: 'admin' | 'user';
}

// Screenshot recognition result type
export interface ScreenshotResult {
  members: GuildMember[];
  timestamp: string;
  accuracy: number;
}

// AA information
export interface AAInfo {
  date: string;
  event_type: string;
  participants: AAMemberData[];
}

// AA member data
export interface AAMemberData {
  name: string;
}


// KVM information
export interface KVMInfo {
  date: string;
  event_type: string;
  non_participants: KVMMemberData[];
}

// KVM member data
export interface KVMMemberData {
  name: string;
}

// GVG information
export interface GVGInfo {
  date: string;
  event_type: string;
  non_participants: GVGMemberData[];
}

// GVG member data
export interface GVGMemberData {
  name: string;
}

// Request and response types
export interface CreateMemberRequest {
  id: number;
  name: string;
  level?: number;
  class?: string;
  position?: string;
  partyDic?: { [key: string]: { partyId: string; isPartyLeader: boolean } };
  createdAt?: string; // Member creation time
  sort?: number; // Sort field
}

export interface UpdateMemberRequest extends Partial<CreateMemberRequest> {
  id: number;
}

// AA related request types
export interface ImportAARequest {
  aaData: AAInfo[];
}

export interface GetAARequest {
  date?: string;
  startDate?: string;
  endDate?: string;
}

// GVG related request types
export interface ImportGVGRequest {
  gvgData: GVGInfo[];
}

export interface GetGVGRequest {
  date?: string;
  startDate?: string;
  endDate?: string;
}

// KVM related request types
export interface ImportKVMRequest {
  kvmData: KVMInfo[];
}

export interface GetKVMRequest {
  date?: string;
  startDate?: string;
  endDate?: string;
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
  // Field mapping configuration
  fieldMapping: FieldMapping;
  // Parse rules
  parseRules: ParseRule[];
  // Output format
  outputFormat: OutputFormat;
}

export interface FieldMapping {
  [key: string]: FieldConfig;
}

export interface FieldConfig {
  // Field name
  name: string;
  // Field type
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  // Is required
  required: boolean;
  // Default value
  defaultValue?: any;
  // Validation rules
  validation?: ValidationRule;
}

export interface ValidationRule {
  // Minimum value/length
  min?: number;
  // Maximum value/length
  max?: number;
  // Regular expression
  pattern?: string;
  // Enum values
  enum?: string[];
}

export interface ParseRule {
  // Rule name
  name: string;
  // Rule type
  type: 'line_pattern' | 'keyword_extraction' | 'position_based' | 'regex';
  // Rule configuration
  config: ParseRuleConfig;
}

export interface ParseRuleConfig {
  // Match pattern
  pattern?: string;
  // Keyword list
  keywords?: string[];
  // Position information
  position?: {
    startLine?: number;
    endLine?: number;
    column?: number;
  };
  // Skip conditions
  skipConditions?: string[];
  // Transform function
  transform?: string;
}

export interface OutputFormat {
  // Output type
  type: 'kvm' | 'gvg' | 'aa' | 'guild';
  // Data structure
  structure: any;
}

// Template management request types
export interface CreateTemplateRequest {
  name: string;
  module: 'kvm' | 'gvg' | 'aa' | 'guild';
  description?: string;
  template: TemplateStructure;
  isDefault?: boolean;
}

export interface UpdateTemplateRequest {
  id: string;
  name?: string;
  description?: string;
  template?: TemplateStructure;
  isDefault?: boolean;
}

export interface GetTemplateRequest {
  module?: 'kvm' | 'gvg' | 'aa' | 'guild';
  isDefault?: boolean;
}

// OCR recognition request types
export interface OCRRecognitionRequest {
  templateId?: string;
  module: 'kvm' | 'gvg' | 'aa' | 'guild';
  images: Buffer[] | string[]; // Support multiple images
}