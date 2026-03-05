import express from 'express';
import {
  getAllTasks,
  getTaskById,
  createTask,
  createMultipleTasks,
  updateTask,
  deleteTask,
  updateTaskStatus,
  addHourlyUpdate,
  addAttachment,
  deleteAttachment,
  getTaskStats,
  searchTasks,
  getAssignees,
  getTasksByAssignee,
  getTasksByCreator,
  getTasksBySite,
  getSupervisorsBySite,
  addAssigneesToTask,
  removeAssigneesFromTask,
  replaceAssigneeInTask
} from '../controllers/taskController';

const router = express.Router();

// Task routes
router.get('/', getAllTasks);
router.get('/search', searchTasks);
router.get('/stats', getTaskStats);
router.get('/assignees', getAssignees);
router.get('/assignee/:assigneeId', getTasksByAssignee);
router.get('/creator/:creatorId', getTasksByCreator);
router.get('/site/:siteName', getTasksBySite);
router.get('/supervisors-by-site', getSupervisorsBySite);
router.get('/:id', getTaskById);

// Create operations
router.post('/', createTask);
router.post('/multiple', createMultipleTasks);

// Update operations
router.put('/:id', updateTask);
router.patch('/:id/status', updateTaskStatus);

// Assignee management routes
router.post('/:id/assignees', addAssigneesToTask);           // Add assignees
router.delete('/:id/assignees', removeAssigneesFromTask);    // Remove assignees
router.put('/:id/assignees/replace', replaceAssigneeInTask); // Replace assignee

// Hourly updates
router.post('/:id/hourly-updates', addHourlyUpdate);

// Attachment management
router.post('/:id/attachments', addAttachment);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

// Delete operation
router.delete('/:id', deleteTask);

export default router;