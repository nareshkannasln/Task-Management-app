const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all tasks for the authenticated user
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        t.*,
        p.name as creator_name,
        p.email as creator_email,
        p.avatar_url as creator_avatar,
        COALESCE(
          json_agg(
            json_build_object(
              'id', tc.id,
              'user_id', tc.user_id,
              'permission', tc.permission,
              'user_name', cp.name,
              'user_email', cp.email,
              'user_avatar', cp.avatar_url
            )
          ) FILTER (WHERE tc.id IS NOT NULL), 
          '[]'
        ) as collaborators
      FROM tasks t
      LEFT JOIN profiles p ON t.created_by = p.id
      LEFT JOIN task_collaborators tc ON t.id = tc.task_id
      LEFT JOIN profiles cp ON tc.user_id = cp.id
      WHERE t.created_by = $1 OR t.id IN (
        SELECT task_id FROM task_collaborators WHERE user_id = $1
      )
      GROUP BY t.id, p.name, p.email, p.avatar_url
      ORDER BY t.created_at DESC
    `;
    
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('status').optional().isIn(['pending', 'in_progress', 'completed']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().withMessage('Invalid due date format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description = '', status = 'pending', priority = 'medium', due_date } = req.body;
    
    const query = `
      INSERT INTO tasks (title, description, status, priority, due_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      title, description, status, priority, 
      due_date ? new Date(due_date) : null, 
      req.user.id
    ]);
    
    // Emit real-time update
    req.io.emit('task_created', {
      task: result.rows[0],
      creator: req.user
    });
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().isLength({ max: 1000 }),
  body('status').optional().isIn(['pending', 'in_progress', 'completed']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const taskId = req.params.id;
    
    // Check if user can edit this task
    const permissionQuery = `
      SELECT t.*, tc.permission
      FROM tasks t
      LEFT JOIN task_collaborators tc ON t.id = tc.task_id AND tc.user_id = $2
      WHERE t.id = $1 AND (t.created_by = $2 OR tc.permission = 'write')
    `;
    
    const permissionResult = await pool.query(permissionQuery, [taskId, req.user.id]);
    
    if (permissionResult.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(req.body).forEach(key => {
      if (['title', 'description', 'status', 'priority', 'due_date'].includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(key === 'due_date' && req.body[key] ? new Date(req.body[key]) : req.body[key]);
        paramCount++;
      }
    });
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(taskId);
    
    const query = `
      UPDATE tasks 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    // Emit real-time update
    req.io.emit('task_updated', {
      task: result.rows[0],
      updatedBy: req.user
    });
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // Check if user owns this task
    const ownerQuery = 'SELECT * FROM tasks WHERE id = $1 AND created_by = $2';
    const ownerResult = await pool.query(ownerQuery, [taskId, req.user.id]);
    
    if (ownerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    
    // Emit real-time update
    req.io.emit('task_deleted', {
      taskId,
      deletedBy: req.user
    });
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Add collaborator to task
router.post('/:id/collaborators', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('permission').isIn(['read', 'write']).withMessage('Permission must be read or write')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const taskId = req.params.id;
    const { email, permission } = req.body;
    
    // Check if user owns this task
    const ownerQuery = 'SELECT * FROM tasks WHERE id = $1 AND created_by = $2';
    const ownerResult = await pool.query(ownerQuery, [taskId, req.user.id]);
    
    if (ownerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Find user by email
    const userQuery = 'SELECT * FROM profiles WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const collaboratorUser = userResult.rows[0];
    
    // Check if already a collaborator
    const existingQuery = 'SELECT * FROM task_collaborators WHERE task_id = $1 AND user_id = $2';
    const existingResult = await pool.query(existingQuery, [taskId, collaboratorUser.id]);
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a collaborator' });
    }
    
    // Add collaborator
    const insertQuery = `
      INSERT INTO task_collaborators (task_id, user_id, permission)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [taskId, collaboratorUser.id, permission]);
    
    // Emit real-time update
    req.io.emit('collaborator_added', {
      taskId,
      collaborator: {
        ...result.rows[0],
        user: collaboratorUser
      },
      addedBy: req.user
    });
    
    res.status(201).json({
      ...result.rows[0],
      user: collaboratorUser
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

// Remove collaborator from task
router.delete('/:id/collaborators/:userId', async (req, res) => {
  try {
    const { id: taskId, userId } = req.params;
    
    // Check if user owns this task
    const ownerQuery = 'SELECT * FROM tasks WHERE id = $1 AND created_by = $2';
    const ownerResult = await pool.query(ownerQuery, [taskId, req.user.id]);
    
    if (ownerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    await pool.query('DELETE FROM task_collaborators WHERE task_id = $1 AND user_id = $2', [taskId, userId]);
    
    // Emit real-time update
    req.io.emit('collaborator_removed', {
      taskId,
      userId,
      removedBy: req.user
    });
    
    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

// Search users for collaboration
router.get('/search-users', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const query = `
      SELECT id, email, name, avatar_url
      FROM profiles
      WHERE (email ILIKE $1 OR name ILIKE $1) AND id != $2
      LIMIT 10
    `;
    
    const result = await pool.query(query, [`%${q}%`, req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router;