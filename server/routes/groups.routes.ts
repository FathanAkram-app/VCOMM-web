import { Router } from 'express';
import { GroupsController } from '../controllers/groups.controller';
import {
  validateGroupId,
  validateMemberId,
  validateUpdateGroupName,
  validateAddMembers,
  validateMemberRole
} from '../validators/groups.validator';
import { isAuthenticated } from '../auth';

export function createGroupsRoutes(groupsController: GroupsController): Router {
  const router = Router();

  // Get group info and members
  router.get('/group-info/:groupId', isAuthenticated, validateGroupId, groupsController.getGroupInfo);
  router.get('/group-members/:groupId', isAuthenticated, validateGroupId, groupsController.getGroupMembers);

  // Update group details
  router.patch('/groups/:groupId/name', isAuthenticated, validateGroupId, validateUpdateGroupName, groupsController.updateGroupName);
  router.patch('/groups/:groupId/description', isAuthenticated, validateGroupId, groupsController.updateGroupDescription);

  // Manage group members
  router.post('/groups/:groupId/members', isAuthenticated, validateGroupId, validateAddMembers, groupsController.addMembers);
  router.delete('/groups/:groupId/members/:memberId', isAuthenticated, validateGroupId, validateMemberId, groupsController.removeMember);
  router.patch('/groups/:groupId/members/:memberId/role', isAuthenticated, validateGroupId, validateMemberId, validateMemberRole, groupsController.updateMemberRole);

  return router;
}
