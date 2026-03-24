// routes/assignTaskRoutes.ts
import express from 'express';
import multer from 'multer';
import {
  getAllAssignTasks,
  getAssignTaskById,
  createAssignTask,
  updateAssignTask,
  deleteAssignTask,
  updateTaskStatus,
  addHourlyUpdate,
  addAttachment,
  deleteAttachment
} from '../controllers/assignTaskController';
import { cloudinary } from '../config/cloudinary';
import { Readable } from 'stream';

const router = express.Router();

// IMPORTANT: Use memoryStorage, NOT diskStorage
const storage = multer.memoryStorage();

// Configure multer for file uploads
const upload = multer({ 
  storage: storage, // This must be memoryStorage
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed') as any, false);
    }
  }
});

// Define Cloudinary resource type
type CloudinaryResourceType = 'auto' | 'image' | 'video' | 'raw';

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer: Buffer, originalname: string, mimetype: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Determine resource type based on mimetype with proper typing
    let resourceType: CloudinaryResourceType = 'auto';
    
    if (mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else if (mimetype === 'application/pdf') {
      resourceType = 'image'; // PDFs can be stored as image type in Cloudinary
    } else if (mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else {
      resourceType = 'raw'; // For other file types
    }

    console.log(`📤 Uploading to Cloudinary with resource type: ${resourceType}`);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'task-attachments',
        public_id: `task-${Date.now()}-${Math.round(Math.random() * 10000)}`,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Cloudinary upload successful!');
          console.log('📎 Cloudinary URL:', result?.secure_url);
          console.log('📎 Cloudinary Public ID:', result?.public_id);
          resolve(result);
        }
      }
    );

    // Create readable stream from buffer and pipe to uploadStream
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

// GET all assign tasks (with filters)
router.get('/', getAllAssignTasks);

// GET single task by ID
router.get('/:id', getAssignTaskById);

// POST create new task
router.post('/', createAssignTask);

// PUT update task
router.put('/:id', updateAssignTask);

// PATCH update task status
router.patch('/:id/status', updateTaskStatus);

// DELETE task
router.delete('/:id', deleteAssignTask);

// POST add hourly update
router.post('/:id/hourly-updates', addHourlyUpdate);

// POST add attachment (single file) - Upload to Cloudinary
router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    console.log('📎 ===== ATTACHMENT UPLOAD START =====');
    console.log('📎 Task ID:', req.params.id);
    console.log('📎 Request body:', req.body);
    console.log('📎 File received:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      hasBuffer: !!req.file.buffer
    } : 'No file');

    // If no file was uploaded but other fields exist, still process
    if (!req.file && Object.keys(req.body).length > 0) {
      console.log('📎 No file, processing JSON data only');
      return addAttachment(req, res);
    }
    
    // If file was uploaded, upload to Cloudinary
    if (req.file) {
      console.log(`📎 Uploading file to Cloudinary: ${req.file.originalname}`);
      
      try {
        // Upload to Cloudinary
        const result = await uploadToCloudinary(
          req.file.buffer, 
          req.file.originalname,
          req.file.mimetype
        );
        
        // Add Cloudinary URL and info to request body
        req.body.filename = req.file.originalname;
        req.body.url = result.secure_url; // This MUST be a Cloudinary URL
        req.body.size = req.file.size;
        req.body.type = req.file.mimetype;
        req.body.cloudinaryPublicId = result.public_id;
        req.body.uploadedBy = req.body.uploadedBy;
        req.body.uploadedByName = req.body.uploadedByName;
        
        console.log('📎 Request body after Cloudinary upload:', {
          filename: req.body.filename,
          url: req.body.url,
          size: req.body.size,
          type: req.body.type,
          cloudinaryPublicId: req.body.cloudinaryPublicId
        });
        
        // Call the original addAttachment controller
        return addAttachment(req, res);
      } catch (cloudinaryError: any) {
        console.error('❌ Cloudinary upload failed:', cloudinaryError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload to Cloudinary',
          error: cloudinaryError.message
        });
      }
    }
    
    res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  } catch (error: any) {
    console.error('❌ Error in upload route:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
});

// DELETE attachment
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

export default router;