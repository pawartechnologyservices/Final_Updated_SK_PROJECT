import mongoose, { Schema, Document } from 'mongoose';

export type AdminLeaveType = 'annual' | 'sick' | 'casual' | 'emergency' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid' | 'other';
export type AdminLeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface IAdminLeave extends Document {
  // Admin information (stored separately, no validation)
  adminId: string;
  adminName: string;
  adminDepartment: string;
  adminPosition: string;
  adminEmail: string;
  adminContact: string;
  
  // Leave information
  leaveType: AdminLeaveType;
  fromDate: Date;
  toDate: Date;
  totalDays: number;
  reason: string;
  
  // Application details
  appliedBy: string;
  appliedDate: Date;
  
  // Status tracking
  status: AdminLeaveStatus;
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
  requestType: 'admin-leave';
  createdAt: Date;
  updatedAt: Date;
}

const AdminLeaveSchema: Schema = new Schema({
  adminId: {
    type: String,
    required: [true, 'Admin ID is required'],
    index: true,
    trim: true
  },
  adminName: {
    type: String,
    required: [true, 'Admin name is required'],
    trim: true
  },
  adminDepartment: {
    type: String,
    required: [true, 'Admin department is required'],
    index: true,
    trim: true
  },
  adminPosition: {
    type: String,
    default: 'Admin',
    trim: true
  },
  adminEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  adminContact: {
    type: String,
    required: [true, 'Admin contact number is required'],
    trim: true
  },
  
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'casual', 'emergency', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other'],
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
  
  appliedBy: {
    type: String,
    required: [true, 'Applied by is required'],
    trim: true
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  
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
  
  cancellationReason: {
    type: String,
    trim: true
  },
  
  requestType: {
    type: String,
    default: 'admin-leave',
    enum: ['admin-leave']
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
AdminLeaveSchema.index({ adminId: 1, status: 1 });
AdminLeaveSchema.index({ adminDepartment: 1, status: 1 });
AdminLeaveSchema.index({ appliedDate: -1 });
AdminLeaveSchema.index({ requestType: 1 });
AdminLeaveSchema.index({ status: 1, appliedDate: -1 });

const AdminLeave = mongoose.model<IAdminLeave>('AdminLeave', AdminLeaveSchema);

export default AdminLeave;