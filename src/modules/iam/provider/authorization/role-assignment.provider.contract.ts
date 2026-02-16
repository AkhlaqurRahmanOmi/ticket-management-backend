export interface RoleAssignmentProvider {
  assignRoleByName(userId: string, roleName: string): Promise<void>;
}
