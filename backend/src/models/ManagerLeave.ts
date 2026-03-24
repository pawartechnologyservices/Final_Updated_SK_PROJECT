import mongoose, { Schema, Document } from 'mongoose';

export type ManagerLeaveType = 'annual' | 'sick' | 'casual' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid' | 'other';
export type ManagerLeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface IManagerLeave extends Document {
  // Manager information (stored separately, not validated against Employee collection)
  managerId: string;
  managerName: string;
  managerDepartment: string;
  managerPosition: string;
  managerEmail: string;
  managerContact: string;
  
  // Leave information
  leaveType: ManagerLeaveType;
  fromDate: Date;
  toDate: Date;
  totalDays: number;
  reason: string;
  
  // Application details
  appliedBy: string;
  appliedDate: Date;
  
  // Status tracking
  status: ManagerLeaveStatus;
  remarks?: string;
  
  // Approval/Rejection info (by admin)
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  adminRemarks?: string;
  
  // Approval/Rejection info (by superadmin)
  approvedBySuperadmin?: string;
  approvedAtSuperadmin?: Date;
  rejectedBySuperadmin?: string;
  rejectedAtSuperadmin?: Date;
  superadminRemarks?: string;
  
  // Cancellation
  cancellationReason?: string;
  
  // System tracking
  requestType: 'manager-leave';
  createdAt: Date;
  updatedAt: Date;
}

const ManagerLeaveSchema: Schema = new Schema({
  // Manager information - NO validation against Employee collection
  managerId: {
    type: String,
    required: [true, 'Manager ID is required'],
    index: true,
    trim: true
  },
  managerName: {
    type: String,
    required: [true, 'Manager name is required'],
    trim: true
  },
  managerDepartment: {
    type: String,
    required: [true, 'Manager department is required'],
    index: true,
    trim: true
  },
  managerPosition: {
    type: String,
    default: 'Manager',
    trim: true
  },
  managerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  managerContact: {
    type: String,
    required: [true, 'Manager contact number is required'],
    trim: true
  },
  
  // Leave information
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'casual', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other'],
    required: [true, 'Leave type is required']
  },
  fromDate: {
    type: Date,
    required: [true, 'From date is required']
  },
  toDate: {
    type: Date,
    required: [true, 'To date is required']
  },
  totalDays: {
    type: Number,
    required: [true, 'Total days is required'],
    min: [0.5, 'Total days must be at least 0.5'],
    max: [90, 'Total days cannot exceed 90']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true
  },
  
  // Application details
  appliedBy: {
    type: String,
    required: [true, 'Applied by is required'],
    trim: true
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  remarks: {
    type: String,
    trim: true
  },
  
  // Approval/Rejection by admin
  approvedBy: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: String,
    trim: true
  },
  rejectedAt: {
    type: Date
  },
  adminRemarks: {
    type: String,
    trim: true
  },
  
  // Approval/Rejection by superadmin
  approvedBySuperadmin: {
    type: String,
    trim: true
  },
  approvedAtSuperadmin: {
    type: Date
  },
  rejectedBySuperadmin: {
    type: String,
    trim: true
  },
  rejectedAtSuperadmin: {
    type: Date
  },
  superadminRemarks: {
    type: String,
    trim: true
  },
  
  // Cancellation
  cancellationReason: {
    type: String,
    trim: true
  },
  
  // System tracking
  requestType: {
    type: String,
    default: 'manager-leave',
    enum: ['manager-leave']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
ManagerLeaveSchema.index({ managerId: 1, status: 1 });
ManagerLeaveSchema.index({ managerDepartment: 1, status: 1 });
ManagerLeaveSchema.index({ appliedDate: -1 });
ManagerLeaveSchema.index({ requestType: 1 });
ManagerLeaveSchema.index({ status: 1, appliedDate: -1 });
ManagerLeaveSchema.index({ managerId: 1, fromDate: 1, toDate: 1 });

const ManagerLeave = mongoose.model<IManagerLeave>('ManagerLeave', ManagerLeaveSchema);

export default ManagerLeave;