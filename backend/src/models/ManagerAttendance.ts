// models/ManagerAttendance.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IManagerAttendance extends Document {
  managerId: string;
  managerName: string;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  breakStartTime: Date | null;
  breakEndTime: Date | null;
  totalHours: number;
  breakTime: number;
  isCheckedIn: boolean;
  isOnBreak: boolean;
  date: string;
  hasCheckedOutToday: boolean;
  dailyActivities: Array<{
    type: string;
    title: string;
    details: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ManagerAttendanceSchema = new Schema({
  managerId: {
    type: String,
    required: true,
    index: true
  },
  managerName: {
    type: String,
    required: true
  },
  checkInTime: {
    type: Date,
    default: null
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  checkInPhoto: {
    type: String,
    default: null
  },
  checkOutPhoto: {
    type: String,
    default: null
  },
  breakStartTime: {
    type: Date,
    default: null
  },
  breakEndTime: {
    type: Date,
    default: null
  },
  totalHours: {
    type: Number,
    default: 0,
    min: 0
  },
  breakTime: {
    type: Number,
    default: 0,
    min: 0
  },
  isCheckedIn: {
    type: Boolean,
    default: false
  },
  isOnBreak: {
    type: Boolean,
    default: false
  },
  date: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  },
  hasCheckedOutToday: {
    type: Boolean,
    default: false
  },
  dailyActivities: [{
    type: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    details: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound index - only allow one attendance record per manager per day
ManagerAttendanceSchema.index({ managerId: 1, date: 1 }, { unique: true });

export default mongoose.model<IManagerAttendance>('ManagerAttendance', ManagerAttendanceSchema);