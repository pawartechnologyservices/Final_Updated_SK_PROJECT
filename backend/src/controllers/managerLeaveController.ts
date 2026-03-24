import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ManagerLeave from '../models/ManagerLeave';

// Helper function to calculate days between dates
const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff + 1;
};

// Helper function to format date
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get month range
const getMonthRange = (year: number, month: number) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { startDate, endDate };
};

// Helper function to create date from string
const createDateFromString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

// Apply for manager leave - NO EMPLOYEE VALIDATION
export const applyManagerLeave = async (req: Request, res: Response) => {
  try {
    console.log('📝 Received manager leave application:', req.body);
    
    const {
      managerId,
      managerName,
      managerDepartment,
      managerPosition,
      managerEmail,
      managerContact,
      leaveType,
      fromDate,
      toDate,
      totalDays,
      reason,
      appliedBy
    } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!managerId) missingFields.push('managerId');
    if (!managerName) missingFields.push('managerName');
    if (!managerDepartment) missingFields.push('managerDepartment');
    if (!managerContact) missingFields.push('managerContact');
    if (!leaveType) missingFields.push('leaveType');
    if (!fromDate) missingFields.push('fromDate');
    if (!toDate) missingFields.push('toDate');
    if (!reason) missingFields.push('reason');
    if (!appliedBy) missingFields.push('appliedBy');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields
      });
    }

    // Parse and validate dates
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    if (from > to) {
      return res.status(400).json({
        success: false,
        message: 'From date must be before to date'
      });
    }

    // Calculate total days if not provided
    const days = totalDays || calculateDaysBetween(fromDate, toDate);

    if (days < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range'
      });
    }

    // Check for overlapping leave requests
    const overlappingLeave = await ManagerLeave.findOne({
      managerId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        {
          fromDate: { $lte: to },
          toDate: { $gte: from }
        }
      ]
    });

    if (overlappingLeave) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending or approved leave request for this period'
      });
    }

    // Create new manager leave record
    const newLeave = new ManagerLeave({
      managerId,
      managerName,
      managerDepartment,
      managerPosition: managerPosition || 'Manager',
      managerEmail: managerEmail || '',
      managerContact,
      leaveType,
      fromDate: from,
      toDate: to,
      totalDays: days,
      reason,
      appliedBy,
      appliedDate: new Date(),
      status: 'pending',
      requestType: 'manager-leave'
    });

    await newLeave.save();

    console.log('✅ Manager leave request submitted successfully:', {
      id: newLeave._id,
      managerId: newLeave.managerId,
      managerName: newLeave.managerName
    });

    res.status(201).json({
      success: true,
      message: 'Manager leave request submitted successfully',
      data: newLeave
    });
  } catch (error: any) {
    console.error('❌ Error applying manager leave:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error applying for manager leave',
      error: error.message
    });
  }
};

// Get manager's own leaves
export const getManagerLeaves = async (req: Request, res: Response) => {
  try {
    const { managerId, status, startDate, endDate, page = 1, limit = 30 } = req.query;
    
    console.log('📝 Fetching manager leaves for:', { managerId, status, startDate, endDate });
    
    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: 'Manager ID is required'
      });
    }
    
    let filter: any = { 
      managerId: managerId as string,
      requestType: 'manager-leave'
    };
    
    if (status && status !== 'all' && status !== 'undefined') {
      filter.status = status;
    }
    
    if (startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined') {
      filter.appliedDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 30;
    const skip = (pageNum - 1) * limitNum;

    const [leaves, total] = await Promise.all([
      ManagerLeave.find(filter)
        .sort({ appliedDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ManagerLeave.countDocuments(filter)
    ]);
    
    const stats = {
      total,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
      cancelled: leaves.filter(l => l.status === 'cancelled').length,
      totalDays: leaves.reduce((sum, leave) => sum + leave.totalDays, 0)
    };
    
    console.log(`✅ Found ${leaves.length} manager leaves`);
    
    res.status(200).json({
      success: true,
      data: leaves,
      stats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching manager leaves:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching manager leaves',
      error: error.message
    });
  }
};

// Get manager leave statistics
export const getManagerLeaveStats = async (req: Request, res: Response) => {
  try {
    const { managerId, department } = req.query;
    
    console.log('📝 Fetching manager leave stats:', { managerId, department });
    
    let filter: any = { requestType: 'manager-leave' };
    
    if (managerId && managerId !== 'undefined') {
      filter.managerId = managerId;
    }
    
    if (department && department !== 'all' && department !== 'undefined') {
      filter.managerDepartment = department;
    }
    
    const managerLeaves = await ManagerLeave.find(filter);
    
    const stats = {
      total: managerLeaves.length,
      pending: managerLeaves.filter(l => l.status === 'pending').length,
      approved: managerLeaves.filter(l => l.status === 'approved').length,
      rejected: managerLeaves.filter(l => l.status === 'rejected').length,
      cancelled: managerLeaves.filter(l => l.status === 'cancelled').length,
      totalDays: managerLeaves.reduce((sum, leave) => sum + leave.totalDays, 0)
    };
    
    const departments = await ManagerLeave.distinct('managerDepartment');
    
    res.status(200).json({
      success: true,
      stats,
      filters: {
        departments
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching manager leave stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching manager leave statistics',
      error: error.message
    });
  }
};

// Get manager leave by ID
export const getManagerLeaveById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log('📝 Fetching manager leave by ID:', id);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID'
      });
    }
    
    const leave = await ManagerLeave.findById(id).lean();
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error fetching manager leave by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave details',
      error: error.message
    });
  }
};

// Update manager leave (edit) - only pending
export const updateManagerLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      leaveType, 
      fromDate, 
      toDate, 
      reason,
      totalDays,
      updatedBy 
    } = req.body;

    console.log('📝 Updating manager leave:', {
      id,
      leaveType,
      fromDate,
      toDate,
      updatedBy
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID'
      });
    }

    const leave = await ManagerLeave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending leave requests can be edited'
      });
    }

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
      
      if (from > to) {
        return res.status(400).json({
          success: false,
          message: 'From date must be before to date'
        });
      }

      const days = totalDays || calculateDaysBetween(fromDate, toDate);
      leave.totalDays = days;
      leave.fromDate = from;
      leave.toDate = to;
    }

    if (leaveType) leave.leaveType = leaveType;
    if (reason) leave.reason = reason;
    
    leave.updatedAt = new Date();

    await leave.save();

    console.log('✅ Manager leave updated successfully:', {
      id: leave._id
    });

    res.status(200).json({
      success: true,
      message: 'Leave request updated successfully',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error updating manager leave:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating leave request',
      error: error.message
    });
  }
};

// Delete manager leave - only pending
export const deleteManagerLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;

    console.log('📝 Deleting manager leave:', {
      id,
      deletedBy
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID'
      });
    }

    const leave = await ManagerLeave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending leave requests can be deleted'
      });
    }

    await ManagerLeave.findByIdAndDelete(id);

    console.log('✅ Manager leave deleted successfully:', {
      id
    });

    res.status(200).json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ Error deleting manager leave:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting leave request',
      error: error.message
    });
  }
};

// Cancel manager leave (manager can cancel their own pending leave)
export const cancelManagerLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancellationReason, cancelledBy } = req.body;
    
    console.log('📝 Cancelling manager leave:', { id, cancelledBy });
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID'
      });
    }
    
    const leave = await ManagerLeave.findById(id);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending leave requests can be cancelled'
      });
    }
    
    leave.status = 'cancelled';
    if (cancellationReason) {
      leave.cancellationReason = cancellationReason;
    }
    if (cancelledBy) {
      leave.appliedBy = cancelledBy;
    }
    leave.updatedAt = new Date();
    
    await leave.save();
    
    console.log('✅ Manager leave cancelled successfully:', {
      id: leave._id
    });
    
    res.status(200).json({
      success: true,
      message: 'Manager leave request cancelled successfully',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error cancelling manager leave:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling manager leave request',
      error: error.message
    });
  }
};

// Get manager leave summary for a specific month
export const getManagerLeaveSummary = async (req: Request, res: Response) => {
  try {
    const { managerId } = req.params;
    const { month, year } = req.query;
    
    console.log('📝 Fetching manager leave summary:', { managerId, month, year });
    
    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: 'Manager ID is required'
      });
    }

    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    
    const { startDate, endDate } = getMonthRange(currentYear, currentMonth);
    const daysInMonth = endDate.getUTCDate();

    const leaves = await ManagerLeave.find({
      managerId,
      fromDate: { $lte: endDate },
      toDate: { $gte: startDate }
    }).sort({ fromDate: 1 });

    const dailyRecords = [];
    const stats = {
      totalLeaves: 0,
      approvedLeaves: 0,
      pendingLeaves: 0,
      rejectedLeaves: 0,
      cancelledLeaves: 0,
      totalDays: 0
    };
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = createDateFromString(dateStr);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const leavesOnDay = leaves.filter(leave => 
        leave.fromDate <= date && leave.toDate >= date
      );

      if (leavesOnDay.length > 0) {
        leavesOnDay.forEach(leave => {
          dailyRecords.push({
            date: dateStr,
            day: dayOfWeek,
            leaveType: leave.leaveType,
            status: leave.status,
            totalDays: leave.totalDays,
            reason: leave.reason,
            leaveId: leave._id
          });
        });

        stats.totalLeaves += leavesOnDay.length;
        stats.totalDays += 1;
        
        leavesOnDay.forEach(leave => {
          if (leave.status === 'approved') stats.approvedLeaves++;
          else if (leave.status === 'pending') stats.pendingLeaves++;
          else if (leave.status === 'rejected') stats.rejectedLeaves++;
          else if (leave.status === 'cancelled') stats.cancelledLeaves++;
        });
      } else {
        dailyRecords.push({
          date: dateStr,
          day: dayOfWeek,
          leaveType: null,
          status: 'no-leave',
          totalDays: 0,
          reason: null,
          leaveId: null
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        month: startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        dailyRecords,
        stats,
        totalDays: daysInMonth
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching manager leave summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching leave summary'
    });
  }
};

// ============= ADMIN FUNCTIONS =============

// Get all manager leaves for admin view
export const getAllManagerLeavesForAdmin = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      managerName,
      managerDepartment,
      page = 1, 
      limit = 50,
      sortBy = 'appliedDate',
      sortOrder = 'desc'
    } = req.query;

    console.log('📝 Fetching all manager leaves for admin:', {
      status,
      managerDepartment,
      managerName
    });

    const query: any = { requestType: 'manager-leave' };
    
    if (status && status !== 'all' && status !== 'undefined') {
      query.status = status;
    }
    
    if (managerDepartment && managerDepartment !== 'all' && managerDepartment !== 'undefined') {
      query.managerDepartment = managerDepartment;
    }
    
    if (managerName && managerName !== 'undefined') {
      query.managerName = { $regex: managerName, $options: 'i' };
    }
    
    if (startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined') {
      query.appliedDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const leaves = await ManagerLeave.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await ManagerLeave.countDocuments(query);

    const departments = await ManagerLeave.distinct('managerDepartment');

    const stats = await ManagerLeave.aggregate([
      { $match: { requestType: 'manager-leave' } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    const formattedStats = {
      total,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      approved: stats.find(s => s._id === 'approved')?.count || 0,
      rejected: stats.find(s => s._id === 'rejected')?.count || 0,
      cancelled: stats.find(s => s._id === 'cancelled')?.count || 0,
      totalDays: stats.reduce((sum, s) => sum + (s.totalDays || 0), 0)
    };

    console.log(`✅ Found ${leaves.length} manager leaves for admin`);

    res.status(200).json({
      success: true,
      leaves: leaves.map(leave => ({
        ...leave,
        id: leave._id.toString(),
        employeeId: leave.managerId,
        employeeName: leave.managerName,
        department: leave.managerDepartment,
        contactNumber: leave.managerContact,
        adminRemarks: leave.adminRemarks || leave.remarks
      })),
      stats: formattedStats,
      filters: {
        departments: ['all', ...departments]
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching all manager leaves for admin:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching manager leaves', 
      error: error.message 
    });
  }
};

// Update manager leave status (admin only)
export const updateManagerLeaveStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks, approvedBy, rejectedBy } = req.body;

    console.log('📝 Admin updating manager leave status:', {
      id,
      status,
      remarks: adminRemarks,
      approvedBy,
      rejectedBy
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID'
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Only "approved" or "rejected" allowed'
      });
    }

    if (status === 'approved' && !approvedBy) {
      return res.status(400).json({
        success: false,
        message: 'Admin name is required for approval'
      });
    }

    if (status === 'rejected' && !rejectedBy) {
      return res.status(400).json({
        success: false,
        message: 'Admin name is required for rejection'
      });
    }

    const leave = await ManagerLeave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Manager leave request not found'
      });
    }

    // Update leave status with admin info
    leave.status = status;
    leave.adminRemarks = adminRemarks;
    leave.updatedAt = new Date();

    if (status === 'approved') {
      leave.approvedBy = approvedBy;
      leave.approvedAt = new Date();
    } else if (status === 'rejected') {
      leave.rejectedBy = rejectedBy;
      leave.rejectedAt = new Date();
    }

    await leave.save();

    console.log('✅ Manager leave status updated by admin successfully:', {
      id: leave._id,
      status: leave.status,
      approvedBy: leave.approvedBy,
      rejectedBy: leave.rejectedBy
    });

    res.status(200).json({
      success: true,
      message: `Manager leave request ${status} by admin`,
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error updating manager leave status by admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating manager leave status',
      error: error.message
    });
  }
};

// Revert manager leave to pending (admin only)
export const revertManagerLeaveToPending = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks, revertedBy } = req.body;

    console.log('📝 Admin reverting manager leave to pending:', {
      id,
      remarks,
      revertedBy
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID'
      });
    }

    const leave = await ManagerLeave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Manager leave request not found'
      });
    }

    if (leave.status !== 'approved' && leave.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Only approved or rejected leaves can be reverted to pending'
      });
    }

    leave.status = 'pending';
    if (remarks) {
      leave.adminRemarks = remarks;
    }
    leave.updatedAt = new Date();

    await leave.save();

    console.log('✅ Manager leave reverted to pending by admin successfully:', {
      id: leave._id
    });

    res.status(200).json({
      success: true,
      message: 'Manager leave request reverted to pending by admin',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error reverting manager leave by admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error reverting manager leave',
      error: error.message
    });
  }
};

// ============= SUPERADMIN FUNCTIONS =============

// Get all manager leaves for superadmin view
export const getAllManagerLeavesForSuperadmin = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      managerName,
      managerDepartment,
      page = 1, 
      limit = 50,
      sortBy = 'appliedDate',
      sortOrder = 'desc'
    } = req.query;

    console.log('📝 Fetching all manager leaves for superadmin:', {
      status,
      managerDepartment,
      managerName
    });

    const query: any = { requestType: 'manager-leave' };
    
    if (status && status !== 'all' && status !== 'undefined') {
      query.status = status;
    }
    
    if (managerDepartment && managerDepartment !== 'all' && managerDepartment !== 'undefined') {
      query.managerDepartment = managerDepartment;
    }
    
    if (managerName && managerName !== 'undefined') {
      query.managerName = { $regex: managerName, $options: 'i' };
    }
    
    if (startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined') {
      query.appliedDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const leaves = await ManagerLeave.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await ManagerLeave.countDocuments(query);

    const departments = await ManagerLeave.distinct('managerDepartment');

    const stats = await ManagerLeave.aggregate([
      { $match: { requestType: 'manager-leave' } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    const formattedStats = {
      total,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      approved: stats.find(s => s._id === 'approved')?.count || 0,
      rejected: stats.find(s => s._id === 'rejected')?.count || 0,
      cancelled: stats.find(s => s._id === 'cancelled')?.count || 0,
      totalDays: stats.reduce((sum, s) => sum + (s.totalDays || 0), 0)
    };

    console.log(`✅ Found ${leaves.length} manager leaves for superadmin`);

    res.status(200).json({
      success: true,
      leaves: leaves.map(leave => ({
        ...leave,
        id: leave._id.toString(),
        employeeId: leave.managerId,
        employeeName: leave.managerName,
        department: leave.managerDepartment,
        contactNumber: leave.managerContact,
        superadminRemarks: leave.superadminRemarks || leave.adminRemarks || leave.remarks
      })),
      stats: formattedStats,
      filters: {
        departments: ['all', ...departments]
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching all manager leaves for superadmin:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching manager leaves', 
      error: error.message 
    });
  }
};

// Update manager leave status (superadmin only)
export const updateManagerLeaveStatusBySuperadmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, superadminRemarks, approvedBy, rejectedBy } = req.body;

    console.log('📝 Superadmin updating manager leave status:', {
      id,
      status,
      remarks: superadminRemarks,
      approvedBy,
      rejectedBy
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID'
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Only "approved" or "rejected" allowed'
      });
    }

    if (status === 'approved' && !approvedBy) {
      return res.status(400).json({
        success: false,
        message: 'Superadmin name is required for approval'
      });
    }

    if (status === 'rejected' && !rejectedBy) {
      return res.status(400).json({
        success: false,
        message: 'Superadmin name is required for rejection'
      });
    }

    const leave = await ManagerLeave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Manager leave request not found'
      });
    }

    // Update leave status with superadmin info
    leave.status = status;
    leave.superadminRemarks = superadminRemarks;
    leave.updatedAt = new Date();

    if (status === 'approved') {
      leave.approvedBySuperadmin = approvedBy;
      leave.approvedAtSuperadmin = new Date();
    } else if (status === 'rejected') {
      leave.rejectedBySuperadmin = rejectedBy;
      leave.rejectedAtSuperadmin = new Date();
    }

    await leave.save();

    console.log('✅ Manager leave status updated by superadmin successfully:', {
      id: leave._id,
      status: leave.status,
      approvedBy: leave.approvedBySuperadmin,
      rejectedBy: leave.rejectedBySuperadmin
    });

    res.status(200).json({
      success: true,
      message: `Manager leave request ${status} by superadmin`,
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error updating manager leave status by superadmin:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating manager leave status',
      error: error.message
    });
  }
};

// Revert manager leave to pending (superadmin only)
export const revertManagerLeaveToPendingBySuperadmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks, revertedBy } = req.body;

    console.log('📝 Superadmin reverting manager leave to pending:', {
      id,
      remarks,
      revertedBy
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID'
      });
    }

    const leave = await ManagerLeave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Manager leave request not found'
      });
    }

    if (leave.status !== 'approved' && leave.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Only approved or rejected leaves can be reverted to pending'
      });
    }

    leave.status = 'pending';
    if (remarks) {
      leave.superadminRemarks = remarks;
    }
    leave.updatedAt = new Date();

    await leave.save();

    console.log('✅ Manager leave reverted to pending by superadmin successfully:', {
      id: leave._id
    });

    res.status(200).json({
      success: true,
      message: 'Manager leave request reverted to pending by superadmin',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error reverting manager leave by superadmin:', error);
    res.status(500).json({
      success: false,
      message: 'Error reverting manager leave',
      error: error.message
    });
  }
};

// Bulk update manager leaves (superadmin only)
export const bulkUpdateManagerLeaves = async (req: Request, res: Response) => {
  try {
    const { leaveIds, status, superadminRemarks, approvedBy, rejectedBy } = req.body;
    
    console.log('📝 Bulk updating manager leaves:', {
      count: leaveIds?.length,
      status,
      approvedBy,
      rejectedBy
    });
    
    if (!leaveIds || !Array.isArray(leaveIds) || leaveIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of leave IDs'
      });
    }
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Only "approved" or "rejected" allowed'
      });
    }
    
    const updateData: any = {
      status,
      superadminRemarks,
      updatedAt: new Date()
    };
    
    if (status === 'approved') {
      if (!approvedBy) {
        return res.status(400).json({
          success: false,
          message: 'Superadmin name is required for approval'
        });
      }
      updateData.approvedBySuperadmin = approvedBy;
      updateData.approvedAtSuperadmin = new Date();
    } else if (status === 'rejected') {
      if (!rejectedBy) {
        return res.status(400).json({
          success: false,
          message: 'Superadmin name is required for rejection'
        });
      }
      updateData.rejectedBySuperadmin = rejectedBy;
      updateData.rejectedAtSuperadmin = new Date();
    }
    
    const result = await ManagerLeave.updateMany(
      { _id: { $in: leaveIds } },
      { $set: updateData }
    );
    
    console.log('✅ Bulk update completed:', result);
    
    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} leave requests`,
      data: result
    });
  } catch (error: any) {
    console.error('❌ Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Error in bulk update',
      error: error.message
    });
  }
};

// Get manager leave statistics by department (for superadmin)
export const getManagerLeaveStatsByDepartment = async (req: Request, res: Response) => {
  try {
    console.log('📝 Fetching manager leave stats by department');
    
    const stats = await ManagerLeave.aggregate([
      { $match: { requestType: 'manager-leave' } },
      {
        $group: {
          _id: {
            department: '$managerDepartment',
            status: '$status'
          },
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      },
      {
        $group: {
          _id: '$_id.department',
          stats: {
            $push: {
              status: '$_id.status',
              count: '$count',
              totalDays: '$totalDays'
            }
          },
          totalLeaves: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    console.log(`✅ Found stats for ${stats.length} departments`);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('❌ Error fetching manager leave stats by department:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave statistics by department',
      error: error.message
    });
  }
};

// Clean up duplicate records (admin utility)
export const cleanupManagerLeaveDuplicates = async (req: Request, res: Response) => {
  try {
    console.log('📝 Cleaning up duplicate manager leave records');
    
    const duplicates = await ManagerLeave.aggregate([
      {
        $group: {
          _id: { 
            managerId: "$managerId", 
            fromDate: "$fromDate", 
            toDate: "$toDate", 
            leaveType: "$leaveType" 
          },
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
      
      await ManagerLeave.deleteMany({
        _id: { $in: deleteIds }
      });
      
      cleanedCount += deleteIds.length;
    }

    console.log(`✅ Cleaned up ${cleanedCount} duplicate records`);

    res.status(200).json({
      success: true,
      message: `Cleaned up ${cleanedCount} duplicate records`,
      duplicatesFound: duplicates.length
    });
  } catch (error: any) {
    console.error('❌ Error cleaning up duplicates:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up duplicates',
      error: error.message
    });
  }
};

// Test endpoint
export const testManagerLeave = async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Manager Leave API is working',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /apply',
      'GET /',
      'GET /stats',
      'GET /summary/:managerId',
      'GET /:id',
      'PUT /:id',
      'DELETE /:id',
      'PUT /:id/cancel',
      'GET /admin/all',
      'PUT /admin/:id/status',
      'PUT /admin/:id/revert',
      'GET /superadmin/all',
      'PUT /superadmin/:id/status',
      'PUT /superadmin/:id/revert',
      'POST /superadmin/bulk',
      'GET /stats/department',
      'POST /cleanup'
    ]
  });
};