import React, { useState, useEffect } from 'react';
import { Plus, Users, Trash2, UserPlus, Settings, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { groupsAPI, usersAPI, Group, GroupMember } from '@/lib/api';
import socketService from '@/lib/socket';

interface GroupsProps {
  onGroupSelect: (group: Group | null) => void;
  selectedGroup: Group | null;
}

const Groups: React.FC<GroupsProps> = ({ onGroupSelect, selectedGroup }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ name: '', description: '' });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Load groups from API
  useEffect(() => {
    loadGroups();
    setupSocketListeners();
    
    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  // Join socket rooms when groups change
  useEffect(() => {
    if (groups.length > 0) {
      const groupIds = groups.map(group => group.id);
      socketService.joinGroups(groupIds);
    }
  }, [groups]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupsAPI.getGroups();
      setGroups(response.groups);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // Group events
    socketService.onGroupUpdated((data) => {
      setGroups(prev => prev.map(group => 
        group.id === data.groupId 
          ? { ...group, name: data.name, description: data.description }
          : group
      ));
      
      if (selectedGroup?.id === data.groupId) {
        onGroupSelect({ ...selectedGroup, name: data.name, description: data.description });
      }
      
      toast({
        title: "Group Updated",
        description: `${data.name} was updated by ${data.updatedBy}`,
      });
    });

    socketService.onMemberAdded((data) => {
      setGroups(prev => prev.map(group => {
        if (group.id === data.groupId) {
          const newMember: GroupMember = {
            user: data.newMember,
            role: data.newMember.role,
            joinedAt: new Date().toISOString(),
            isActive: true
          };
          return {
            ...group,
            members: [...group.members, newMember],
            membersCount: group.membersCount + 1
          };
        }
        return group;
      }));

      toast({
        title: "New Member Added",
        description: `${data.newMember.name} joined the group`,
      });
    });

    socketService.onMemberRemoved((data) => {
      setGroups(prev => prev.map(group => {
        if (group.id === data.groupId) {
          return {
            ...group,
            members: group.members.filter(m => m.user.id !== data.removedMember.id),
            membersCount: group.membersCount - 1
          };
        }
        return group;
      }));

      toast({
        title: "Member Removed",
        description: `${data.removedMember.name} ${data.isSelfRemoval ? 'left' : 'was removed from'} the group`,
      });
    });

    socketService.onGroupDeleted((data) => {
      setGroups(prev => prev.filter(group => group.id !== data.groupId));
      
      if (selectedGroup?.id === data.groupId) {
        onGroupSelect(null);
      }
      
      toast({
        title: "Group Deleted",
        description: `${data.groupName} was deleted by ${data.deletedBy}`,
        variant: "destructive",
      });
    });
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newGroupForm.name.trim()) return;

    try {
      const response = await groupsAPI.createGroup({
        name: newGroupForm.name.trim(),
        description: newGroupForm.description.trim(),
      });

      setGroups([...groups, response.group]);
      setNewGroupForm({ name: '', description: '' });
      setShowCreateForm(false);
      
      toast({
        title: "Group Created!",
        description: `Created group "${response.group.name}"`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create group",
        variant: "destructive",
      });
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await usersAPI.searchUsers(query);
      setSearchResults(response.users);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const addMember = async (groupId: string, userEmail: string) => {
    try {
      await groupsAPI.addMember(groupId, { email: userEmail });
      setNewMemberEmail('');
      setSearchQuery('');
      setSearchResults([]);
      setShowAddMember(null);
      
      toast({
        title: "Invitation Sent!",
        description: `Invited user to the group`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add member",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (groupId: string, memberId: string, memberName: string) => {
    try {
      await groupsAPI.removeMember(groupId, memberId);
      
      toast({
        title: "Member Removed",
        description: `Removed ${memberName} from the group`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const joinGroupByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) return;

    try {
      const response = await groupsAPI.joinGroup(inviteCode.trim());
      setGroups([...groups, response.group]);
      setInviteCode('');
      setShowJoinGroup(false);
      
      toast({
        title: "Joined Group!",
        description: `Successfully joined "${response.group.name}"`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to join group",
        variant: "destructive",
      });
    }
  };

  const deleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete "${groupName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await groupsAPI.deleteGroup(groupId);
      
      toast({
        title: "Group Deleted",
        description: `Deleted group "${groupName}"`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Invite Code Copied!",
      description: "Share this code with others to invite them to the group",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Groups</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowJoinGroup(true)}
            variant="outline"
            className="border-purple-600 text-purple-600 hover:bg-purple-50"
          >
            <Link className="mr-2 h-4 w-4" />
            Join Group
          </Button>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No groups yet</h3>
            <p className="text-gray-500 mb-4">Create your first group or join an existing one to start splitting expenses</p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
              <Button 
                onClick={() => setShowJoinGroup(true)}
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                <Link className="mr-2 h-4 w-4" />
                Join Group
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card 
              key={group.id} 
              className={`hover:shadow-lg transition-shadow cursor-pointer ${
                selectedGroup?.id === group.id ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => onGroupSelect(group)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-800 mb-1">
                      {group.name}
                    </CardTitle>
                    {group.description && (
                      <p className="text-sm text-gray-600">{group.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyInviteCode(group.inviteCode);
                      }}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="Copy invite code"
                    >
                      <Link className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGroup(group.id, group.name);
                      }}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Members ({group.membersCount})</span>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddMember(group.id);
                      }}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {group.members.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No members yet</p>
                    ) : (
                      group.members.slice(0, 3).map((member, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-700">
                            {member.user.name} {member.role === 'admin' && '(Admin)'}
                          </span>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMember(group.id, member.user.id, member.user.name);
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            ×
                          </Button>
                        </div>
                      ))
                    )}
                    {group.members.length > 3 && (
                      <p className="text-xs text-gray-500">+{group.members.length - 3} more</p>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Total: ₹{group.totalExpenses}</span>
                      <span>Settled: ₹{group.totalSettled}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={createGroup} className="space-y-4">
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={newGroupForm.name}
                onChange={(e) => setNewGroupForm({...newGroupForm, name: e.target.value})}
                placeholder="e.g., Weekend Trip, Roommates"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="groupDescription">Description (Optional)</Label>
              <Input
                id="groupDescription"
                value={newGroupForm.description}
                onChange={(e) => setNewGroupForm({...newGroupForm, description: e.target.value})}
                placeholder="Brief description of the group"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Create Group
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateForm(false)} 
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={showJoinGroup} onOpenChange={setShowJoinGroup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Join Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={joinGroupByCode} className="space-y-4">
            <div>
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter the group invite code"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Ask a group member for the invite code
              </p>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                Join Group
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowJoinGroup(false)} 
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={!!showAddMember} onOpenChange={() => setShowAddMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="memberEmail">Search User</Label>
              <Input
                id="memberEmail"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="Enter email or name"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {searchResults.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (showAddMember) {
                        addMember(showAddMember, user.email);
                      }
                    }}
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddMember(null)} 
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Groups;
