import { Request, Response } from 'express';
import mongoose from 'mongoose';
import AdminLeave from '../models/AdminLeave';

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

// Apply for admin leave - NO VALIDATION
export const applyAdminLeave = async (req: Request, res: Response) => {
  try {
    console.log('📝 Received admin leave application:', req.body);
    
    const {
      adminId,
      adminName,
      adminDepartment,
      adminPosition,
      adminEmail,
      adminContact,
      leaveType,
      fromDate,
      toDate,
      totalDays,
      reason,
      appliedBy
    } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!adminId) missingFields.push('adminId');
    if (!adminName) missingFields.push('adminName');
    if (!adminDepartment) missingFields.push('adminDepartment');
    if (!adminContact) missingFields.push('adminContact');
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
    const overlappingLeave = await AdminLeave.findOne({
      adminId,
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

    // Create new admin leave record
    const newLeave = new AdminLeave({
      adminId,
      adminName,
      adminDepartment,
      adminPosition: adminPosition || 'Admin',
      adminEmail: adminEmail || '',
      adminContact,
      leaveType,
      fromDate: from,
      toDate: to,
      totalDays: days,
      reason,
      appliedBy,
      appliedDate: new Date(),
      status: 'pending',
      requestType: 'admin-leave'
    });

    await newLeave.save();

    console.log('✅ Admin leave request submitted successfully:', {
      id: newLeave._id,
      adminId: newLeave.adminId,
      adminName: newLeave.adminName
    });

    res.status(201).json({
      success: true,
      message: 'Admin leave request submitted successfully',
      data: newLeave
    });
  } catch (error: any) {
    console.error('❌ Error applying admin leave:', error);
    
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
      message: 'Error applying for admin leave',
      error: error.message
    });
  }
};

// Get admin's own leaves
export const getAdminLeaves = async (req: Request, res: Response) => {
  try {
    const { adminId, status, startDate, endDate, page = 1, limit = 30 } = req.query;
    
    console.log('📝 Fetching admin leaves for:', { adminId, status });
    
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      });
    }
    
    let filter: any = { 
      adminId: adminId as string,
      requestType: 'admin-leave'
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
      AdminLeave.find(filter)
        .sort({ appliedDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AdminLeave.countDocuments(filter)
    ]);
    
    const stats = {
      total,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
      cancelled: leaves.filter(l => l.status === 'cancelled').length,
      totalDays: leaves.reduce((sum, leave) => sum + leave.totalDays, 0)
    };
    
    console.log(`✅ Found ${leaves.length} admin leaves`);
    
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
    console.error('❌ Error fetching admin leaves:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin leaves',
      error: error.message
    });
  }
};

// Get admin leave by ID
export const getAdminLeaveById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log('📝 Fetching admin leave by ID:', id);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID'
      });
    }
    
    const leave = await AdminLeave.findById(id).lean();
    
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
    console.error('❌ Error fetching admin leave by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave details',
      error: error.message
    });
  }
};

// Update admin leave (edit) - only pending
export const updateAdminLeave = async (req: Request, res: Response) => {
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

    console.log('📝 Updating admin leave:', {
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

    const leave = await AdminLeave.findById(id);

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

    console.log('✅ Admin leave updated successfully:', {
      id: leave._id
    });

    res.status(200).json({
      success: true,
      message: 'Leave request updated successfully',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error updating admin leave:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating leave request',
      error: error.message
    });
  }
};

// Delete admin leave - only pending
export const deleteAdminLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;

    console.log('📝 Deleting admin leave:', {
      id,
      deletedBy
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID'
      });
    }

    const leave = await AdminLeave.findById(id);

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

    await AdminLeave.findByIdAndDelete(id);

    console.log('✅ Admin leave deleted successfully:', {
      id
    });

    res.status(200).json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ Error deleting admin leave:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting leave request',
      error: error.message
    });
  }
};

// Cancel admin leave
export const cancelAdminLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancellationReason, cancelledBy } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID'
      });
    }

    const leave = await AdminLeave.findById(id);

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

    res.status(200).json({
      success: true,
      message: 'Admin leave request cancelled successfully',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error cancelling admin leave:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling admin leave request',
      error: error.message
    });
  }
};

// Get admin leave summary for a specific month
export const getAdminLeaveSummary = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { month, year } = req.query;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      });
    }

    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;

    const { startDate, endDate } = getMonthRange(currentYear, currentMonth);
    const daysInMonth = endDate.getUTCDate();

    const leaves = await AdminLeave.find({
      adminId,
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
      const date = new Date(Date.UTC(currentYear, currentMonth - 1, day));
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
    console.error('❌ Error fetching admin leave summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching leave summary'
    });
  }
};

// Get admin leave statistics
export const getAdminLeaveStats = async (req: Request, res: Response) => {
  try {
    const { adminId, department } = req.query;

    let filter: any = { requestType: 'admin-leave' };

    if (adminId && adminId !== 'undefined') {
      filter.adminId = adminId;
    }

    if (department && department !== 'all' && department !== 'undefined') {
      filter.adminDepartment = department;
    }

    const leaves = await AdminLeave.find(filter);

    const stats = {
      total: leaves.length,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
      cancelled: leaves.filter(l => l.status === 'cancelled').length,
      totalDays: leaves.reduce((sum, leave) => sum + leave.totalDays, 0)
    };

    const departments = await AdminLeave.distinct('adminDepartment');

    res.status(200).json({
      success: true,
      stats,
      filters: {
        departments
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching admin leave stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin leave statistics',
      error: error.message
    });
  }
};

// ============= ADMIN FUNCTIONS =============

// Get all admin leaves for admin view
export const getAllAdminLeavesForAdmin = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      adminName,
      adminDepartment,
      page = 1, 
      limit = 50,
      sortBy = 'appliedDate',
      sortOrder = 'desc'
    } = req.query;

    console.log('📝 Fetching all admin leaves for admin:', {
      status,
      adminDepartment,
      adminName
    });

    const query: any = { requestType: 'admin-leave' };
    
    if (status && status !== 'all' && status !== 'undefined') {
      query.status = status;
    }
    
    if (adminDepartment && adminDepartment !== 'all' && adminDepartment !== 'undefined') {
      query.adminDepartment = adminDepartment;
    }
    
    if (adminName && adminName !== 'undefined') {
      query.adminName = { $regex: adminName, $options: 'i' };
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

    const leaves = await AdminLeave.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await AdminLeave.countDocuments(query);

    const departments = await AdminLeave.distinct('adminDepartment');

    const stats = await AdminLeave.aggregate([
      { $match: { requestType: 'admin-leave' } },
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

    console.log(`✅ Found ${leaves.length} admin leaves for admin`);

    res.status(200).json({
      success: true,
      leaves: leaves.map(leave => ({
        ...leave,
        id: leave._id.toString(),
        employeeId: leave.adminId,
        employeeName: leave.adminName,
        department: leave.adminDepartment,
        contactNumber: leave.adminContact,
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
    console.error('❌ Error fetching all admin leaves for admin:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching admin leaves', 
      error: error.message 
    });
  }
};

// Update admin leave status (admin only)
export const updateAdminLeaveStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks, approvedBy, rejectedBy } = req.body;

    console.log('📝 Admin updating admin leave status:', {
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

    const leave = await AdminLeave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Admin leave request not found'
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

    console.log('✅ Admin leave status updated by admin successfully:', {
      id: leave._id,
      status: leave.status,
      approvedBy: leave.approvedBy,
      rejectedBy: leave.rejectedBy
    });

    res.status(200).json({
      success: true,
      message: `Admin leave request ${status} by admin`,
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error updating admin leave status by admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating admin leave status',
      error: error.message
    });
  }
};

// Revert admin leave to pending (admin only)
export const revertAdminLeaveToPending = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks, revertedBy } = req.body;

    console.log('📝 Admin reverting admin leave to pending:', {
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

    const leave = await AdminLeave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Admin leave request not found'
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

    console.log('✅ Admin leave reverted to pending by admin successfully:', {
      id: leave._id
    });

    res.status(200).json({
      success: true,
      message: 'Admin leave request reverted to pending by admin',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error reverting admin leave by admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error reverting admin leave',
      error: error.message
    });
  }
};

// ============= SUPERADMIN FUNCTIONS =============

// Get all admin leaves for superadmin view
export const getAllAdminLeavesForSuperadmin = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      adminName,
      adminDepartment,
      page = 1, 
      limit = 50,
      sortBy = 'appliedDate',
      sortOrder = 'desc'
    } = req.query;

    console.log('📝 Fetching all admin leaves for superadmin:', {
      status,
      adminDepartment,
      adminName
    });

    const query: any = { requestType: 'admin-leave' };
    
    if (status && status !== 'all' && status !== 'undefined') {
      query.status = status;
    }
    
    if (adminDepartment && adminDepartment !== 'all' && adminDepartment !== 'undefined') {
      query.adminDepartment = adminDepartment;
    }
    
    if (adminName && adminName !== 'undefined') {
      query.adminName = { $regex: adminName, $options: 'i' };
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

    const leaves = await AdminLeave.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await AdminLeave.countDocuments(query);

    const departments = await AdminLeave.distinct('adminDepartment');

    const stats = await AdminLeave.aggregate([
      { $match: { requestType: 'admin-leave' } },
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

    console.log(`✅ Found ${leaves.length} admin leaves for superadmin`);

    res.status(200).json({
      success: true,
      leaves: leaves.map(leave => ({
        ...leave,
        id: leave._id.toString(),
        employeeId: leave.adminId,
        employeeName: leave.adminName,
        department: leave.adminDepartment,
        contactNumber: leave.adminContact,
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
    console.error('❌ Error fetching all admin leaves for superadmin:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching admin leaves', 
      error: error.message 
    });
  }
};

// Update admin leave status (superadmin only)
export const updateAdminLeaveStatusBySuperadmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, superadminRemarks, approvedBy, rejectedBy } = req.body;

    console.log('📝 Superadmin updating admin leave status:', {
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

    const leave = await AdminLeave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Admin leave request not found'
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

    console.log('✅ Admin leave status updated by superadmin successfully:', {
      id: leave._id,
      status: leave.status,
      approvedBy: leave.approvedBySuperadmin,
      rejectedBy: leave.rejectedBySuperadmin
    });

    res.status(200).json({
      success: true,
      message: `Admin leave request ${status} by superadmin`,
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error updating admin leave status by superadmin:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating admin leave status',
      error: error.message
    });
  }
};

// Revert admin leave to pending (superadmin only)
export const revertAdminLeaveToPendingBySuperadmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks, revertedBy } = req.body;

    console.log('📝 Superadmin reverting admin leave to pending:', {
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

    const leave = await AdminLeave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Admin leave request not found'
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

    console.log('✅ Admin leave reverted to pending by superadmin successfully:', {
      id: leave._id
    });

    res.status(200).json({
      success: true,
      message: 'Admin leave request reverted to pending by superadmin',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error reverting admin leave by superadmin:', error);
    res.status(500).json({
      success: false,
      message: 'Error reverting admin leave',
      error: error.message
    });
  }
};

// Test endpoint
export const testAdminLeave = async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Admin Leave API is working',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /apply',
      'GET /',
      'GET /stats',
      'GET /summary/:adminId',
      'GET /:id',
      'PUT /:id',
      'DELETE /:id',
      'PUT /:id/cancel',
      'GET /admin/all',
      'PUT /admin/:id/status',
      'PUT /admin/:id/revert',
      'GET /superadmin/all',
      'PUT /superadmin/:id/status',
      'PUT /superadmin/:id/revert'
    ]
  });
};