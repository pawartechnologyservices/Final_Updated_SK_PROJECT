import express from 'express';
import {
  applyManagerLeave,
  getManagerLeaves,
  getManagerLeaveStats,
  getManagerLeaveById,
  updateManagerLeave,
  deleteManagerLeave,
  cancelManagerLeave,
  getManagerLeaveSummary,
  // Admin functions
  getAllManagerLeavesForAdmin,
  updateManagerLeaveStatus,
  revertManagerLeaveToPending,
  // Superadmin functions
  getAllManagerLeavesForSuperadmin,
  updateManagerLeaveStatusBySuperadmin,
  revertManagerLeaveToPendingBySuperadmin,
  bulkUpdateManagerLeaves,
  getManagerLeaveStatsByDepartment,
  cleanupManagerLeaveDuplicates,
  testManagerLeave
} from '../controllers/managerLeaveController';

const router = express.Router();

// Test endpoint
router.get('/test', testManagerLeave);

// Manager routes (for managers themselves)
router.post('/apply', applyManagerLeave);
router.get('/', getManagerLeaves);
router.get('/stats', getManagerLeaveStats);
router.get('/summary/:managerId', getManagerLeaveSummary);
router.get('/:id', getManagerLeaveById);
router.put('/:id', updateManagerLeave);
router.delete('/:id', deleteManagerLeave);
router.put('/:id/cancel', cancelManagerLeave);

// Admin routes (for admin users)
router.get('/admin/all', getAllManagerLeavesForAdmin);
router.put('/admin/:id/status', updateManagerLeaveStatus);
router.put('/admin/:id/revert', revertManagerLeaveToPending);

// Superadmin routes (for superadmin users)
router.get('/superadmin/all', getAllManagerLeavesForSuperadmin);
router.put('/superadmin/:id/status', updateManagerLeaveStatusBySuperadmin);
router.put('/superadmin/:id/revert', revertManagerLeaveToPendingBySuperadmin);
router.post('/superadmin/bulk', bulkUpdateManagerLeaves);

// Statistics routes
router.get('/stats/department', getManagerLeaveStatsByDepartment);

// Admin utility
router.post('/cleanup', cleanupManagerLeaveDuplicates);

export default router;