import express from 'express';
import {
  getAllLeaves,
  getEmployeeLeaves,
  getSupervisorLeaves,
  applyForLeave,
  updateLeaveStatus,
  getSupervisorEmployees,
  getLeaveStats,
  getAllDepartments,
  getEmployeeCountByDepartment,
  getLeaveDetails,
  cancelLeaveRequest,
  getAllLeavesForAdmin,
  updateLeaveStatusWithRemarks,
  getPendingLeaves,
  testLeaves,
  getTodayLeaveStatus,
  updateLeaveRequest,
  deleteLeaveRequest,
  bulkUpdateLeaveStatus
} from '../controllers/leaveController';

const router = express.Router();

// Test routes
router.get('/test/employees', async (req, res) => {
  try {
    const Employee = (await import('../models/Employee')).default;
    const employees = await Employee.find().limit(10);
    const departments = await Employee.distinct('department');
    const totalCount = await Employee.countDocuments();
    const activeCount = await Employee.countDocuments({ status: 'active' });
    
    res.json({
      success: true,
      totalCount,
      activeCount,
      departments,
      sampleEmployees: employees.map(emp => ({
        id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        phone: emp.phone,
        email: emp.email,
        status: emp.status
      }))
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Test leaves endpoint
router.get('/test/leaves', testLeaves);

// Add test employee
router.post('/test/add-employee', async (req, res) => {
  try {
    const { employeeId, name, department, position, phone, email } = req.body;
    const Employee = (await import('../models/Employee')).default;
    
    const existingEmployee = await Employee.findOne({ employeeId });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }
    
    const employee = new Employee({
      employeeId,
      name,
      department,
      position,
      phone,
      email,
      status: 'active'
    });
    
    await employee.save();
    
    res.json({
      success: true,
      message: 'Employee added successfully',
      employee
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get all departments
router.get('/departments', getAllDepartments);

// Get employee count by department
router.get('/employee-count', getEmployeeCountByDepartment);

// Main routes - exactly like attendance routes
router.post('/apply', applyForLeave); // Like attendance checkin
router.get('/employee/:employeeId', getEmployeeLeaves); // Like attendance history
router.get('/supervisor', getSupervisorLeaves); // Like attendance team attendance
router.get('/supervisor/employees', getSupervisorEmployees);
router.get('/', getAllLeaves); // Like attendance get all
router.put('/:id/status', updateLeaveStatus); // Like attendance update - NOW SUPPORTS ALL STATUS CHANGES
router.get('/stats', getLeaveStats);
router.get('/pending', getPendingLeaves);
router.get('/today/:employeeId', getTodayLeaveStatus); // Like attendance today status

// Bulk operations
router.put('/bulk/status', bulkUpdateLeaveStatus); // Bulk update status

// Edit and Delete routes
router.put('/:id', updateLeaveRequest); // Update leave request
router.delete('/:id', deleteLeaveRequest); // Delete leave request

// Additional routes
router.get('/:id', getLeaveDetails);
router.put('/:id/cancel', cancelLeaveRequest);
router.put('/:id/status-with-remarks', updateLeaveStatusWithRemarks); // NOW SUPPORTS ALL STATUS CHANGES
router.get('/admin/all', getAllLeavesForAdmin);

// Manager leave routes - like attendance supervisor routes
router.post('/manager/apply', async (req, res) => {
  try {
    const Leave = (await import('../models/Leaves')).default;
    
    const leaveData = {
      ...req.body,
      isSupervisorLeave: true,
      supervisorId: req.body.supervisorId // This references users collection
    };
    
    const leave = await Leave.create(leaveData);
    res.status(201).json({ 
      success: true,
      message: 'Manager leave submitted successfully', 
      data: leave 
    });
  } catch (error: any) {
    console.error('❌ Error submitting manager leave:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Failed to submit manager leave' 
    });
  }
});

// Manager leaves route - like attendance team attendance
router.get('/manager', async (req, res) => {
  try {
    const { supervisorId } = req.query;
    const Leave = (await import('../models/Leaves')).default;
    
    const query: any = { isSupervisorLeave: true };
    
    if (supervisorId) {
      query.supervisorId = supervisorId; // Filter by supervisor ID from users collection
    }
    
    const managerLeaves = await Leave.find(query).sort({ createdAt: -1 });
    res.json({ 
      success: true,
      data: managerLeaves 
    });
  } catch (error: any) {
    console.error('❌ Error fetching manager leaves:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Failed to fetch manager leaves' 
    });
  }
});

export default router;