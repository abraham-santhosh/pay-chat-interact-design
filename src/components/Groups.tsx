
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdAt: string;
}

interface GroupsProps {
  onGroupSelect: (group: Group) => void;
  selectedGroup: Group | null;
}

const Groups: React.FC<GroupsProps> = ({ onGroupSelect, selectedGroup }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', members: '' });
  const { toast } = useToast();

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;

    const group: Group = {
      id: Date.now().toString(),
      name: newGroup.name.trim(),
      description: newGroup.description.trim(),
      members: newGroup.members.split(',').map(m => m.trim()).filter(m => m),
      createdAt: new Date().toLocaleDateString(),
    };

    setGroups([...groups, group]);
    setNewGroup({ name: '', description: '', members: '' });
    setShowCreateGroup(false);
    
    toast({
      title: "Group Created!",
      description: `${group.name} has been created successfully`,
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
    if (selectedGroup?.id === groupId) {
      onGroupSelect(null);
    }
    toast({
      title: "Group Deleted",
      description: "Group has been removed",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Groups</h2>
        <Button
          onClick={() => setShowCreateGroup(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No groups yet</h3>
            <p className="text-gray-500">Create your first group to start splitting expenses</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Card 
              key={group.id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedGroup?.id === group.id ? 'ring-2 ring-purple-600 bg-purple-50' : ''
              }`}
              onClick={() => onGroupSelect(group)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800">{group.name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                    className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {group.description && (
                  <p className="text-sm text-gray-600 mb-2">{group.description}</p>
                )}
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{group.members.length} members</span>
                  <span className="ml-auto">{group.createdAt}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
                Group Name *
              </label>
              <Input
                id="groupName"
                value={newGroup.name}
                onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                placeholder="e.g., Roommates, Trip to Paris"
                required
              />
            </div>
            
            <div>
              <label htmlFor="groupDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                id="groupDescription"
                value={newGroup.description}
                onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                placeholder="Optional description"
              />
            </div>
            
            <div>
              <label htmlFor="groupMembers" className="block text-sm font-medium text-gray-700 mb-1">
                Members (comma-separated)
              </label>
              <Input
                id="groupMembers"
                value={newGroup.members}
                onChange={(e) => setNewGroup({...newGroup, members: e.target.value})}
                placeholder="john@email.com, jane@email.com"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Create Group
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateGroup(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Groups;
