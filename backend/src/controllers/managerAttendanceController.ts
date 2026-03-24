// controllers/managerAttendanceController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import ManagerAttendance, { IManagerAttendance } from '../models/ManagerAttendance';
import { uploadAttendancePhoto } from '../utils/CloudinaryUtils';

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to calculate time difference in hours
const calculateHours = (startTime: Date | null, endTime: Date | null): number => {
  if (!startTime || !endTime) return 0;
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
};

// Helper function to format break duration
const formatBreakDuration = (hours: number): string => {
  if (!hours || hours === 0) return '0m';
  
  const totalMinutes = Math.round(hours * 60);
  const hoursPart = Math.floor(totalMinutes / 60);
  const minutesPart = totalMinutes % 60;
  
  if (hoursPart > 0 && minutesPart > 0) {
    return `${hoursPart}h ${minutesPart}m`;
  } else if (hoursPart > 0) {
    return `${hoursPart}h`;
  } else {
    return `${minutesPart}m`;
  }
};

// Health check endpoint
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    await ManagerAttendance.findOne().limit(1);
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Manager Attendance API',
      database: 'Connected'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'Manager Attendance API',
      database: 'Disconnected',
      error: error.message
    });
  }
};

// Check in manager with photo
export const checkInWithPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { managerId, managerName } = req.body;
    const photoFile = req.file;
    
    console.log('📸 Check-in with photo request:', { managerId, managerName, hasPhoto: !!photoFile });
    
    if (!managerId || !managerName) {
      res.status(400).json({
        success: false,
        message: 'Manager ID and name are required'
      });
      return;
    }

    if (!photoFile) {
      res.status(400).json({
        success: false,
        message: 'Photo is required for check-in'
      });
      return;
    }

    const todayDateStr = getTodayDateString();
    const checkInTime = new Date();
    
    let attendance = await ManagerAttendance.findOne({
      managerId,
      date: todayDateStr
    });

    if (attendance && attendance.hasCheckedOutToday) {
      res.status(400).json({
        success: false,
        message: 'You have already checked out for today. Cannot check in again.'
      });
      return;
    }

    if (attendance && attendance.isCheckedIn) {
      res.status(400).json({
        success: false,
        message: 'You are already checked in for today.'
      });
      return;
    }

    // Upload photo to Cloudinary
    let photoUrl = '';
    try {
      const uploadResult = await uploadAttendancePhoto(
        photoFile.buffer,
        managerId,
        managerName,
        'checkin'
      );
      photoUrl = uploadResult.secure_url;
      console.log('✅ Photo uploaded to Cloudinary:', photoUrl);
    } catch (uploadError: any) {
      console.error('❌ Photo upload error:', uploadError);
      res.status(500).json({
        success: false,
        message: `Failed to upload photo: ${uploadError.message}`
      });
      return;
    }

    try {
      if (!attendance) {
        attendance = new ManagerAttendance({
          managerId,
          managerName,
          checkInTime,
          checkInPhoto: photoUrl,
          isCheckedIn: true,
          date: todayDateStr,
          hasCheckedOutToday: false,
          dailyActivities: [{
            type: 'checkin',
            title: 'Checked in with photo',
            details: `Checked in at ${checkInTime.toLocaleTimeString()} with photo verification`,
            timestamp: checkInTime
          }]
        });
      } else {
        attendance.checkInTime = checkInTime;
        attendance.checkInPhoto = photoUrl;
        attendance.isCheckedIn = true;
        attendance.checkOutTime = null;
        attendance.hasCheckedOutToday = false;
        attendance.dailyActivities.push({
          type: 'checkin',
          title: 'Checked in with photo',
          details: `Checked in at ${checkInTime.toLocaleTimeString()} with photo verification`,
          timestamp: checkInTime
        });
      }

      await attendance.save();
      console.log('✅ Check-in saved to MongoDB:', attendance._id);

      res.status(200).json({
        success: true,
        message: 'Successfully checked in with photo!',
        data: {
          _id: attendance._id,
          managerId: attendance.managerId,
          managerName: attendance.managerName,
          checkInTime: attendance.checkInTime,
          checkInPhoto: attendance.checkInPhoto,
          isCheckedIn: attendance.isCheckedIn,
          date: attendance.date,
          hasCheckedOutToday: attendance.hasCheckedOutToday
        }
      });
    } catch (saveError: any) {
      console.error('❌ Save error:', saveError);
      
      if (saveError.code === 11000) {
        const existingAttendance = await ManagerAttendance.findOne({
          managerId,
          date: todayDateStr
        });
        
        if (existingAttendance) {
          res.status(400).json({
            success: false,
            message: existingAttendance.isCheckedIn 
              ? 'You are already checked in for today.'
              : 'You have already checked out for today.',
            data: existingAttendance
          });
          return;
        }
      }
      
      res.status(500).json({
        success: false,
        message: 'Error saving attendance record',
        error: saveError.message
      });
    }
  } catch (error: any) {
    console.error('❌ Check-in error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking in'
    });
  }
};

// Check out manager with photo
export const checkOutWithPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { managerId } = req.body;
    const photoFile = req.file;
    
    console.log('📸 Check-out with photo request:', { managerId, hasPhoto: !!photoFile });
    
    if (!managerId) {
      res.status(400).json({
        success: false,
        message: 'Manager ID is required'
      });
      return;
    }

    if (!photoFile) {
      res.status(400).json({
        success: false,
        message: 'Photo is required for check-out'
      });
      return;
    }

    const todayDateStr = getTodayDateString();
    
    const attendance = await ManagerAttendance.findOne({
      managerId,
      date: todayDateStr
    });

    if (!attendance) {
      res.status(404).json({
        success: false,
        message: 'No check-in record found for today'
      });
      return;
    }

    if (!attendance.isCheckedIn) {
      res.status(400).json({
        success: false,
        message: 'You are not currently checked in'
      });
      return;
    }

    if (attendance.isOnBreak) {
      res.status(400).json({
        success: false,
        message: 'Please end your break before checking out'
      });
      return;
    }

    // Upload photo to Cloudinary
    let photoUrl = '';
    try {
      const uploadResult = await uploadAttendancePhoto(
        photoFile.buffer,
        managerId,
        attendance.managerName,
        'checkout'
      );
      photoUrl = uploadResult.secure_url;
      console.log('✅ Photo uploaded to Cloudinary:', photoUrl);
    } catch (uploadError: any) {
      console.error('❌ Photo upload error:', uploadError);
      res.status(500).json({
        success: false,
        message: `Failed to upload photo: ${uploadError.message}`
      });
      return;
    }

    const checkOutTime = new Date();
    const checkInTime = attendance.checkInTime || new Date();
    
    let totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    totalHours -= attendance.breakTime;

    attendance.checkOutTime = checkOutTime;
    attendance.checkOutPhoto = photoUrl;
    attendance.totalHours = parseFloat(totalHours.toFixed(2));
    attendance.isCheckedIn = false;
    attendance.hasCheckedOutToday = true;
    attendance.dailyActivities.push({
      type: 'checkout',
      title: 'Checked out with photo',
      details: `Checked out at ${checkOutTime.toLocaleTimeString()} with photo verification - Total: ${totalHours.toFixed(2)}h (Break: ${attendance.breakTime.toFixed(2)}h)`,
      timestamp: checkOutTime
    });

    await attendance.save();
    console.log('✅ Check-out saved to MongoDB:', attendance._id);

    res.status(200).json({
      success: true,
      message: 'Successfully checked out with photo!',
      data: {
        _id: attendance._id,
        managerId: attendance.managerId,
        managerName: attendance.managerName,
        checkOutTime: attendance.checkOutTime,
        checkOutPhoto: attendance.checkOutPhoto,
        totalHours: attendance.totalHours,
        isCheckedIn: attendance.isCheckedIn,
        hasCheckedOutToday: attendance.hasCheckedOutToday
      }
    });
  } catch (error: any) {
    console.error('❌ Check-out error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking out'
    });
  }
};

// Regular check in (without photo)
export const checkIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { managerId, managerName } = req.body;
    
    if (!managerId || !managerName) {
      res.status(400).json({
        success: false,
        message: 'Manager ID and name are required'
      });
      return;
    }

    const todayDateStr = getTodayDateString();
    const checkInTime = new Date();
    
    let attendance = await ManagerAttendance.findOne({
      managerId,
      date: todayDateStr
    });

    if (attendance && attendance.hasCheckedOutToday) {
      res.status(400).json({
        success: false,
        message: 'You have already checked out for today. Cannot check in again.'
      });
      return;
    }

    if (attendance && attendance.isCheckedIn) {
      res.status(400).json({
        success: false,
        message: 'You are already checked in for today.'
      });
      return;
    }

    try {
      if (!attendance) {
        attendance = new ManagerAttendance({
          managerId,
          managerName,
          checkInTime,
          isCheckedIn: true,
          date: todayDateStr,
          hasCheckedOutToday: false,
          dailyActivities: [{
            type: 'checkin',
            title: 'Checked in',
            details: `Checked in at ${checkInTime.toLocaleTimeString()}`,
            timestamp: checkInTime
          }]
        });
      } else {
        attendance.checkInTime = checkInTime;
        attendance.isCheckedIn = true;
        attendance.checkOutTime = null;
        attendance.hasCheckedOutToday = false;
        attendance.dailyActivities.push({
          type: 'checkin',
          title: 'Checked in',
          details: `Checked in at ${checkInTime.toLocaleTimeString()}`,
          timestamp: checkInTime
        });
      }

      await attendance.save();

      res.status(200).json({
        success: true,
        message: 'Successfully checked in!',
        data: attendance
      });
    } catch (saveError: any) {
      console.error('Save error:', saveError);
      
      if (saveError.code === 11000) {
        const existingAttendance = await ManagerAttendance.findOne({
          managerId,
          date: todayDateStr
        });
        
        if (existingAttendance) {
          res.status(400).json({
            success: false,
            message: existingAttendance.isCheckedIn 
              ? 'You are already checked in for today.'
              : 'You have already checked out for today.',
            data: existingAttendance
          });
          return;
        }
      }
      
      res.status(500).json({
        success: false,
        message: 'Error saving attendance record',
        error: saveError.message
      });
    }
  } catch (error: any) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking in'
    });
  }
};

// Regular check out (without photo)
export const checkOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const { managerId } = req.body;
    
    if (!managerId) {
      res.status(400).json({
        success: false,
        message: 'Manager ID is required'
      });
      return;
    }

    const todayDateStr = getTodayDateString();
    
    const attendance = await ManagerAttendance.findOne({
      managerId,
      date: todayDateStr
    });

    if (!attendance) {
      res.status(404).json({
        success: false,
        message: 'No check-in record found for today'
      });
      return;
    }

    if (!attendance.isCheckedIn) {
      res.status(400).json({
        success: false,
        message: 'You are not currently checked in'
      });
      return;
    }

    if (attendance.isOnBreak) {
      res.status(400).json({
        success: false,
        message: 'Please end your break before checking out'
      });
      return;
    }

    const checkOutTime = new Date();
    const checkInTime = attendance.checkInTime || new Date();
    
    let totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    totalHours -= attendance.breakTime;

    attendance.checkOutTime = checkOutTime;
    attendance.totalHours = parseFloat(totalHours.toFixed(2));
    attendance.isCheckedIn = false;
    attendance.hasCheckedOutToday = true;
    attendance.dailyActivities.push({
      type: 'checkout',
      title: 'Checked out',
      details: `Checked out at ${checkOutTime.toLocaleTimeString()} - Total: ${totalHours.toFixed(2)}h (Break: ${attendance.breakTime.toFixed(2)}h)`,
      timestamp: checkOutTime
    });

    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Successfully checked out!',
      data: attendance
    });
  } catch (error: any) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking out'
    });
  }
};

// Break in manager
export const breakIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { managerId } = req.body;
    
    if (!managerId) {
      res.status(400).json({
        success: false,
        message: 'Manager ID is required'
      });
      return;
    }

    const todayDateStr = getTodayDateString();
    
    const attendance = await ManagerAttendance.findOne({
      managerId,
      date: todayDateStr
    });

    if (!attendance) {
      res.status(404).json({
        success: false,
        message: 'No check-in record found for today'
      });
      return;
    }

    if (!attendance.isCheckedIn) {
      res.status(400).json({
        success: false,
        message: 'You must be checked in to take a break'
      });
      return;
    }

    if (attendance.isOnBreak) {
      res.status(400).json({
        success: false,
        message: 'Already on break'
      });
      return;
    }

    const breakStartTime = new Date();
    
    attendance.breakStartTime = breakStartTime;
    attendance.isOnBreak = true;
    attendance.dailyActivities.push({
      type: 'break',
      title: 'Break started',
      details: `Started break at ${breakStartTime.toLocaleTimeString()}`,
      timestamp: breakStartTime
    });

    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Break started successfully!',
      data: attendance
    });
  } catch (error: any) {
    console.error('Break-in error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error starting break'
    });
  }
};

// Break out manager
export const breakOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const { managerId } = req.body;
    
    if (!managerId) {
      res.status(400).json({
        success: false,
        message: 'Manager ID is required'
      });
      return;
    }

    const todayDateStr = getTodayDateString();
    
    const attendance = await ManagerAttendance.findOne({
      managerId,
      date: todayDateStr
    });

    if (!attendance) {
      res.status(404).json({
        success: false,
        message: 'No check-in record found for today'
      });
      return;
    }

    if (!attendance.isOnBreak) {
      res.status(400).json({
        success: false,
        message: 'Not currently on break'
      });
      return;
    }

    if (!attendance.breakStartTime) {
      res.status(400).json({
        success: false,
        message: 'Break start time not found'
      });
      return;
    }

    const breakEndTime = new Date();
    const breakStartTime = attendance.breakStartTime;
    
    const breakDuration = (breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60 * 60);
    const newBreakTime = attendance.breakTime + parseFloat(breakDuration.toFixed(2));
    
    attendance.breakEndTime = breakEndTime;
    attendance.breakTime = newBreakTime;
    attendance.isOnBreak = false;
    attendance.dailyActivities.push({
      type: 'break',
      title: 'Break ended',
      details: `Ended break at ${breakEndTime.toLocaleTimeString()} - Duration: ${breakDuration.toFixed(2)}h (Total breaks: ${newBreakTime.toFixed(2)}h)`,
      timestamp: breakEndTime
    });

    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Break ended successfully!',
      data: attendance
    });
  } catch (error: any) {
    console.error('Break-out error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error ending break'
    });
  }
};

// Get today's attendance status
export const getTodayStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { managerId } = req.params;
    
    if (!managerId) {
      res.status(400).json({
        success: false,
        message: 'Manager ID is required'
      });
      return;
    }

    const todayDateStr = getTodayDateString();
    
    const attendance = await ManagerAttendance.findOne({
      managerId,
      date: todayDateStr
    });

    if (!attendance) {
      res.status(200).json({
        success: true,
        data: null,
        message: 'No attendance record for today'
      });
      return;
    }

    // Return full attendance data including photos
    res.status(200).json({
      success: true,
      data: {
        _id: attendance._id,
        managerId: attendance.managerId,
        managerName: attendance.managerName,
        isCheckedIn: attendance.isCheckedIn,
        isOnBreak: attendance.isOnBreak,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        checkInPhoto: attendance.checkInPhoto,
        checkOutPhoto: attendance.checkOutPhoto,
        breakStartTime: attendance.breakStartTime,
        breakEndTime: attendance.breakEndTime,
        totalHours: attendance.totalHours,
        breakTime: attendance.breakTime,
        date: attendance.date,
        hasCheckedOutToday: attendance.hasCheckedOutToday
      }
    });
  } catch (error: any) {
    console.error('Get today status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching today\'s status'
    });
  }
};

// Get month summary with photos
export const getMonthSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { managerId } = req.params;
    const { month, year } = req.query;
    
    if (!managerId) {
      res.status(400).json({
        success: false,
        message: 'Manager ID is required'
      });
      return;
    }

    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    const records = await ManagerAttendance.find({
      managerId,
      date: {
        $gte: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
        $lte: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
      }
    }).sort({ date: 1 });

    const dailyRecords = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(dateStr);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const record = records.find(r => r.date === dateStr);

      if (record) {
        let status = 'Absent';
        if (record.checkOutTime) {
          status = 'Present';
          if (record.checkInTime) {
            const checkInHour = record.checkInTime.getHours();
            const checkInMinute = record.checkInTime.getMinutes();
            if (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 30)) {
              status = 'Late';
            }
          }
          if (record.totalHours < 4) {
            status = 'Half Day';
          }
        } else if (record.isCheckedIn) {
          status = 'Checked In';
        }

        dailyRecords.push({
          date: dateStr,
          day: dayOfWeek,
          checkIn: record.checkInTime ? record.checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          checkOut: record.checkOutTime ? record.checkOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          checkInPhoto: record.checkInPhoto || null,
          checkOutPhoto: record.checkOutPhoto || null,
          status: status,
          totalHours: record.totalHours.toFixed(1),
          breakTime: record.breakTime.toFixed(1),
          breakDuration: formatBreakDuration(record.breakTime),
          breaks: record.breakTime > 0 ? 1 : 0,
          overtime: record.totalHours > 8 ? (record.totalHours - 8).toFixed(1) : '0.0',
          isOnBreak: record.isOnBreak,
          hasCheckedOutToday: record.hasCheckedOutToday
        });
      } else {
        dailyRecords.push({
          date: dateStr,
          day: dayOfWeek,
          checkIn: '-',
          checkOut: '-',
          checkInPhoto: null,
          checkOutPhoto: null,
          status: 'Absent',
          totalHours: '0.0',
          breakTime: '0.0',
          breakDuration: '0m',
          breaks: 0,
          overtime: '0.0',
          isOnBreak: false,
          hasCheckedOutToday: false
        });
      }
    }

    const presentRecords = records.filter(r => r.checkOutTime);
    const presentDays = presentRecords.length;
    const checkedInDays = records.filter(r => r.isCheckedIn && !r.checkOutTime).length;
    const totalHours = presentRecords.reduce((sum, r) => sum + r.totalHours, 0);
    const totalBreakTime = records.reduce((sum, r) => sum + r.breakTime, 0);
    const totalOvertime = presentRecords.reduce((sum, r) => {
      const overtime = r.totalHours > 8 ? r.totalHours - 8 : 0;
      return sum + overtime;
    }, 0);

    const lateDays = dailyRecords.filter(r => r.status === 'Late').length;
    const halfDays = dailyRecords.filter(r => r.status === 'Half Day').length;
    const absentDays = dailyRecords.filter(r => r.status === 'Absent').length;

    const todayDateStr = getTodayDateString();
    const currentStatus = records.find(r => r.date === todayDateStr && r.isCheckedIn && !r.hasCheckedOutToday) || null;

    res.status(200).json({
      success: true,
      data: {
        month: new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        dailyRecords,
        stats: {
          totalDays: daysInMonth,
          presentDays,
          checkedInDays,
          absentDays,
          lateDays,
          halfDays,
          averageHours: (totalHours / (presentDays || 1)).toFixed(1),
          totalHours: totalHours.toFixed(1),
          totalBreakTime: totalBreakTime.toFixed(1),
          totalOvertime: totalOvertime.toFixed(1),
          attendanceRate: Math.round((presentDays / daysInMonth) * 100)
        },
        currentStatus: currentStatus ? {
          _id: currentStatus._id,
          isCheckedIn: currentStatus.isCheckedIn,
          isOnBreak: currentStatus.isOnBreak,
          checkInTime: currentStatus.checkInTime,
          checkOutTime: currentStatus.checkOutTime,
          checkInPhoto: currentStatus.checkInPhoto,
          checkOutPhoto: currentStatus.checkOutPhoto,
          totalHours: currentStatus.totalHours,
          breakTime: currentStatus.breakTime,
          hasCheckedOutToday: currentStatus.hasCheckedOutToday
        } : null
      }
    });
  } catch (error: any) {
    console.error('Get month summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching month summary'
    });
  }
};

// Get attendance history with photos
export const getAttendanceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { managerId } = req.params;
    const { startDate, endDate, page = 1, limit = 30 } = req.query;
    
    if (!managerId) {
      res.status(400).json({
        success: false,
        message: 'Manager ID is required'
      });
      return;
    }

    const query: any = { managerId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: startDate as string,
        $lte: endDate as string
      };
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      ManagerAttendance.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      ManagerAttendance.countDocuments(query)
    ]);

    const presentRecords = records.filter(r => r.checkOutTime);
    const presentDays = presentRecords.length;
    const totalHours = presentRecords.reduce((sum, r) => sum + r.totalHours, 0);
    const totalBreakTime = records.reduce((sum, r) => sum + r.breakTime, 0);

    res.status(200).json({
      success: true,
      data: {
        history: records.map(record => ({
          _id: record._id,
          managerId: record.managerId,
          managerName: record.managerName,
          date: record.date,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          checkInPhoto: record.checkInPhoto,
          checkOutPhoto: record.checkOutPhoto,
          totalHours: record.totalHours,
          breakTime: record.breakTime,
          isCheckedIn: record.isCheckedIn,
          isOnBreak: record.isOnBreak,
          hasCheckedOutToday: record.hasCheckedOutToday
        })),
        stats: {
          totalDays: records.length,
          presentDays,
          absentDays: records.length - presentDays,
          averageHours: parseFloat((totalHours / (presentDays || 1)).toFixed(1)),
          totalBreakTime: parseFloat(totalBreakTime.toFixed(1)),
          attendanceRate: records.length > 0 ? Math.round((presentDays / records.length) * 100) : 0
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error: any) {
    console.error('Get attendance history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching attendance history'
    });
  }
};

// Add activity log
export const addActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { managerId, managerName, type, title, details } = req.body;
    
    if (!managerId || !type || !title) {
      res.status(400).json({
        success: false,
        message: 'Manager ID, type, and title are required'
      });
      return;
    }

    const todayDateStr = getTodayDateString();
    
    let attendance = await ManagerAttendance.findOne({
      managerId,
      date: todayDateStr
    });

    if (!attendance) {
      attendance = new ManagerAttendance({
        managerId,
        managerName: managerName || 'Manager',
        date: todayDateStr,
        dailyActivities: []
      });
    }

    const activity = {
      type,
      title,
      details: details || '',
      timestamp: new Date()
    };

    attendance.dailyActivities.push(activity);
    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Activity logged successfully',
      data: activity
    });
  } catch (error: any) {
    console.error('Add activity error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error logging activity'
    });
  }
};

// Clean up duplicate records
export const cleanupDuplicates = async (req: Request, res: Response): Promise<void> => {
  try {
    const duplicates = await ManagerAttendance.aggregate([
      {
        $group: {
          _id: { managerId: "$managerId", date: "$date" },
          count: { $sum: 1 },
          ids: { $push: "$_id" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    let cleanedCount = 0;
    
    for (const dup of duplicates) {
      const [keepId, ...deleteIds] = dup.ids;
      
      await ManagerAttendance.deleteMany({
        _id: { $in: deleteIds }
      });
      
      cleanedCount += deleteIds.length;
    }

    res.status(200).json({
      success: true,
      message: `Cleaned up ${cleanedCount} duplicate records`,
      duplicatesFound: duplicates.length
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error cleaning up duplicates'
    });
  }
};