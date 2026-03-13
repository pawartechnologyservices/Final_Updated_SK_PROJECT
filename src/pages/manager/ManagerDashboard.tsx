import { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  ClipboardList, 
  Clock, 
  Users, 
  LogIn,
  LogOut,
  Coffee,
  Timer,
  CalendarDays,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowRight,
  FileText,
  Calendar,
  UserPlus,
  Settings,
  Bell,
  Eye,
  Target,
  LineChart as LineChartIcon,
  Activity,
  CheckSquare,
  PlayCircle,
  AlertTriangle,
  Zap,
  MapPin,
  CalendarCheck,
  Building,
  RefreshCw,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UserCheck,
  UserX,
  UserMinus,
  UserPlus as UserPlusIcon,
  Home,
  Shield as ShieldIcon,
  Car,
  Trash2,
  Droplets,
  ShoppingCart,
  DollarSign,
  Briefcase,
  User,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Info,
  Target as TargetIcon,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import userService from "@/services/userService";
import { siteService, Site } from "@/services/SiteService";
import taskService, { Task } from "@/services/TaskService";
import axios from "axios";

// Import Recharts for charts
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Input } from "@/components/ui/input";

// API Base URL
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001/api`;

// Chart color constants
const CHART_COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  weeklyOff: '#8b5cf6',
  leave: '#f59e0b',
  halfDay: '#3b82f6',
  late: '#f59e0b',
  payroll: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444']
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

// Types
interface Employee {
  id: string;
  _id?: string;
  employeeId?: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  site: string;
  siteName?: string;
  status: 'present' | 'absent' | 'leave' | 'weekly-off';
  checkInTime?: string;
  checkOutTime?: string;
  date: string;
  remark?: string;
  action?: 'fine' | 'advance' | 'other' | '' | 'none';
  employeeStatus?: string;
  role?: string;
  gender?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  salary?: number | string;
  assignedSites?: string[];
  shift?: string;
  workingHours?: string;
  employeeType?: string;
  reportingManager?: string;
  createdAt?: string;
  updatedAt?: string;
  isOnBreak?: boolean;
  hasCheckedOutToday?: boolean;
  isManager?: boolean;
  isSupervisor?: boolean;
}

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  status: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  isCheckedIn: boolean;
  isOnBreak: boolean;
  supervisorId?: string;
  remarks?: string;
  siteName?: string;
  department?: string;
}

interface SiteAttendanceData {
  id: string;
  siteId: string;
  name: string;
  siteName: string;
  clientName?: string;
  location?: string;
  totalEmployees: number;
  present: number;
  absent: number;
  weeklyOff: number;
  leave: number;
  shortage: number;
  date: string;
  daysInPeriod: number;
  totalRequiredAttendance: number;
  totalPresentAttendance: number;
  periodShortage: number;
  startDate: string;
  endDate: string;
  employees: Employee[];
  isRealData: boolean;
  attendanceRate: number;
}

// Interface for daily attendance summary (TOTAL ACROSS ALL MANAGER'S SITES)
interface DailyAttendanceSummary {
  date: string;
  day: string;
  present: number;
  absent: number;
  weeklyOff: number;
  leave: number;
  halfDay: number;
  total: number;
  rate: string;
  index: number;
  totalEmployees: number;
  sitesWithData: number;
  siteBreakdown?: {
    [siteName: string]: {
      total: number;
      present: number;
      absent: number;
      weeklyOff: number;
      leave: number;
      halfDay: number;
    }
  };
}

interface AttendanceStatus {
  isCheckedIn: boolean;
  isOnBreak: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  lastCheckInDate: string | null;
  hasCheckedOutToday: boolean;
}

interface LeaveRequest {
  id: string;
  _id: string;
  employeeName: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  avatar: string;
}

interface TaskDetail {
  id: string;
  _id: string;
  title: string;
  description: string;
  assignee: string;
  assignedTo: string;
  assignedToName?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  deadline: string;
  status: 'completed' | 'in-progress' | 'pending' | 'cancelled' | 'overdue';
  progress: number;
  siteName?: string;
  siteId?: string;
  clientName?: string;
  taskType?: string;
  createdAt: string;
  source: 'manager' | 'superadmin';
  isAssignedToMe?: boolean;
}

interface QuickAction {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  color: string;
  bgColor: string;
  hoverColor: string;
  gradient: string;
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

const formatDateDisplay = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to format time
const formatTimeForDisplay = (timestamp: string | null): string => {
  if (!timestamp || timestamp === "-" || timestamp === "" || timestamp === "null") return "-";
  
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

// Format duration for display
const formatDuration = (hours: number): string => {
  if (!hours || hours === 0) return "0m";
  
  const totalMinutes = Math.round(hours * 60);
  const hoursPart = Math.floor(totalMinutes / 60);
  const minutesPart = totalMinutes % 60;
  
  if (hoursPart > 0 && minutesPart > 0) {
    return `${hoursPart}h ${minutesPart}m`;
  } else if (hoursPart > 0) {
    return `${hoursPart}h`;
  } else {
    return `${minutesPart}m`;
  }
};

// Format short date
const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short',
    day: 'numeric'
  });
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Normalize site name for comparison
const normalizeSiteName = (siteName: string | null | undefined): string => {
  if (!siteName) return '';
  return siteName
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
};

// Fetch employees from API - EXACTLY LIKE ManagerAttendance.tsx
const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    console.log('🔄 Fetching employees from API...');
    
    const response = await fetch(`${API_URL}/employees?limit=1000`);
    const data = await response.json();
    
    if (response.ok) {
      let employeesData = [];
      
      if (Array.isArray(data)) {
        employeesData = data;
      } else if (data.success && Array.isArray(data.data)) {
        employeesData = data.data;
      } else if (Array.isArray(data.employees)) {
        employeesData = data.employees;
      } else if (data.data && Array.isArray(data.data.employees)) {
        employeesData = data.data.employees;
      }
      
      const transformedEmployees: Employee[] = employeesData.map((emp: any) => ({
        id: emp._id || emp.id || `emp_${Math.random()}`,
        _id: emp._id || emp.id,
        employeeId: emp.employeeId || emp.employeeID || `EMP${String(Math.random()).slice(2, 6)}`,
        name: emp.name || emp.employeeName || "Unknown Employee",
        email: emp.email || "",
        phone: emp.phone || emp.mobile || "",
        department: emp.department || "Unknown Department",
        position: emp.position || emp.designation || emp.role || "Employee",
        site: emp.site || emp.siteName || "Main Site",
        siteName: emp.siteName || emp.site || "Main Site",
        status: "absent" as const,
        employeeStatus: (emp.status || "active") as string,
        role: emp.role || 'employee',
        gender: emp.gender || '',
        dateOfJoining: emp.dateOfJoining || emp.joinDate || '',
        dateOfBirth: emp.dateOfBirth || '',
        salary: emp.salary || emp.basicSalary || 0,
        assignedSites: emp.assignedSites || emp.sites || [],
        shift: emp.shift || 'General',
        workingHours: emp.workingHours || '9:00 AM - 6:00 PM',
        employeeType: emp.employeeType || emp.type || 'Full-time',
        reportingManager: emp.reportingManager || emp.manager || '',
        createdAt: emp.createdAt || emp.created || new Date().toISOString(),
        updatedAt: emp.updatedAt || emp.updated || new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        isManager: (emp.position?.toLowerCase() || '').includes('manager') || (emp.department?.toLowerCase() || '').includes('manager'),
        isSupervisor: (emp.position?.toLowerCase() || '').includes('supervisor') || (emp.department?.toLowerCase() || '').includes('supervisor')
      }));
      
      console.log(`✅ Loaded ${transformedEmployees.length} employees`);
      return transformedEmployees;
    } else {
      throw new Error(data.message || 'Failed to load employees');
    }
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    throw new Error(`Error loading employees: ${error.message}`);
  }
};

// Fetch attendance records for a specific date - EXACTLY LIKE ManagerAttendance.tsx
const fetchAttendanceRecords = async (date: string): Promise<AttendanceRecord[]> => {
  try {
    console.log(`🔄 Fetching attendance records for date: ${date}`);
    const response = await fetch(`${API_URL}/attendance?date=${date}&limit=1000`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        return data.data.map((record: any) => ({
          _id: record._id || record.id,
          employeeId: record.employeeId || '',
          employeeName: record.employeeName || 'Unknown',
          date: record.date || date,
          checkInTime: record.checkInTime || null,
          checkOutTime: record.checkOutTime || null,
          breakStartTime: record.breakStartTime || null,
          breakEndTime: record.breakEndTime || null,
          totalHours: Number(record.totalHours) || 0,
          breakTime: Number(record.breakTime) || 0,
          status: (record.status?.toLowerCase() || 'absent') as any,
          isCheckedIn: Boolean(record.isCheckedIn),
          isOnBreak: Boolean(record.isOnBreak),
          supervisorId: record.supervisorId,
          remarks: record.remarks || '',
          siteName: record.siteName || record.site || '',
          department: record.department || ''
        }));
      }
    }
    return [];
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }
};

// Fetch manager's assigned sites from tasks
const fetchManagerSites = async (managerId: string): Promise<Site[]> => {
  try {
    console.log('Fetching tasks for manager:', managerId);
    
    const [allSites, allTasks] = await Promise.all([
      siteService.getAllSites(),
      taskService.getAllTasks()
    ]);

    // Filter sites where manager is assigned (based on tasks)
    const managerSites = allSites.filter(site => {
      const siteTasks = allTasks.filter(task => task.siteId === site._id);
      
      const isManagerAssigned = siteTasks.some(task => 
        task.assignedUsers?.some((user: any) => 
          user.userId === managerId && user.role === 'manager'
        ) || task.assignedTo === managerId
      );

      return isManagerAssigned;
    });

    console.log(`Found ${managerSites.length} sites for manager`);
    return managerSites;
    
  } catch (error) {
    console.error('Error fetching manager sites:', error);
    return [];
  }
};

// Generate employee data for site for a specific date - EXACTLY LIKE ManagerAttendance.tsx
const generateSiteEmployeeData = async (siteName: string, date: string): Promise<Employee[]> => {
  try {
    const allEmployees = await fetchEmployees();
    
    const siteEmployees = allEmployees.filter(emp => 
      emp.site === siteName || emp.siteName === siteName
    );
    
    console.log(`Found ${siteEmployees.length} employees for site: ${siteName}`);
    
    const attendanceRecords = await fetchAttendanceRecords(date);
    
    const employees: Employee[] = [];
    
    for (const employee of siteEmployees) {
      const attendance = attendanceRecords.find(record => 
        record.employeeId === employee._id || record.employeeId === employee.id
      );
      
      let status: 'present' | 'absent' | 'leave' | 'weekly-off' = 'absent';
      let checkInTime = '-';
      let checkOutTime = '-';
      let remark = '';
      let isOnBreak = false;
      let hasCheckedOutToday = false;
      
      if (attendance) {
        if (attendance.status === 'present' || attendance.status === 'half-day') {
          status = 'present';
        } else if (attendance.status === 'leave') {
          status = 'leave';
        } else if (attendance.status === 'weekly-off') {
          status = 'weekly-off';
        } else {
          status = 'absent';
        }
        
        checkInTime = attendance.checkInTime ? formatTimeForDisplay(attendance.checkInTime) : '-';
        checkOutTime = attendance.checkOutTime ? formatTimeForDisplay(attendance.checkOutTime) : '-';
        remark = attendance.remarks || '';
        isOnBreak = attendance.isOnBreak || false;
        hasCheckedOutToday = attendance.checkOutTime ? true : false;
      }
      
      employees.push({
        ...employee,
        status,
        checkInTime,
        checkOutTime,
        date,
        remark,
        isOnBreak,
        hasCheckedOutToday
      });
    }
    
    console.log(`Processed ${employees.length} employees for site: ${siteName}`);
    return employees;
  } catch (error) {
    console.error('Error generating employee data:', error);
    return [];
  }
};

// Calculate site attendance data for a specific date - EXACTLY LIKE ManagerAttendance.tsx
const calculateSiteAttendanceData = async (site: Site, date: string): Promise<SiteAttendanceData> => {
  const employees = await generateSiteEmployeeData(site.name, date);
  
  const present = employees.filter(emp => emp.status === 'present').length;
  const weeklyOff = employees.filter(emp => emp.status === 'weekly-off').length;
  const leave = employees.filter(emp => emp.status === 'leave').length;
  const absent = employees.filter(emp => emp.status === 'absent').length;
  
  const totalPresent = present + weeklyOff;
  const totalRequired = employees.length;
  const shortage = totalRequired - totalPresent;
  const attendanceRate = totalRequired > 0 ? Math.round((totalPresent / totalRequired) * 100) : 0;
  
  return {
    id: site._id,
    siteId: site._id,
    name: site.name,
    siteName: site.name,
    clientName: site.clientName,
    location: site.location,
    totalEmployees: employees.length,
    present: totalPresent,
    absent,
    weeklyOff,
    leave,
    shortage,
    date,
    daysInPeriod: 1,
    totalRequiredAttendance: totalRequired,
    totalPresentAttendance: totalPresent,
    periodShortage: shortage,
    startDate: date,
    endDate: date,
    employees,
    isRealData: employees.length > 0,
    attendanceRate
  };
};

// Fetch attendance data for manager's sites for the last 7 days - WITH CORRECT COUNTING
const fetchManagerAttendanceData = async (managerId: string, days: number = 7): Promise<DailyAttendanceSummary[]> => {
  try {
    console.log(`🔄 Fetching attendance data for last ${days} days across manager's sites...`);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);
    
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    // First, fetch manager's sites
    const managerSites = await fetchManagerSites(managerId);
    
    if (managerSites.length === 0) {
      console.log('No sites assigned to manager');
      return [];
    }
    
    // Calculate total employees across all sites by summing site employees
    let totalEmployeesAllSites = 0;
    const siteEmployeeCounts: { [siteName: string]: number } = {};
    
    for (const site of managerSites) {
      const employees = await generateSiteEmployeeData(site.name, formatDate(new Date()));
      siteEmployeeCounts[site.name] = employees.length;
      totalEmployeesAllSites += employees.length;
    }
    
    console.log(`Total employees across all manager's sites: ${totalEmployeesAllSites}`);
    console.log('Site employee counts:', siteEmployeeCounts);
    
    // Try to fetch attendance records for the date range
    let allRecords: AttendanceRecord[] = [];
    
    try {
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { 
          startDate: startDateStr, 
          endDate: endDateStr,
          limit: 10000
        }
      });
      
      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          allRecords = response.data.data;
        } else if (Array.isArray(response.data)) {
          allRecords = response.data;
        } else if (response.data.attendance && Array.isArray(response.data.attendance)) {
          allRecords = response.data.attendance;
        }
      }
    } catch (error) {
      console.log('Main attendance endpoint failed, trying range endpoint:', error);
      
      try {
        const response = await axios.get(`${API_URL}/attendance/range`, {
          params: { startDate: startDateStr, endDate: endDateStr }
        });
        
        if (response.data) {
          if (response.data.success && Array.isArray(response.data.data)) {
            allRecords = response.data.data;
          } else if (Array.isArray(response.data)) {
            allRecords = response.data;
          } else if (response.data.attendance && Array.isArray(response.data.attendance)) {
            allRecords = response.data.attendance;
          }
        }
      } catch (rangeError) {
        console.log('Range endpoint failed, falling back to day-by-day:', rangeError);
        
        const tempDate = new Date(startDate);
        while (tempDate <= endDate) {
          const dateStr = formatDate(tempDate);
          try {
            const response = await axios.get(`${API_URL}/attendance`, {
              params: { date: dateStr }
            });
            
            if (response.data) {
              let dayRecords = [];
              if (response.data.success && Array.isArray(response.data.data)) {
                dayRecords = response.data.data;
              } else if (Array.isArray(response.data)) {
                dayRecords = response.data;
              } else if (response.data.attendance && Array.isArray(response.data.attendance)) {
                dayRecords = response.data.attendance;
              }
              
              allRecords.push(...dayRecords);
            }
          } catch (dayError) {
            console.log(`No data for ${dateStr}`);
          }
          
          tempDate.setDate(tempDate.getDate() + 1);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
    
    console.log(`✅ Fetched ${allRecords.length} attendance records total`);
    
    // Create a set of employee IDs from all sites
    const allSiteEmployees: Employee[] = [];
    for (const site of managerSites) {
      const employees = await generateSiteEmployeeData(site.name, formatDate(new Date()));
      allSiteEmployees.push(...employees);
    }
    
    const employeeIdsFromSites = new Set(allSiteEmployees.map(emp => emp._id || emp.id));
    
    // Process records into daily summaries
    const dailySummaries: { [key: string]: DailyAttendanceSummary } = {};
    
    // Initialize all dates in range with CORRECT TOTAL EMPLOYEE COUNT
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = formatDate(currentDate);
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      dailySummaries[dateStr] = {
        date: dateStr,
        day: dateStr === formatDate(new Date()) ? 'Today' :
             dateStr === formatDate(new Date(Date.now() - 86400000)) ? 'Yesterday' : dayName,
        present: 0,
        absent: 0,
        weeklyOff: 0,
        leave: 0,
        halfDay: 0,
        total: 0,
        rate: '0.0%',
        index: days - Math.floor((new Date(endDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)),
        totalEmployees: totalEmployeesAllSites,
        sitesWithData: 0,
        siteBreakdown: {}
      };
      
      // Initialize site breakdown for this date with correct per-site totals
      Object.keys(siteEmployeeCounts).forEach(siteName => {
        if (dailySummaries[dateStr].siteBreakdown) {
          dailySummaries[dateStr].siteBreakdown![siteName] = {
            total: siteEmployeeCounts[siteName],
            present: 0,
            absent: 0,
            weeklyOff: 0,
            leave: 0,
            halfDay: 0
          };
        }
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Track which sites have data for each date
    const sitesWithDataPerDate: { [date: string]: Set<string> } = {};
    
    // Filter records to only include employees from manager's sites and count them
    allRecords.forEach(record => {
      // Only process if this employee belongs to manager's sites
      if (employeeIdsFromSites.has(record.employeeId) && dailySummaries[record.date]) {
        dailySummaries[record.date].total++;
        
        // Track unique sites for this date
        if (record.siteName) {
          if (!sitesWithDataPerDate[record.date]) {
            sitesWithDataPerDate[record.date] = new Set();
          }
          sitesWithDataPerDate[record.date].add(record.siteName);
        }
        
        // Update site breakdown with correct counts
        if (record.siteName && dailySummaries[record.date].siteBreakdown?.[record.siteName]) {
          if (record.status === 'present') {
            dailySummaries[record.date].siteBreakdown![record.siteName].present++;
          } else if (record.status === 'weekly-off') {
            dailySummaries[record.date].siteBreakdown![record.siteName].weeklyOff++;
          } else if (record.status === 'leave') {
            dailySummaries[record.date].siteBreakdown![record.siteName].leave++;
          } else if (record.status === 'half-day') {
            dailySummaries[record.date].siteBreakdown![record.siteName].halfDay++;
          } else {
            dailySummaries[record.date].siteBreakdown![record.siteName].absent++;
          }
        }
        
        // Update totals
        if (record.status === 'present') {
          dailySummaries[record.date].present++;
        } else if (record.status === 'weekly-off') {
          dailySummaries[record.date].weeklyOff++;
        } else if (record.status === 'leave') {
          dailySummaries[record.date].leave++;
        } else if (record.status === 'half-day') {
          dailySummaries[record.date].halfDay++;
        } else {
          dailySummaries[record.date].absent++;
        }
      }
    });
    
    // Set sitesWithData count
    Object.keys(sitesWithDataPerDate).forEach(date => {
      if (dailySummaries[date]) {
        dailySummaries[date].sitesWithData = sitesWithDataPerDate[date].size;
      }
    });
    
    // Calculate unaccounted employees for each date
    Object.values(dailySummaries).forEach(summary => {
      // Calculate total accounted employees from attendance records
      const totalAccounted = summary.present + summary.weeklyOff + summary.leave + summary.halfDay;
      
      // If total accounted is less than total employees, add the difference to absent
      if (totalAccounted < summary.totalEmployees) {
        const unaccounted = summary.totalEmployees - totalAccounted;
        summary.absent += unaccounted;
        console.log(`Date ${summary.date}: Total employees=${summary.totalEmployees}, Accounted=${totalAccounted}, Unaccounted=${unaccounted} added to absent`);
      }
      
      // Update site breakdown for unaccounted employees
      if (summary.siteBreakdown) {
        Object.keys(summary.siteBreakdown).forEach(siteName => {
          const siteData = summary.siteBreakdown![siteName];
          const accountedSite = siteData.present + siteData.weeklyOff + siteData.leave + siteData.halfDay;
          if (accountedSite < siteData.total) {
            siteData.absent += (siteData.total - accountedSite);
          }
        });
      }
      
      // Calculate attendance rate (present + weekly off considered as present for rate)
      const totalPresentWithWO = summary.present + summary.weeklyOff;
      summary.rate = summary.totalEmployees > 0 
        ? ((totalPresentWithWO / summary.totalEmployees) * 100).toFixed(1) + '%'
        : '0.0%';
    });
    
    // Sort by date descending (most recent first)
    const summaries = Object.values(dailySummaries).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    console.log(`📊 Processed ${summaries.length} daily summaries for manager's sites`);
    console.log(`📈 Total employees across manager's sites: ${totalEmployeesAllSites}`);
    
    return summaries;
    
  } catch (error: any) {
    console.error('Error fetching attendance data:', error);
    toast.error('Failed to fetch attendance data', {
      description: error.message || 'Using demo data instead'
    });
    
    // Generate demo data as fallback
    return generateDemoAttendanceData(days, managerId);
  }
};

// Generate demo attendance data as fallback
const generateDemoAttendanceData = (days: number, managerId: string): DailyAttendanceSummary[] => {
  console.log('Generating demo attendance data for manager...');
  const data = [];
  const today = new Date();
  
  // Demo site counts for manager
  const demoSites = [
    'Site A',
    'Site B',
    'Site C'
  ];
  
  // Demo employee counts per site - TOTAL should be sum of these
  const siteEmployeeCounts: { [key: string]: number } = {
    'Site A': 25,
    'Site B': 18,
    'Site C': 12
  };
  
  // CORRECT: This is the sum of all employees across all sites
  const totalEmployees = Object.values(siteEmployeeCounts).reduce((a, b) => a + b, 0);
  console.log(`Demo data: Total employees across all sites = ${totalEmployees}`);

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    const dayName = i === 0 ? 'Today' :
      i === 1 ? 'Yesterday' :
        date.toLocaleDateString('en-US', { weekday: 'long' });

    let totalPresent = 0;
    let totalWeeklyOff = 0;
    let totalLeave = 0;
    let totalHalfDay = 0;
    let totalAbsent = 0;
    
    const siteBreakdown: { [siteName: string]: { total: number; present: number; absent: number; weeklyOff: number; leave: number; halfDay: number } } = {};
    
    // Calculate per site
    Object.entries(siteEmployeeCounts).forEach(([siteName, siteTotal]) => {
      let present, weeklyOff, leave, halfDay, absent;
      
      if (isWeekend) {
        // Weekend pattern
        weeklyOff = Math.floor(siteTotal * 0.7);
        present = Math.floor(siteTotal * 0.15);
        leave = Math.floor(siteTotal * 0.05);
        halfDay = Math.floor(siteTotal * 0.05);
        absent = siteTotal - present - weeklyOff - leave - halfDay;
      } else {
        // Weekday pattern
        present = Math.floor(siteTotal * 0.75);
        weeklyOff = Math.floor(siteTotal * 0.05);
        leave = Math.floor(siteTotal * 0.05);
        halfDay = Math.floor(siteTotal * 0.05);
        absent = siteTotal - present - weeklyOff - leave - halfDay;
      }
      
      siteBreakdown[siteName] = {
        total: siteTotal,
        present,
        absent,
        weeklyOff,
        leave,
        halfDay
      };
      
      totalPresent += present;
      totalWeeklyOff += weeklyOff;
      totalLeave += leave;
      totalHalfDay += halfDay;
      totalAbsent += absent;
    });

    const totalPresentWithWO = totalPresent + totalWeeklyOff;
    const rate = totalEmployees > 0 ? ((totalPresentWithWO / totalEmployees) * 100).toFixed(1) + '%' : '0.0%';

    data.push({
      date: date.toISOString().split('T')[0],
      day: dayName,
      present: totalPresent,
      absent: totalAbsent,
      weeklyOff: totalWeeklyOff,
      leave: totalLeave,
      halfDay: totalHalfDay,
      total: totalEmployees,
      rate,
      index: i,
      totalEmployees,
      sitesWithData: demoSites.length,
      siteBreakdown
    });
  }

  return data;
};

// Site Employee Details Component
interface SiteEmployeeDetailsProps {
  siteData: SiteAttendanceData;
  onBack: () => void;
  selectedDate: string;
}

const SiteEmployeeDetails: React.FC<SiteEmployeeDetailsProps> = ({ siteData, onBack, selectedDate }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'present' | 'absent' | 'weekly-off' | 'leave'>('all');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const itemsPerPage = 20;

  useEffect(() => {
    if (siteData?.employees && siteData.employees.length > 0) {
      setEmployees(siteData.employees);
    }
  }, [siteData?.employees]);

  const allEmployees = employees;
  const presentEmployees = allEmployees.filter(emp => emp.status === 'present');
  const weeklyOffEmployees = allEmployees.filter(emp => emp.status === 'weekly-off');
  const leaveEmployees = allEmployees.filter(emp => emp.status === 'leave');
  const absentEmployees = allEmployees.filter(emp => emp.status === 'absent');

  const filteredEmployees = useMemo(() => {
    let filtered = [];
    switch (activeTab) {
      case 'present':
        filtered = presentEmployees;
        break;
      case 'absent':
        filtered = absentEmployees;
        break;
      case 'weekly-off':
        filtered = weeklyOffEmployees;
        break;
      case 'leave':
        filtered = leaveEmployees;
        break;
      default:
        filtered = allEmployees;
    }

    if (employeeSearch) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (emp.employeeId && emp.employeeId.toLowerCase().includes(employeeSearch.toLowerCase())) ||
        emp.department.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (emp.email && emp.email.toLowerCase().includes(employeeSearch.toLowerCase()))
      );
    }

    return filtered;
  }, [activeTab, employeeSearch, allEmployees, presentEmployees, absentEmployees, weeklyOffEmployees, leaveEmployees]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, currentPage]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return "bg-green-100 text-green-800 border-green-200";
      case 'absent':
        return "bg-red-100 text-red-800 border-red-200";
      case 'weekly-off':
        return "bg-purple-100 text-purple-800 border-purple-200";
      case 'leave':
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {siteData.name} - Employee Details
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatDateDisplay(selectedDate)} • {siteData.totalEmployees} employees
              {siteData.clientName && ` • Client: ${siteData.clientName}`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6"
      >
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total Employees</p>
                <p className="text-2xl font-bold text-blue-600">{siteData.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Present</p>
                <p className="text-2xl font-bold text-green-600">{siteData.present}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Weekly Off</p>
                <p className="text-2xl font-bold text-purple-600">{siteData.weeklyOff}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Leave</p>
                <p className="text-2xl font-bold text-blue-600">{siteData.leave}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Absent</p>
                <p className="text-2xl font-bold text-red-600">{siteData.absent}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg">
                <Button
                  variant={activeTab === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                >
                  All ({allEmployees.length})
                </Button>
                <Button
                  variant={activeTab === 'present' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setActiveTab('present'); setCurrentPage(1); }}
                >
                  Present ({presentEmployees.length})
                </Button>
                <Button
                  variant={activeTab === 'weekly-off' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setActiveTab('weekly-off'); setCurrentPage(1); }}
                >
                  Weekly Off ({weeklyOffEmployees.length})
                </Button>
                <Button
                  variant={activeTab === 'leave' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setActiveTab('leave'); setCurrentPage(1); }}
                >
                  Leave ({leaveEmployees.length})
                </Button>
                <Button
                  variant={activeTab === 'absent' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setActiveTab('absent'); setCurrentPage(1); }}
                >
                  Absent ({absentEmployees.length})
                </Button>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => { setEmployeeSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full lg:w-64"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Employee Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>
              Employee Details - {filteredEmployees.length} employees found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left font-medium">Employee ID</th>
                      <th className="h-12 px-4 text-left font-medium">Name</th>
                      <th className="h-12 px-4 text-left font-medium">Department</th>
                      <th className="h-12 px-4 text-left font-medium">Position</th>
                      <th className="h-12 px-4 text-left font-medium">Status</th>
                      <th className="h-12 px-4 text-left font-medium">Check In</th>
                      <th className="h-12 px-4 text-left font-medium">Check Out</th>
                      <th className="h-12 px-4 text-left font-medium">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEmployees.length > 0 ? (
                      paginatedEmployees.map((employee) => (
                        <tr key={employee.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 align-middle font-mono text-xs">
                            {employee.employeeId || employee.id}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="font-medium">{employee.name}</div>
                          </td>
                          <td className="p-4 align-middle">
                            <Badge variant="outline">{employee.department}</Badge>
                          </td>
                          <td className="p-4 align-middle">{employee.position}</td>
                          <td className="p-4 align-middle">
                            <Badge className={getStatusBadge(employee.status)}>
                              {employee.status === 'weekly-off' ? 'Weekly Off' : 
                               employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                              {employee.isOnBreak && <span className="ml-1 text-xs">(Break)</span>}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {employee.checkInTime || '-'}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {employee.checkOutTime || '-'}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="space-y-1">
                              {employee.email && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Mail className="h-3 w-3" />
                                  {employee.email}
                                </div>
                              )}
                              {employee.phone && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Phone className="h-3 w-3" />
                                  {employee.phone}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No employees found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredEmployees.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                      First
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                      Next
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const ManagerDashboard = () => {
  const { onMenuClick } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const { user: authUser } = useRole();
  
  // Current user state
  const [managerId, setManagerId] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Attendance state for manager self
  const [attendance, setAttendance] = useState<AttendanceStatus>({
    isCheckedIn: false,
    isOnBreak: false,
    checkInTime: null,
    checkOutTime: null,
    breakStartTime: null,
    breakEndTime: null,
    totalHours: 0,
    breakTime: 0,
    lastCheckInDate: null,
    hasCheckedOutToday: false
  });

  // SITE ATTENDANCE DATA
  const [sites, setSites] = useState<Site[]>([]);
  const [siteAttendanceData, setSiteAttendanceData] = useState<SiteAttendanceData[]>([]);
  const [filteredSiteData, setFilteredSiteData] = useState<SiteAttendanceData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSiteDetails, setShowSiteDetails] = useState(false);
  const [selectedSite, setSelectedSite] = useState<SiteAttendanceData | null>(null);
  const itemsPerPage = 10;

  // 7-DAY ATTENDANCE PIE CHARTS
  const [attendanceData, setAttendanceData] = useState<DailyAttendanceSummary[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [totalEmployeesManagerSites, setTotalEmployeesManagerSites] = useState(0);
  
  // UI navigation for 7-day pie charts
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [sixDaysStartIndex, setSixDaysStartIndex] = useState(1);
  const [showSiteBreakdown, setShowSiteBreakdown] = useState(false);

  // Leave requests
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState<number>(0);
  
  // Tasks
  const [assignedTasks, setAssignedTasks] = useState<TaskDetail[]>([]);

  // Stats
  const [stats, setStats] = useState({
    presentDays: 0,
    totalSites: 0,
    pendingLeaves: 0,
    productivityScore: 0,
    totalEmployees: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalWeeklyOff: 0,
    totalLeave: 0,
    totalHalfDay: 0,
    attendanceRate: 0
  });

  // Enhanced Quick Actions
  const quickActions: QuickAction[] = [
    {
      id: 1,
      title: "Supervisors",
      description: "View and manage supervisors",
      icon: Users,
      action: () => navigate("/manager/supervisors"),
      color: "text-white",
      bgColor: "bg-gradient-to-br from-blue-500 to-blue-600",
      hoverColor: "hover:from-blue-600 hover:to-blue-700",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      id: 2,
      title: "Leave Management",
      description: "Approve/reject leave requests",
      icon: Calendar,
      action: () => navigate("/manager/leave"),
      color: "text-white",
      bgColor: "bg-gradient-to-br from-green-500 to-green-600",
      hoverColor: "hover:from-green-600 hover:to-green-700",
      gradient: "from-green-500 to-green-600"
    },
    {
      id: 3,
      title: "Task Management",
      description: "Manage all tasks",
      icon: ClipboardList,
      action: () => navigate("/manager/tasks"),
      color: "text-white",
      bgColor: "bg-gradient-to-br from-purple-500 to-purple-600",
      hoverColor: "hover:from-purple-600 hover:to-purple-700",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      id: 4,
      title: "Reports",
      description: "Generate detailed reports",
      icon: FileText,
      action: () => navigate("/manager/reports"),
      color: "text-white",
      bgColor: "bg-gradient-to-br from-orange-500 to-orange-600",
      hoverColor: "hover:from-orange-600 hover:to-orange-700",
      gradient: "from-orange-500 to-orange-600"
    }
  ];

  // Initialize current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        if (authUser) {
          const userId = authUser._id || authUser.id;
          
          if (userId) {
            const allUsersResponse = await userService.getAllUsers();
            const foundUser = allUsersResponse.allUsers.find((user: any) => 
              user._id === userId || user.id === userId
            );
            
            if (foundUser) {
              setManagerId(foundUser._id);
              setManagerName(foundUser.name || foundUser.firstName || 'Manager');
            } else {
              const storedUser = localStorage.getItem("sk_user");
              if (storedUser) {
                const user = JSON.parse(storedUser);
                setManagerId(user._id || user.id);
                setManagerName(user.name || user.firstName || 'Manager');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, [authUser]);

  // Load attendance data for 7-day pie charts
  const loadAttendanceData = async (showRefreshToast: boolean = false) => {
    if (!managerId) return;
    
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoadingAttendance(true);
      }
      setAttendanceError(null);

      const data = await fetchManagerAttendanceData(managerId, 7);
      setAttendanceData(data);
      
      if (data.length > 0) {
        setTotalEmployeesManagerSites(data[0].totalEmployees);
      }

      if (data.length > 0) {
        setCurrentDayIndex(0);
        setSixDaysStartIndex(Math.min(1, data.length - 6));
      }

      if (showRefreshToast) {
        toast.success('Attendance data refreshed successfully');
      }
    } catch (error: any) {
      console.error('Failed to load attendance data:', error);
      setAttendanceError(error.message || 'Failed to load attendance data');
      toast.error('Failed to load attendance data', {
        description: error.message || 'Please try again later'
      });
    } finally {
      setLoadingAttendance(false);
      setRefreshing(false);
    }
  };

  // Fetch today's attendance status
  const fetchAttendanceStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/manager-attendance/today/${managerId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const attendanceData = data.data;
          setAttendance({
            isCheckedIn: attendanceData.isCheckedIn || false,
            isOnBreak: attendanceData.isOnBreak || false,
            checkInTime: attendanceData.checkInTime,
            checkOutTime: attendanceData.checkOutTime,
            breakStartTime: attendanceData.breakStartTime,
            breakEndTime: attendanceData.breakEndTime,
            totalHours: attendanceData.totalHours || 0,
            breakTime: attendanceData.breakTime || 0,
            lastCheckInDate: attendanceData.lastCheckInDate,
            hasCheckedOutToday: attendanceData.hasCheckedOutToday || false
          });
        }
      }
    } catch (error) {
      console.error('Error fetching attendance status:', error);
    }
  };

  // Fetch leave requests
  const fetchLeaveRequests = async () => {
    try {
      const allUsersResponse = await userService.getAllUsers();
      const foundUser = allUsersResponse.allUsers.find((user: any) => 
        user._id === managerId || user.id === managerId
      );
      
      let managerDepartment = "Management";
      if (foundUser && foundUser.department) {
        managerDepartment = foundUser.department;
      }
      
      const response = await fetch(
        `${API_URL}/leaves/supervisor?department=${encodeURIComponent(managerDepartment)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (Array.isArray(data)) {
          const pendingLeaves = data.filter((leave: any) => leave.status === 'pending').length;
          setPendingLeaveCount(pendingLeaves);
          
          setStats(prev => ({
            ...prev,
            pendingLeaves: pendingLeaves
          }));
          
          const recentLeaves = data
            .filter((leave: any) => leave.status === 'pending')
            .sort((a: any, b: any) => new Date(b.createdAt || b.appliedDate).getTime() - new Date(a.createdAt || a.appliedDate).getTime())
            .slice(0, 3)
            .map((leave: any) => ({
              id: leave._id || leave.id,
              _id: leave._id || leave.id,
              employeeName: leave.employeeName || leave.name || 'Unknown',
              employeeId: leave.employeeId || 'Unknown',
              type: leave.leaveType || 'Leave',
              startDate: leave.fromDate || leave.startDate,
              endDate: leave.toDate || leave.endDate,
              reason: leave.reason || 'No reason provided',
              status: leave.status,
              avatar: leave.employeeName ? leave.employeeName.substring(0, 2).toUpperCase() : '??'
            }));
          
          setLeaveRequests(recentLeaves);
        }
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  // Fetch tasks assigned to manager
  const fetchAssignedTasks = async () => {
    try {
      let tasksData: any[] = [];
      
      try {
        const response = await fetch(`${API_URL}/tasks/manager/${managerId}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            tasksData = data;
          }
        }
      } catch (error) {
        console.log('Error with manager tasks endpoint, trying all tasks:', error);
      }
      
      if (tasksData.length === 0) {
        try {
          const response = await fetch(`${API_URL}/tasks`);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              tasksData = data;
            }
          }
        } catch (error) {
          console.log('Error with all tasks endpoint:', error);
        }
      }
      
      if (tasksData.length > 0) {
        const assignedToManager = tasksData.filter((task: any) => {
          const isAssignedById = task.assignedTo === managerId;
          const isAssignedByName = task.assignedToName?.toLowerCase() === managerName?.toLowerCase();
          const isAssignedByAssignee = task.assignee === managerId;
          return task.assignedTo && (isAssignedById || isAssignedByName || isAssignedByAssignee);
        });
        
        const tasks: TaskDetail[] = assignedToManager.map((task: any) => {
          let progress = 0;
          if (task.status === 'completed') progress = 100;
          else if (task.status === 'in-progress') progress = Math.floor(Math.random() * 70) + 30;
          else if (task.status === 'pending') progress = Math.floor(Math.random() * 30);
          
          let status = task.status || 'pending';
          if (status === 'pending' && task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dueDate < today) {
              status = 'overdue';
            }
          }
          
          return {
            id: task._id || task.id,
            _id: task._id || task.id,
            title: task.title || 'Untitled Task',
            description: task.description || '',
            assignee: task.assignee || task.assignedTo,
            assignedTo: task.assignedTo,
            assignedToName: task.assignedToName || managerName,
            priority: (task.priority || 'medium') as any,
            dueDate: task.dueDate || task.deadline,
            deadline: task.deadline || task.dueDate,
            status: status as any,
            progress: task.progress || progress,
            siteName: task.siteName,
            siteId: task.siteId,
            clientName: task.clientName,
            taskType: task.taskType,
            createdAt: task.createdAt || new Date().toISOString(),
            source: task.source || 'manager',
            isAssignedToMe: true
          };
        });
        
        setAssignedTasks(tasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // Fetch site attendance data for all manager's sites
  const fetchSiteAttendanceData = async (managerSites: Site[], date: string) => {
    try {
      setRefreshing(true);
      
      const data: SiteAttendanceData[] = [];
      let totalEmployeesAllSites = 0;
      let totalPresentAllSites = 0;
      let totalAbsentAllSites = 0;
      let totalWeeklyOffAllSites = 0;
      let totalLeaveAllSites = 0;
      
      for (const site of managerSites) {
        const siteData = await calculateSiteAttendanceData(site, date);
        data.push(siteData);
        
        totalEmployeesAllSites += siteData.totalEmployees;
        totalPresentAllSites += siteData.present;
        totalAbsentAllSites += siteData.absent;
        totalWeeklyOffAllSites += siteData.weeklyOff;
        totalLeaveAllSites += siteData.leave;
      }
      
      setSiteAttendanceData(data);
      
      const attendanceRate = totalEmployeesAllSites > 0 
        ? Math.round((totalPresentAllSites / totalEmployeesAllSites) * 100) 
        : 0;
      
      setStats(prev => ({
        ...prev,
        totalSites: managerSites.length,
        totalEmployees: totalEmployeesAllSites,
        totalPresent: totalPresentAllSites,
        totalAbsent: totalAbsentAllSites,
        totalWeeklyOff: totalWeeklyOffAllSites,
        totalLeave: totalLeaveAllSites,
        totalHalfDay: 0,
        attendanceRate
      }));
      
      console.log(`Total employees across all sites: ${totalEmployeesAllSites}`);
      
    } catch (error) {
      console.error('Error calculating site attendance:', error);
      toast.error('Error calculating attendance data');
    } finally {
      setRefreshing(false);
    }
  };

  // Load all data
  const loadAllData = async () => {
    setIsLoading(true);
    setIsStatsLoading(true);
    
    try {
      const managerSites = await fetchManagerSites(managerId);
      setSites(managerSites);
      
      await Promise.all([
        fetchAttendanceStatus(),
        fetchLeaveRequests(),
        fetchAssignedTasks(),
        fetchSiteAttendanceData(managerSites, selectedDate),
        loadAttendanceData()
      ]);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setIsLoading(false);
      setIsStatsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (managerId) {
      loadAllData();
    }
  }, [managerId]);

  // Recalculate when date changes
  useEffect(() => {
    if (sites.length > 0) {
      fetchSiteAttendanceData(sites, selectedDate);
    }
  }, [selectedDate]);

  // Filter sites based on search
  useEffect(() => {
    if (!siteAttendanceData || siteAttendanceData.length === 0) {
      setFilteredSiteData([]);
      return;
    }
    
    const filtered = siteAttendanceData.filter(site =>
      site.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredSiteData(filtered);
    setCurrentPage(1);
  }, [siteAttendanceData, searchTerm]);

  // Paginate sites
  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSiteData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSiteData, currentPage]);

  const totalPages = Math.ceil(filteredSiteData.length / itemsPerPage);

  // Get current day data for pie chart
  const currentDayData = useMemo(() => {
    if (attendanceData.length === 0) {
      return {
        date: new Date().toISOString().split('T')[0],
        day: 'Today',
        present: 0,
        absent: 0,
        weeklyOff: 0,
        leave: 0,
        halfDay: 0,
        total: 0,
        rate: '0.0%',
        index: 0,
        totalEmployees: totalEmployeesManagerSites,
        sitesWithData: 0,
        siteBreakdown: {}
      };
    }
    return attendanceData[currentDayIndex] || attendanceData[0];
  }, [attendanceData, currentDayIndex, totalEmployeesManagerSites]);

  // Get six days data
  const sixDaysData = useMemo(() => {
    if (attendanceData.length === 0) return [];
    return attendanceData.slice(sixDaysStartIndex, sixDaysStartIndex + 6);
  }, [attendanceData, sixDaysStartIndex]);

  // Current day pie data - NOW INCLUDING WEEKLY OFF IN SEPARATE COLOR
  const currentDayPieData = [
    { name: 'Present', value: currentDayData.present, color: CHART_COLORS.present },
    { name: 'Weekly Off', value: currentDayData.weeklyOff, color: CHART_COLORS.weeklyOff },
    { name: 'Leave', value: currentDayData.leave, color: CHART_COLORS.leave },
    { name: 'Absent', value: currentDayData.absent, color: CHART_COLORS.absent }
  ].filter(item => item.value > 0); // Only show categories with values > 0

  // Navigation handlers for pie charts
  const handlePreviousDay = () => {
    setCurrentDayIndex(prev => (prev > 0 ? prev - 1 : attendanceData.length - 1));
  };

  const handleNextDay = () => {
    setCurrentDayIndex(prev => (prev < attendanceData.length - 1 ? prev + 1 : 0));
  };

  const handleSixDaysPrevious = () => {
    setSixDaysStartIndex(prev => {
      const newIndex = prev + 6;
      const maxIndex = attendanceData.length - 6;
      return newIndex <= maxIndex ? newIndex : prev;
    });
  };

  const handleSixDaysNext = () => {
    setSixDaysStartIndex(prev => {
      const newIndex = prev - 6;
      return newIndex >= 1 ? newIndex : prev;
    });
  };

  const canGoSixDaysPrevious = sixDaysStartIndex < attendanceData.length - 6;
  const canGoSixDaysNext = sixDaysStartIndex > 1;

  const getDateRangeText = () => {
    if (sixDaysData.length === 0) return '';

    const firstDate = new Date(sixDaysData[0].date);
    const lastDate = new Date(sixDaysData[sixDaysData.length - 1].date);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    };

    return `${formatDate(firstDate)} - ${formatDate(lastDate)}`;
  };

  // Handle view details
  const handleViewDetails = (site: SiteAttendanceData) => {
    setSelectedSite(site);
    setShowSiteDetails(true);
  };

  // Handle back from details
  const handleBackFromDetails = () => {
    setShowSiteDetails(false);
    setSelectedSite(null);
  };

  // Handle refresh
  const handleRefresh = async () => {
    await loadAllData();
    toast.success('Dashboard data refreshed!');
  };

  // Handle check in
  const handleCheckIn = async () => {
    if (attendance.isCheckedIn || attendance.hasCheckedOutToday) {
      toast.error(attendance.hasCheckedOutToday ? "Already checked out for today" : "Already checked in");
      return;
    }

    setIsAttendanceLoading(true);
    try {
      const response = await fetch(`${API_URL}/manager-attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId, managerName })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Checked in successfully!");
        setAttendance(prev => ({
          ...prev,
          isCheckedIn: true,
          checkInTime: data.data.checkInTime,
          hasCheckedOutToday: false
        }));
      } else {
        toast.error(data.message || "Failed to check in");
      }
    } catch (error) {
      toast.error("Failed to check in");
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle check out
  const handleCheckOut = async () => {
    if (!attendance.isCheckedIn || attendance.hasCheckedOutToday) {
      toast.error("Cannot check out");
      return;
    }

    setIsAttendanceLoading(true);
    try {
      const response = await fetch(`${API_URL}/manager-attendance/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Checked out successfully!");
        setAttendance(prev => ({
          ...prev,
          isCheckedIn: false,
          checkOutTime: data.data.checkOutTime,
          totalHours: data.data.totalHours || 0,
          hasCheckedOutToday: true
        }));
      } else {
        toast.error(data.message || "Failed to check out");
      }
    } catch (error) {
      toast.error("Failed to check out");
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle break in
  const handleBreakIn = async () => {
    if (!attendance.isCheckedIn || attendance.isOnBreak) {
      toast.error(attendance.isOnBreak ? "Already on break" : "Must be checked in");
      return;
    }

    setIsAttendanceLoading(true);
    try {
      const response = await fetch(`${API_URL}/manager-attendance/breakin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Break started!");
        setAttendance(prev => ({
          ...prev,
          isOnBreak: true,
          breakStartTime: data.data.breakStartTime
        }));
      } else {
        toast.error(data.message || "Failed to start break");
      }
    } catch (error) {
      toast.error("Failed to start break");
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle break out
  const handleBreakOut = async () => {
    if (!attendance.isOnBreak) {
      toast.error("Not on break");
      return;
    }

    setIsAttendanceLoading(true);
    try {
      const response = await fetch(`${API_URL}/manager-attendance/breakout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Break ended!");
        setAttendance(prev => ({
          ...prev,
          isOnBreak: false,
          breakEndTime: data.data.breakEndTime,
          breakTime: prev.breakTime + (data.data.breakDuration || 0)
        }));
      } else {
        toast.error(data.message || "Failed to end break");
      }
    } catch (error) {
      toast.error("Failed to end break");
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle leave action
  const handleLeaveAction = async (leaveId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`${API_URL}/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          managerId,
          managerName
        })
      });

      const data = await response.json();
      if (data.success) {
        const updatedLeaves = leaveRequests.map(leave => 
          leave.id === leaveId ? { ...leave, status: action === 'approve' ? 'approved' : 'rejected' } : leave
        );
        setLeaveRequests(updatedLeaves);
        
        const newPendingCount = updatedLeaves.filter(l => l.status === 'pending').length;
        setPendingLeaveCount(newPendingCount);
        setStats(prev => ({ ...prev, pendingLeaves: newPendingCount }));
        
        const leave = leaveRequests.find(l => l.id === leaveId);
        toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} leave for ${leave?.employeeName}`);
      } else {
        toast.error(data.message || `Failed to ${action} leave`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} leave`);
    }
  };

  // Handle export
  const handleExport = () => {
    const headers = ['Site Name', 'Client', 'Location', 'Total Employees', 'Present', 'Weekly Off', 'Leave', 'Absent', 'Shortage', 'Attendance Rate'];
    const csvContent = [
      headers.join(','),
      ...filteredSiteData.map(site => [
        `"${site.name}"`,
        `"${site.clientName || '-'}"`,
        `"${site.location || '-'}"`,
        site.totalEmployees,
        site.present,
        site.weeklyOff,
        site.leave,
        site.absent,
        site.shortage,
        `${site.attendanceRate}%`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `site_attendance_${selectedDate}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Data exported successfully');
  };

  // Handle navigation to attendance page with date
 // Update the handleNavigateToAttendance function in ManagerDashboard.tsx
// Update the handleNavigateToAttendance function in ManagerDashboard.tsx
const handleNavigateToAttendance = (date: string) => {
  // Navigate to managerattendance with the team-attendance tab active and the selected date
  navigate(`/manager/managerattendance?tab=team-attendance&date=${date}`);
};

  // Custom tooltips
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-3 border rounded-lg shadow-lg"
        >
          <p className="font-semibold text-sm">{data.name}</p>
          <p className="text-sm" style={{ color: data.payload.fill }}>
            {data.value} employees ({((data.value / currentDayData.totalEmployees) * 100).toFixed(1)}%)
          </p>
        </motion.div>
      );
    }
    return null;
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Excellent: "bg-green-100 text-green-800 border-green-200",
      Good: "bg-blue-100 text-blue-800 border-blue-200",
      Average: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Poor: "bg-red-100 text-red-800 border-red-200"
    };
    return styles[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // If showing site details
  if (showSiteDetails && selectedSite) {
    return (
      <SiteEmployeeDetails
        siteData={selectedSite}
        onBack={handleBackFromDetails}
        selectedDate={selectedDate}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <DashboardHeader 
        title="Manager Dashboard" 
        subtitle={`Welcome back, ${managerName}! Here's your site attendance overview`}
        onMenuClick={onMenuClick}
      />

      <div className="p-6 space-y-6">
        {/* Attendance Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-blue-600" />
                Your Attendance Control
                {isAttendanceLoading && (
                  <Badge variant="outline" className="ml-2">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Processing...
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage your work hours and breaks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      disabled={attendance.isCheckedIn || attendance.hasCheckedOutToday || isAttendanceLoading}
                      className="flex-1 flex items-center gap-2"
                    >
                      {isAttendanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                      {isAttendanceLoading ? "Processing..." : "Check In"}
                    </Button>
                    <Button
                      onClick={handleCheckOut}
                      disabled={!attendance.isCheckedIn || attendance.hasCheckedOutToday || isAttendanceLoading}
                      className="flex-1 flex items-center gap-2"
                    >
                      {isAttendanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                      {isAttendanceLoading ? "Processing..." : "Check Out"}
                    </Button>
                  </div>
                  {attendance.checkInTime && (
                    <p className="text-xs text-gray-500">
                      Checked in: {formatTimeForDisplay(attendance.checkInTime)}
                    </p>
                  )}
                </div>

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
                      disabled={!attendance.isCheckedIn || attendance.isOnBreak || isAttendanceLoading}
                      className="flex-1 flex items-center gap-2"
                    >
                      {isAttendanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coffee className="h-4 w-4" />}
                      {isAttendanceLoading ? "Processing..." : "Break In"}
                    </Button>
                    <Button
                      onClick={handleBreakOut}
                      disabled={!attendance.isOnBreak || isAttendanceLoading}
                      className="flex-1 flex items-center gap-2"
                    >
                      {isAttendanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />}
                      {isAttendanceLoading ? "Processing..." : "Break Out"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Hours:</span>
                    <p className="font-medium">{attendance.totalHours.toFixed(2)}h</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Break Time:</span>
                    <p className="font-medium">{attendance.breakTime.toFixed(2)}h</p>
                  </div>
                </div>
                {attendance.hasCheckedOutToday && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Already checked out for today
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 7 Days Attendance Rate Pie Charts - WITH WEEKLY OFF IN SEPARATE COLOR */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-blue-100/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="px-4 sm:px-6 bg-gradient-to-r from-blue-50 to-blue-100/30 rounded-t-lg border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                    <PieChartIcon className="h-5 w-5" />
                    7 Days Attendance - Your Assigned Sites
                  </CardTitle>
                  <p className="text-sm text-blue-600/80 mt-1">
                    Daily attendance overview for {totalEmployeesManagerSites} employees across {sites.length} sites
                    {!loadingAttendance && attendanceData.length > 0 && (
                      <span className="ml-2 text-green-600">
                        • {currentDayData.sitesWithData > 0 ? 'Real Data' : 'Demo Data'}
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant="outline" className="bg-white/80 border-blue-200">
                  <Eye className="h-3 w-3 mr-1" />
                  All Sites Combined
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {loadingAttendance ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                  <span className="text-muted-foreground">Loading attendance data across all sites...</span>
                </div>
              ) : attendanceData.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h3>
                  <p className="text-gray-500 mb-4">No attendance records found for the last 7 days.</p>
                  <Button onClick={handleRefresh} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  {/* 6 Days Small Pie Charts - UPDATED TO SHOW WEEKLY OFF */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Historical Overview - All Sites Combined
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {getDateRangeText()} | Total Employees: {totalEmployeesManagerSites}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSixDaysPrevious}
                          disabled={!canGoSixDaysPrevious}
                          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSixDaysNext}
                          disabled={!canGoSixDaysNext}
                          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      {sixDaysData.map((dayData, index) => {
                        const pieData = [
                          { name: 'Present', value: dayData.present, color: CHART_COLORS.present },
                          { name: 'Weekly Off', value: dayData.weeklyOff, color: CHART_COLORS.weeklyOff },
                          { name: 'Leave', value: dayData.leave, color: CHART_COLORS.leave },
                          { name: 'Absent', value: dayData.absent, color: CHART_COLORS.absent }
                        ].filter(item => item.value > 0);

                        return (
                          <motion.div
                            key={`${dayData.date}-${index}`}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Card
                              className="cursor-pointer transform transition-all duration-200 hover:shadow-lg border-2 hover:border-blue-300"
                              onClick={() => handleNavigateToAttendance(dayData.date)}
                            >
                              <CardContent className="p-3">
                                <div className="text-center mb-2">
                                  <p className="text-xs font-medium text-gray-700">{dayData.day}</p>
                                  <p className="text-xs text-muted-foreground">{dayData.date}</p>
                                  <Badge variant={
                                    parseFloat(dayData.rate) > 90 ? 'default' :
                                      parseFloat(dayData.rate) > 80 ? 'secondary' : 'destructive'
                                  } className="mt-1 text-xs">
                                    {dayData.rate}
                                  </Badge>
                                </div>
                                <div className="h-32">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                      <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={40}
                                        fill="#8884d8"
                                        dataKey="value"
                                        labelLine={false}
                                      >
                                        {pieData.map((entry, cellIndex) => (
                                          <Cell key={`cell-${cellIndex}`} fill={entry.color} />
                                        ))}
                                      </Pie>
                                      <Tooltip />
                                    </RechartsPieChart>
                                  </ResponsiveContainer>
                                </div>
                                <div className="text-center mt-2">
                                  <div className="flex justify-center items-center gap-2 text-xs flex-wrap">
                                    {dayData.present > 0 && (
                                      <div className="flex items-center">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                                        <span>{dayData.present}</span>
                                      </div>
                                    )}
                                    {dayData.weeklyOff > 0 && (
                                      <div className="flex items-center">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-1"></div>
                                        <span>{dayData.weeklyOff}</span>
                                      </div>
                                    )}
                                    {dayData.leave > 0 && (
                                      <div className="flex items-center">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                                        <span>{dayData.leave}</span>
                                      </div>
                                    )}
                                    {dayData.absent > 0 && (
                                      <div className="flex items-center">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                                        <span>{dayData.absent}</span>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    Total: {dayData.totalEmployees}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Main Today's Pie Chart - WITH WEEKLY OFF */}
                  <div className="border-t pt-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          Today's Overview - All Sites Combined
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Total Employees: {currentDayData.totalEmployees} | 
                          Attendance Rate: {currentDayData.rate} | 
                          Sites with Data: {currentDayData.sitesWithData}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs flex-wrap">
                          <span className="flex items-center">
                            <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                            Present: {currentDayData.present}
                          </span>
                          <span className="flex items-center">
                            <span className="w-3 h-3 bg-purple-500 rounded-full mr-1"></span>
                            Weekly Off: {currentDayData.weeklyOff}
                          </span>
                          <span className="flex items-center">
                            <span className="w-3 h-3 bg-orange-500 rounded-full mr-1"></span>
                            Leave: {currentDayData.leave}
                          </span>
                          <span className="flex items-center">
                            <span className="w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                            Absent: {currentDayData.absent}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousDay}
                          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground mx-2 min-w-[60px] text-center">
                          Day {currentDayIndex + 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextDay}
                          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="cursor-pointer"
                        onClick={() => handleNavigateToAttendance(currentDayData.date)}
                      >
                        <div className="w-full h-80 bg-gradient-to-br from-blue-50/50 to-green-50/50 rounded-xl p-4 border-2 border-blue-200/50 hover:border-blue-400 transition-colors duration-300 backdrop-blur-sm">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={currentDayPieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              >
                                {currentDayPieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomPieTooltip />} />
                              <Legend />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>

                      {/* Detailed Breakdown Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Detailed Attendance Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                              <span className="font-medium">Present</span>
                              <div className="text-right">
                                <span className="font-bold text-green-600 text-lg">{currentDayData.present}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({((currentDayData.present / totalEmployeesManagerSites) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                              <span className="font-medium">Weekly Off</span>
                              <div className="text-right">
                                <span className="font-bold text-purple-600 text-lg">{currentDayData.weeklyOff}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({((currentDayData.weeklyOff / totalEmployeesManagerSites) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                              <span className="font-medium">On Leave</span>
                              <div className="text-right">
                                <span className="font-bold text-orange-600 text-lg">{currentDayData.leave}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({((currentDayData.leave / totalEmployeesManagerSites) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                              <span className="font-medium">Absent</span>
                              <div className="text-right">
                                <span className="font-bold text-red-600 text-lg">{currentDayData.absent}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({((currentDayData.absent / totalEmployeesManagerSites) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg mt-4 border-t pt-4">
                              <span className="font-medium text-blue-800">Total Employees</span>
                              <span className="font-bold text-blue-600 text-xl">{totalEmployeesManagerSites}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-center mt-4"
                    >
                      <p className="text-sm text-muted-foreground">
                        Click on the pie chart to view detailed site-wise attendance for {currentDayData.date}
                      </p>
                    </motion.div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Site Attendance Overview Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-2 border-blue-100/50 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/30 rounded-t-lg border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                    <Building className="h-5 w-5" />
                    Site-wise Attendance Overview
                  </CardTitle>
                  <CardDescription className="text-sm text-blue-600/80 mt-1">
                    Total employees across all your assigned sites: {stats.totalEmployees}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-white/80 border-blue-200">
                  {sites.length} {sites.length === 1 ? 'Site' : 'Sites'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40"
                  />
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(formatDate(new Date()))}>
                    Today
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sites..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Sites Table */}
              {refreshing ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading attendance data...</span>
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="h-12 px-4 text-left font-medium">Site Name</th>
                          <th className="h-12 px-4 text-left font-medium">Client</th>
                          <th className="h-12 px-4 text-left font-medium">Location</th>
                          <th className="h-12 px-4 text-left font-medium">Total</th>
                          <th className="h-12 px-4 text-left font-medium text-green-700 bg-green-50">Present</th>
                          <th className="h-12 px-4 text-left font-medium text-purple-700 bg-purple-50">Weekly Off</th>
                          <th className="h-12 px-4 text-left font-medium text-blue-700 bg-blue-50">Leave</th>
                          <th className="h-12 px-4 text-left font-medium text-red-700 bg-red-50">Absent</th>
                          <th className="h-12 px-4 text-left font-medium text-red-700 bg-red-50">Shortage</th>
                          <th className="h-12 px-4 text-left font-medium">Rate</th>
                          {/* <th className="h-12 px-4 text-left font-medium">Actions</th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedSites.length > 0 ? (
                          paginatedSites.map((site) => {
                            const status = site.attendanceRate >= 90 ? 'Excellent' :
                                          site.attendanceRate >= 80 ? 'Good' :
                                          site.attendanceRate >= 70 ? 'Average' : 'Poor';
                            
                            return (
                              <tr key={site.id} className="border-b hover:bg-muted/50">
                                <td className="p-4 align-middle font-medium">
                                  <div className="font-medium">{site.name}</div>
                                  {site.isRealData && (
                                    <Badge variant="outline" className="mt-1 text-xs bg-green-50">
                                      Real Data
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-4 align-middle">{site.clientName || '-'}</td>
                                <td className="p-4 align-middle">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    {site.location || '-'}
                                  </div>
                                </td>
                                <td className="p-4 align-middle font-bold">{site.totalEmployees}</td>
                                <td className="p-4 align-middle font-bold text-green-700 bg-green-50">{site.present}</td>
                                <td className="p-4 align-middle font-bold text-purple-700 bg-purple-50">{site.weeklyOff}</td>
                                <td className="p-4 align-middle font-bold text-blue-700 bg-blue-50">{site.leave}</td>
                                <td className="p-4 align-middle font-bold text-red-700 bg-red-50">{site.absent}</td>
                                <td className="p-4 align-middle font-bold text-red-700 bg-red-50">{site.shortage}</td>
                                <td className="p-4 align-middle font-bold">{site.attendanceRate}%</td>
                                {/* <td className="p-4 align-middle">
                                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(site)}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </td> */}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={11} className="p-8 text-center text-muted-foreground">
                              {filteredSiteData.length === 0 ? (
                                <div className="text-center py-8">
                                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sites Found</h3>
                                  <p className="text-gray-500">
                                    {searchTerm
                                      ? 'No sites match your search criteria.'
                                      : 'No sites are currently assigned to you.'}
                                  </p>
                                </div>
                              ) : (
                                'No data available'
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {filteredSiteData.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSiteData.length)} of {filteredSiteData.length} sites
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                          First
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                          Next
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                          Last
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Additional Sections - Leave Requests and Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Leave Requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Recent Leave Requests
                </CardTitle>
                <CardDescription>
                  {pendingLeaveCount} pending {pendingLeaveCount === 1 ? 'request' : 'requests'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaveRequests.length > 0 ? (
                    leaveRequests.map((leave, index) => (
                      <motion.div
                        key={leave.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-sm">{leave.employeeName}</div>
                          <div className="text-xs text-muted-foreground">
                            {leave.type} • {formatShortDate(leave.startDate)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {leave.status}
                          </Badge>
                          {leave.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleLeaveAction(leave.id, 'approve')}
                              >
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleLeaveAction(leave.id, 'reject')}
                              >
                                <XCircle className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No pending leave requests</p>
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    className="w-full mt-2"
                    onClick={() => navigate("/manager/leave")}
                  >
                    View All Leaves
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Assigned Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-green-600" />
                  Your Tasks
                </CardTitle>
                <CardDescription>
                  {assignedTasks.length} {assignedTasks.length === 1 ? 'task' : 'tasks'} assigned to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assignedTasks.slice(0, 3).map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate("/manager/tasks")}
                    >
                      <div className="font-medium text-sm truncate">{task.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className={
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {task.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Due: {formatShortDate(task.dueDate)}
                      </div>
                    </motion.div>
                  ))}
                  
                  {assignedTasks.length === 0 && (
                    <div className="text-center py-4">
                      <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No tasks assigned to you</p>
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    className="w-full mt-2"
                    onClick={() => navigate("/manager/tasks")}
                  >
                    View All Tasks
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Access frequently used features with one click
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="outline"
                      className={`w-full h-28 flex flex-col items-center justify-center gap-3 ${action.bgColor} ${action.hoverColor} border-0 transition-all duration-300 shadow-md hover:shadow-lg`}
                      onClick={action.action}
                    >
                      <div className={`p-3 rounded-full bg-white/20 backdrop-blur-sm`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-sm text-white">{action.title}</div>
                        <div className="text-xs text-white/80 mt-1">{action.description}</div>
                      </div>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ManagerDashboard;