import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHourlyUpdate {
  id: string;
  timestamp: Date;
  content: string;
  submittedBy: string; // User ID
}

export interface IAttachment {
  id: string;
  filename: string;
  url: string;
  uploadedAt: Date;
  size: number;
  type: string;
}

export interface IAssignedUser {
  userId: string;
  name: string;
  role: 'manager' | 'supervisor' | 'employee';
  assignedAt: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'; // Individual status
}

// Define methods interface
export interface ITaskMethods {
  isUserAssigned(userId: string): boolean;
  getUserStatus(userId: string): string | null;
  updateUserStatus(userId: string, newStatus: string): boolean;
  updateOverallStatus(): void;
}

// Combine with Document
export interface ITask extends Document, ITaskMethods {
  title: string;
  description: string;
  assignedUsers: IAssignedUser[];
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  deadline: Date;
  dueDateTime: Date;
  siteId: string;
  siteName: string;
  clientName: string;
  taskType?: string;
  attachments: IAttachment[];
  hourlyUpdates: IHourlyUpdate[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the model type
export interface ITaskModel extends Model<ITask, {}, ITaskMethods> {}

const AttachmentSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  size: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  }
}, { _id: false });

const HourlyUpdateSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  content: {
    type: String,
    required: true
  },
  submittedBy: {
    type: String,
    required: true
  }
}, { _id: false });

const AssignedUserSchema = new Schema({
  userId: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['manager', 'supervisor', 'employee'],
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  }
}, { _id: false });

const TaskSchema: Schema<ITask, ITaskModel> = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Task title must be at least 3 characters']
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true,
      minlength: [10, 'Task description must be at least 10 characters']
    },
   // In Task model (Task.ts), update the assignedUsers validation (around line 78)

assignedUsers: {
  type: [AssignedUserSchema],
  default: [],
  validate: {
    validator: function(users: IAssignedUser[]) {
      // Allow empty array for templates and fully staffed sites
      return true; // Remove the requirement for at least one assignee
    },
    message: 'At least one assignee is required'
  }
},
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
      required: true
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
      validate: {
        validator: function(value: Date) {
          return value instanceof Date && !isNaN(value.getTime());
        },
        message: 'Invalid deadline date'
      }
    },
    dueDateTime: {
      type: Date,
      required: [true, 'Due date and time is required'],
      validate: {
        validator: function(value: Date) {
          return value instanceof Date && !isNaN(value.getTime());
        },
        message: 'Invalid due date and time'
      }
    },
    siteId: {
      type: String,
      required: [true, 'Site ID is required'],
      trim: true
    },
    siteName: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true
    },
    taskType: {
      type: String,
      enum: ['inspection', 'maintenance', 'training', 'audit', 'emergency', 'routine', 'safety', 'equipment', 'general', 'other'],
      default: 'general'
    },
    attachments: {
      type: [AttachmentSchema],
      default: []
    },
    hourlyUpdates: {
      type: [HourlyUpdateSchema],
      default: []
    },
    createdBy: {
      type: String,
      required: [true, 'Creator ID is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
TaskSchema.index({ 'assignedUsers.userId': 1 });
TaskSchema.index({ siteId: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ deadline: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ createdAt: -1 });

// Virtual for formatted due date
TaskSchema.virtual('formattedDueDate').get(function(this: ITask) {
  return this.dueDateTime.toLocaleString();
});

// Virtual for formatted deadline
TaskSchema.virtual('formattedDeadline').get(function(this: ITask) {
  return this.deadline.toLocaleDateString();
});

// Virtual to get assigned user names as comma-separated string
TaskSchema.virtual('assignedUserNames').get(function(this: ITask) {
  return this.assignedUsers.map(user => user.name).join(', ');
});

// Virtual to get assigned user IDs as array
TaskSchema.virtual('assignedUserIds').get(function(this: ITask) {
  return this.assignedUsers.map(user => user.userId);
});

// Method to check if a specific user is assigned
TaskSchema.methods.isUserAssigned = function(userId: string): boolean {
  return this.assignedUsers.some((user: IAssignedUser) => user.userId === userId);
};

// Method to get user's individual status
TaskSchema.methods.getUserStatus = function(userId: string): string | null {
  const user = this.assignedUsers.find((u: IAssignedUser) => u.userId === userId);
  return user ? user.status : null;
};

// Method to update user's individual status
TaskSchema.methods.updateUserStatus = function(userId: string, newStatus: string): boolean {
  const userIndex = this.assignedUsers.findIndex((u: IAssignedUser) => u.userId === userId);
  if (userIndex === -1) return false;
  
  this.assignedUsers[userIndex].status = newStatus;
  
  // Update overall status based on all users' statuses
  this.updateOverallStatus();
  
  return true;
};

// Method to update overall status based on all users' statuses
TaskSchema.methods.updateOverallStatus = function() {
  const allCompleted = this.assignedUsers.every((user: IAssignedUser) => user.status === 'completed');
  const anyInProgress = this.assignedUsers.some((user: IAssignedUser) => user.status === 'in-progress');
  const anyCancelled = this.assignedUsers.some((user: IAssignedUser) => user.status === 'cancelled');
  
  if (allCompleted) {
    this.status = 'completed';
  } else if (anyCancelled) {
    this.status = 'cancelled';
  } else if (anyInProgress) {
    this.status = 'in-progress';
  } else {
    this.status = 'pending';
  }
};

// Pre-save middleware to ensure overall status consistency
TaskSchema.pre('save', function(next) {
  if (this.assignedUsers && this.assignedUsers.length > 0) {
    this.updateOverallStatus();
  }
  next();
});

export default mongoose.model<ITask, ITaskModel>('Task', TaskSchema);