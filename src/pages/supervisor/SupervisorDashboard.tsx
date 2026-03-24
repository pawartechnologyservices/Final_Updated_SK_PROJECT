import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  ClipboardList, 
  CheckCircle2, 
  FileText, 
  AlertTriangle,
  Clock,
  TrendingUp,
  MessageSquare,
  Calendar,
  BarChart3,
  Plus,
  Download,
  Search,
  RefreshCw,
  LogIn,
  LogOut,
  Coffee,
  Timer,
  UserCheck,
  ClipboardCheck,
  AlertCircle,
  Wifi,
  WifiOff,
  Crown,
  Eye,
  Ban,
  Loader2,
  Building,
  CalendarDays,
  XCircle,
  UserX,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Home,
  Shield,
  Car,
  Trash2,
  Droplets,
  ShoppingCart,
  DollarSign,
  Briefcase,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  Info,
  Target,
  ExternalLink,
  UserCheck as UserCheckIcon,
  UserX as UserXIcon,
  Calendar as CalendarIcon,
  Filter,
  Camera
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import CameraCapture from "./CameraCapture";

// API URL
const API_URL = process.env.NODE_ENV === 'development' 
  ? `http://${window.location.hostname}:5001/api` 
  : '/api';

// Types
interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  siteName?: string;
  status: "active" | "inactive" | "left";
  email?: string;
  phone?: string;
  checkInPhoto?: string;
  checkOutPhoto?: string;
}

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  status: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInPhoto?: string | null;
  checkOutPhoto?: string | null;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  totalHours?: number;
  breakTime?: number;
  isCheckedIn?: boolean;
  isOnBreak?: boolean;
  supervisorId?: string;
  remarks?: string;
}

interface LeaveRequest {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  site: string;
  siteId?: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedBy: string;
  appliedFor: string;
  createdAt: string;
  updatedAt: string;
  isSupervisorLeave?: boolean;
  supervisorId?: string;
  remarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

interface Site {
  _id: string;
  name: string;
  clientName?: string;
  status?: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  deadline: string;
  dueDateTime?: string;
  siteId: string;
  siteName: string;
  clientName?: string;
  assignedUsers?: Array<{
    userId: string;
    name: string;
    role: string;
    assignedAt: string;
    status: string;
  }>;
  assignedTo?: string;
  assignedToName?: string;
}

interface DashboardStats {
  totalEmployees: number;
  assignedTasks: number;
  completedTasks: number;
  pendingReports: number;
  attendanceRate: number;
  overtimeHours: number;
  productivity: number;
  pendingRequests: number;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  employee: string;
  priority: string;
  timestamp: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface SiteEmployeeCount {
  siteName: string;
  totalEmployees: number;
}

interface AttendanceStatus {
  isCheckedIn: boolean;
  isOnBreak: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  lastCheckInDate?: string | null;
  hasCheckedInToday?: boolean;
  hasCheckedOutToday?: boolean;
}

interface SupervisorAttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  supervisorId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  status: string;
  shift: string;
  hours: number;
}

interface ManagerAttendanceData {
  _id: string;
  managerId: string;
  managerName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  lastCheckInDate: string | null;
  isCheckedIn: boolean;
  isOnBreak: boolean;
}

interface AttendanceSummary {
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  weeklyOffCount: number;
  leaveCount: number;
  halfDayCount: number;
}

interface OutletContext {
  onMenuClick: () => void;
}

// Helper function to format date
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to format time for display
const formatTimeForDisplay = (timestamp: string | null): string => {
  if (!timestamp || timestamp === "-" || timestamp === "") return "-";
  
  try {
    if (typeof timestamp === 'string' && (timestamp.includes('AM') || timestamp.includes('PM'))) {
      return timestamp;
    }
    
    if (timestamp.includes('T')) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      }
    }
    
    const timeParts = timestamp.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0]);
      const minutes = timeParts[1];
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${period}`;
    }
    
    return timestamp;
  } catch (error) {
    return timestamp || "-";
  }
};

// Helper function to format hours
const formatHours = (hours: number): string => {
  if (hours < 0) {
    return "0.00 hrs";
  }
  return `${hours.toFixed(2)} hrs`;
};

// Helper function to normalize site names for comparison
const normalizeSiteName = (siteName: string | null | undefined): string => {
  if (!siteName) return '';
  return siteName.toString().toLowerCase().trim();
};

// Helper function to calculate total hours
const calculateTotalHours = (start: string | null, end: string | null): number => {
  if (!start || !end) return 0;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return (endTime - startTime) / (1000 * 60 * 60);
};

// Helper function to calculate break time
const calculateBreakTime = (start: string | null, end: string | null): number => {
  if (!start || !end) return 0;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return (endTime - startTime) / (1000 * 60 * 60);
};

// Helper to check if a date is within a leave range
const isDateInLeaveRange = (date: string, fromDate: string, toDate: string): boolean => {
  const checkDate = new Date(date);
  const start = new Date(fromDate);
  const end = new Date(toDate);
  return checkDate >= start && checkDate <= end;
};

// Get current supervisor from localStorage
const getCurrentSupervisor = () => {
  const storedUser = localStorage.getItem("sk_user");
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return {
        id: user._id || user.id || `supervisor-${Date.now()}`,
        name: user.name || user.firstName || 'Supervisor',
        supervisorId: user.supervisorId || user._id || `supervisor-${Date.now()}`,
        email: user.email || ''
      };
    } catch (e) {
      console.error('Error parsing user:', e);
      return {
        id: `supervisor-${Date.now()}`,
        name: 'Supervisor',
        supervisorId: `supervisor-${Date.now()}`,
        email: ''
      };
    }
  } else {
    return {
      id: 'supervisor-001',
      name: 'Supervisor User',
      supervisorId: 'supervisor-001',
      email: 'supervisor@example.com'
    };
  }
};

// Mock data generators
const generateMockStats = (totalEmployees: number, assignedTasks: number, completedTasks: number): DashboardStats => ({
  totalEmployees: totalEmployees,
  assignedTasks: assignedTasks,
  completedTasks: completedTasks,
  pendingReports: 0,
  attendanceRate: 0,
  overtimeHours: 0,
  productivity: 0,
  pendingRequests: 0
});

const generateMockActivities = (): Activity[] => [
  {
    id: '1',
    type: 'task',
    message: 'Completed monthly sales report',
    employee: 'John Doe',
    priority: 'high',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: '2',
    type: 'approval',
    message: 'Requested leave approval',
    employee: 'Sarah Smith',
    priority: 'medium',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: '3',
    type: 'completion',
    message: 'Finished project documentation',
    employee: 'Mike Johnson',
    priority: 'low',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
  }
];

const generateMockTeam = (): TeamMember[] => [
  { id: '1', name: 'John Doe', role: 'Senior Developer', status: 'active' },
  { id: '2', name: 'Sarah Smith', role: 'QA Engineer', status: 'active' },
  { id: '3', name: 'Mike Johnson', role: 'Frontend Developer', status: 'remote' },
  { id: '4', name: 'Emily Brown', role: 'Backend Developer', status: 'on leave' },
  { id: '5', name: 'David Wilson', role: 'DevOps Engineer', status: 'active' }
];

const generateMockTasks = (): Task[] => [
  {
    _id: '1',
    title: 'Update project documentation',
    description: 'Update the project documentation with latest changes',
    priority: 'high',
    status: 'in-progress',
    deadline: '2024-01-15',
    siteId: 'site1',
    siteName: 'Main Office',
    clientName: 'Internal',
    assignedUsers: [{ userId: '1', name: 'John Doe', role: 'Developer', assignedAt: new Date().toISOString(), status: 'assigned' }]
  },
  {
    _id: '2',
    title: 'Fix login authentication bug',
    description: 'Fix the login authentication bug reported by users',
    priority: 'high',
    status: 'in-progress',
    deadline: '2024-01-12',
    siteId: 'site1',
    siteName: 'Main Office',
    clientName: 'Internal',
    assignedUsers: [{ userId: '2', name: 'Sarah Smith', role: 'QA', assignedAt: new Date().toISOString(), status: 'assigned' }]
  },
  {
    _id: '3',
    title: 'Design new dashboard layout',
    description: 'Create new dashboard layout designs',
    priority: 'medium',
    status: 'pending',
    deadline: '2024-01-20',
    siteId: 'site2',
    siteName: 'Branch Office',
    clientName: 'Client A',
    assignedUsers: [{ userId: '3', name: 'Mike Johnson', role: 'Designer', assignedAt: new Date().toISOString(), status: 'assigned' }]
  },
  {
    _id: '4',
    title: 'Performance optimization',
    description: 'Optimize application performance',
    priority: 'low',
    status: 'pending',
    deadline: '2024-01-18',
    siteId: 'site2',
    siteName: 'Branch Office',
    clientName: 'Client A',
    assignedUsers: [{ userId: '4', name: 'Emily Brown', role: 'Developer', assignedAt: new Date().toISOString(), status: 'assigned' }]
  }
];

const SupervisorDashboard = () => {
  const { onMenuClick } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  
  // Camera states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraAction, setCameraAction] = useState<'checkin' | 'checkout' | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Photo modal for viewing
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [selectedPhotoType, setSelectedPhotoType] = useState<'checkin' | 'checkout'>('checkin');
  
  // State for data
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    assignedTasks: 0,
    completedTasks: 0,
    pendingReports: 0,
    attendanceRate: 0,
    overtimeHours: 0,
    productivity: 0,
    pendingRequests: 0
  });
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<string>('');
  
  // State for API connection
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  
  // Current supervisor state
  const [currentSupervisor, setCurrentSupervisor] = useState(getCurrentSupervisor());
  
  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceStatus>({
    isCheckedIn: false,
    isOnBreak: false,
    checkInTime: null,
    checkOutTime: null,
    checkInPhoto: null,
    checkOutPhoto: null,
    breakStartTime: null,
    breakEndTime: null,
    totalHours: 0,
    breakTime: 0,
    lastCheckInDate: null,
    hasCheckedInToday: false,
    hasCheckedOutToday: false
  });

  // Manager attendance data
  const [managerAttendance, setManagerAttendance] = useState<ManagerAttendanceData | null>(null);
  const [isLoadingManagerAttendance, setIsLoadingManagerAttendance] = useState(false);

  // Supervisor attendance records
  const [supervisorAttendanceRecords, setSupervisorAttendanceRecords] = useState<SupervisorAttendanceRecord[]>([]);

  // Loading states
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  
  // Site and employee data
  const [supervisorSites, setSupervisorSites] = useState<Site[]>([]);
  const [supervisorSiteNames, setSupervisorSiteNames] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [siteEmployeeCounts, setSiteEmployeeCounts] = useState<SiteEmployeeCount[]>([]);
  
  // Leave requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [todayLeaveCount, setTodayLeaveCount] = useState(0);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  
  // Task tracking state
  const [assignedTasksCount, setAssignedTasksCount] = useState(0);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  // Loading states for data fetching
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);
  
  // Attendance summary
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalEmployees: 0,
    presentCount: 0,
    absentCount: 0,
    weeklyOffCount: 0,
    leaveCount: 0,
    halfDayCount: 0
  });

  // Date selection
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Handle view photo
  const handleViewPhoto = (photoUrl: string | null | undefined, type: 'checkin' | 'checkout') => {
    if (photoUrl) {
      setSelectedPhotoUrl(photoUrl);
      setSelectedPhotoType(type);
      setPhotoModalOpen(true);
    } else {
      toast.error('No photo available');
    }
  };

  // Handle photo capture for supervisor
  const handlePhotoCapture = async (photoFile: File) => {
    if (!cameraAction || !currentSupervisor.id) return;
    
    setUploadingPhoto(true);
    
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('employeeId', currentSupervisor.id);
      formData.append('employeeName', currentSupervisor.name);
      
      if (currentSupervisor.supervisorId) {
        formData.append('supervisorId', currentSupervisor.supervisorId);
      }
      
      const endpoint = cameraAction === 'checkin' 
        ? `${API_URL}/attendance/checkin-with-photo`
        : `${API_URL}/attendance/checkout-with-photo`;
      
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const data = response.data;
      
      if (data.success) {
        toast.success(`Successfully ${cameraAction === 'checkin' ? 'checked in' : 'checked out'} with photo!`);
        
        if (cameraAction === 'checkin') {
          const newAttendance = {
            ...attendance,
            isCheckedIn: true,
            checkInTime: data.data?.checkInTime || new Date().toISOString(),
            checkInPhoto: data.data?.checkInPhoto,
            lastCheckInDate: new Date().toDateString(),
            hasCheckedInToday: true,
            hasCheckedOutToday: false
          };
          setAttendance(newAttendance);
          localStorage.setItem(`supervisorAttendance_${currentSupervisor.id}`, JSON.stringify(newAttendance));
        } else {
          const newAttendance = {
            ...attendance,
            isCheckedIn: false,
            isOnBreak: false,
            checkOutTime: data.data?.checkOutTime || new Date().toISOString(),
            checkOutPhoto: data.data?.checkOutPhoto,
            totalHours: data.data?.totalHours || 0,
            hasCheckedOutToday: true
          };
          setAttendance(newAttendance);
          localStorage.setItem(`supervisorAttendance_${currentSupervisor.id}`, JSON.stringify(newAttendance));
        }
        
        addActivity(cameraAction === 'checkin' ? 'checkin' : 'checkout', 
          `${cameraAction === 'checkin' ? 'Checked in' : 'Checked out'} with photo verification at ${formatTimeForDisplay(new Date().toISOString())}`);
        
        setCameraOpen(false);
        setCameraAction(null);
        
        // Refresh data
        loadSupervisorAttendanceRecords();
        loadAttendanceStatus();
      } else {
        toast.error(data.message || `Error ${cameraAction === 'checkin' ? 'checking in' : 'checking out'}`);
      }
    } catch (error: any) {
      console.error('Photo attendance error:', error);
      toast.error(`Failed to ${cameraAction === 'checkin' ? 'check in' : 'check out'}: ${error.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle check-in with camera
  const handleCheckIn = () => {
    if (attendance.hasCheckedInToday && !attendance.isCheckedIn) {
      toast.error("You have already checked in today. Only one check-in allowed per day.");
      return;
    }

    if (attendance.isCheckedIn) {
      toast.error("You are already checked in!");
      return;
    }
    
    setCameraAction('checkin');
    setCameraOpen(true);
  };

  // Handle check-out with camera
  const handleCheckOut = () => {
    if (attendance.hasCheckedOutToday) {
      toast.error("You have already checked out today.");
      return;
    }

    if (!attendance.isCheckedIn && !attendance.hasCheckedInToday) {
      toast.error("You need to check in first!");
      return;
    }

    if (!attendance.isCheckedIn && attendance.hasCheckedInToday) {
      toast.warning("You are not currently checked in, but you checked in earlier today.", {
        action: {
          label: "Force Check Out",
          onClick: () => forceCheckOut()
        }
      });
      return;
    }
    
    setCameraAction('checkout');
    setCameraOpen(true);
  };

  // Force check out without photo
  const forceCheckOut = async () => {
    try {
      console.log('🔄 Force checking out for supervisor:', currentSupervisor.id);
      
      const now = new Date().toISOString();
      const totalHours = calculateTotalHours(attendance.checkInTime, now);
      
      const newAttendance = {
        ...attendance,
        isCheckedIn: false,
        isOnBreak: false,
        checkOutTime: now,
        totalHours: totalHours,
        hasCheckedOutToday: true
      };
      
      setAttendance(newAttendance);
      localStorage.setItem(`supervisorAttendance_${currentSupervisor.id}`, JSON.stringify(newAttendance));
      addActivity('checkout', `Force checked out at ${formatTimeForDisplay(now)} - Total: ${totalHours.toFixed(2)}h`);
      
      toast.success(`✅ Force checked out successfully! Total hours: ${totalHours.toFixed(2)}`);
      
    } catch (error) {
      console.error('Force check-out error:', error);
      toast.error("Error force checking out");
    }
  };

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      setIsCheckingConnection(true);
      console.log('🔄 Checking backend connection at:', `${API_URL}`);
      
      const response = await axios.get(`${API_URL}/employees?limit=1`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      console.log(`✅ Backend connected (status: ${response.status})`);
      setIsBackendConnected(true);
      
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        console.error('❌ Backend connection error - server not reachable:', error);
        setIsBackendConnected(false);
      } else if (error.response) {
        console.log(`✅ Backend is running but returned status ${error.response.status}`);
        setIsBackendConnected(true);
      } else {
        console.error('❌ Backend connection error:', error);
        setIsBackendConnected(false);
      }
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Fetch leave requests and count today's leaves
  const fetchTodayLeaveCount = useCallback(async () => {
    if (!currentSupervisor) return 0;
    
    try {
      setLoadingLeaves(true);
      console.log("🔍 Fetching leave requests for today:", selectedDate);
      
      const response = await axios.get(`${API_URL}/leaves`, {
        params: { limit: 1000 }
      });
      
      let allLeaves: LeaveRequest[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          allLeaves = response.data;
        } else if (response.data.success && Array.isArray(response.data.data)) {
          allLeaves = response.data.data;
        } else if (response.data.leaves && Array.isArray(response.data.leaves)) {
          allLeaves = response.data.leaves;
        }
      }
      
      console.log(`📊 Total leaves from API: ${allLeaves.length}`);
      
      const today = selectedDate;
      const approvedLeavesToday = allLeaves.filter(leave => {
        if (leave.status !== 'approved') return false;
        return isDateInLeaveRange(today, leave.fromDate, leave.toDate);
      });
      
      console.log(`✅ Found ${approvedLeavesToday.length} employees on leave today`);
      
      setLeaveRequests(allLeaves);
      setTodayLeaveCount(approvedLeavesToday.length);
      
      return approvedLeavesToday.length;
      
    } catch (error: any) {
      console.error('❌ Error fetching leave requests:', error);
      return 0;
    } finally {
      setLoadingLeaves(false);
    }
  }, [currentSupervisor, selectedDate]);

  // Fetch tasks assigned to this supervisor
  const fetchAssignedTasks = useCallback(async () => {
    if (!currentSupervisor) return { assigned: 0, completed: 0 };
    
    try {
      setLoadingTasks(true);
      const supervisorId = currentSupervisor.id;
      const supervisorName = currentSupervisor.name;
      
      console.log("🔍 Fetching tasks assigned to supervisor:", {
        id: supervisorId,
        name: supervisorName
      });
      
      const response = await axios.get(`${API_URL}/assigntasks`, {
        params: { limit: 1000 }
      });
      
      let allTasks: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          allTasks = response.data;
        } else if (response.data.success && Array.isArray(response.data.data)) {
          allTasks = response.data.data;
        } else if (response.data.tasks && Array.isArray(response.data.tasks)) {
          allTasks = response.data.tasks;
        }
      }
      
      console.log(`📊 Total tasks from assigntasks: ${allTasks.length}`);
      
      const myTasks = allTasks.filter(task => {
        if (!task.assignedSupervisors || !Array.isArray(task.assignedSupervisors)) {
          return false;
        }
        
        return task.assignedSupervisors.some(supervisor => {
          const supervisorUserId = supervisor.userId;
          const matchById = String(supervisorUserId) === String(supervisorId);
          const matchByName = supervisor.name?.toLowerCase().trim() === supervisorName?.toLowerCase().trim();
          return matchById || matchByName;
        });
      });
      
      const completedCount = myTasks.filter(task => {
        const myInfo = task.assignedSupervisors?.find((supervisor: any) => {
          const matchById = String(supervisor.userId) === String(supervisorId);
          const matchByName = supervisor.name?.toLowerCase().trim() === supervisorName?.toLowerCase().trim();
          return matchById || matchByName;
        });
        return myInfo?.status === 'completed' || task.status === 'completed';
      }).length;
      
      console.log(`✅ Found ${myTasks.length} tasks assigned to this supervisor (${completedCount} completed)`);
      
      return { assigned: myTasks.length, completed: completedCount };
      
    } catch (error: any) {
      console.error('❌ Error fetching assigned tasks:', error);
      return { assigned: 0, completed: 0 };
    } finally {
      setLoadingTasks(false);
    }
  }, [currentSupervisor]);

  // Fetch tasks where this specific supervisor is assigned (for site filtering)
  const fetchSupervisorSitesFromTasks = useCallback(async () => {
    if (!currentSupervisor) return { siteNames: [], siteIds: [] };
    
    try {
      const supervisorId = currentSupervisor.id;
      const supervisorName = currentSupervisor.name;
      
      console.log("🔍 Fetching tasks for supervisor:", {
        id: supervisorId,
        name: supervisorName
      });
      
      const response = await axios.get(`${API_URL}/tasks`, {
        params: { limit: 1000 }
      });
      
      let supervisorSiteNamesSet = new Set<string>();
      let supervisorSiteIdsSet = new Set<string>();
      let tasksWithSupervisor: Task[] = [];
      
      let allTasks: Task[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          allTasks = response.data;
        } else if (response.data.success && Array.isArray(response.data.data)) {
          allTasks = response.data.data;
        } else if (response.data.tasks && Array.isArray(response.data.tasks)) {
          allTasks = response.data.tasks;
        }
      }
      
      console.log(`📊 Total tasks fetched: ${allTasks.length}`);
      
      allTasks.forEach((task: Task) => {
        let isAssignedToThisSupervisor = false;
        
        if (task.assignedUsers && Array.isArray(task.assignedUsers)) {
          isAssignedToThisSupervisor = task.assignedUsers.some(user => {
            const userIdMatch = user.userId === supervisorId;
            const nameMatch = user.name?.toLowerCase() === supervisorName?.toLowerCase();
            return userIdMatch || nameMatch;
          });
        }
        
        if (!isAssignedToThisSupervisor && task.assignedTo) {
          isAssignedToThisSupervisor = 
            task.assignedTo === supervisorId || 
            task.assignedToName?.toLowerCase() === supervisorName?.toLowerCase();
        }
        
        if (isAssignedToThisSupervisor && task.siteId && task.siteName) {
          supervisorSiteIdsSet.add(task.siteId);
          supervisorSiteNamesSet.add(task.siteName);
          tasksWithSupervisor.push(task);
        }
      });
      
      const supervisorSiteNames = Array.from(supervisorSiteNamesSet);
      const supervisorSiteIds = Array.from(supervisorSiteIdsSet);
      
      console.log(`✅ Found ${tasksWithSupervisor.length} tasks for this supervisor`);
      console.log("📍 Supervisor's sites from tasks:", supervisorSiteNames);
      
      return { siteNames: supervisorSiteNames, siteIds: supervisorSiteIds };
      
    } catch (error: any) {
      console.error('❌ Error fetching tasks:', error);
      return { siteNames: [], siteIds: [] };
    }
  }, [currentSupervisor]);

  // Fetch all sites and filter by supervisor's task-assigned sites
  const fetchAllSites = useCallback(async () => {
    if (!currentSupervisor) return [];
    
    try {
      setLoadingSites(true);
      const { siteNames: taskSiteNames, siteIds: taskSiteIds } = await fetchSupervisorSitesFromTasks();
      
      console.log("🌐 Fetching all sites from API...");
      
      const response = await axios.get(`${API_URL}/sites`);
      
      let allSitesData: Site[] = [];
      
      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          allSitesData = response.data.data;
        } else if (Array.isArray(response.data)) {
          allSitesData = response.data;
        } else if (response.data.sites && Array.isArray(response.data.sites)) {
          allSitesData = response.data.sites;
        }
      }
      
      console.log(`📊 Fetched ${allSitesData.length} sites from API`);
      
      const transformedSites = allSitesData.map((site: any) => ({
        _id: site._id || site.id,
        name: site.name,
        clientName: site.clientName || site.client,
        status: site.status || "active"
      }));
      
      let supervisorSiteList: Site[] = [];
      
      if (taskSiteNames.length > 0) {
        supervisorSiteList = transformedSites.filter(site => {
          const exactNameMatch = taskSiteNames.some(taskSiteName => 
            site.name === taskSiteName
          );
          
          const exactNormalizedMatch = taskSiteNames.some(taskSiteName => 
            normalizeSiteName(site.name) === normalizeSiteName(taskSiteName)
          );
          
          const idMatch = taskSiteIds.includes(site._id);
          
          return exactNameMatch || exactNormalizedMatch || idMatch;
        });
        
        console.log(`✅ Matched ${supervisorSiteList.length} sites from task assignments (exact matches only)`);
      } else {
        supervisorSiteList = transformedSites;
        console.log("⚠️ No task sites found, showing all sites");
      }
      
      setSupervisorSites(supervisorSiteList);
      setSupervisorSiteNames(supervisorSiteList.map(site => site.name));
      
      setLoadingSites(false);
      return supervisorSiteList;
      
    } catch (error: any) {
      console.error('❌ Error fetching sites:', error);
      setLoadingSites(false);
      return [];
    }
  }, [currentSupervisor, fetchSupervisorSitesFromTasks]);

  // Fetch employees assigned to supervisor's sites
  const fetchEmployees = useCallback(async () => {
    if (!currentSupervisor) {
      console.log("No current supervisor");
      return;
    }
    
    try {
      setLoadingEmployees(true);
      console.log("Fetching employees...");
      
      let supervisorSiteList = supervisorSites;
      let supervisorSiteNameList = supervisorSiteNames;
      
      if (supervisorSiteList.length === 0) {
        supervisorSiteList = await fetchAllSites() || [];
        supervisorSiteNameList = supervisorSiteList.map(site => site.name);
      }
      
      if (supervisorSiteNameList.length === 0) {
        console.log("❌ No sites from tasks - setting empty employees array");
        setEmployees([]);
        setSiteEmployeeCounts([]);
        
        setSummary(prev => ({
          ...prev,
          totalEmployees: 0
        }));
        
        setStats(prev => ({
          ...prev,
          totalEmployees: 0
        }));
        
        toast.warning("You have no tasks assigned to any sites. Please contact your administrator.");
        setLoadingEmployees(false);
        return;
      }
      
      console.log("📡 Fetching all employees from API:", `${API_URL}/employees`);
      
      const response = await axios.get(`${API_URL}/employees`, {
        params: { limit: 1000 }
      });
      
      let fetchedEmployees: Employee[] = [];
      let allEmployees: Employee[] = [];
      
      if (response.data) {
        if (response.data.success) {
          allEmployees = response.data.data || response.data.employees || [];
        } else if (Array.isArray(response.data)) {
          allEmployees = response.data;
        } else if (response.data.employees && Array.isArray(response.data.employees)) {
          allEmployees = response.data.employees;
        }
        
        console.log(`📊 Total employees from API: ${allEmployees.length}`);
        console.log("📍 Supervisor's task-assigned sites:", supervisorSiteNameList);
        
        fetchedEmployees = allEmployees.filter((emp: Employee) => {
          const employeeSite = emp.siteName || '';
          
          const exactMatch = supervisorSiteNameList.some(siteName => 
            siteName === employeeSite
          );
          
          const normalizedExactMatch = supervisorSiteNameList.some(siteName => 
            normalizeSiteName(siteName) === normalizeSiteName(employeeSite)
          );
          
          const matches = exactMatch || normalizedExactMatch;
          
          if (matches) {
            console.log(`✅ Employee ${emp.name} (${emp.employeeId}) matches site: "${employeeSite}"`);
          } else {
            console.log(`❌ Employee ${emp.name} site: "${employeeSite}" does NOT match any supervisor site`);
          }
          
          return matches;
        });
        
        console.log(`✅ Filtered ${fetchedEmployees.length} employees for supervisor's task-assigned sites`);
        
        const siteCountMap = new Map<string, number>();
        fetchedEmployees.forEach(emp => {
          const siteName = emp.siteName || 'Unknown Site';
          siteCountMap.set(siteName, (siteCountMap.get(siteName) || 0) + 1);
        });
        
        const siteCounts = Array.from(siteCountMap.entries()).map(([siteName, count]) => ({
          siteName,
          totalEmployees: count
        }));
        
        setSiteEmployeeCounts(siteCounts);
        
        setSummary(prev => ({
          ...prev,
          totalEmployees: fetchedEmployees.length
        }));
        
        setStats(prev => ({
          ...prev,
          totalEmployees: fetchedEmployees.length
        }));
        
        if (fetchedEmployees.length > 0) {
          toast.success(`Loaded ${fetchedEmployees.length} employees for your task-assigned sites`);
        } else {
          toast.warning(`No employees found for your task-assigned sites: ${supervisorSiteNameList.join(', ')}`);
        }
      }
      
      setEmployees(fetchedEmployees);
      
    } catch (error: any) {
      console.error('❌ Error fetching employees:', error);
      
      if (error.code === 'ERR_NETWORK') {
        toast.error("Network error: Cannot connect to server");
      } else {
        toast.error(`Failed to load employees: ${error.message}`);
      }
      
      setEmployees([]);
      setSiteEmployeeCounts([]);
      
      setSummary(prev => ({
        ...prev,
        totalEmployees: 0
      }));
      
      setStats(prev => ({
        ...prev,
        totalEmployees: 0
      }));
    } finally {
      setLoadingEmployees(false);
    }
  }, [currentSupervisor, supervisorSites, supervisorSiteNames, fetchAllSites]);

  // Load attendance records for selected date
  const loadAttendanceRecords = async (date: string) => {
    try {
      setLoadingAttendance(true);
      console.log('📋 Fetching attendance for date:', date);
      
      if (employees.length === 0) {
        console.log("No employees to fetch attendance for");
        setAttendanceRecords([]);
        setSummary(prev => ({
          ...prev,
          presentCount: 0,
          absentCount: 0,
          weeklyOffCount: 0,
          halfDayCount: 0
        }));
        setLoadingAttendance(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { date }
      });
      
      console.log('Attendance API response:', response.data);
      
      if (response.data && response.data.success) {
        const allRecords = response.data.data || [];
        
        const employeeIdsFromSites = new Set(employees.map(emp => emp._id));
        const employeeNamesFromSites = new Set(employees.map(emp => emp.name));
        
        const filteredRecords = allRecords.filter((record: any) => 
          employeeIdsFromSites.has(record.employeeId) || 
          employeeNamesFromSites.has(record.employeeName)
        );
        
        console.log(`📊 Total attendance records: ${allRecords.length}, Filtered: ${filteredRecords.length}`);
        
        setAttendanceRecords(filteredRecords);
        
        const presentCount = filteredRecords.filter((r: AttendanceRecord) => r.status === 'present').length;
        const weeklyOffCount = filteredRecords.filter((r: AttendanceRecord) => r.status === 'weekly-off').length;
        const halfDayCount = filteredRecords.filter((r: AttendanceRecord) => r.status === 'half-day').length;
        
        const absentFromRecords = filteredRecords.filter((r: AttendanceRecord) => r.status === 'absent').length;
        
        const employeesWithRecords = new Set(filteredRecords.map(r => r.employeeId));
        const employeesWithoutRecords = employees.filter(emp => !employeesWithRecords.has(emp._id)).length;
        
        const totalAbsentCount = absentFromRecords + employeesWithoutRecords;
        
        console.log(`📊 Summary - Total: ${employees.length}, Present: ${presentCount}, Weekly Off: ${weeklyOffCount}, Half Day: ${halfDayCount}, Absent: ${totalAbsentCount}`);
        
        setSummary(prev => ({
          totalEmployees: employees.length,
          presentCount,
          absentCount: totalAbsentCount,
          weeklyOffCount,
          leaveCount: todayLeaveCount,
          halfDayCount
        }));
      } else {
        console.error('Failed to load attendance:', response.data?.message);
        setAttendanceRecords([]);
        
        setSummary(prev => ({
          totalEmployees: employees.length,
          presentCount: 0,
          absentCount: employees.length,
          weeklyOffCount: 0,
          leaveCount: todayLeaveCount,
          halfDayCount: 0
        }));
      }
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      
      if (error.code === 'ERR_NETWORK') {
        toast.error("Network error: Cannot fetch attendance data");
      }
      
      setAttendanceRecords([]);
      
      setSummary(prev => ({
        totalEmployees: employees.length,
        presentCount: 0,
        absentCount: employees.length,
        weeklyOffCount: 0,
        leaveCount: todayLeaveCount,
        halfDayCount: 0
      }));
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Load manager attendance data
  const loadManagerAttendanceData = async () => {
    try {
      setIsLoadingManagerAttendance(true);
      console.log('🔄 Loading manager attendance data...');
      
      const storedUser = localStorage.getItem("sk_user");
      let managerId = '';
      let managerName = '';
      
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          managerId = user._id || user.id || `manager-${Date.now()}`;
          managerName = user.name || user.firstName || 'Manager';
        } catch (e) {
          console.error('Error parsing user:', e);
          managerId = `manager-${Date.now()}`;
          managerName = 'Manager';
        }
      } else {
        managerId = `manager-${Date.now()}`;
        managerName = 'Demo Manager';
      }
      
      if (!managerId) {
        console.log('⚠️ No manager ID found, skipping manager attendance fetch');
        setIsLoadingManagerAttendance(false);
        return;
      }
      
      console.log('📋 Fetching manager attendance for ID:', managerId);
      
      const response = await fetch(`${API_URL}/manager-attendance/today/${managerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Manager attendance API response:', data);
        
        if (data.success && data.data) {
          setManagerAttendance(data.data);
          console.log('✅ Manager attendance data loaded:', data.data);
          
          if (data.data.checkInTime) {
            const checkInTime = formatTimeForDisplay(data.data.checkInTime);
            addActivity('checkin', `Manager ${managerName} checked in at ${checkInTime}`, 'manager');
          }
        } else {
          console.log('ℹ️ No manager attendance data found for today');
          setManagerAttendance(null);
        }
      } else {
        console.log('⚠️ Manager attendance API failed, status:', response.status);
        setManagerAttendance(null);
      }
    } catch (error) {
      console.error('❌ Error loading manager attendance:', error);
      setManagerAttendance(null);
    } finally {
      setIsLoadingManagerAttendance(false);
    }
  };

  // Load attendance status
  const loadAttendanceStatus = async () => {
    try {
      setIsCheckingStatus(true);
      console.log('🔄 Loading attendance status from API...');
      
      const response = await fetch(`${API_URL}/attendance/status/${currentSupervisor.id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 API Response data:', data);
        
        if (data.success && data.data) {
          const apiAttendance = data.data;
          const today = new Date().toDateString();
          const lastCheckInDate = apiAttendance.lastCheckInDate ? 
            new Date(apiAttendance.lastCheckInDate).toDateString() : null;
          
          const hasCheckedInToday = lastCheckInDate === today;
          const hasCheckedOutToday = apiAttendance.checkOutTime && 
            new Date(apiAttendance.checkOutTime).toDateString() === today;
          
          const newAttendance: AttendanceStatus = {
            isCheckedIn: apiAttendance.isCheckedIn || false,
            isOnBreak: apiAttendance.isOnBreak || false,
            checkInTime: apiAttendance.checkInTime || null,
            checkOutTime: apiAttendance.checkOutTime || null,
            checkInPhoto: apiAttendance.checkInPhoto || null,
            checkOutPhoto: apiAttendance.checkOutPhoto || null,
            breakStartTime: apiAttendance.breakStartTime || null,
            breakEndTime: apiAttendance.breakEndTime || null,
            totalHours: Number(apiAttendance.totalHours) || 0,
            breakTime: Number(apiAttendance.breakTime) || 0,
            lastCheckInDate: apiAttendance.lastCheckInDate || null,
            hasCheckedInToday: hasCheckedInToday,
            hasCheckedOutToday: hasCheckedOutToday
          };
          
          setAttendance(newAttendance);
          localStorage.setItem(`supervisorAttendance_${currentSupervisor.id}`, JSON.stringify(newAttendance));
          console.log('✅ Attendance loaded from API');
          setApiStatus('');
          return;
        }
      } else {
        console.log('⚠️ API failed, using localStorage');
        setApiStatus('API connection failed, using local data');
      }
      
      const savedAttendance = localStorage.getItem(`supervisorAttendance_${currentSupervisor.id}`);
      if (savedAttendance) {
        const parsedAttendance = JSON.parse(savedAttendance);
        
        const today = new Date().toDateString();
        const lastCheckInDate = parsedAttendance.lastCheckInDate ? 
          new Date(parsedAttendance.lastCheckInDate).toDateString() : null;
        
        const updatedAttendance = {
          ...parsedAttendance,
          totalHours: Number(parsedAttendance.totalHours) || 0,
          breakTime: Number(parsedAttendance.breakTime) || 0,
          hasCheckedInToday: lastCheckInDate === today,
          hasCheckedOutToday: parsedAttendance.checkOutTime && 
            new Date(parsedAttendance.checkOutTime).toDateString() === today
        };
        
        setAttendance(updatedAttendance);
        console.log('📁 Attendance loaded from localStorage');
        setApiStatus('Using local data');
      }
    } catch (error) {
      console.error('❌ Error loading attendance status:', error);
      setApiStatus('Error loading attendance data');
      
      const savedAttendance = localStorage.getItem(`supervisorAttendance_${currentSupervisor.id}`);
      if (savedAttendance) {
        const parsedAttendance = JSON.parse(savedAttendance);
        setAttendance({
          ...parsedAttendance,
          totalHours: Number(parsedAttendance.totalHours) || 0,
          breakTime: Number(parsedAttendance.breakTime) || 0,
          hasCheckedInToday: parsedAttendance.hasCheckedInToday || false,
          hasCheckedOutToday: parsedAttendance.hasCheckedOutToday || false
        });
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Load supervisor attendance records
  const loadSupervisorAttendanceRecords = async () => {
    try {
      console.log('🔄 Loading supervisor attendance history...');
      
      const response = await fetch(`${API_URL}/attendance/history?employeeId=${currentSupervisor.id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Supervisor attendance history response:', data);
        
        if (data.success && Array.isArray(data.data)) {
          const supervisorRecords = data.data.filter((record: any) => 
            record.employeeId === currentSupervisor.id || 
            record.supervisorId === currentSupervisor.id
          );
          
          console.log(`✅ Found ${supervisorRecords.length} records for current supervisor`);
          
          const transformedRecords = supervisorRecords.map((record: any, index: number) => {
            const recordDate = record.date ? record.date : 
                             new Date(Date.now() - index * 86400000).toISOString().split('T')[0];
            
            let status = "Absent";
            if (record.checkInTime && record.checkOutTime) {
              status = "Present";
            } else if (record.checkInTime && !record.checkOutTime) {
              status = "In Progress";
            } else if (record.status === "Weekly Off") {
              status = "Weekly Off";
            }
            
            return {
              id: record._id || record.id || `record-${index}`,
              employeeId: record.employeeId || currentSupervisor.id,
              employeeName: record.employeeName || currentSupervisor.name,
              supervisorId: record.supervisorId || currentSupervisor.supervisorId,
              date: recordDate,
              checkInTime: record.checkInTime ? formatTimeForDisplay(record.checkInTime) : "-",
              checkOutTime: record.checkOutTime ? formatTimeForDisplay(record.checkOutTime) : "-",
              checkInPhoto: record.checkInPhoto || null,
              checkOutPhoto: record.checkOutPhoto || null,
              breakStartTime: record.breakStartTime ? formatTimeForDisplay(record.breakStartTime) : "-",
              breakEndTime: record.breakEndTime ? formatTimeForDisplay(record.breakEndTime) : "-",
              totalHours: Number(record.totalHours) || 0,
              breakTime: Number(record.breakTime) || 0,
              status: status,
              shift: record.shift || "Supervisor Shift",
              hours: Number(record.totalHours) || 0
            };
          });
          
          transformedRecords.sort((a: SupervisorAttendanceRecord, b: SupervisorAttendanceRecord) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          setSupervisorAttendanceRecords(transformedRecords);
          return;
        }
      } else {
        console.log('⚠️ History endpoint failed, creating sample data');
        createSampleAttendanceRecords();
      }
    } catch (error) {
      console.error('❌ Error loading supervisor attendance history:', error);
      createSampleAttendanceRecords();
    }
  };

  // Create sample attendance records with mock photos
  const createSampleAttendanceRecords = () => {
    const today = new Date().toISOString().split('T')[0];
    const sampleRecords: SupervisorAttendanceRecord[] = [
      {
        id: "today",
        employeeId: currentSupervisor.id,
        employeeName: currentSupervisor.name,
        supervisorId: currentSupervisor.supervisorId,
        date: today,
        checkInTime: attendance.checkInTime ? formatTimeForDisplay(attendance.checkInTime) : "-",
        checkOutTime: attendance.checkOutTime ? formatTimeForDisplay(attendance.checkOutTime) : "-",
        checkInPhoto: attendance.checkInPhoto || null,
        checkOutPhoto: attendance.checkOutPhoto || null,
        breakStartTime: attendance.breakStartTime,
        breakEndTime: attendance.breakEndTime,
        totalHours: attendance.totalHours || 0,
        breakTime: attendance.breakTime || 0,
        status: attendance.isCheckedIn ? 
               (attendance.checkOutTime ? "Present" : "In Progress") : 
               "Absent",
        shift: "Supervisor Shift",
        hours: attendance.totalHours || 0
      },
      {
        id: "1",
        employeeId: currentSupervisor.id,
        employeeName: currentSupervisor.name,
        supervisorId: currentSupervisor.supervisorId,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        checkInTime: "08:45 AM",
        checkOutTime: "05:15 PM",
        checkInPhoto: null,
        checkOutPhoto: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 8.5,
        breakTime: 0.5,
        status: "Present",
        shift: "Supervisor Shift",
        hours: 8.5
      },
      {
        id: "2",
        employeeId: currentSupervisor.id,
        employeeName: currentSupervisor.name,
        supervisorId: currentSupervisor.supervisorId,
        date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        checkInTime: "09:00 AM",
        checkOutTime: "04:30 PM",
        checkInPhoto: null,
        checkOutPhoto: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 7.5,
        breakTime: 0.5,
        status: "Present",
        shift: "Supervisor Shift",
        hours: 7.5
      },
      {
        id: "3",
        employeeId: currentSupervisor.id,
        employeeName: currentSupervisor.name,
        supervisorId: currentSupervisor.supervisorId,
        date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        checkInTime: "-",
        checkOutTime: "-",
        checkInPhoto: null,
        checkOutPhoto: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 0,
        breakTime: 0,
        status: "Absent",
        shift: "Supervisor Shift",
        hours: 0
      }
    ];
    
    setSupervisorAttendanceRecords(sampleRecords);
  };

  // Save attendance status
  const saveAttendanceStatus = (newAttendance: AttendanceStatus) => {
    const sanitizedAttendance = {
      ...newAttendance,
      totalHours: Number(newAttendance.totalHours) || 0,
      breakTime: Number(newAttendance.breakTime) || 0,
    };
    
    setAttendance(sanitizedAttendance);
    localStorage.setItem(`supervisorAttendance_${currentSupervisor.id}`, JSON.stringify(sanitizedAttendance));
  };

  // Handle break in
  const handleBreakIn = async () => {
    try {
      if (!attendance.isCheckedIn) {
        toast.error("You need to check in first!");
        return;
      }

      if (attendance.isOnBreak) {
        toast.error("You are already on break!");
        return;
      }

      console.log('🔄 Starting break for supervisor:', currentSupervisor.id);
      
      setIsAttendanceLoading(true);
      
      const payload = {
        employeeId: currentSupervisor.id,
      };
      
      const response = await fetch(`${API_URL}/attendance/breakin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Break started successfully!");
        
        const now = new Date().toISOString();
        const newAttendance = {
          ...attendance,
          isOnBreak: true,
          breakStartTime: now
        };
        saveAttendanceStatus(newAttendance);
        addActivity('break', `Started break at ${formatTimeForDisplay(now)}`);
        loadSupervisorAttendanceRecords();
      } else {
        throw new Error(data.message || "Error starting break");
      }
    } catch (error: any) {
      console.error('Break-in error:', error);
      toast.error(`Break-in failed: ${error.message}`);
      
      const now = new Date().toISOString();
      const newAttendance = {
        ...attendance,
        isOnBreak: true,
        breakStartTime: now
      };
      saveAttendanceStatus(newAttendance);
      addActivity('break', `Started break at ${formatTimeForDisplay(now)} (Offline)`);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle break out
  const handleBreakOut = async () => {
    try {
      if (!attendance.isOnBreak) {
        toast.error("You are not on break!");
        return;
      }

      console.log('🔄 Ending break for supervisor:', currentSupervisor.id);
      
      setIsAttendanceLoading(true);
      
      const payload = {
        employeeId: currentSupervisor.id,
      };
      
      const response = await fetch(`${API_URL}/attendance/breakout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Break ended successfully!");
        
        const now = new Date().toISOString();
        const breakTime = calculateBreakTime(attendance.breakStartTime, now);
        const totalBreakTime = (Number(attendance.breakTime) || 0) + breakTime;
        const newAttendance = {
          ...attendance,
          isOnBreak: false,
          breakEndTime: now,
          breakTime: totalBreakTime
        };
        saveAttendanceStatus(newAttendance);
        addActivity('break', `Ended break at ${formatTimeForDisplay(now)} - Duration: ${breakTime.toFixed(2)}h`);
        loadSupervisorAttendanceRecords();
      } else {
        throw new Error(data.message || "Error ending break");
      }
    } catch (error: any) {
      console.error('Break-out error:', error);
      toast.error(`Break-out failed: ${error.message}`);
      
      const now = new Date().toISOString();
      const breakTime = calculateBreakTime(attendance.breakStartTime, now);
      const totalBreakTime = (Number(attendance.breakTime) || 0) + breakTime;
      const newAttendance = {
        ...attendance,
        isOnBreak: false,
        breakEndTime: now,
        breakTime: totalBreakTime
      };
      saveAttendanceStatus(newAttendance);
      addActivity('break', `Ended break at ${formatTimeForDisplay(now)} - Duration: ${breakTime.toFixed(2)}h (Offline)`);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle card clicks
  const handlePresentClick = () => {
    if (summary.presentCount === 0) {
      toast.info('No present employees to show');
      return;
    }
    navigate('/supervisor/attendance', { 
      state: { 
        filterStatus: 'present',
        date: selectedDate,
        fromDashboard: true 
      } 
    });
    toast.info('Showing present employees for today');
  };

  const handleAbsentClick = () => {
    if (summary.absentCount === 0) {
      toast.info('No absent employees to show');
      return;
    }
    navigate('/supervisor/attendance', { 
      state: { 
        filterStatus: 'absent',
        date: selectedDate,
        fromDashboard: true 
      } 
    });
    toast.info('Showing absent employees for today');
  };

  const handleWeeklyOffClick = () => {
    if (summary.weeklyOffCount === 0) {
      toast.info('No employees on weekly off to show');
      return;
    }
    navigate('/supervisor/attendance', { 
      state: { 
        filterStatus: 'weekly-off',
        date: selectedDate,
        fromDashboard: true 
      } 
    });
    toast.info('Showing employees on weekly off for today');
  };

  // Add activity
  const addActivity = (type: string, message: string, userType: string = 'self') => {
    const user = userType === 'manager' ? 'Manager' : 'You';
    const newActivity: Activity = {
      id: Date.now().toString(),
      type,
      message,
      employee: user,
      priority: 'medium',
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
  };

  // Filter data based on search
  const filteredData = {
    activities: activities.filter(item => 
      item.message?.toLowerCase().includes(search.toLowerCase()) ||
      item.employee?.toLowerCase().includes(search.toLowerCase())
    ),
    tasks: tasks.filter(item =>
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.assignedToName?.toLowerCase().includes(search.toLowerCase())
    )
  };

  // Handle action
  const handleAction = (action: string, id?: string) => {
    const actions: { [key: string]: (id?: string) => void } = {
      assignTask: () => alert('Opening task assignment...'),
      generateReport: () => alert('Generating report...'),
      approveRequests: () => window.location.href = '/supervisor/approvals',
      scheduleMeeting: () => window.location.href = '/supervisor/meetings/schedule',
      performanceReview: () => window.location.href = '/supervisor/performance/reviews',
      exportData: () => alert('Exporting data...'),
      viewAllActivities: () => window.location.href = '/supervisor/activities',
      manageEmployees: () => window.location.href = '/supervisor/employees',
      viewTask: (id?: string) => window.location.href = `/supervisor/tasks/${id}`,
      viewEmployee: (id?: string) => window.location.href = `/supervisor/employees/${id}`,
      viewAttendance: () => navigate('/supervisor/attendance'),
      taskManagement: () => navigate('/supervisor/tasks')
    };
    
    if (actions[action]) {
      actions[action](id);
    }
  };

  // Get color for badges
  const getColor = (type: string, value: string) => {
    const colors: { [key: string]: { [key: string]: string } } = {
      priority: {
        high: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
        medium: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
        low: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      },
      status: {
        active: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
        'on leave': 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        remote: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      },
      icon: {
        task: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        approval: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
        completion: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        checkin: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        checkout: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        break: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
      },
      progress: {
        high: 'bg-red-600 dark:bg-red-500',
        medium: 'bg-yellow-500 dark:bg-yellow-400',
        low: 'bg-blue-600 dark:bg-blue-500'
      }
    };
    
    return colors[type]?.[value] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  };

  // Format time
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Format number
  const formatNumber = (value: number): string => {
    return Number(value).toFixed(2);
  };

  // Handle retry connection
  const handleRetryConnection = () => {
    checkBackendConnection().then(() => {
      if (isBackendConnected) {
        loadData();
        loadAttendanceStatus();
        loadManagerAttendanceData();
        loadSupervisorAttendanceRecords();
        fetchAllSites();
        fetchEmployees();
        loadAttendanceRecords(selectedDate);
        updateTaskCounts();
        fetchTodayLeaveCount();
      }
    });
  };

  // Update task counts from API
  const updateTaskCounts = async () => {
    const { assigned, completed } = await fetchAssignedTasks();
    setAssignedTasksCount(assigned);
    setCompletedTasksCount(completed);
    
    setStats(prev => ({
      ...prev,
      assignedTasks: assigned,
      completedTasks: completed
    }));
  };

  // Handle refresh
  const handleRefresh = () => {
    setCurrentSupervisor(getCurrentSupervisor());
    
    checkBackendConnection();
    loadData();
    loadAttendanceStatus();
    loadManagerAttendanceData();
    loadSupervisorAttendanceRecords();
    fetchAllSites();
    fetchEmployees();
    loadAttendanceRecords(selectedDate);
    updateTaskCounts();
    fetchTodayLeaveCount();
    
    toast.success("Dashboard data refreshed!");
  };

  const loadData = async () => {
    const { assigned, completed } = await fetchAssignedTasks();
    setAssignedTasksCount(assigned);
    setCompletedTasksCount(completed);
    
    await fetchTodayLeaveCount();
    
    setStats(generateMockStats(summary.totalEmployees, assigned, completed));
    setActivities(generateMockActivities());
    setTeam(generateMockTeam());
    setTasks(generateMockTasks());
  };

  // Check if it's a new day
  const isNewDay = () => {
    if (!attendance.lastCheckInDate) return true;
    
    const today = new Date().toDateString();
    const lastCheckInDay = new Date(attendance.lastCheckInDate).toDateString();
    
    return today !== lastCheckInDay;
  };

  // Auto-reset attendance if it's a new day
  useEffect(() => {
    if (attendance.lastCheckInDate && isNewDay()) {
      console.log('📅 New day detected, resetting attendance flags');
      const resetAttendance = {
        ...attendance,
        hasCheckedInToday: false,
        hasCheckedOutToday: false
      };
      saveAttendanceStatus(resetAttendance);
    }
  }, [attendance.lastCheckInDate]);

  // Update stats whenever summary.totalEmployees or task counts or leave count change
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalEmployees: summary.totalEmployees,
      assignedTasks: assignedTasksCount,
      completedTasks: completedTasksCount
    }));
  }, [summary.totalEmployees, assignedTasksCount, completedTasksCount]);

  // Update summary leave count when todayLeaveCount changes
  useEffect(() => {
    setSummary(prev => ({
      ...prev,
      leaveCount: todayLeaveCount
    }));
  }, [todayLeaveCount]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      console.log("🚀 Initializing supervisor dashboard...");
      await checkBackendConnection();
      await fetchAllSites();
      await fetchEmployees();
      await fetchTodayLeaveCount();
      await loadAttendanceRecords(selectedDate);
      await loadAttendanceStatus();
      await loadManagerAttendanceData();
      await loadSupervisorAttendanceRecords();
      await updateTaskCounts();
      await loadData();
      setLoading(false);
    };
    
    initializeData();
  }, []);

  // Load attendance records when employees or date changes
  useEffect(() => {
    if (employees.length > 0) {
      loadAttendanceRecords(selectedDate);
    } else {
      setSummary(prev => ({
        ...prev,
        totalEmployees: 0,
        presentCount: 0,
        absentCount: 0,
        weeklyOffCount: 0,
        leaveCount: todayLeaveCount,
        halfDayCount: 0
      }));
    }
  }, [employees, selectedDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader 
        title="Supervisor Dashboard" 
        subtitle="Manage team and operations"
        onMenuClick={onMenuClick}
      />

      <div className="p-6 space-y-6">
        {/* Connected Status Banner */}
        {isBackendConnected && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  ✅ Connected to Database
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Showing real data from MongoDB database.
                </p>
                {managerAttendance && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Manager attendance data loaded
                  </p>
                )}
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Live Data
              </Badge>
            </div>
          </div>
        )}

        {/* Manager Status Section */}
        {managerAttendance && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                  <Crown className="h-5 w-5" />
                  Manager Status
                </CardTitle>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  Live Tracking
                </Badge>
              </div>
              <CardDescription className="text-blue-700 dark:text-blue-400">
                Current manager attendance status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${managerAttendance.isCheckedIn ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      {managerAttendance.isCheckedIn ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className={`text-lg font-bold ${managerAttendance.isCheckedIn ? 'text-green-600' : 'text-gray-600'}`}>
                        {managerAttendance.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                      </p>
                    </div>
                  </div>
                  {managerAttendance.checkInPhoto && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPhoto(managerAttendance.checkInPhoto, 'checkin')}
                      className="mt-2 h-6 px-2 text-xs"
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      View Photo
                    </Button>
                  )}
                </div>

                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${managerAttendance.isOnBreak ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                      <Coffee className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Break Status</p>
                      <p className={`text-lg font-bold ${managerAttendance.isOnBreak ? 'text-orange-600' : 'text-gray-600'}`}>
                        {managerAttendance.isOnBreak ? 'On Break' : 'Active'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                      <LogIn className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Check In Time</p>
                      <p className="text-lg font-bold text-blue-600">
                        {managerAttendance.checkInTime ? formatTimeForDisplay(managerAttendance.checkInTime) : '--:--'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Hours Worked</p>
                      <p className="text-lg font-bold text-purple-600">
                        {managerAttendance.totalHours ? managerAttendance.totalHours.toFixed(2) : '0.00'} hrs
                      </p>
                    </div>
                  </div>
                  {managerAttendance.checkOutPhoto && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPhoto(managerAttendance.checkOutPhoto, 'checkout')}
                      className="mt-2 h-6 px-2 text-xs"
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      View Check-out Photo
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Manager: {managerAttendance.managerName}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Last Check-in: {managerAttendance.lastCheckInDate ? 
                        new Date(managerAttendance.lastCheckInDate).toLocaleDateString() : 
                        'No recent check-in'}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={loadManagerAttendanceData}
                    disabled={isLoadingManagerAttendance}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    {isLoadingManagerAttendance ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-3 w-3" />
                        Refresh Status
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header with Shortcut Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex gap-2">
              <Button 
                onClick={() => handleAction('viewAttendance')}
                className="flex-1 sm:flex-none flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <UserCheck className="h-4 w-4" />
                Employee Attendance
              </Button>
              <Button 
                onClick={() => handleAction('taskManagement')}
                className="flex-1 sm:flex-none flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <ClipboardCheck className="h-4 w-4" />
                Task Management
              </Button>
            </div>
            <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* API Status Alert */}
        {apiStatus && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">API Status</p>
              <p className="text-sm text-yellow-700">{apiStatus}</p>
            </div>
          </div>
        )}

        {/* Attendance Controls with Camera */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-blue-600" />
              Your Attendance Control - {currentSupervisor.name}
              {isAttendanceLoading && (
                <Badge variant="outline" className="ml-2 animate-pulse">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Processing...
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Take a photo to verify your check-in and check-out times - One check-in/check-out allowed per day
              {attendance.lastCheckInDate && (
                <span className="block text-xs mt-1">
                  Last check-in: {attendance.lastCheckInDate}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Daily Check-in Status */}
            {attendance.hasCheckedInToday && !attendance.isCheckedIn && !attendance.hasCheckedOutToday && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                  <Ban className="h-4 w-4" />
                  <span className="text-sm font-medium">Already Checked In Today</span>
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  You have already checked in today. Check-in is allowed only once per day.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={forceCheckOut}
                    disabled={isAttendanceLoading}
                    className="text-xs"
                  >
                    {isAttendanceLoading ? "Processing..." : "Force Check Out"}
                  </Button>
                </div>
              </div>
            )}

            {attendance.hasCheckedOutToday && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Already Checked Out Today</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  You have completed your attendance for today. Check-out allowed only once per day.
                </p>
                {attendance.checkOutPhoto && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewPhoto(attendance.checkOutPhoto, 'checkout')}
                    className="mt-2 h-6 px-2 text-xs"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    View Check-out Photo
                  </Button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Check In/Out */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Work Status</span>
                  <Badge className={attendance.isCheckedIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {attendance.isCheckedIn ? 'Checked In' : 'Checked Out'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCheckIn}
                    disabled={attendance.isCheckedIn || (attendance.hasCheckedInToday && !attendance.hasCheckedOutToday) || isAttendanceLoading || isCheckingStatus}
                    className="flex-1 flex items-center gap-2"
                    variant={(attendance.isCheckedIn || (attendance.hasCheckedInToday && !attendance.hasCheckedOutToday) || isAttendanceLoading || isCheckingStatus) ? "outline" : "default"}
                  >
                    <Camera className="h-4 w-4" />
                    {isAttendanceLoading ? "Processing..." : 
                     attendance.hasCheckedInToday && !attendance.hasCheckedOutToday ? 'Already Checked In' : 
                     'Check In with Photo'}
                  </Button>
                  <Button
                    onClick={handleCheckOut}
                    disabled={(!attendance.isCheckedIn && !attendance.hasCheckedInToday) || attendance.hasCheckedOutToday || isAttendanceLoading || isCheckingStatus}
                    className="flex-1 flex items-center gap-2"
                    variant={(!attendance.isCheckedIn && !attendance.hasCheckedInToday) || attendance.hasCheckedOutToday || isAttendanceLoading || isCheckingStatus ? "outline" : "default"}
                  >
                    <Camera className="h-4 w-4" />
                    {isAttendanceLoading ? "Processing..." : 
                     attendance.hasCheckedOutToday ? 'Already Checked Out' : 
                     'Check Out with Photo'}
                  </Button>
                </div>
                {attendance.checkInTime && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Checked in: {formatTimeForDisplay(attendance.checkInTime)}
                    </p>
                    {attendance.checkInPhoto && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPhoto(attendance.checkInPhoto, 'checkin')}
                        className="h-6 px-2 text-xs"
                      >
                        <Camera className="h-3 w-3 mr-1" />
                        View Photo
                      </Button>
                    )}
                  </div>
                )}
                {attendance.checkOutTime && (
                  <p className="text-xs text-green-500">
                    Checked out: {formatTimeForDisplay(attendance.checkOutTime)}
                  </p>
                )}
              </div>

              {/* Break In/Out */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Break Status</span>
                  <Badge className={attendance.isOnBreak ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}>
                    {attendance.isOnBreak ? 'On Break' : 'Active'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBreakIn}
                    disabled={!attendance.isCheckedIn || attendance.isOnBreak || isAttendanceLoading || isCheckingStatus}
                    className="flex-1 flex items-center gap-2"
                    variant={(!attendance.isCheckedIn || attendance.isOnBreak || isAttendanceLoading || isCheckingStatus) ? "outline" : "default"}
                  >
                    <Coffee className="h-4 w-4" />
                    {isAttendanceLoading ? "Processing..." : "Break In"}
                  </Button>
                  <Button
                    onClick={handleBreakOut}
                    disabled={!attendance.isOnBreak || isAttendanceLoading || isCheckingStatus}
                    className="flex-1 flex items-center gap-2"
                    variant={!attendance.isOnBreak || isAttendanceLoading || isCheckingStatus ? "outline" : "default"}
                  >
                    <Timer className="h-4 w-4" />
                    {isAttendanceLoading ? "Processing..." : "Break Out"}
                  </Button>
                </div>
                {attendance.breakStartTime && attendance.isOnBreak && (
                  <p className="text-xs text-gray-500">
                    Break started: {formatTimeForDisplay(attendance.breakStartTime)}
                  </p>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Hours:</span>
                  <p className="font-medium">{formatNumber(attendance.totalHours)}h</p>
                </div>
                <div>
                  <span className="text-gray-500">Break Time:</span>
                  <p className="font-medium">{formatNumber(attendance.breakTime)}h</p>
                </div>
                <div>
                  <span className="text-gray-500">Employee ID:</span>
                  <p className="font-medium text-sm">{currentSupervisor.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Daily Status:</span>
                  <p className="font-medium">
                    {attendance.hasCheckedInToday ? 
                      (attendance.hasCheckedOutToday ? "Completed" : "In Progress") : 
                      "Not Started"}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <p>Data storage: {isBackendConnected ? 'MongoDB Database' : 'Local Storage'}</p>
                {!isBackendConnected && (
                  <p className="text-yellow-600 dark:text-yellow-400">
                    ⚠️ Data will sync when backend is available
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Site Employee Counts */}
        {siteEmployeeCounts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Employee Count Per Site (Task-Assigned Sites Only)
              </CardTitle>
              <CardDescription className="text-xs">
                Total employees across all sites: {summary.totalEmployees}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {siteEmployeeCounts.map((site) => (
                  <div key={site.siteName} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <span className="text-sm font-medium truncate max-w-[200px]" title={site.siteName}>
                      {site.siteName}
                    </span>
                    <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {site.totalEmployees} employee{site.totalEmployees !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3x3 Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Employees Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Employees</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{summary.totalEmployees}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                    Across {supervisorSites.length} task-assigned site{supervisorSites.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Tasks Card */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Assigned Tasks</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{assignedTasksCount}</p>
                  <p className="text-xs text-green-700 dark:text-green-500 mt-1">
                    Tasks assigned to you
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
                  <ClipboardList className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Tasks Card */}
          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Completed Tasks</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{completedTasksCount}</p>
                  <p className="text-xs text-purple-700 dark:text-purple-500 mt-1">
                    {assignedTasksCount > 0 
                      ? `${Math.round((completedTasksCount / assignedTasksCount) * 100)}% completion rate`
                      : 'No tasks assigned'}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Present Card */}
          <motion.div
            whileHover={summary.presentCount > 0 ? { scale: 1.02 } : {}}
            whileTap={summary.presentCount > 0 ? { scale: 0.98 } : {}}
            className={summary.presentCount > 0 ? "cursor-pointer" : "cursor-default opacity-75"}
            onClick={handlePresentClick}
          >
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">Present Today</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {summary.presentCount}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-500 mt-1">
                      {summary.totalEmployees > 0 
                        ? `${Math.round((summary.presentCount / summary.totalEmployees) * 100)}% of total`
                        : 'No employees'}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
                    <UserCheck className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                </div>
                {summary.presentCount > 0 && (
                  <div className="mt-3 text-xs text-green-700 dark:text-green-500 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Click to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Absent Card */}
          <motion.div
            whileHover={summary.absentCount > 0 ? { scale: 1.02 } : {}}
            whileTap={summary.absentCount > 0 ? { scale: 0.98 } : {}}
            className={summary.absentCount > 0 ? "cursor-pointer" : "cursor-default opacity-75"}
            onClick={handleAbsentClick}
          >
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">Absent Today</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {summary.absentCount}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-500 mt-1">
                      {summary.totalEmployees > 0 
                        ? `${Math.round((summary.absentCount / summary.totalEmployees) * 100)}% of total`
                        : 'No employees'}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-800 rounded-full">
                    <UserX className="h-6 w-6 text-red-600 dark:text-red-300" />
                  </div>
                </div>
                {summary.absentCount > 0 && (
                  <div className="mt-3 text-xs text-red-700 dark:text-red-500 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Click to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Off Card */}
          <motion.div
            whileHover={summary.weeklyOffCount > 0 ? { scale: 1.02 } : {}}
            whileTap={summary.weeklyOffCount > 0 ? { scale: 0.98 } : {}}
            className={summary.weeklyOffCount > 0 ? "cursor-pointer" : "cursor-default opacity-75"}
            onClick={handleWeeklyOffClick}
          >
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Weekly Off Today</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {summary.weeklyOffCount}
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-500 mt-1">
                      {summary.totalEmployees > 0 
                        ? `${Math.round((summary.weeklyOffCount / summary.totalEmployees) * 100)}% of total`
                        : 'No employees'}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full">
                    <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                </div>
                {summary.weeklyOffCount > 0 && (
                  <div className="mt-3 text-xs text-purple-700 dark:text-purple-500 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Click to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Additional Stats - Leave and Half Day */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* On Leave Card */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">On Leave Today</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{todayLeaveCount}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                    {summary.totalEmployees > 0 
                      ? `${Math.round((todayLeaveCount / summary.totalEmployees) * 100)}% of total`
                      : 'No employees'}
                  </p>
                  {loadingLeaves && (
                    <div className="mt-1">
                      <Loader2 className="h-3 w-3 animate-spin text-blue-500 inline mr-1" />
                      <span className="text-xs text-blue-500">Loading...</span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                  <CalendarDays className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
              <div className="mt-3 text-xs text-blue-700 dark:text-blue-500">
                <span>Approved leave requests for today</span>
                {todayLeaveCount > 0 && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-xs text-blue-600 ml-2"
                    onClick={() => navigate('/supervisor/leave')}
                  >
                    View Details
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Half Day Card */}
          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Half Day Today</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{summary.halfDayCount}</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
                    {summary.totalEmployees > 0 
                      ? `${Math.round((summary.halfDayCount / summary.totalEmployees) * 100)}% of total`
                      : 'No employees'}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-800 rounded-full">
                  <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Footer */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm">Present: {summary.presentCount}</span>
                </div>
                <div className="flex items-center ml-4">
                  <XCircle className="h-4 w-4 text-red-600 mr-1" />
                  <span className="text-sm">Absent: {summary.absentCount}</span>
                </div>
                <div className="flex items-center ml-4">
                  <Calendar className="h-4 w-4 text-purple-600 mr-1" />
                  <span className="text-sm">Weekly Off: {summary.weeklyOffCount}</span>
                </div>
                <div className="flex items-center ml-4">
                  <CalendarDays className="h-4 w-4 text-blue-600 mr-1" />
                  <span className="text-sm">On Leave: {todayLeaveCount}</span>
                </div>
                <div className="flex items-center ml-4">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mr-1" />
                  <span className="text-sm">Half Day: {summary.halfDayCount}</span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search activities, tasks..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activities & Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activities */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Recent Activities
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleAction('viewAllActivities')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredData.activities.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`p-2 rounded-full ${getColor('icon', activity.type)}`}>
                      {activity.type === 'task' && <ClipboardList className="h-4 w-4" />}
                      {activity.type === 'approval' && <FileText className="h-4 w-4" />}
                      {activity.type === 'completion' && <CheckCircle2 className="h-4 w-4" />}
                      {activity.type === 'checkin' && <LogIn className="h-4 w-4" />}
                      {activity.type === 'checkout' && <LogOut className="h-4 w-4" />}
                      {activity.type === 'break' && <Coffee className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(activity.timestamp)} • {activity.employee}
                      </p>
                    </div>
                    <Badge className={getColor('priority', activity.priority)}>
                      {activity.priority}
                    </Badge>
                  </div>
                ))}
                {filteredData.activities.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No activities found</p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Upcoming Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredData.tasks.map(task => (
                  <div key={task._id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-gray-500">
                          Due: {task.deadline} • {task.assignedToName || 'Unassigned'}
                        </p>
                      </div>
                      <Badge className={getColor('priority', task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getColor('progress', task.priority)}`}
                        style={{ width: `${task.status === 'completed' ? 100 : task.status === 'in-progress' ? 50 : 20}%` }}
                      />
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-3"
                      onClick={() => handleAction('viewTask', task._id)}
                    >
                      View Details
                    </Button>
                  </div>
                ))}
                {filteredData.tasks.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No tasks found</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Team
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleAction('manageEmployees')}>
                    Manage
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {team.map(member => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => handleAction('viewEmployee', member.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                        {member.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                    </div>
                    <Badge className={getColor('status', member.status)}>
                      {member.status}
                    </Badge>
                  </div>
                ))}
                {team.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No team members</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => handleAction('assignTask')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Task
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleAction('generateReport')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleAction('approveRequests')}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Requests
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleAction('scheduleMeeting')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleAction('viewAttendance')}>
                  <Timer className="h-4 w-4 mr-2" />
                  View Attendance
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleAction('exportData')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Empty State */}
        {summary.totalEmployees === 0 && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                No employees are currently assigned to your task-assigned sites. 
                Please contact your administrator to assign employees to your sites.
              </p>
              {supervisorSites.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Your task-assigned sites:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {supervisorSites.map(site => (
                      <Badge key={site._id} variant="outline" className="bg-white">
                        {site.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={handleRefresh} variant="outline" className="mt-6">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Photo View Modal */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPhotoType === 'checkin' ? 'Check-in Photo' : 'Check-out Photo'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {selectedPhotoUrl && (
              <img
                src={selectedPhotoUrl}
                alt={`${selectedPhotoType} photo`}
                className="max-w-full h-auto rounded-lg shadow-lg"
                onError={(e) => {
                  console.error('Failed to load image:', selectedPhotoUrl);
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"%3E%3Crect x="2" y="2" width="20" height="20" rx="2.18"%3E%3C/rect%3E%3Cpath d="M8 2v20M16 2v20M2 8h20M2 16h20"%3E%3C/path%3E%3C/svg%3E';
                  toast.error('Failed to load photo');
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoModalOpen(false)}>Close</Button>
            {selectedPhotoUrl && (
              <Button onClick={() => window.open(selectedPhotoUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" /> Open Original
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Capture Dialog */}
      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handlePhotoCapture}
        title={cameraAction === 'checkin' ? "Take Check-in Photo" : "Take Check-out Photo"}
        description={cameraAction === 'checkin' 
          ? "Take a photo to verify your check-in time. This photo will be stored securely." 
          : "Take a photo to verify your check-out time. This photo will be stored securely."}
        actionLabel={cameraAction === 'checkin' ? "Use for Check-in" : "Use for Check-out"}
      />
    </div>
  );
};

export default SupervisorDashboard;