import React, { useState } from 'react';
import { X, UserPlus, Mail, Trash2, Users } from 'lucide-react';
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  creator_email?: string;
  creator_avatar?: string;
  collaborators?: any[];
}
import { useTask } from '../contexts/TaskContext';
import toast from 'react-hot-toast';

interface ShareModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ task, isOpen, onClose }) => {
  const { refreshTasks, addCollaborator, removeCollaborator, searchUsers } = useTask();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'read' | 'write'>('read');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearchUsers = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const users = await searchUsers(query);
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await addCollaborator(task.id, email, permission);
      setEmail('');
      setSearchResults([]);
      await refreshTasks();
    } catch (error) {
      console.error('Error adding collaborator:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      await removeCollaborator(task.id, userId);
      await refreshTasks();
    } catch (error) {
      console.error('Error removing collaborator:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            <Users className="h-5 w-5 inline mr-2" />
            Share Task
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
            <p className="text-sm text-gray-600">
              Share this task with team members to collaborate
            </p>
          </div>

          <form onSubmit={handleAddCollaborator} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 inline mr-1" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter email address"
                required
              />
              
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setEmail(user.email);
                        setSearchResults([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permission
              </label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'read' | 'write')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="read">Read Only</option>
                <option value="write">Read & Write</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? 'Adding...' : 'Add Collaborator'}
            </button>
          </form>

          {task.collaborators && task.collaborators.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3">Current Collaborators</h3>
              <div className="space-y-2">
                {task.collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {collaborator.user?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {collaborator.user?.email} • {collaborator.permission}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCollaborator(collaborator.user_id)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;