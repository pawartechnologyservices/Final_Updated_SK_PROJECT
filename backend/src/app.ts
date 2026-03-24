import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import connectDB from './config/database';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from "cloudinary";
import User, { IUser } from './models/User';
import excelImportRoutes from './routes/employeeImportExport.routes';
import { PasswordFixer } from './utils/passwordFixer';

// Import all routes
import deductionRoutes from './routes/deductionRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import uploadRoutes from './routes/upload.routes';
import authRoutes from './routes/authRoutes';
import epfRoutes from './routes/epfRoutes';
import shiftRoutes from './routes/shiftRoutes';
import salaryStructureRoutes from './routes/salaryStructureRoutes';
import salarySlipRoutes from './routes/salarySlipRoutes';
import leaveRoutes from './routes/leaveRoutes';
import siteRoutes from './routes/siteRoutes';
import clientRoutes from './routes/clientRoutes';
import tasksRoutes from './routes/tasksRoutes';
import employeeRoutes from './routes/employeeRoutes';
import leadRoutes from './routes/leadRoutes';
import communicationRoutes from './routes/communicationRoutes';
import expenseRoutes from './routes/expenseRoutes';
import workQueryRoutes from './routes/workQuery.routes';
import serviceRoutes from './routes/serviceRoutes';
import alertRoutes from './routes/alertRoutes'
import machineRoutes from './routes/machineRoutes';
import payrollRoutes from './routes/payrollRoutes'
import rosterRoutes from './routes/rosterRoutes'
import adminLeaveRoutes from './routes/adminLeaveRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import managerLeaveRoutes from './routes/managerLeaveRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import supervisorRoutes from './routes/supervisorRoutes';
//import dashboardRoutes from './routes/dashboardRoutes';
import trainingRoutes from './routes/trainingRoutes';
import briefingRoutes from './routes/briefingRoutes';
import settingsRoutes from './routes/settings';
import managerAttendanceRoutes from './routes/managerAttendanceRoutes';

import assignTaskRoutes from './routes/assignTaskRoutes';

const app: Application = express();

// ==================== CORS CONFIGURATION ====================
app.use(cors({
  origin: ['http://localhost:8080','http://localhost:5001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With','cache-control','Cache-control'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer storage for Cloudinary (Custom implementation)
const createCloudinaryStorage = () => {
  const storage = multer.memoryStorage(); // Store files in memory first
  
  return {
    _handleFile: async (
      req: Request,
      file: Express.Multer.File,
      cb: (error?: any, info?: Partial<Express.Multer.File>) => void
    ) => {
      try {
        // Upload to Cloudinary
        const result = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'employee-photos',
              allowed_formats: ['jpg', 'jpeg', 'png'],
              transformation: [{ width: 500, height: 500, crop: 'limit' }],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          
          uploadStream.end(file.buffer);
        });

        // Return file info with Cloudinary URL
        const fileInfo: Partial<Express.Multer.File> = {
          filename: result.public_id,
          path: result.secure_url,
          size: result.bytes,
          mimetype: file.mimetype,
          originalname: file.originalname,
        };
        
        cb(null, fileInfo);
      } catch (error: any) {
        cb(error);
      }
    },
    
    _removeFile: (
      req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null) => void
    ) => {
      // Delete from Cloudinary if needed
      if (file.filename) {
        cloudinary.uploader.destroy(file.filename, (error) => {
          cb(error);
        });
      } else {
        cb(null);
      }
    }
  };
};

// Create multer instance with custom storage
const cloudinaryStorage = createCloudinaryStorage();
const upload = multer({ 
  storage: cloudinaryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

// Alternative: Simple memory storage (easier to work with)
const memoryStorage = multer.memoryStorage();
const simpleUpload = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

// ==================== DATABASE CONNECTION ====================
connectDB();

// ==================== PASSWORD FIXER ON STARTUP ====================
const runPasswordFixer = async () => {
  try {
    // Wait for MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for MongoDB connection...');
      await new Promise(resolve => {
        mongoose.connection.once('connected', resolve);
      });
    }
    
    console.log('\n🔧 [STARTUP] Running password health check...');
    const fixResult = await PasswordFixer.checkAndFixUnhashedPasswords();
    
    if (fixResult.fixedCount > 0) {
      console.log(`\n⚠️ [STARTUP] IMPORTANT: Fixed ${fixResult.fixedCount} unhashed passwords.`);
      console.log('💡 [STARTUP] Users may need to use their original plain-text passwords until they change them.');
    } else if (fixResult.success && fixResult.alreadyHashedCount === fixResult.totalUsers) {
      console.log('✅ [STARTUP] All passwords are already properly hashed!');
    }
    
    if (fixResult.errorCount > 0) {
      console.warn(`⚠️ [STARTUP] Had ${fixResult.errorCount} errors during password check`);
    }
    
    console.log('✅ [STARTUP] Password health check completed\n');
  } catch (error: any) {
    console.error('❌ [STARTUP] Password fixer failed:', error.message);
    console.log('⚠️ [STARTUP] Continuing server startup despite password fixer error');
  }
};

// ==================== LOGGING & CACHING MIDDLEWARE ====================
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  
  // Disable caching for API routes
  if (req.path.startsWith('/api')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

// Add error logging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Serve static files
app.use('/api/auth', authRoutes);
app.use('/api/import', excelImportRoutes);
app.use('/api/settings', settingsRoutes);
console.log('✅ Settings routes registered at /api/settings');
app.use('/api', uploadRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/work-queries', workQueryRoutes);
app.use('/api/alerts',alertRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/manager-leaves', managerLeaveRoutes); 
app.use('/api/attendance', attendanceRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/briefings', briefingRoutes);
app.use('/api/assigntasks', assignTaskRoutes);  // Make sure this line is here

app.use('/api/manager-attendance', managerAttendanceRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
console.log('📁 Static files being served from:', path.join(__dirname, '../uploads'));

// ==================== BASIC TEST ENDPOINTS ====================
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'SK Enterprises Backend API',
    status: 'running',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    endpoints:{
      alerts: '/api/alerts',
    }
  });
});

// ✅ HEALTH ENDPOINT - ADD THIS
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Document Management API',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime()
  });
});

app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// ==================== USER MANAGEMENT ROUTES ====================
// ✅ CREATE - Add new user
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    console.log('POST /api/users called with:', req.body);
    
    const { 
      username, 
      email, 
      password, 
      role, 
      firstName, 
      lastName,
      department,
      site,
      phone,
      joinDate
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User with this email or username already exists' 
      });
    }

    // Create name from firstName and lastName
    const name = `${firstName} ${lastName}`.trim();

    const newUser = new User({
      username,
      email,
      password,
      role: role || 'employee',
      firstName,
      lastName,
      name,
      department: department || 'General',
      // site: site || 'Mumbai Office',
      phone,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      isActive: true
    });

    await newUser.save();

    const userResponse = {
      _id: newUser._id.toString(),
      id: newUser._id.toString().slice(-6),
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      department: newUser.department,
      //site: newUser.site,
      phone: newUser.phone,
      isActive: newUser.isActive,
      status: newUser.isActive ? 'active' : 'inactive',
      joinDate: newUser.joinDate.toISOString().split('T')[0]
    };

    console.log('User created successfully:', userResponse);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating user'
    });
  }
});

// ✅ READ - Get all users (with grouping by role)
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    console.log('GET /api/users called');
    
    // 1️⃣ Fetch users (latest first)
    const users = await User.find().sort({ createdAt: -1 });
    console.log(`Found ${users.length} users`);

    // 2️⃣ Transform users safely
    const transformedUsers = users.map((user: IUser) => {
      const userObj = user.toJSON();
      return {
        ...userObj,
        id: userObj._id.toString().slice(-6),
        _id: userObj._id.toString(),
        status: userObj.isActive ? 'active' : 'inactive'
      };
    });

    // 3️⃣ Group users by role
    const groupedByRole = transformedUsers.reduce((acc: any, user: any) => {
      if (!acc[user.role]) {
        acc[user.role] = [];
      }
      acc[user.role].push(user);
      return acc;
    }, {});

    // 4️⃣ Send response
    res.status(200).json({
      success: true,
      allUsers: transformedUsers,
      groupedByRole,
      total: transformedUsers.length,
      active: transformedUsers.filter((u: any) => u.isActive).length,
      inactive: transformedUsers.filter((u: any) => !u.isActive).length
    });
  } catch (error: any) {
    console.error('GET /api/users failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching users',
      error: error.message
    });
  }
});

// ✅ Get single user by ID
app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userObj = user.toJSON();
    const userResponse = {
      ...userObj,
      id: userObj._id.toString().slice(-6),
      _id: userObj._id.toString(),
      status: userObj.isActive ? 'active' : 'inactive',
      joinDate: user.joinDate.toISOString().split('T')[0],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user'
    });
  }
});

// ✅ Get user statistics
app.get('/api/users/stats', async (req: Request, res: Response) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching stats'
    });
  }
});

// ✅ Toggle user status
app.patch('/api/users/:id/toggle-status', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    user.updatedAt = new Date();
    await user.save();

    const userObj = user.toJSON();
    const userResponse = {
      ...userObj,
      id: userObj._id.toString().slice(-6),
      _id: userObj._id.toString(),
      status: userObj.isActive ? 'active' : 'inactive',
      joinDate: user.joinDate.toISOString().split('T')[0]
    };

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating status'
    });
  }
});

// ✅ UPDATE - Update user (enhanced)
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    // If name is provided, split into firstName and lastName
    if (updates.name) {
      const [firstName, ...lastNameParts] = updates.name.split(' ');
      updates.firstName = firstName;
      updates.lastName = lastNameParts.join(' ');
      delete updates.name;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userObj = user.toJSON();
    const userResponse = {
      ...userObj,
      id: userObj._id.toString().slice(-6),
      _id: userObj._id.toString(),
      status: userObj.isActive ? 'active' : 'inactive',
      joinDate: user.joinDate.toISOString().split('T')[0]
    };

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating user'
    });
  }
});

// ✅ DELETE - Delete user
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting user'
    });
  }
});

// ✅ Update user role
app.put('/api/users/:id/role', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'manager', 'supervisor', 'employee'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid role' 
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userObj = user.toJSON();
    const userResponse = {
      ...userObj,
      id: userObj._id.toString().slice(-6),
      _id: userObj._id.toString(),
      status: userObj.isActive ? 'active' : 'inactive',
      joinDate: user.joinDate.toISOString().split('T')[0]
    };

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating role'
    });
  }
});

// ✅ Search users
app.get('/api/users/search/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { department: { $regex: query, $options: 'i' } },
        { role: { $regex: query, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    const transformedUsers = users.map((user: IUser) => {
      const userObj = user.toJSON();
      return {
        ...userObj,
        id: userObj._id.toString().slice(-6),
        _id: userObj._id.toString(),
        status: userObj.isActive ? 'active' : 'inactive'
      };
    });

    res.status(200).json({
      success: true,
      users: transformedUsers,
      count: transformedUsers.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error searching users'
    });
  }
});

// ==================== PASSWORD HEALTH CHECK ENDPOINT ====================
app.get('/api/password-health', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Password health check requested');
    
    const result = await PasswordFixer.checkAndFixUnhashedPasswords();
    
    res.status(200).json({
      success: true,
      message: 'Password health check completed',
      data: result
    });
  } catch (error: any) {
    console.error('❌ Password health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking password health',
      error: error.message
    });
  }
});

// ==================== ROUTE REGISTRATION ====================
// IMPORTANT: Register all imported routes AFTER basic routes
app.use('/api/employees', employeeRoutes);
// Auth routes
app.use('/api/auth', authRoutes);

// HR & Payroll routes
//app.use('/api/employees', employeeRoutes);
app.use('/api/epf-forms', epfRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/deductions', deductionRoutes);
app.use('/api/salary-structures', salaryStructureRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/roster',rosterRoutes);
app.use('/api/salary-slips', salarySlipRoutes);
app.use('/api/leaves', leaveRoutes);

// Site & Project routes
app.use('/api/sites', siteRoutes);
app.use('/api/tasks', tasksRoutes);
// CRM routes
app.use('/api/crm/clients', clientRoutes);
app.use('/api/crm/leads', leadRoutes);
app.use('/api/crm/communications', communicationRoutes);
app.use('/api/admin-leaves', adminLeaveRoutes); // This is the correct line

// Inventory & Upload routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/upload', uploadRoutes);

// Expense routes
app.use('/api/expenses', expenseRoutes);


// ==================== CRM DASHBOARD STATS ====================
app.get('/api/crm/stats', async (req: Request, res: Response) => {
  try {
    // Dynamically import models to avoid circular dependencies
    const Client = (await import('./models/Client')).default;
    const Lead = (await import('./models/Lead')).default;
    const Communication = (await import('./models/Communication')).default;
    
    // Get counts
    const [clientsCount, leadsCount, communicationsCount] = await Promise.all([
      Client.countDocuments(),
      Lead.countDocuments({ status: { $nin: ['closed-won', 'closed-lost'] } }),
      Communication.countDocuments()
    ]);

    // Calculate total value from clients
    const allClients = await Client.find({}, 'value');
    const totalValue = allClients.reduce((sum: number, client: any) => {
      const valueStr = client.value || '0';
      const numericValue = parseFloat(valueStr.replace(/[₹,]/g, '')) || 0;
      return sum + numericValue;
    }, 0);
    
    // Format total value
    let formattedValue = '₹0';
    if (totalValue >= 10000000) { // 1 crore or more
      formattedValue = `₹${(totalValue / 10000000).toFixed(1)}Cr`;
    } else if (totalValue >= 100000) { // 1 lakh or more
      formattedValue = `₹${(totalValue / 100000).toFixed(1)}L`;
    } else {
      formattedValue = `₹${totalValue.toLocaleString('en-IN')}`;
    }

    res.status(200).json({
      success: true,
      data: {
        totalClients: clientsCount,
        activeLeads: leadsCount,
        totalValue: formattedValue,
        communications: communicationsCount
      }
    });
  } catch (error: any) {
    console.error('CRM stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching CRM stats',
      data: {
        totalClients: 0,
        activeLeads: 0,
        totalValue: '₹0',
        communications: 0
      }
    });
  }
});

// ==================== 404 HANDLER ====================
app.use('*', (req: Request, res: Response) => {
  console.log(`❌ 404: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// ==================== ERROR HANDLER ====================
app.use((error: Error, req: Request, res: Response, next: Function) => {
  console.error('❌ Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

const PORT = process.env.PORT || 5001;

// Start server with password fixer
const startServer = async () => {
  try {
    // Start the server
    app.listen(PORT, async () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
      console.log(`👤 Users endpoint: http://localhost:${PORT}/api/users`);
      console.log(`🔐 Password health: http://localhost:${PORT}/api/password-health`);
      console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Not Configured'}`);
      
      // Run password fixer after server starts
      setTimeout(runPasswordFixer, 2000); // Wait 2 seconds for server to stabilize
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔌 Shutting down gracefully...');
  await mongoose.disconnect();
  console.log('✅ MongoDB disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔌 Received SIGTERM, shutting down...');
  await mongoose.disconnect();
  console.log('✅ MongoDB disconnected');
  process.exit(0);
});

// Export upload for use in other files
export { app, upload, simpleUpload, cloudinary };

// Start the server
if (require.main === module) {
  startServer();
}