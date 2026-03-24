// routes/attendanceRoutes.ts
import express from 'express';
import {
  checkIn,
  checkOut,
  checkInWithPhoto,
  checkOutWithPhoto,
  breakIn,
  breakOut,
  getTodayStatus,
  getAttendanceHistory,
  getTeamAttendance,
  getAllAttendance,
  updateAttendance,
  getWeeklySummary,
  manualAttendance,
  updateAttendanceStatus,
  upload
} from '../controllers/attendanceController';

const router = express.Router();

// Check in/out routes
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);

// Check in/out with photo routes
router.post('/checkin-with-photo', upload.single('photo'), checkInWithPhoto);
router.post('/checkout-with-photo', upload.single('photo'), checkOutWithPhoto);

// Break routes
router.post('/breakin', breakIn);
router.post('/breakout', breakOut);

// Get attendance data
router.get('/status/:employeeId', getTodayStatus);
router.get('/history', getAttendanceHistory);
router.get('/team', getTeamAttendance);
router.get('/', getAllAttendance);

// Update attendance (admin/supervisor)
router.put('/:id', updateAttendance);

// Update attendance status (admin/supervisor)
router.post('/update-status', updateAttendanceStatus);

// Manual attendance entry
router.post('/manual', manualAttendance);
router.get('/weekly-summary', getWeeklySummary);

export default router;