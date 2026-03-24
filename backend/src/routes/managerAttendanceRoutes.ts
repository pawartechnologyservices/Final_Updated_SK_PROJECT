// routes/managerAttendanceRoutes.ts
import express from 'express';
import multer from 'multer';
import path from 'path';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Import controllers
import {
  healthCheck,
  checkIn,
  checkOut,
  breakIn,
  breakOut,
  getTodayStatus,
  getAttendanceHistory,
  addActivity,
  getMonthSummary,
  cleanupDuplicates
} from '../controllers/managerAttendanceController';

// Import photo controllers
import {
  checkInWithPhoto,
  checkOutWithPhoto
} from '../controllers/managerAttendanceController';

const router = express.Router();

// Health check
router.get('/health', healthCheck);

// Attendance actions (without photo)
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);

// Attendance actions with photo - THESE ARE THE CRITICAL ROUTES
router.post('/checkin-with-photo', upload.single('photo'), checkInWithPhoto);
router.post('/checkout-with-photo', upload.single('photo'), checkOutWithPhoto);

// Break actions
router.post('/breakin', breakIn);
router.post('/breakout', breakOut);

// Get attendance data
router.get('/today/:managerId', getTodayStatus);
router.get('/history/:managerId', getAttendanceHistory);
router.get('/summary/:managerId', getMonthSummary);

// Activity logging
router.post('/activity', addActivity);

// Admin cleanup (one-time use)
router.post('/cleanup', cleanupDuplicates);

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Manager attendance routes are working!' });
});

export default router;