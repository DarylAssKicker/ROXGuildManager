// Permission types
export type Permission = {
  resource: string;
  actions: string[];
};

export type UserRole = 'admin' | 'owner' | 'editor' | 'viewer';

// Role-based permissions (matching server-side definitions)
export const ROLE_PERMISSIONS: { [key in UserRole]: Permission[] } = {
  admin: [
    { resource: 'guild_members', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'aa', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'gvg', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'kvm', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'groups', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'parties', actions: ['read', 'create', 'update', 'delete'] }
  ],
  owner: [
    { resource: 'guild_members', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'aa', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'gvg', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'kvm', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'groups', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'parties', actions: ['read', 'create', 'update', 'delete'] }
  ],
  editor: [
    { resource: 'guild_members', actions: ['read', 'create', 'update'] },
    { resource: 'aa', actions: ['read', 'create'] },
    { resource: 'gvg', actions: ['read', 'create'] },
    { resource: 'kvm', actions: ['read', 'create'] },
    { resource: 'groups', actions: ['read', 'create', 'update'] },
    { resource: 'parties', actions: ['read', 'create', 'update'] }
  ],
  viewer: [
    { resource: 'guild_members', actions: ['read'] },
    { resource: 'aa', actions: ['read'] },
    { resource: 'gvg', actions: ['read'] },
    { resource: 'kvm', actions: ['read'] },
    { resource: 'groups', actions: ['read'] },
    { resource: 'parties', actions: ['read'] }
  ]
};

/**
 * Check if user has permission for specific resource and action
 */
export function hasPermission(
  userRole: UserRole, 
  resource: string, 
  action: 'read' | 'create' | 'update' | 'delete'
): boolean {
  // Admin and owner have all permissions
  if (userRole === 'admin' || userRole === 'owner') {
    return true;
  }
  
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.some(perm => 
    perm.resource === resource && perm.actions.includes(action)
  );
}

/**
 * Check if user can edit (create, update, or delete)
 */
export function canEdit(userRole: UserRole, resource: string): boolean {
  return hasPermission(userRole, resource, 'create') || 
         hasPermission(userRole, resource, 'update') || 
         hasPermission(userRole, resource, 'delete');
}

/**
 * Check if user can delete
 */
export function canDelete(userRole: UserRole, resource: string): boolean {
  return hasPermission(userRole, resource, 'delete');
}