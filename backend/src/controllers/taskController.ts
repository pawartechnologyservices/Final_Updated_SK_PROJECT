import { Request, Response } from 'express';
import Task from '../models/Task';
import Site from '../models/Site';
import User from '../models/User';

// Helper function to clean object
const cleanObject = (obj: any) => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// Get all tasks
export const getAllTasks = async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching all tasks');
    
    const { 
      status, 
      priority, 
      siteId, 
      assignedTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let filter: any = {};
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (siteId) filter.siteId = siteId;
    if (assignedTo) filter['assignedUsers.userId'] = assignedTo;
    
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
    
    const tasks = await Task.find(filter)
      .sort(sort)
      .lean();
    
    console.log(`✅ Found ${tasks.length} tasks`);
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('❌ Error fetching tasks:', error);
    res.status(500).json({ 
      message: 'Error fetching tasks', 
      error: error.message 
    });
  }
};

// Get task by ID
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching task with ID: ${id}`);
    
    const task = await Task.findById(id).lean();
    
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ message: 'Task not found' });
    }
    
    console.log(`✅ Found task: ${task.title}`);
    res.status(200).json(task);
  } catch (error: any) {
    console.error('❌ Error fetching task:', error);
    res.status(500).json({ 
      message: 'Error fetching task', 
      error: error.message 
    });
  }
};

// Create new task - UPDATED VERSION with multiple assignees
// Create new task - UPDATED VERSION with multiple assignees
// Create new task - UPDATED to allow empty assignees for templates
export const createTask = async (req: Request, res: Response) => {
  try {
    console.log('📝 CREATE TASK REQUEST START ============');
    console.log('📦 Request body received:', JSON.stringify(req.body, null, 2));
    
    // Remove id fields
    const { _id, id, __v, ...requestData } = req.body;
    console.log('🧹 After removing id fields:', JSON.stringify(requestData, null, 2));
    
    // Check if we have assignedUsers array or single assignedTo
    let assignedUsers = [];
    
    if (requestData.assignedUsers && Array.isArray(requestData.assignedUsers)) {
      // Use provided assignedUsers array
      assignedUsers = requestData.assignedUsers.map((user: any) => ({
        userId: user.userId || user._id || '',
        name: user.name || '',
        role: user.role || 'employee',
        assignedAt: user.assignedAt ? new Date(user.assignedAt) : new Date(),
        status: user.status || 'pending'
      }));
    } else if (requestData.assignedTo && requestData.assignedToName) {
      // Convert single assignee to assignedUsers array
      assignedUsers = [{
        userId: requestData.assignedTo,
        name: requestData.assignedToName,
        role: requestData.assignedToRole || 'employee',
        assignedAt: new Date(),
        status: 'pending'
      }];
    }
    // If no assignees provided, assignedUsers remains empty array (for templates)
    
    // Clean the data
    const cleanedData = requestData;
    
    // Validate required fields
    const requiredFields = [
      'title', 
      'description', 
      'priority', 
      'deadline', 
      'dueDateTime',
      'siteId',
      'siteName',
      'clientName',
      'createdBy'
    ];
    
    const missingFields = requiredFields.filter(field => {
      const value = cleanedData[field];
      return value === undefined || value === null || value === '';
    });
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields',
        missingFields
      });
    }
    
    // Parse dates
    let deadline: Date;
    let dueDateTime: Date;
    
    try {
      deadline = new Date(cleanedData.deadline);
      dueDateTime = new Date(cleanedData.dueDateTime);
      
      if (isNaN(deadline.getTime()) || isNaN(dueDateTime.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      console.log('❌ Invalid date format');
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    // Prepare task data
    const taskData: any = {
      title: String(cleanedData.title).trim(),
      description: String(cleanedData.description).trim(),
      assignedUsers: assignedUsers, // Can be empty array for templates
      priority: cleanedData.priority,
      status: cleanedData.status || 'pending',
      deadline: deadline,
      dueDateTime: dueDateTime,
      siteId: String(cleanedData.siteId).trim(),
      siteName: String(cleanedData.siteName).trim(),
      clientName: String(cleanedData.clientName).trim(),
      taskType: cleanedData.taskType || 'general',
      createdBy: String(cleanedData.createdBy).trim(),
      attachments: Array.isArray(cleanedData.attachments) ? cleanedData.attachments : [],
      hourlyUpdates: Array.isArray(cleanedData.hourlyUpdates) ? cleanedData.hourlyUpdates : []
    };
    
    console.log('📊 Final task data to save:', JSON.stringify(taskData, null, 2));
    
    // Create new task instance
    const task = new Task(taskData);
    console.log('🏗️ Task instance created');
    
    // Save to database
    console.log('💾 Attempting to save task to database...');
    await task.save();
    
    console.log(`✅ Task created successfully! ID: ${task._id}, Title: ${task.title}`);
    console.log(`👥 Assigned users: ${assignedUsers.length}`);
    console.log('📝 CREATE TASK REQUEST END ============\n');
    
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
    
  } catch (error: any) {
    console.error('❌ CREATE TASK ERROR ============');
    console.error('Error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation error', 
        errors: messages
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error creating task', 
      error: error.message
    });
  }
};
// Add assignees to existing task
export const addAssigneesToTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assignees } = req.body; // Array of assignees to add
    
    console.log(`➕ Adding assignees to task ID: ${id}`);
    console.log(`📦 Assignees to add:`, assignees);
    
    if (!assignees || !Array.isArray(assignees) || assignees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No assignees provided'
      });
    }
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    // Get current assignee IDs
    const currentUserIds = new Set(task.assignedUsers.map(u => u.userId));
    
    // Add new assignees that aren't already assigned
    const newAssignees = assignees
      .filter((user: any) => !currentUserIds.has(user.userId || user._id))
      .map((user: any) => ({
        userId: user.userId || user._id || '',
        name: user.name || '',
        role: user.role || 'employee',
        assignedAt: new Date(),
        status: 'pending' as const
      }));
    
    if (newAssignees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All assignees are already assigned to this task'
      });
    }
    
    // Add new assignees
    task.assignedUsers = [...task.assignedUsers, ...newAssignees];
    await task.save();
    
    console.log(`✅ Added ${newAssignees.length} new assignees to task`);
    
    res.status(200).json({
      success: true,
      message: `Successfully added ${newAssignees.length} assignee(s)`,
      task
    });
    
  } catch (error: any) {
    console.error('❌ Error adding assignees:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding assignees', 
      error: error.message 
    });
  }
};

// Remove assignees from task
export const removeAssigneesFromTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body; // Array of user IDs to remove
    
    console.log(`➖ Removing assignees from task ID: ${id}`);
    console.log(`📦 User IDs to remove:`, userIds);
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No user IDs provided'
      });
    }
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    // Check if removing all assignees
    if (task.assignedUsers.length <= userIds.length) {
      const wouldRemoveAll = userIds.every(id => 
        task.assignedUsers.some(u => u.userId === id)
      );
      
      if (wouldRemoveAll) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove all assignees. At least one assignee is required.'
        });
      }
    }
    
    // Filter out the users to remove
    const removeSet = new Set(userIds);
    const remainingUsers = task.assignedUsers.filter(u => !removeSet.has(u.userId));
    const removedCount = task.assignedUsers.length - remainingUsers.length;
    
    if (removedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching assignees found'
      });
    }
    
    task.assignedUsers = remainingUsers;
    await task.save();
    
    console.log(`✅ Removed ${removedCount} assignees from task`);
    
    res.status(200).json({
      success: true,
      message: `Successfully removed ${removedCount} assignee(s)`,
      task
    });
    
  } catch (error: any) {
    console.error('❌ Error removing assignees:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error removing assignees', 
      error: error.message 
    });
  }
};

// Replace assignee in task
export const replaceAssigneeInTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { oldUserId, newUser } = req.body;
    
    console.log(`🔄 Replacing assignee in task ID: ${id}`);
    console.log(`📦 Old User ID: ${oldUserId}, New User:`, newUser);
    
    if (!oldUserId || !newUser) {
      return res.status(400).json({
        success: false,
        message: 'Both oldUserId and newUser are required'
      });
    }
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    // Find the index of the old user
    const userIndex = task.assignedUsers.findIndex(u => u.userId === oldUserId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User to replace not found'
      });
    }
    
    // Check if new user is already assigned
    const isNewUserAssigned = task.assignedUsers.some(u => u.userId === (newUser.userId || newUser._id));
    
    if (isNewUserAssigned) {
      return res.status(400).json({
        success: false,
        message: 'New user is already assigned to this task'
      });
    }
    
    // Replace the user
    task.assignedUsers[userIndex] = {
      userId: newUser.userId || newUser._id || '',
      name: newUser.name || '',
      role: newUser.role || task.assignedUsers[userIndex].role,
      assignedAt: new Date(),
      status: 'pending' as const
    };
    
    await task.save();
    
    console.log(`✅ Replaced assignee successfully`);
    
    res.status(200).json({
      success: true,
      message: 'Assignee replaced successfully',
      task
    });
    
  } catch (error: any) {
    console.error('❌ Error replacing assignee:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error replacing assignee', 
      error: error.message 
    });
  }
};
// Create multiple tasks (for bulk assignment) - UPDATED to handle multiple assignees per task
// Create multiple tasks (for bulk assignment) - UPDATED to handle multiple assignees per task
// In taskController.ts - Fix the createMultipleTasks function

// Create multiple tasks (for bulk assignment)
export const createMultipleTasks = async (req: Request, res: Response) => {
  try {
    console.log('📝 CREATE MULTIPLE TASKS REQUEST START ============');
    console.log('📦 Request body received:', JSON.stringify(req.body, null, 2));
    
    const { tasks, createdBy } = req.body;
    
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No tasks provided'
      });
    }
    
    console.log(`📦 Creating ${tasks.length} tasks`);
    
    const tasksToCreate = tasks.map((taskData: any, index: number) => {
      console.log(`📦 Processing task ${index + 1}:`, JSON.stringify(taskData, null, 2));
      
      // Remove id fields from each task
      const { _id, id, __v, ...cleanTask } = taskData;
      
      // Handle assignedUsers
      let assignedUsers = [];
      
      if (cleanTask.assignedUsers && Array.isArray(cleanTask.assignedUsers)) {
        // Use provided assignedUsers array
        assignedUsers = cleanTask.assignedUsers.map((user: any) => {
          // Ensure user has required fields
          if (!user.userId || !user.name || !user.role) {
            throw new Error(`Task ${index + 1} has invalid assignee data: missing required fields`);
          }
          
          return {
            userId: user.userId,
            name: user.name,
            role: user.role,
            assignedAt: user.assignedAt ? new Date(user.assignedAt) : new Date(),
            status: user.status || 'pending'
          };
        });
      }
      // assignedUsers can be empty array - that's valid for fully staffed sites
      
      // Validate required fields
      const requiredFields = [
        'title', 
        'description', 
        'priority', 
        'deadline', 
        'dueDateTime',
        'siteId',
        'siteName',
        'clientName'
      ];
      
      const missingFields = requiredFields.filter(field => {
        const value = cleanTask[field];
        return value === undefined || value === null || value === '';
      });
      
      if (missingFields.length > 0) {
        throw new Error(`Task ${index + 1} is missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Parse dates
      let deadline: Date;
      let dueDateTime: Date;
      
      try {
        deadline = new Date(cleanTask.deadline);
        dueDateTime = new Date(cleanTask.dueDateTime);
        
        if (isNaN(deadline.getTime()) || isNaN(dueDateTime.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (error) {
        throw new Error(`Task ${index + 1} has invalid date format`);
      }
      
      return {
        title: String(cleanTask.title).trim(),
        description: String(cleanTask.description).trim(),
        assignedUsers: assignedUsers, // Can be empty array
        priority: cleanTask.priority,
        status: cleanTask.status || 'pending',
        deadline: deadline,
        dueDateTime: dueDateTime,
        siteId: String(cleanTask.siteId).trim(),
        siteName: String(cleanTask.siteName).trim(),
        clientName: String(cleanTask.clientName).trim(),
        taskType: cleanTask.taskType || 'general',
        attachments: Array.isArray(cleanTask.attachments) ? cleanTask.attachments : [],
        hourlyUpdates: [],
        createdBy: String(createdBy || cleanTask.createdBy || 'system').trim()
      };
    });
    
    console.log('📊 Tasks to create:', JSON.stringify(tasksToCreate, null, 2));
    
    // Validate that we have tasks to create
    if (tasksToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid tasks to create'
      });
    }
    
    // Create tasks in database
    const createdTasks = await Task.insertMany(tasksToCreate, { ordered: false });
    
    console.log(`✅ Successfully created ${createdTasks.length} tasks`);
    console.log('📝 CREATE MULTIPLE TASKS REQUEST END ============\n');
    
    res.status(201).json({
      success: true,
      message: `Successfully created ${createdTasks.length} tasks`,
      tasks: createdTasks
    });
    
  } catch (error: any) {
    console.error('❌ CREATE MULTIPLE TASKS ERROR:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    // Handle bulk write errors (when using ordered: false)
    if (error.name === 'BulkWriteError' || error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate task entry or write error',
        error: error.message
      });
    }
    
    // Handle our custom errors
    if (error.message) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating tasks',
      error: error.message
    });
  }
};

// Update task
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Updating task with ID: ${id}`);
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found for update: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    // Remove id fields
    const { _id, id: reqId, ...updateData } = req.body;
    
    // Handle assignedUsers update
    if (updateData.assignedUsers && Array.isArray(updateData.assignedUsers)) {
      task.assignedUsers = updateData.assignedUsers;
    } else if (updateData.assignedTo && updateData.assignedToName) {
      // Convert single assignee to assignedUsers
      task.assignedUsers = [{
        userId: updateData.assignedTo,
        name: updateData.assignedToName,
        role: updateData.assignedToRole || 'employee',
        assignedAt: new Date(),
        status: 'pending'
      }];
    }
    
    // Update other task fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'assignedUsers' && key !== 'assignedTo' && key !== 'assignedToName') {
        (task as any)[key] = updateData[key];
      }
    });
    
    await task.save();
    
    console.log(`✅ Task updated successfully: ${task.title}`);
    
    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating task', 
      error: error.message 
    });
  }
};

// Delete task
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting task with ID: ${id}`);
    
    const task = await Task.findByIdAndDelete(id);
    
    if (!task) {
      console.log(`❌ Task not found for deletion: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    console.log(`✅ Task deleted successfully: ${task.title}`);
    
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      task
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting task', 
      error: error.message 
    });
  }
};

// Update task status - UPDATED to handle multiple assignees
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, userId } = req.body; // Optional userId for individual status update
    
    console.log(`🔄 Updating task status for ID: ${id} to ${status}${userId ? ` for user ${userId}` : ''}`);
    
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    if (userId) {
      // Update individual user's status
      const updated = task.updateUserStatus(userId, status);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'User not found in assigned users'
        });
      }
    } else {
      // Update overall status
      task.status = status;
      
      // Also update all users' individual statuses to match
      task.assignedUsers = task.assignedUsers.map(user => ({
        ...user,
        status: status
      }));
    }
    
    await task.save();
    
    console.log(`✅ Task status updated: ${task.title} is now ${status}`);
    
    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      task
    });
  } catch (error: any) {
    console.error('Error updating task status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating task status', 
      error: error.message 
    });
  }
};

// Add hourly update to task
export const addHourlyUpdate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, submittedBy } = req.body;
    
    console.log(`📝 Adding hourly update to task ID: ${id}`);
    
    if (!content || !submittedBy) {
      return res.status(400).json({
        success: false,
        message: 'Content and submittedBy are required'
      });
    }
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    const newUpdate = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      content: String(content).trim(),
      submittedBy: String(submittedBy).trim()
    };
    
    task.hourlyUpdates.push(newUpdate);
    await task.save();
    
    console.log(`✅ Hourly update added to task: ${task.title}`);
    
    res.status(200).json({
      success: true,
      message: 'Hourly update added successfully',
      update: newUpdate,
      task
    });
  } catch (error: any) {
    console.error('Error adding hourly update:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding hourly update', 
      error: error.message 
    });
  }
};

// Add attachment to task
export const addAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { filename, url, size, type } = req.body;
    
    console.log(`📎 Adding attachment to task ID: ${id}`);
    
    if (!filename || !url) {
      return res.status(400).json({
        success: false,
        message: 'Filename and URL are required'
      });
    }
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    const newAttachment = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      filename: String(filename).trim(),
      url: String(url).trim(),
      uploadedAt: new Date(),
      size: size || 0,
      type: type || 'application/octet-stream'
    };
    
    task.attachments.push(newAttachment);
    await task.save();
    
    console.log(`✅ Attachment added to task: ${task.title}`);
    
    res.status(200).json({
      success: true,
      message: 'Attachment added successfully',
      attachment: newAttachment,
      task
    });
  } catch (error: any) {
    console.error('Error adding attachment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding attachment', 
      error: error.message 
    });
  }
};

// Delete attachment from task
export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { id, attachmentId } = req.params;
    
    console.log(`🗑️ Deleting attachment ${attachmentId} from task ID: ${id}`);
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    const initialLength = task.attachments.length;
    task.attachments = task.attachments.filter(att => att.id !== attachmentId);
    
    if (task.attachments.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }
    
    await task.save();
    
    console.log(`✅ Attachment deleted from task: ${task.title}`);
    
    res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
      task
    });
  } catch (error: any) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting attachment', 
      error: error.message 
    });
  }
};

// Get task statistics - UPDATED for multiple assignees
export const getTaskStats = async (req: Request, res: Response) => {
  try {
    console.log('📊 Getting task statistics');
    
    const stats = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          highPriority: {
            $sum: {
              $cond: [{ $eq: ['$priority', 'high'] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    // Get tasks grouped by assignee (using assignedUsers array)
    const tasksByAssignee = await Task.aggregate([
      { $unwind: '$assignedUsers' },
      {
        $group: {
          _id: '$assignedUsers.userId',
          count: { $sum: 1 },
          name: { $first: '$assignedUsers.name' },
          role: { $first: '$assignedUsers.role' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get counts by role
    const tasksByRole = await Task.aggregate([
      { $unwind: '$assignedUsers' },
      {
        $group: {
          _id: '$assignedUsers.role',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$assignedUsers.userId' }
        }
      }
    ]);
    
    const totalTasks = await Task.countDocuments();
    const totalAssignees = await Task.aggregate([
      { $unwind: '$assignedUsers' },
      { $group: { _id: '$assignedUsers.userId' } },
      { $count: 'total' }
    ]);
    
    console.log(`📊 Statistics: ${totalTasks} tasks, ${totalAssignees[0]?.total || 0} assignees`);
    
    res.status(200).json({
      stats,
      tasksByAssignee,
      tasksByRole,
      totalTasks,
      totalAssignees: totalAssignees[0]?.total || 0
    });
  } catch (error: any) {
    console.error('Error fetching task statistics:', error);
    res.status(500).json({ 
      message: 'Error fetching task statistics', 
      error: error.message 
    });
  }
};

// Search tasks - UPDATED for multiple assignees
export const searchTasks = async (req: Request, res: Response) => {
  try {
    const { query, status, priority, siteId, assignedTo } = req.query;
    console.log(`🔍 Searching tasks with query: "${query}"`);
    
    let filter: any = {};
    
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'assignedUsers.name': { $regex: query, $options: 'i' } },
        { siteName: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (siteId) filter.siteId = siteId;
    if (assignedTo) filter['assignedUsers.userId'] = assignedTo;
    
    const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();
    
    console.log(`🔍 Found ${tasks.length} tasks matching search`);
    
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('Error searching tasks:', error);
    res.status(500).json({ 
      message: 'Error searching tasks', 
      error: error.message 
    });
  }
};

// Get assignees (managers and supervisors)
export const getAssignees = async (req: Request, res: Response) => {
  try {
    console.log('👥 Fetching assignees (managers and supervisors)');
    
    const { role } = req.query;
    
    let filter: any = { 
      isActive: true,
      role: { $in: ['manager', 'supervisor'] }
    };
    
    if (role) {
      filter.role = role;
    }
    
    const assignees = await User.find(filter)
      .select('_id name email phone role department assignedSites')
      .sort({ name: 1 })
      .lean();
    
    console.log(`✅ Found ${assignees.length} assignees`);
    
    res.status(200).json(assignees);
  } catch (error: any) {
    console.error('❌ Error fetching assignees:', error);
    res.status(500).json({ 
      message: 'Error fetching assignees', 
      error: error.message 
    });
  }
};

// Get tasks by assignee - UPDATED for multiple assignees
export const getTasksByAssignee = async (req: Request, res: Response) => {
  try {
    const { assigneeId } = req.params;
    console.log(`📋 Fetching tasks for assignee: ${assigneeId}`);
    
    const tasks = await Task.find({ 'assignedUsers.userId': assigneeId })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`✅ Found ${tasks.length} tasks for assignee ${assigneeId}`);
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('❌ Error fetching tasks by assignee:', error);
    res.status(500).json({ 
      message: 'Error fetching tasks by assignee', 
      error: error.message 
    });
  }
};

// Get tasks by creator
export const getTasksByCreator = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    console.log(`📋 Fetching tasks created by: ${creatorId}`);
    
    const tasks = await Task.find({ createdBy: creatorId })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`✅ Found ${tasks.length} tasks created by ${creatorId}`);
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('❌ Error fetching tasks by creator:', error);
    res.status(500).json({ 
      message: 'Error fetching tasks by creator', 
      error: error.message 
    });
  }
};

// Get tasks by site
export const getTasksBySite = async (req: Request, res: Response) => {
  try {
    const { siteName } = req.params;
    console.log(`📋 Fetching tasks for site: ${siteName}`);
    
    const tasks = await Task.find({ siteName: siteName })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`✅ Found ${tasks.length} tasks for site ${siteName}`);
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('❌ Error fetching tasks by site:', error);
    res.status(500).json({ 
      message: 'Error fetching tasks by site', 
      error: error.message 
    });
  }
};

// Get supervisors by site - NEW function to track supervisor assignments
export const getSupervisorsBySite = async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching supervisors by site');
    
    const tasks = await Task.find({ 'assignedUsers.role': 'supervisor' })
      .select('siteId siteName assignedUsers')
      .lean();
    
    const siteToSupervisors = new Map();
    
    tasks.forEach(task => {
      const supervisors = task.assignedUsers.filter((user: any) => user.role === 'supervisor');
      
      supervisors.forEach((supervisor: any) => {
        if (!siteToSupervisors.has(task.siteId)) {
          siteToSupervisors.set(task.siteId, new Set());
        }
        siteToSupervisors.get(task.siteId).add(supervisor.userId);
      });
    });
    
    // Convert Sets to Arrays for JSON response
    const result: any = {};
    siteToSupervisors.forEach((value, key) => {
      result[key] = Array.from(value);
    });
    
    console.log(`✅ Found supervisors for ${siteToSupervisors.size} sites`);
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error('❌ Error fetching supervisors by site:', error);
    res.status(500).json({ 
      message: 'Error fetching supervisors by site', 
      error: error.message 
    });
  }
};