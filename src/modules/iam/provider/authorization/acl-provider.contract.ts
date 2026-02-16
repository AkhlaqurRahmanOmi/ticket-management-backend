export interface AclProvider {
  isOrganizationMember(userId: string, orgId: string): Promise<boolean>;
}
