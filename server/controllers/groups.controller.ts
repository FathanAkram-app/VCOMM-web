import { Request, Response } from 'express';
import { GroupsService } from '../services/groups.service';

export class GroupsController {
  constructor(
    private groupsService: GroupsService,
    private broadcastGroupUpdate: (groupId: number, updateType: string, data: any) => Promise<void>
  ) {}

  getGroupInfo = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = req.session?.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const groupInfo = await this.groupsService.getGroupInfo(groupId, userId);
      return res.json(groupInfo);
    } catch (error: any) {
      console.error('Error getting group info:', error);
      if (error.message === 'Group not found') {
        return res.status(404).json({ message: 'Group not found' });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({ message: 'Access denied' });
      }
      return res.status(500).json({ message: 'Failed to get group info' });
    }
  };

  getGroupMembers = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = req.session?.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const members = await this.groupsService.getGroupMembers(groupId, userId);
      return res.json(members);
    } catch (error: any) {
      console.error('Error getting group members:', error);
      if (error.message === 'Access denied') {
        return res.status(403).json({ message: 'Access denied' });
      }
      return res.status(500).json({ message: 'Failed to get group members' });
    }
  };

  updateGroupName = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = req.session?.user?.id;
      const { name } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const result = await this.groupsService.updateGroupName(groupId, userId, name);

      // Broadcast group update to all members
      await this.broadcastGroupUpdate(groupId, 'name_updated', result);

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating group name:', error);
      if (error.message === 'Admin access required') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      return res.status(500).json({ message: 'Failed to update group name' });
    }
  };

  updateGroupDescription = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = req.session?.user?.id;
      const { description } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const result = await this.groupsService.updateGroupDescription(groupId, userId, description);

      // Broadcast group update to all members
      await this.broadcastGroupUpdate(groupId, 'description_updated', result);

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating group description:', error);
      if (error.message === 'Admin access required') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      return res.status(500).json({ message: 'Failed to update group description' });
    }
  };

  addMembers = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = req.session?.user?.id;
      const { userIds } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const result = await this.groupsService.addMembers(groupId, userId, userIds);

      // Broadcast group update if members were added
      if (result.addedMembers.length > 0) {
        await this.broadcastGroupUpdate(groupId, 'members_added', result);
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error adding group members:', error);
      if (error.message === 'Admin access required') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      return res.status(500).json({ message: 'Failed to add group members' });
    }
  };

  removeMember = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const groupId = parseInt(req.params.groupId);
      const memberId = parseInt(req.params.memberId);
      const userId = req.session?.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const result = await this.groupsService.removeMember(groupId, userId, memberId);

      // Broadcast group update to all members
      await this.broadcastGroupUpdate(groupId, 'member_removed', result);

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing group member:', error);
      if (error.message === 'Admin access required') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      if (error.message === 'Cannot remove yourself') {
        return res.status(400).json({ message: 'Cannot remove yourself' });
      }
      return res.status(500).json({ message: 'Failed to remove group member' });
    }
  };

  updateMemberRole = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const groupId = parseInt(req.params.groupId);
      const memberId = parseInt(req.params.memberId);
      const userId = req.session?.user?.id;
      const { role } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const result = await this.groupsService.updateMemberRole(groupId, userId, memberId, role);

      // Broadcast group update to all members
      await this.broadcastGroupUpdate(groupId, 'member_role_changed', result);

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error changing member role:', error);
      if (error.message === 'Admin access required') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      if (error.message === 'Cannot change your own role') {
        return res.status(400).json({ message: 'Cannot change your own role' });
      }
      return res.status(500).json({ message: 'Failed to change member role' });
    }
  };
}
