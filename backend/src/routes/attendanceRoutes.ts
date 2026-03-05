import express from 'express';
import {
  checkIn,
  checkOut,
  breakIn,
  breakOut,
  getTodayStatus,
  getAttendanceHistory,
  getTeamAttendance,
  getAllAttendance,
  updateAttendance,
  getWeeklySummary,
  manualAttendance,
  updateAttendanceStatus // Add this import
} from '../controllers/attendanceController';

const router = express.Router();

// Check in/out routes
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.post('/breakin', breakIn);
router.post('/breakout', breakOut);

// Get attendance data
router.get('/status/:employeeId', getTodayStatus);
router.get('/history', getAttendanceHistory);
router.get('/team', getTeamAttendance);
router.get('/', getAllAttendance);

// Update attendance (admin/supervisor)
router.put('/:id', updateAttendance);

// NEW: Update attendance status (admin/supervisor)
router.post('/update-status', updateAttendanceStatus);

// Manual attendance entry
router.post('/manual', manualAttendance);
router.get('/weekly-summary', getWeeklySummary);

export default router;