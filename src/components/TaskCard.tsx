import React, { useState } from 'react';
import { Calendar, Clock, Users, Edit, Trash2, Share, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { useTask } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
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
import clsx from 'clsx';
import TaskModal from './TaskModal';
import ShareModal from './ShareModal';

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { updateTask, deleteTask } = useTask();
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const isOwner = user?.id === task.created_by;
  const canEdit = isOwner || task.collaborators?.some(c => c.user_id === user?.id && c.permission === 'write');

  const priorityColors = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-red-100 text-red-800 border-red-200',
  };

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!canEdit) return;
    
    try {
      await updateTask(task.id, { status: newStatus });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(task.id);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-2">
            {task.title}
          </h3>
          
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-gray-500" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setShowEditModal(true);
                        setShowActions(false);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Task
                    </button>
                  )}
                  
                  {isOwner && (
                    <>
                      <button
                        onClick={() => {
                          setShowShareModal(true);
                          setShowActions(false);
                        }}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <Share className="h-4 w-4 mr-2" />
                        Share Task
                      </button>
                      
                      <button
                        onClick={() => {
                          handleDelete();
                          setShowActions(false);
                        }}
                        className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Task
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={clsx(
            'px-2 py-1 rounded-full text-xs font-medium border',
            priorityColors[task.priority]
          )}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
          </span>
          
          <button
            onClick={() => canEdit && handleStatusChange(
              task.status === 'pending' ? 'in_progress' : 
              task.status === 'in_progress' ? 'completed' : 'pending'
            )}
            className={clsx(
              'px-2 py-1 rounded-full text-xs font-medium transition-colors',
              statusColors[task.status],
              canEdit && 'hover:opacity-80 cursor-pointer'
            )}
          >
            {task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            {task.due_date && (
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>{format(new Date(task.created_at), 'MMM d')}</span>
            </div>
          </div>
          
          {task.collaborators && task.collaborators.length > 0 && (
            <div className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              <span>{task.collaborators.length} collaborator{task.collaborators.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {task.creator && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Created by {task.creator.name}
            </span>
          </div>
        )}
      </div>

      {showEditModal && (
        <TaskModal
          task={task}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showShareModal && (
        <ShareModal
          task={task}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
};

export default TaskCard;