import express from 'express';
import {
  applyAdminLeave,
  getAdminLeaves,
  getAdminLeaveById,
  updateAdminLeave,
  deleteAdminLeave,
  cancelAdminLeave,
  getAdminLeaveSummary,
  getAdminLeaveStats,
  // Admin functions
  getAllAdminLeavesForAdmin,
  updateAdminLeaveStatus,
  revertAdminLeaveToPending,
  // Superadmin functions
  getAllAdminLeavesForSuperadmin,
  updateAdminLeaveStatusBySuperadmin,
  revertAdminLeaveToPendingBySuperadmin,
  testAdminLeave
} from '../controllers/adminLeaveController';

const router = express.Router();

// Test endpoint
router.get('/test', testAdminLeave);

// Apply for admin leave
router.post('/apply', applyAdminLeave);

// Get admin's own leaves
router.get('/', getAdminLeaves);

// Get leave statistics
router.get('/stats', getAdminLeaveStats);

// Get monthly summary
router.get('/summary/:adminId', getAdminLeaveSummary);

// Get leave by ID
router.get('/:id', getAdminLeaveById);

// Update leave (edit)
router.put('/:id', updateAdminLeave);

// Delete leave
router.delete('/:id', deleteAdminLeave);

// Cancel leave
router.put('/:id/cancel', cancelAdminLeave);

// Admin routes (for admin users)
router.get('/admin/all', getAllAdminLeavesForAdmin);
router.put('/admin/:id/status', updateAdminLeaveStatus);
router.put('/admin/:id/revert', revertAdminLeaveToPending);

// Superadmin routes (for superadmin users)
router.get('/superadmin/all', getAllAdminLeavesForSuperadmin);
router.put('/superadmin/:id/status', updateAdminLeaveStatusBySuperadmin);
router.put('/superadmin/:id/revert', revertAdminLeaveToPendingBySuperadmin);

export default router;