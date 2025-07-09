import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '../lib/api';
import { socketManager } from '../lib/socket';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

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

interface CreateTaskData {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  due_date?: string;
}

interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  due_date?: string;
}

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  createTask: (taskData: CreateTaskData) => Promise<Task>;
  updateTask: (taskId: string, updates: UpdateTaskData) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  addCollaborator: (taskId: string, email: string, permission: 'read' | 'write') => Promise<void>;
  removeCollaborator: (taskId: string, userId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<any[]>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadTasks();
      setupSocketListeners();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      const data = await apiClient.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    socketManager.on('task_created', (data: any) => {
      setTasks(prev => [data.task, ...prev]);
      if (data.creator.id !== user?.id) {
        toast.success(`New task created: ${data.task.title}`);
      }
    });

    socketManager.on('task_updated', (data: any) => {
      setTasks(prev => prev.map(task => 
        task.id === data.task.id ? { ...task, ...data.task } : task
      ));
      if (data.updatedBy.id !== user?.id) {
        toast.success(`Task updated: ${data.task.title}`);
      }
    });

    socketManager.on('task_deleted', (data: any) => {
      setTasks(prev => prev.filter(task => task.id !== data.taskId));
      if (data.deletedBy.id !== user?.id) {
        toast.success('Task deleted');
      }
    });

    socketManager.on('collaborator_added', (data: any) => {
      loadTasks(); // Refresh to get updated collaborators
      if (data.addedBy.id !== user?.id) {
        toast.success('New collaborator added');
      }
    });

    socketManager.on('collaborator_removed', (data: any) => {
      loadTasks(); // Refresh to get updated collaborators
      if (data.removedBy.id !== user?.id) {
        toast.success('Collaborator removed');
      }
    });
  };

  const handleCreateTask = async (taskData: CreateTaskData): Promise<Task> => {
    try {
      const newTask = await apiClient.createTask(taskData);
      toast.success('Task created successfully');
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
      throw error;
    }
  };

  const handleUpdateTask = async (taskId: string, updates: UpdateTaskData): Promise<Task> => {
    try {
      const updatedTask = await apiClient.updateTask(taskId, updates);
      toast.success('Task updated successfully');
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    try {
      await apiClient.deleteTask(taskId);
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      throw error;
    }
  };

  const handleAddCollaborator = async (taskId: string, email: string, permission: 'read' | 'write'): Promise<void> => {
    try {
      await apiClient.addCollaborator(taskId, email, permission);
      toast.success('Collaborator added successfully');
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast.error('Failed to add collaborator');
      throw error;
    }
  };

  const handleRemoveCollaborator = async (taskId: string, userId: string): Promise<void> => {
    try {
      await apiClient.removeCollaborator(taskId, userId);
      toast.success('Collaborator removed successfully');
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Failed to remove collaborator');
      throw error;
    }
  };

  const handleSearchUsers = async (query: string): Promise<any[]> => {
    return await apiClient.searchUsers(query);
  };

  const value = {
    tasks,
    loading,
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    refreshTasks: loadTasks,
    addCollaborator: handleAddCollaborator,
    removeCollaborator: handleRemoveCollaborator,
    searchUsers: handleSearchUsers,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};