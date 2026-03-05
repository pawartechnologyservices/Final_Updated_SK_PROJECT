import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Attendance, { IAttendance } from '../models/attendance';
import Employee from '../models/Employee'; // Use uppercase E to match other imports

// Helper function to calculate time difference in hours
const calculateHours = (startTime: string | null, endTime: string | null): number => {
  if (!startTime || !endTime) return 0;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return (end - start) / (1000 * 60 * 60);
};

// Helper function to format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Update attendance status (for supervisors)
export const updateAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const { 
      employeeId, 
      attendanceId, 
      date, 
      status, 
      remarks, 
      supervisorId,
      employeeName 
    } = req.body;

    console.log('📝 Updating attendance status:', {
      employeeId,
      attendanceId,
      date,
      status,
      remarks,
      supervisorId,
      employeeName
    });

    // Validate required fields
    if (!employeeId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employeeId, date, and status are required'
      });
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'half-day', 'leave', 'weekly-off'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: present, absent, half-day, leave, weekly-off'
      });
    }

    // Parse and validate date
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const formattedDate = formatDate(attendanceDate);

    // Check if attendance record exists
    let attendanceRecord;
    
    if (attendanceId && mongoose.Types.ObjectId.isValid(attendanceId)) {
      // Update existing record by ID
      attendanceRecord = await Attendance.findById(attendanceId);
      
      if (!attendanceRecord) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }
      
      // Update the record
      attendanceRecord.status = status as any;
      if (remarks !== undefined) attendanceRecord.remarks = remarks;
      if (supervisorId) attendanceRecord.supervisorId = supervisorId;
      
      await attendanceRecord.save();
      
    } else {
      // Check if record exists for this employee and date
      attendanceRecord = await Attendance.findOne({
        employeeId,
        date: formattedDate
      });
      
      if (attendanceRecord) {
        // Update existing record
        attendanceRecord.status = status as any;
        if (remarks !== undefined) attendanceRecord.remarks = remarks;
        if (supervisorId) attendanceRecord.supervisorId = supervisorId;
        
        await attendanceRecord.save();
      } else {
        // Try to get employee name if not provided
        let finalEmployeeName = employeeName;
        let employeeDepartment = 'General';
        let employeeSiteName = null;
        
        if (!finalEmployeeName) {
          const employee = await Employee.findById(employeeId);
          finalEmployeeName = employee?.name || 'Unknown Employee';
          employeeDepartment = employee?.department || 'General';
          employeeSiteName = employee?.siteName || null;
        }

        // Create new attendance record
        const newAttendance = new Attendance({
          employeeId,
          employeeName: finalEmployeeName,
          date: formattedDate,
          status,
          remarks: remarks || '',
          supervisorId: supervisorId || null,
          isCheckedIn: false,
          isOnBreak: false,
          checkInTime: null,
          checkOutTime: null,
          breakStartTime: null,
          breakEndTime: null,
          totalHours: 0,
          breakTime: 0,
          department: employeeDepartment,
          siteName: employeeSiteName
        });
        
        attendanceRecord = await newAttendance.save();
      }
    }

    console.log('✅ Attendance status updated successfully:', {
      id: attendanceRecord._id,
      employeeId: attendanceRecord.employeeId,
      status: attendanceRecord.status,
      date: attendanceRecord.date
    });

    return res.status(200).json({
      success: true,
      message: `Attendance status updated to ${status} successfully`,
      data: attendanceRecord
    });

  } catch (error: any) {
    console.error('❌ Error updating attendance status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while updating attendance status'
    });
  }
};

// Check in
export const checkIn = async (req: Request, res: Response) => {
  try {
    const { employeeId, employeeName, supervisorId } = req.body;
    
    if (!employeeId || !employeeName) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and name are required',
      });
    }

    const today = formatDate(new Date());

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: today,
    });

    if (existingAttendance?.isCheckedIn) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in for today',
      });
    }

    const checkInTime = new Date().toISOString();

    let attendance: IAttendance | null;
    
    if (existingAttendance) {
      // Update existing record
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        {
          checkInTime,
          isCheckedIn: true,
          status: 'present',
          updatedAt: new Date(),
        },
        { new: true }
      );
      
      if (!attendance) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update attendance record',
        });
      }
    } else {
      // Get employee details for department/site
      const employee = await Employee.findById(employeeId);
      
      // Create new attendance record
      attendance = await Attendance.create({
        employeeId,
        employeeName,
        date: today,
        checkInTime,
        checkOutTime: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 0,
        breakTime: 0,
        status: 'present',
        isCheckedIn: true,
        isOnBreak: false,
        supervisorId: supervisorId || null,
        department: employee?.department || 'General',
        siteName: employee?.siteName || null
      });
    }

    res.status(200).json({
      success: true,
      message: 'Checked in successfully',
      data: attendance,
    });
  } catch (error: any) {
    console.error('❌ Check-in error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error checking in',
      error: error.message,
    });
  }
};

// Check out
export const checkOut = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const today = formatDate(new Date());
    const checkOutTime = new Date().toISOString();

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
      isCheckedIn: true,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No active check-in found',
      });
    }

    // Calculate total hours
    const totalHours = calculateHours(attendance.checkInTime, checkOutTime);
    
    // Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        checkOutTime,
        isCheckedIn: false,
        isOnBreak: false,
        totalHours,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update attendance record',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      data: updatedAttendance,
      totalHours: totalHours.toFixed(2),
    });
  } catch (error: any) {
    console.error('❌ Check-out error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error checking out',
      error: error.message,
    });
  }
};

// Break in
export const breakIn = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const today = formatDate(new Date());
    const breakStartTime = new Date().toISOString();

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
      isCheckedIn: true,
      isOnBreak: false,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No active check-in found or already on break',
      });
    }

    // Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        breakStartTime,
        isOnBreak: true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update break status',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Break started successfully',
      data: updatedAttendance,
    });
  } catch (error: any) {
    console.error('❌ Break-in error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error starting break',
      error: error.message,
    });
  }
};

// Break out
export const breakOut = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const today = formatDate(new Date());
    const breakEndTime = new Date().toISOString();

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
      isCheckedIn: true,
      isOnBreak: true,
    });

    if (!attendance || !attendance.breakStartTime) {
      return res.status(404).json({
        success: false,
        message: 'No active break found',
      });
    }

    // Calculate break duration
    const breakDuration = calculateHours(attendance.breakStartTime, breakEndTime);
    const totalBreakTime = (attendance.breakTime || 0) + breakDuration;

    // Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        breakEndTime,
        isOnBreak: false,
        breakTime: totalBreakTime,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update break status',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Break ended successfully',
      data: updatedAttendance,
      breakDuration: breakDuration.toFixed(2),
    });
  } catch (error: any) {
    console.error('❌ Break-out error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error ending break',
      error: error.message,
    });
  }
};

// Get today's attendance status
export const getTodayStatus = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const today = formatDate(new Date());

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
    });

    if (!attendance) {
      return res.status(200).json({
        success: true,
        message: 'No attendance record found for today',
        data: {
          isCheckedIn: false,
          isOnBreak: false,
          checkInTime: null,
          checkOutTime: null,
          breakStartTime: null,
          breakEndTime: null,
          totalHours: 0,
          breakTime: 0,
          lastCheckInDate: null
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance status retrieved',
      data: {
        isCheckedIn: attendance.isCheckedIn,
        isOnBreak: attendance.isOnBreak,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        breakStartTime: attendance.breakStartTime,
        breakEndTime: attendance.breakEndTime,
        totalHours: attendance.totalHours,
        breakTime: attendance.breakTime,
        lastCheckInDate: attendance.date
      },
    });
  } catch (error: any) {
    console.error('❌ Get status error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance status',
      error: error.message,
    });
  }
};

// Get attendance history
export const getAttendanceHistory = async (req: Request, res: Response) => {
  try {
    const { employeeId, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const query: any = { employeeId: employeeId.toString() };
    
    if (startDate && endDate) {
      query.date = {
        $gte: startDate.toString(),
        $lte: endDate.toString(),
      };
    }

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    const [attendanceHistory, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Attendance.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      message: 'Attendance history retrieved',
      data: attendanceHistory,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('❌ Get history error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance history',
      error: error.message,
    });
  }
};

// Get team attendance
export const getTeamAttendance = async (req: Request, res: Response) => {
  try {
    const { supervisorId, date } = req.query;
    
    if (!supervisorId) {
      return res.status(400).json({
        success: false,
        message: 'Supervisor ID is required',
      });
    }

    const queryDate = date ? date.toString() : formatDate(new Date());
    
    const teamAttendance = await Attendance.find({
      date: queryDate,
      supervisorId: supervisorId.toString(),
    }).sort({ checkInTime: -1 });

    res.status(200).json({
      success: true,
      message: 'Team attendance retrieved',
      data: teamAttendance,
      date: queryDate,
      total: teamAttendance.length,
    });
  } catch (error: any) {
    console.error('❌ Get team attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving team attendance',
      error: error.message,
    });
  }
};

// Get all attendance
export const getAllAttendance = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, date, employeeId, startDate, endDate } = req.query;
    
    const query: any = {};
    
    if (date) {
      query.date = date.toString();
    }
    
    if (employeeId) {
      query.employeeId = employeeId.toString();
    }

    if (startDate && endDate) {
      query.date = {
        $gte: startDate.toString(),
        $lte: endDate.toString(),
      };
    }

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    const [attendanceRecords, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Attendance.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      message: 'Attendance records retrieved',
      data: attendanceRecords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('❌ Get all attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance records',
      error: error.message,
    });
  }
};

// Update attendance
export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance ID',
      });
    }

    // Calculate total hours if both check-in and check-out times are provided
    if (updateData.checkInTime && updateData.checkOutTime) {
      updateData.totalHours = calculateHours(
        updateData.checkInTime,
        updateData.checkOutTime
      );
    }

    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedAttendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: updatedAttendance,
    });
  } catch (error: any) {
    console.error('❌ Update attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating attendance',
      error: error.message,
    });
  }
};

// Manual attendance entry
export const manualAttendance = async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      employeeName,
      date,
      checkInTime,
      checkOutTime,
      breakStartTime,
      breakEndTime,
      status,
      remarks,
      totalHours = 0,
      isCheckedIn = false,
      supervisorId
    } = req.body;

    if (!employeeId || !employeeName || !date) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, name, and date are required',
      });
    }

    // Validate date
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    const formattedDate = formatDate(attendanceDate);

    // Get employee details
    const employee = await Employee.findById(employeeId);

    // Check if record already exists
    const existingRecord = await Attendance.findOne({
      employeeId,
      date: formattedDate,
    });

    let attendance;
    
    if (existingRecord) {
      // Update existing record
      attendance = await Attendance.findByIdAndUpdate(
        existingRecord._id,
        {
          employeeName,
          checkInTime,
          checkOutTime,
          breakStartTime,
          breakEndTime,
          status,
          remarks,
          totalHours,
          isCheckedIn: isCheckedIn && !checkOutTime,
          isOnBreak: !!breakStartTime && !breakEndTime,
          supervisorId: supervisorId || existingRecord.supervisorId,
          department: employee?.department || existingRecord.department,
          siteName: employee?.siteName || existingRecord.siteName,
          updatedAt: new Date(),
        },
        { new: true }
      );
    } else {
      // Create new record
      attendance = await Attendance.create({
        employeeId,
        employeeName,
        date: formattedDate,
        checkInTime,
        checkOutTime,
        breakStartTime,
        breakEndTime,
        status: status || 'present',
        remarks: remarks || '',
        totalHours,
        isCheckedIn: isCheckedIn && !checkOutTime,
        isOnBreak: !!breakStartTime && !breakEndTime,
        supervisorId: supervisorId || null,
        department: employee?.department || 'General',
        siteName: employee?.siteName || null
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: attendance,
    });
  } catch (error: any) {
    console.error('❌ Manual attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error recording attendance',
      error: error.message,
    });
  }
};

// Get weekly summary
export const getWeeklySummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    // Get all attendance records for the week
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: startDate.toString(),
        $lte: endDate.toString(),
      },
    });

    // Group by employee
    const employeeMap = new Map();
    
    attendanceRecords.forEach(record => {
      if (!employeeMap.has(record.employeeId)) {
        employeeMap.set(record.employeeId, {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          department: record.department || 'Unknown',
          weekStartDate: startDate,
          weekEndDate: endDate,
          daysPresent: 0,
          daysAbsent: 0,
          daysHalfDay: 0,
          daysLeave: 0,
          daysWeeklyOff: 0,
          totalHours: 0,
          totalBreakTime: 0,
        });
      }
      
      const employeeData = employeeMap.get(record.employeeId);
      
      switch (record.status) {
        case 'present':
          employeeData.daysPresent++;
          employeeData.totalHours += record.totalHours || 0;
          break;
        case 'absent':
          employeeData.daysAbsent++;
          break;
        case 'half-day':
          employeeData.daysHalfDay++;
          employeeData.totalHours += record.totalHours || 0;
          break;
        case 'leave':
          employeeData.daysLeave++;
          break;
        case 'weekly-off':
          employeeData.daysWeeklyOff++;
          break;
      }
      
      employeeData.totalBreakTime += record.breakTime || 0;
    });

    // Convert map to array and determine overall status
    const weeklySummaries = Array.from(employeeMap.values()).map(emp => {
      let overallStatus: 'present' | 'absent' | 'mixed' = 'absent';
      
      if (emp.daysPresent > 0 || emp.daysHalfDay > 0) {
        overallStatus = emp.daysPresent >= 5 ? 'present' : 'mixed';
      }
      
      return {
        ...emp,
        overallStatus
      };
    });

    res.status(200).json({
      success: true,
      message: 'Weekly summary retrieved',
      data: weeklySummaries,
    });
  } catch (error: any) {
    console.error('❌ Weekly summary error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving weekly summary',
      error: error.message,
    });
  }
};