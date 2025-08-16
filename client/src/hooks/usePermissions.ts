import { useAuth } from '../contexts/AuthContext';
import { hasPermission, canEdit, canDelete, UserRole } from '../utils/permissions';

export const usePermissions = () => {
  const { user } = useAuth();

  const checkPermission = (resource: string, action: 'read' | 'create' | 'update' | 'delete'): boolean => {
    if (!user) return false;
    return hasPermission(user.role as UserRole, resource, action);
  };

  const checkCanEdit = (resource: string): boolean => {
    if (!user) return false;
    return canEdit(user.role as UserRole, resource);
  };

  const checkCanDelete = (resource: string): boolean => {
    if (!user) return false;
    return canDelete(user.role as UserRole, resource);
  };

  const checkCanRead = (resource: string): boolean => {
    if (!user) return false;
    return hasPermission(user.role as UserRole, resource, 'read');
  };

  const checkCanCreate = (resource: string): boolean => {
    if (!user) return false;
    return hasPermission(user.role as UserRole, resource, 'create');
  };

  const checkCanUpdate = (resource: string): boolean => {
    if (!user) return false;
    return hasPermission(user.role as UserRole, resource, 'update');
  };

  return {
    user,
    hasPermission: checkPermission,
    canEdit: checkCanEdit,
    canDelete: checkCanDelete,
    canRead: checkCanRead,
    canCreate: checkCanCreate,
    canUpdate: checkCanUpdate,
    isOwner: user?.role === 'owner',
    isAdmin: user?.role === 'admin',
    isEditor: user?.role === 'editor',
    isViewer: user?.role === 'viewer',
    isOwnerOrAdmin: user?.role === 'owner' || user?.role === 'admin',
  };
};