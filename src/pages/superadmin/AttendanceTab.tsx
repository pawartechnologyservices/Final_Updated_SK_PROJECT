import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  ArrowLeft, 
  Download, 
  Filter, 
  Calendar, 
  Building, 
  Users, 
  Edit, 
  Save, 
  X,
  Plus,
  Minus,
  User,
  AlertCircle,
  UserCheck,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RefreshCw,
  Loader2,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
  FileSpreadsheet,
  MapPin,
  Briefcase,
  Hash,
  Mail,
  Phone,
  UserCog,
  Target,
  Percent,
  FileText,
  Shield,
  ShieldCheck,
  Camera,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { siteService, Site } from "@/services/SiteService";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// API URL
const API_URL = process.env.NODE_ENV === 'development' 
  ? `http://${window.location.hostname}:5001/api` 
  : '/api';

// Department data matching the dashboard
const departmentViewData = [
  { 
    department: 'Housekeeping', 
    present: 56, 
    total: 65, 
    rate: '86.2%'
  },
  { 
    department: 'Security', 
    present: 26, 
    total: 28, 
    rate: '92.9%'
  },
  { 
    department: 'Parking', 
    present: 5, 
    total: 5, 
    rate: '100%'
  },
  { 
    department: 'Waste Management', 
    present: 8, 
    total: 10, 
    rate: '80.0%'
  },
  { 
    department: 'Consumables', 
    present: 3, 
    total: 3, 
    rate: '100%'
  },
  { 
    department: 'Other', 
    present: 5, 
    total: 7, 
    rate: '71.4%'
  },
];

// Employee data structure with photo fields
interface Employee {
  id: string;
  _id?: string;
  employeeId?: string;
  name: string;
  department: string;
  position: string;
  status: 'present' | 'absent' | 'leave' | 'weekly-off';
  checkInTime?: string;
  checkOutTime?: string;
  checkInPhoto?: string;
  checkOutPhoto?: string;
  site: string;
  siteName?: string;
  date: string;
  remark?: string;
  action?: 'fine' | 'advance' | 'other' | '' | 'none';
  email?: string;
  phone?: string;
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
  isManager?: boolean;
  isSupervisor?: boolean;
}

// Attendance Record structure with photo fields
interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
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
  shift?: string;
  overtimeHours?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
}

// Site Deployment Stats interface
interface SiteDeploymentStats {
  totalStaff: number;
  managerCount: number;
  supervisorCount: number;
  staffCount: number;
  managerRequirement: number;
  supervisorRequirement: number;
  staffRequirement: number;
  dailyStaffRequirement: number;
  totalStaffRequirementForPeriod: number;
  isStaffFull: boolean;
  remainingStaff: number;
}

// Helper function to calculate days between dates
const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff + 1;
};

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
    console.error('Error formatting time:', timestamp, error);
    return timestamp || "-";
  }
};

// Helper function to check if employee is manager or supervisor
const isManagerOrSupervisor = (employee: Employee): boolean => {
  const position = employee.position?.toLowerCase() || '';
  const department = employee.department?.toLowerCase() || '';
  
  return position.includes('manager') || 
         position.includes('supervisor') || 
         department.includes('manager') || 
         department.includes('supervisor');
};

// Fetch employees from API
const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    console.log('🔄 Fetching employees from API...');
    
    const response = await axios.get(`${API_URL}/employees`, {
      params: { limit: 1000 }
    });
    
    console.log('Employees API response:', response.data);
    
    let employeesData = [];
    
    if (response.data) {
      if (Array.isArray(response.data)) {
        employeesData = response.data;
      } else if (response.data.success && Array.isArray(response.data.data)) {
        employeesData = response.data.data;
      } else if (Array.isArray(response.data.employees)) {
        employeesData = response.data.employees;
      } else if (response.data.data && Array.isArray(response.data.data.employees)) {
        employeesData = response.data.data.employees;
      }
    }
    
    // Transform employees data to match our interface
    const transformedEmployees: Employee[] = employeesData.map((emp: any) => {
      const employee = {
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
        status: "present" as const,
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
        isManager: false,
        isSupervisor: false
      };
      
      // Set manager/supervisor flags
      const position = employee.position?.toLowerCase() || '';
      const department = employee.department?.toLowerCase() || '';
      
      employee.isManager = position.includes('manager') || department.includes('manager');
      employee.isSupervisor = position.includes('supervisor') || department.includes('supervisor');
      
      return employee;
    });
    
    console.log(`✅ Loaded ${transformedEmployees.length} employees`);
    return transformedEmployees;
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    throw new Error(`Error loading employees: ${error.message}`);
  }
};

// Fetch attendance records for date range
const fetchAttendanceRecords = async (start: string, end: string): Promise<AttendanceRecord[]> => {
  try {
    console.log(`🔄 Fetching attendance records from ${start} to ${end}`);
    
    // First, try to fetch all attendance records (might be paginated)
    try {
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { 
          startDate: start, 
          endDate: end,
          limit: 1000
        }
      });
      
      console.log('Attendance API response:', response.data);
      
      if (response.data) {
        let records = [];
        
        if (response.data.success && Array.isArray(response.data.data)) {
          records = response.data.data;
        } else if (Array.isArray(response.data)) {
          records = response.data;
        } else if (response.data.attendance && Array.isArray(response.data.attendance)) {
          records = response.data.attendance;
        }
        
        // Filter records by date range if API doesn't support range filtering
        const filteredRecords = records.filter((record: any) => {
          const recordDate = record.date;
          return recordDate >= start && recordDate <= end;
        });
        
        const transformedRecords: AttendanceRecord[] = filteredRecords.map((record: any) => ({
          _id: record._id || record.id || `att_${Math.random()}`,
          employeeId: record.employeeId || record.employee?._id || '',
          employeeName: record.employeeName || record.employee?.name || 'Unknown',
          date: record.date || '',
          checkInTime: record.checkInTime || null,
          checkOutTime: record.checkOutTime || null,
          checkInPhoto: record.checkInPhoto || null,
          checkOutPhoto: record.checkOutPhoto || null,
          breakStartTime: record.breakStartTime || null,
          breakEndTime: record.breakEndTime || null,
          totalHours: Number(record.totalHours) || 0,
          breakTime: Number(record.breakTime) || 0,
          status: (record.status?.toLowerCase() || 'absent') as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off',
          isCheckedIn: Boolean(record.isCheckedIn),
          isOnBreak: Boolean(record.isOnBreak),
          supervisorId: record.supervisorId,
          remarks: record.remarks || '',
          siteName: record.siteName || record.site || record.department || '',
          department: record.department || '',
          shift: record.shift || '',
          overtimeHours: Number(record.overtimeHours) || 0,
          lateMinutes: Number(record.lateMinutes) || 0,
          earlyLeaveMinutes: Number(record.earlyLeaveMinutes) || 0
        }));
        
        console.log(`✅ Loaded ${transformedRecords.length} attendance records from main endpoint`);
        return transformedRecords;
      }
    } catch (mainError) {
      console.log('Main attendance endpoint failed, trying range endpoint:', mainError);
    }
    
    // Try bulk range endpoint second
    try {
      const response = await axios.get(`${API_URL}/attendance/range`, {
        params: { startDate: start, endDate: end }
      });
      
      console.log('Attendance range API response:', response.data);
      
      if (response.data) {
        let records = [];
        
        if (response.data.success && Array.isArray(response.data.data)) {
          records = response.data.data;
        } else if (Array.isArray(response.data)) {
          records = response.data;
        } else if (response.data.attendance && Array.isArray(response.data.attendance)) {
          records = response.data.attendance;
        }
        
        const transformedRecords: AttendanceRecord[] = records.map((record: any) => ({
          _id: record._id || record.id || `att_${Math.random()}`,
          employeeId: record.employeeId || record.employee?._id || '',
          employeeName: record.employeeName || record.employee?.name || 'Unknown',
          date: record.date || '',
          checkInTime: record.checkInTime || null,
          checkOutTime: record.checkOutTime || null,
          checkInPhoto: record.checkInPhoto || null,
          checkOutPhoto: record.checkOutPhoto || null,
          breakStartTime: record.breakStartTime || null,
          breakEndTime: record.breakEndTime || null,
          totalHours: Number(record.totalHours) || 0,
          breakTime: Number(record.breakTime) || 0,
          status: (record.status?.toLowerCase() || 'absent') as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off',
          isCheckedIn: Boolean(record.isCheckedIn),
          isOnBreak: Boolean(record.isOnBreak),
          supervisorId: record.supervisorId,
          remarks: record.remarks || '',
          siteName: record.siteName || record.site || record.department || '',
          department: record.department || '',
          shift: record.shift || '',
          overtimeHours: Number(record.overtimeHours) || 0,
          lateMinutes: Number(record.lateMinutes) || 0,
          earlyLeaveMinutes: Number(record.earlyLeaveMinutes) || 0
        }));
        
        console.log(`✅ Loaded ${transformedRecords.length} attendance records from range endpoint`);
        return transformedRecords;
      }
    } catch (rangeError: any) {
      console.log('Range endpoint failed:', rangeError.message);
    }
    
    // Fallback: fetch day by day
    console.log('Falling back to day-by-day attendance fetch...');
    const allRecords: AttendanceRecord[] = [];
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    
    const totalDays = calculateDaysBetween(start, end);
    let daysProcessed = 0;
    
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
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
          
          const transformedDayRecords: AttendanceRecord[] = dayRecords.map((record: any) => ({
            _id: record._id || record.id || `att_${Math.random()}`,
            employeeId: record.employeeId || record.employee?._id || '',
            employeeName: record.employeeName || record.employee?.name || 'Unknown',
            date: record.date || dateStr,
            checkInTime: record.checkInTime || null,
            checkOutTime: record.checkOutTime || null,
            checkInPhoto: record.checkInPhoto || null,
            checkOutPhoto: record.checkOutPhoto || null,
            breakStartTime: record.breakStartTime || null,
            breakEndTime: record.breakEndTime || null,
            totalHours: Number(record.totalHours) || 0,
            breakTime: Number(record.breakTime) || 0,
            status: (record.status?.toLowerCase() || 'absent') as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off',
            isCheckedIn: Boolean(record.isCheckedIn),
            isOnBreak: Boolean(record.isOnBreak),
            supervisorId: record.supervisorId,
            remarks: record.remarks || '',
            siteName: record.siteName || record.site || record.department || '',
            department: record.department || '',
            shift: record.shift || '',
            overtimeHours: Number(record.overtimeHours) || 0,
            lateMinutes: Number(record.lateMinutes) || 0,
            earlyLeaveMinutes: Number(record.earlyLeaveMinutes) || 0
          }));
          
          allRecords.push(...transformedDayRecords);
        }
        
        daysProcessed++;
        if (daysProcessed % 5 === 0) {
          console.log(`Processed ${daysProcessed}/${totalDays} days...`);
        }
      } catch (dayError: any) {
        console.log(`No attendance data for ${dateStr}: ${dayError.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Loaded ${allRecords.length} attendance records across ${totalDays} days (day-by-day)`);
    return allRecords;
    
  } catch (error: any) {
    console.error('Error fetching attendance records:', error);
    return [];
  }
};

// Generate employee data for sites - WITH PHOTO SUPPORT
const generateEmployeeData = async (siteName: string, startDate: string, endDate: string): Promise<Employee[]> => {
  try {
    const employees: Employee[] = [];
    
    // Fetch all employees
    const allEmployees = await fetchEmployees();
    
    // Filter employees for this site
    const siteEmployees = allEmployees.filter(emp => 
      emp.site === siteName || emp.siteName === siteName
    );
    
    // If no employees found for this site, return empty array
    if (siteEmployees.length === 0) {
      console.log(`No employees found for site: ${siteName}`);
      return [];
    }
    
    // Fetch attendance for the entire date range
    const attendanceRecords = await fetchAttendanceRecords(startDate, endDate);
    
    // Create a map of attendance records by employee and date for quick lookup
    const attendanceMap = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach(record => {
      const key = `${record.employeeId}_${record.date}`;
      attendanceMap.set(key, record);
    });
    
    // For each date in the range, create employee records
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysInPeriod = calculateDaysBetween(startDate, endDate);
    
    console.log(`Generating employee data for ${siteName} from ${startDate} to ${endDate} (${daysInPeriod} days) with ${siteEmployees.length} employees`);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const currentDate = formatDate(date);
      
      for (const employee of siteEmployees) {
        // Get attendance for this date
        const attendanceKey = `${employee._id || employee.id}_${currentDate}`;
        const attendance = attendanceMap.get(attendanceKey);
        
        // Determine status based on attendance
        let status: 'present' | 'absent' | 'leave' | 'weekly-off' = 'absent';
        let checkInTime = '';
        let checkOutTime = '';
        let checkInPhoto = '';
        let checkOutPhoto = '';
        let remark = '';
        
        if (attendance) {
          // Use the exact status from attendance record
          status = attendance.status as any;
          checkInTime = attendance.checkInTime ? formatTimeForDisplay(attendance.checkInTime) : '';
          checkOutTime = attendance.checkOutTime ? formatTimeForDisplay(attendance.checkOutTime) : '';
          checkInPhoto = attendance.checkInPhoto || '';
          checkOutPhoto = attendance.checkOutPhoto || '';
          remark = attendance.remarks || '';
        } else {
          // If no attendance record, mark as absent (not weekly off)
          // This is the key fix: only mark as weekly-off if explicitly set in attendance
          status = 'absent';
        }
        
        employees.push({
          id: `${employee.employeeId || employee.id}_${currentDate}`,
          _id: employee._id,
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          position: employee.position,
          isManager: employee.isManager,
          isSupervisor: employee.isSupervisor,
          status: status,
          checkInTime: checkInTime,
          checkOutTime: checkOutTime,
          checkInPhoto: checkInPhoto,
          checkOutPhoto: checkOutPhoto,
          site: siteName,
          siteName: siteName,
          date: currentDate,
          remark: remark,
          action: 'none',
          email: employee.email,
          phone: employee.phone,
          employeeStatus: employee.employeeStatus,
          role: employee.role,
          gender: employee.gender,
          dateOfJoining: employee.dateOfJoining,
          dateOfBirth: employee.dateOfBirth,
          salary: employee.salary,
          assignedSites: employee.assignedSites,
          shift: employee.shift,
          workingHours: employee.workingHours,
          employeeType: employee.employeeType,
          reportingManager: employee.reportingManager,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt
        });
      }
    }
    
    // If no real employees found, generate demo data as fallback
    if (employees.length === 0) {
      console.log('No real employees found, generating demo data for', siteName);
      return generateDemoEmployeeData(siteName, startDate, endDate);
    }
    
    console.log(`Generated ${employees.length} employee records for ${siteName}`);
    return employees;
  } catch (error) {
    console.error('Error generating employee data:', error);
    return generateDemoEmployeeData(siteName, startDate, endDate);
  }
};

// Generate demo employee data with mock photos
const generateDemoEmployeeData = (siteName: string, startDate: string, endDate: string): Employee[] => {
  const employees: Employee[] = [];
  const departments = ['Housekeeping', 'Security', 'Parking', 'Waste Management', 'Consumables', 'Other'];
  const positions = ['Staff', 'Supervisor', 'Manager', 'Executive'];
  const actions = ['fine', 'advance', 'other', 'none'] as const;
  const remarks = [
    'Late arrival',
    'Early departure',
    'Half day',
    'Permission granted',
    'Medical leave',
    'Personal work',
    '',
    '',
    '',
    ''
  ];
  
  // Generate demo employees for each date in the range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysInPeriod = calculateDaysBetween(startDate, endDate);
  
  // Base employees (same across dates)
  const baseEmployees: { id: string; name: string; department: string; position: string; isManager: boolean; isSupervisor: boolean; }[] = [];
  const totalEmployees = 10 + Math.floor(Math.random() * 20);
  
  for (let i = 1; i <= totalEmployees; i++) {
    const position = positions[Math.floor(Math.random() * positions.length)];
    const isManager = position === 'Manager';
    const isSupervisor = position === 'Supervisor';
    
    baseEmployees.push({
      id: `DEMO${siteName.substring(0, 3).toUpperCase()}${i.toString().padStart(3, '0')}`,
      name: `Demo Employee ${i}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      position: position,
      isManager,
      isSupervisor
    });
  }
  
  // For each date, create attendance records
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const currentDate = formatDate(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    baseEmployees.forEach((baseEmp, index) => {
      let status: 'present' | 'absent' | 'leave' | 'weekly-off';
      
      // Only set weekly-off on weekends and based on probability
      // This ensures weekly-off is explicitly set, not default
      if (isWeekend && Math.random() > 0.8) {
        status = 'weekly-off';
      } else {
        const rand = Math.random();
        if (rand < 0.75) {
          status = 'present';
        } else if (rand < 0.9) {
          status = 'absent';
        } else {
          status = 'leave';
        }
      }
      
      const hasRemark = Math.random() > 0.5;
      const hasAction = Math.random() > 0.7;
      
      // Mock photo URLs for demo
      const mockPhotoUrl = status === 'present' 
        ? `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/200`
        : '';
      
      employees.push({
        id: `${baseEmp.id}_${currentDate}`,
        employeeId: baseEmp.id,
        name: baseEmp.name,
        department: baseEmp.department,
        position: baseEmp.position,
        isManager: baseEmp.isManager,
        isSupervisor: baseEmp.isSupervisor,
        status: status,
        checkInTime: status === 'present' ? '09:00 AM' : '',
        checkOutTime: status === 'present' ? '06:00 PM' : '',
        checkInPhoto: status === 'present' ? mockPhotoUrl : '',
        checkOutPhoto: status === 'present' ? mockPhotoUrl : '',
        site: siteName,
        siteName: siteName,
        date: currentDate,
        remark: hasRemark ? remarks[Math.floor(Math.random() * remarks.length)] : '',
        action: hasAction ? actions[Math.floor(Math.random() * actions.length)] : 'none',
        email: `demo${index}@example.com`,
        phone: `+123456789${index}`,
        employeeStatus: 'active',
        role: 'employee',
        shift: 'General',
        workingHours: '9:00 AM - 6:00 PM',
        employeeType: 'Full-time'
      });
    });
  }
  
  return employees;
};

// Calculate site deployment statistics
const calculateSiteDeploymentStats = (site: Site, employees: Employee[]): SiteDeploymentStats => {
  const managerRequirement = site.managerCount || 0;
  const supervisorRequirement = site.supervisorCount || 0;
  
  const staffRequirement = Array.isArray(site.staffDeployment) 
    ? site.staffDeployment.reduce((total, item) => {
        const role = item.role?.toLowerCase() || '';
        if (!role.includes('manager') && !role.includes('supervisor')) {
          return total + (Number(item.count) || 0);
        }
        return total;
      }, 0)
    : 0;
  
  let managerCount = 0;
  let supervisorCount = 0;
  let staffCount = 0;
  
  // Count unique employees (not per day)
  const uniqueEmployeeIds = new Set<string>();
  employees.forEach(emp => {
    if (!uniqueEmployeeIds.has(emp.employeeId || emp.id)) {
      uniqueEmployeeIds.add(emp.employeeId || emp.id);
      if (emp.isManager) {
        managerCount++;
      } else if (emp.isSupervisor) {
        supervisorCount++;
      } else {
        staffCount++;
      }
    }
  });
  
  const totalStaff = managerCount + supervisorCount + staffCount;
  const dailyStaffRequirement = staffRequirement;
  const remainingStaff = Math.max(0, staffRequirement - staffCount);
  const isStaffFull = staffCount >= staffRequirement;
  
  return {
    totalStaff,
    managerCount,
    supervisorCount,
    staffCount,
    managerRequirement,
    supervisorRequirement,
    staffRequirement,
    dailyStaffRequirement,
    totalStaffRequirementForPeriod: dailyStaffRequirement,
    isStaffFull,
    remainingStaff
  };
};

// Calculate attendance data for a site for a given period
const calculateSiteAttendanceData = async (site: Site, startDate: string, endDate: string) => {
  const daysInPeriod = calculateDaysBetween(startDate, endDate);
  const isSingleDay = daysInPeriod === 1;
  
  let employees: Employee[] = [];
  try {
    employees = await generateEmployeeData(site.name, startDate, endDate);
  } catch (error) {
    console.error('Error fetching employee data:', error);
    employees = generateDemoEmployeeData(site.name, startDate, endDate);
  }
  
  const deploymentStats = calculateSiteDeploymentStats(site, employees);
  const dailyRequirement = deploymentStats.dailyStaffRequirement;
  const totalRequiredForPeriod = dailyRequirement * daysInPeriod;
  
  let totalPresentCount = 0;
  let totalAbsentCount = 0;
  let totalWeeklyOffCount = 0;
  let totalLeaveCount = 0;
  
  const dailyStats: { [date: string]: { present: number; absent: number; weeklyOff: number; leave: number; total: number } } = {};
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = formatDate(date);
    dailyStats[dateStr] = { present: 0, absent: 0, weeklyOff: 0, leave: 0, total: 0 };
  }
  
  // Count attendance per date, excluding managers and supervisors
  employees.forEach(emp => {
    // Skip managers and supervisors for staff counts
    if (emp.isManager || emp.isSupervisor) return;
    
    const date = emp.date;
    if (!dailyStats[date]) {
      dailyStats[date] = { present: 0, absent: 0, weeklyOff: 0, leave: 0, total: 0 };
    }
    
    dailyStats[date].total++;
    
    // CRITICAL FIX: Only count as weekly-off if status is explicitly 'weekly-off'
    if (emp.status === 'present') {
      totalPresentCount++;
      dailyStats[date].present++;
    } else if (emp.status === 'absent') {
      totalAbsentCount++;
      dailyStats[date].absent++;
    } else if (emp.status === 'weekly-off') {
      totalWeeklyOffCount++;
      dailyStats[date].weeklyOff++;
    } else if (emp.status === 'leave') {
      totalLeaveCount++;
      dailyStats[date].leave++;
    } else {
      // Any other status (like undefined) counts as absent
      totalAbsentCount++;
      dailyStats[date].absent++;
    }
  });
  
  const totalRequiredAttendance = totalRequiredForPeriod;
  const totalPresentAttendance = totalPresentCount; // Only actual present counts, not including weekly-off
  const periodShortage = totalAbsentCount + totalLeaveCount;
  
  const singleDayPresent = Object.values(dailyStats)[0]?.present || 0;
  const singleDayWeeklyOff = Object.values(dailyStats)[0]?.weeklyOff || 0;
  const singleDayLeave = Object.values(dailyStats)[0]?.leave || 0;
  const singleDayAbsent = Object.values(dailyStats)[0]?.absent || 0;
  const singleDayTotalPresent = singleDayPresent; // Only actual present for daily view
  const singleDayOnSiteRequirement = dailyRequirement; // Weekly off doesn't reduce requirement for daily
  
  return {
    id: `${site._id}-${startDate}-${endDate}`,
    siteId: `${site._id}-${startDate}-${endDate}`,
    name: site.name,
    siteName: site.name,
    dailyRequirement,
    totalEmployees: dailyRequirement,
    deploymentStats,
    totalRequiredForPeriod,
    totalPresent: totalPresentCount,
    totalWeeklyOff: totalWeeklyOffCount,
    totalLeave: totalLeaveCount,
    totalAbsent: totalAbsentCount,
    present: totalPresentCount,
    weeklyOff: totalWeeklyOffCount,
    leave: totalLeaveCount,
    absent: totalAbsentCount,
    shortage: periodShortage,
    date: `${startDate} to ${endDate}`,
    daysInPeriod,
    totalRequiredAttendance,
    totalPresentAttendance,
    periodShortage,
    startDate,
    endDate,
    presentCount: totalPresentCount,
    absentCount: totalAbsentCount,
    weeklyOffCount: totalWeeklyOffCount,
    leaveCount: totalLeaveCount,
    durationTotalRequired: totalRequiredForPeriod,
    durationWeeklyOff: totalWeeklyOffCount,
    durationOnSiteRequirement: totalRequiredForPeriod - totalWeeklyOffCount,
    durationPresent: totalPresentCount,
    durationAbsent: totalAbsentCount + totalLeaveCount,
    avgDailyPresent: Math.round(totalPresentCount / daysInPeriod),
    avgDailyAbsent: Math.round((totalAbsentCount + totalLeaveCount) / daysInPeriod),
    avgDailyWeeklyOff: Math.round(totalWeeklyOffCount / daysInPeriod),
    avgDailyLeave: Math.round(totalLeaveCount / daysInPeriod),
    avgDailyTotalRequired: dailyRequirement,
    avgDailyOnSiteRequirement: dailyRequirement,
    dailyStats,
    singleDayPresent,
    singleDayWeeklyOff,
    singleDayLeave,
    singleDayAbsent,
    singleDayTotalPresent,
    singleDayShortage: singleDayAbsent + singleDayLeave,
    singleDayOnSiteRequirement,
    employees: employees || [],
    originalSite: site,
    isRealData: employees.length > 0 && employees[0]?.employeeId?.startsWith?.('DEMO') === false
  };
};

// Calculate department site data
const calculateDepartmentSiteData = async (site: Site, startDate: string, endDate: string, department: string) => {
  const siteData = await calculateSiteAttendanceData(site, startDate, endDate);
  
  const departmentEmployees = (siteData.employees || []).filter(emp => emp.department === department);
  
  let departmentPresent = 0;
  let departmentAbsent = 0;
  let departmentWeeklyOff = 0;
  let departmentLeave = 0;
  
  departmentEmployees.forEach(emp => {
    if (emp.isManager || emp.isSupervisor) return;
    
    if (emp.status === 'present') departmentPresent++;
    else if (emp.status === 'absent') departmentAbsent++;
    else if (emp.status === 'weekly-off') departmentWeeklyOff++;
    else if (emp.status === 'leave') departmentLeave++;
    else departmentAbsent++;
  });
  
  const departmentDailyRequirement = Math.round(departmentEmployees.filter(emp => !emp.isManager && !emp.isSupervisor).length / siteData.daysInPeriod);
  const departmentTotalRequired = departmentDailyRequirement * siteData.daysInPeriod;
  
  return {
    ...siteData,
    siteId: `${site._id}-${startDate}-${endDate}`,
    dailyRequirement: departmentDailyRequirement,
    totalEmployees: departmentDailyRequirement,
    totalRequiredForPeriod: departmentTotalRequired,
    totalPresent: departmentPresent,
    totalWeeklyOff: departmentWeeklyOff,
    totalLeave: departmentLeave,
    totalAbsent: departmentAbsent,
    present: departmentPresent,
    weeklyOff: departmentWeeklyOff,
    leave: departmentLeave,
    absent: departmentAbsent,
    employees: departmentEmployees,
    durationTotalRequired: departmentTotalRequired,
    durationWeeklyOff: departmentWeeklyOff,
    durationOnSiteRequirement: departmentTotalRequired - departmentWeeklyOff,
    durationPresent: departmentPresent,
    durationAbsent: departmentAbsent + departmentLeave
  };
};

const departments = departmentViewData.map(dept => dept.department);

// Site Employee Details Page Component with Photo Viewing
interface SiteEmployeeDetailsProps {
  siteData: any;
  onBack: () => void;
  viewType: 'site' | 'department';
}

const SiteEmployeeDetails: React.FC<SiteEmployeeDetailsProps> = ({ siteData, onBack, viewType }) => {
  if (!siteData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Site Data...</h2>
          <p className="text-gray-600 mb-4">Please wait while site data is being loaded.</p>
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attendance View
          </Button>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'all' | 'present' | 'absent' | 'weekly-off' | 'leave'>('all');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>(siteData.startDate || new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>(siteData?.employees || []);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyView, setDailyView] = useState<boolean>(siteData.daysInPeriod === 1);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoType, setSelectedPhotoType] = useState<'checkin' | 'checkout'>('checkin');
  
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    employees.forEach(emp => {
      if (emp.date) dates.add(emp.date);
    });
    return Array.from(dates).sort();
  }, [employees]);
  
  useEffect(() => {
    if (siteData?.employees) {
      setEmployees(siteData.employees || []);
      if (siteData.daysInPeriod === 1) {
        setDailyView(true);
        setSelectedDate(siteData.startDate);
      } else {
        setDailyView(false);
      }
    }
  }, [siteData?.employees, siteData?.daysInPeriod, siteData?.startDate]);
  
  const handleViewPhoto = (photoUrl: string | null | undefined, type: 'checkin' | 'checkout') => {
    if (photoUrl) {
      setSelectedPhoto(photoUrl);
      setSelectedPhotoType(type);
      setPhotoModalOpen(true);
    } else {
      toast.error('No photo available for this attendance record');
    }
  };
  
  const filteredEmployeesByDate = useMemo(() => {
    if (dailyView && selectedDate) {
      return employees.filter(emp => emp.date === selectedDate);
    }
    return employees;
  }, [employees, dailyView, selectedDate]);

  const allEmployees = filteredEmployeesByDate;
  const presentEmployees = allEmployees.filter((emp: Employee) => emp.status === 'present');
  const absentEmployees = allEmployees.filter((emp: Employee) => emp.status === 'absent');
  const weeklyOffEmployees = allEmployees.filter((emp: Employee) => emp.status === 'weekly-off');
  const leaveEmployees = allEmployees.filter((emp: Employee) => emp.status === 'leave');
  const managersAndSupervisors = allEmployees.filter((emp: Employee) => emp.isManager || emp.isSupervisor);

  const filteredEmployees = useMemo(() => {
    let employeesList = [];
    switch (activeTab) {
      case 'present':
        employeesList = presentEmployees;
        break;
      case 'absent':
        employeesList = absentEmployees;
        break;
      case 'weekly-off':
        employeesList = weeklyOffEmployees;
        break;
      case 'leave':
        employeesList = leaveEmployees;
        break;
      default:
        employeesList = allEmployees;
    }

    if (employeeSearch) {
      employeesList = employeesList.filter((emp: Employee) =>
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (emp.employeeId && emp.employeeId.toLowerCase().includes(employeeSearch.toLowerCase())) ||
        emp.department.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (emp.email && emp.email.toLowerCase().includes(employeeSearch.toLowerCase()))
      );
    }

    return employeesList;
  }, [activeTab, employeeSearch, allEmployees, presentEmployees, absentEmployees, weeklyOffEmployees, leaveEmployees]);

  const itemsPerPage = 20;
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const refreshEmployeeData = async () => {
    try {
      setRefreshing(true);
      console.log('Refreshing employee data for site:', siteData.siteName);
      
      const refreshedEmployees = await generateEmployeeData(
        siteData.siteName || siteData.name,
        siteData.startDate,
        siteData.endDate
      );
      
      setEmployees(refreshedEmployees);
      toast.success('Employee data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing employee data:', error);
      toast.error('Failed to refresh employee data');
    } finally {
      setRefreshing(false);
    }
  };

  const updateEmployeeAction = (employeeId: string, action: 'fine' | 'advance' | 'other' | '' | 'none') => {
    setEmployees(prevEmployees =>
      prevEmployees.map(emp =>
        emp.id === employeeId ? { 
          ...emp, 
          action: action === 'none' ? '' : action 
        } : emp
      )
    );
  };

  const updateEmployeeRemark = (employeeId: string, remark: string) => {
    setEmployees(prevEmployees =>
      prevEmployees.map(emp =>
        emp.id === employeeId ? { ...emp, remark } : emp
      )
    );
  };

  const handleExportEmployeeDetails = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Position',
      'Status',
      'Check In Time',
      'Check Out Time',
      'Check In Photo URL',
      'Check Out Photo URL',
      'Email',
      'Phone',
      'Employee Type',
      'Shift',
      'Working Hours',
      'Reporting Manager',
      'Date of Joining',
      'Action Required',
      'Remarks',
      'Site',
      'Date',
      'Role Type'
    ];
    
    const rows = filteredEmployees.map((emp: Employee) => [
      emp.employeeId || emp.id,
      `"${emp.name}"`,
      emp.department,
      emp.position,
      emp.status === 'weekly-off' ? 'Weekly Off' : emp.status === 'leave' ? 'Leave' : emp.status.charAt(0).toUpperCase() + emp.status.slice(1),
      emp.checkInTime || '-',
      emp.checkOutTime || '-',
      emp.checkInPhoto || '-',
      emp.checkOutPhoto || '-',
      emp.email || '-',
      emp.phone || '-',
      emp.employeeType || 'Full-time',
      emp.shift || 'General',
      emp.workingHours || '9:00 AM - 6:00 PM',
      emp.reportingManager || '-',
      emp.dateOfJoining ? formatDateDisplay(emp.dateOfJoining) : '-',
      emp.action === 'none' || !emp.action ? '-' : emp.action.charAt(0).toUpperCase() + emp.action.slice(1),
      `"${emp.remark || ''}"`,
      `"${emp.site}"`,
      emp.date,
      emp.isManager ? 'Manager' : emp.isSupervisor ? 'Supervisor' : 'Staff'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_details_${siteData.name || siteData.siteName}_${siteData.startDate}_to_${siteData.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Employee details exported successfully`);
  };

  const handleExportEmployees = () => {
    const headers = ['Employee ID', 'Name', 'Department', 'Position', 'Status', 'Check In', 'Check Out', 'Has Check In Photo', 'Has Check Out Photo', 'Action', 'Remark', 'Site', 'Date', 'Role Type'];
    const csvContent = [
      headers.join(','),
      ...filteredEmployees.map((emp: Employee) => [
        emp.employeeId || emp.id,
        `"${emp.name}"`,
        emp.department,
        emp.position,
        emp.status === 'weekly-off' ? 'Weekly Off' : emp.status === 'leave' ? 'Leave' : emp.status.charAt(0).toUpperCase() + emp.status.slice(1),
        emp.checkInTime || '-',
        emp.checkOutTime || '-',
        emp.checkInPhoto ? 'Yes' : 'No',
        emp.checkOutPhoto ? 'Yes' : 'No',
        emp.action === 'none' || !emp.action ? '-' : emp.action,
        `"${emp.remark || ''}"`,
        `"${emp.site}"`,
        emp.date,
        emp.isManager ? 'Manager' : emp.isSupervisor ? 'Supervisor' : 'Staff'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employees_${siteData.name || siteData.siteName}_${siteData.startDate}_to_${siteData.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Employee data exported successfully`);
  };

  return (
    <>
      <div className="min-h-screen bg-background p-4 sm:p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Attendance
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {siteData.name || siteData.siteName} - Employee Details
                </h1>
                <p className="text-sm text-muted-foreground">
                  {formatDateDisplay(siteData.startDate)} to {formatDateDisplay(siteData.endDate)} • {viewType === 'department' ? 'Department View' : 'Site View'}
                  {siteData.isRealData && (
                    <span className="ml-2 text-green-600 font-medium">
                      ✓ Real Data
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshEmployeeData}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportEmployees}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Summary
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={handleExportEmployeeDetails}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export Details
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6"
        >
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Daily Staff Requirement</p>
                  <p className="text-2xl font-bold text-blue-600">{siteData.dailyRequirement || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per day (excl. mgr/sup)
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-800">Total Required</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {siteData.totalRequiredForPeriod || siteData.durationTotalRequired || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    For {siteData.daysInPeriod} days
                  </p>
                </div>
                <div className="p-2 bg-indigo-100 rounded-full">
                  <Calendar className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Total Present</p>
                  <p className="text-2xl font-bold text-green-600">
                    {siteData.totalPresent || siteData.presentCount || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Staff only
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Total Weekly Off</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {siteData.totalWeeklyOff || siteData.weeklyOffCount || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Staff only (explicit weekly-off)
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Total Leave</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {siteData.totalLeave || siteData.leaveCount || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Staff only
                  </p>
                </div>
                <div className="p-2 bg-orange-100 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Total Absent</p>
                  <p className="text-2xl font-bold text-red-600">
                    {siteData.totalAbsent || siteData.absentCount || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Staff only (no attendance record)
                  </p>
                </div>
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Deployment Stats Cards */}
        {siteData.deploymentStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
          >
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-800">Managers</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {siteData.deploymentStats.managerCount} / {siteData.deploymentStats.managerRequirement}
                    </p>
                  </div>
                  <div className="p-2 bg-amber-100 rounded-full">
                    <Shield className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-teal-800">Supervisors</p>
                    <p className="text-2xl font-bold text-teal-600">
                      {siteData.deploymentStats.supervisorCount} / {siteData.deploymentStats.supervisorRequirement}
                    </p>
                  </div>
                  <div className="p-2 bg-teal-100 rounded-full">
                    <ShieldCheck className="h-6 w-6 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-cyan-50 border-cyan-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-cyan-800">Staff</p>
                    <p className="text-2xl font-bold text-cyan-600">
                      {siteData.deploymentStats.staffCount} / {siteData.deploymentStats.staffRequirement}
                    </p>
                  </div>
                  <div className="p-2 bg-cyan-100 rounded-full">
                    <Users className="h-6 w-6 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${siteData.deploymentStats.isStaffFull ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${siteData.deploymentStats.isStaffFull ? 'text-red-800' : 'text-green-800'}`}>
                      Remaining Staff
                    </p>
                    <p className={`text-2xl font-bold ${siteData.deploymentStats.isStaffFull ? 'text-red-600' : 'text-green-600'}`}>
                      {siteData.deploymentStats.remainingStaff}
                    </p>
                  </div>
                  <div className={`p-2 rounded-full ${siteData.deploymentStats.isStaffFull ? 'bg-red-100' : 'bg-green-100'}`}>
                    {siteData.deploymentStats.isStaffFull ? (
                      <XCircle className={`h-6 w-6 text-red-600`} />
                    ) : (
                      <CheckCircle className={`h-6 w-6 text-green-600`} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Date Navigation */}
        {!dailyView && availableDates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">View Daily Attendance:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableDates.map(date => (
                      <Button
                        key={date}
                        variant={selectedDate === date ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedDate(date);
                          setDailyView(true);
                          setCurrentPage(1);
                        }}
                      >
                        {formatDateDisplay(date)}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDailyView(false);
                      setCurrentPage(1);
                    }}
                  >
                    Show Cumulative View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Daily View Indicator */}
        {dailyView && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-blue-800">
                        Viewing: {formatDateDisplay(selectedDate)}
                      </h3>
                      <p className="text-sm text-blue-700">
                        Showing attendance data for this specific date
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDailyView(false);
                      setCurrentPage(1);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Show Cumulative View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Data Source Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <Card className={siteData.isRealData ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={siteData.isRealData ? "default" : "secondary"}>
                      {siteData.isRealData ? "Real Employee Data" : "Demo Employee Data"}
                    </Badge>
                    {siteData.isRealData && (
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        ✓ Connected to API
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {siteData.isRealData 
                      ? `Loaded ${employees.length} employee records from ${siteData.startDate} to ${siteData.endDate}`
                      : 'Showing demo employee data. Real data will be shown when API connection is available.'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {dailyView 
                      ? `Showing ${allEmployees.length} employees for ${formatDateDisplay(selectedDate)}`
                      : `Showing ${employees.length} total records across ${siteData.daysInPeriod} days (cumulative totals)`
                    }
                    {managersAndSupervisors.length > 0 && (
                      <span className="ml-2 text-amber-600">
                        • {managersAndSupervisors.length} managers/supervisors (excluded from staff counts)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-right">
                    <div className="text-sm font-medium">Data Source</div>
                    <div className="text-xs text-muted-foreground">
                      {siteData.isRealData ? 'Live Database' : 'Generated'}
                    </div>
                  </div>
                  {!siteData.isRealData && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`${API_URL}/employees`, '_blank')}
                    >
                      Check API Status
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Period Calculation Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="text-sm">
                <h3 className="font-semibold mb-2">Period Attendance Calculation ({siteData.daysInPeriod} days):</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2 rounded border">
                    <span className="font-medium">Total Required Attendance (Staff Only)</span>
                    <div className="text-green-600 font-medium mt-1">
                      = {siteData.dailyRequirement || 0} staff × {siteData.daysInPeriod} days
                    </div>
                    <div className="text-green-600 font-medium mt-1">
                      = {siteData.totalRequiredForPeriod || siteData.durationTotalRequired || 0}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="font-medium">Total Present (Cumulative - Staff Only)</span>
                    <div className="text-blue-600 font-medium mt-1">
                      = {siteData.totalPresent || siteData.presentCount || 0} present
                    </div>
                    <div className="text-blue-600 font-medium mt-1">
                      Across {siteData.daysInPeriod} days
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="font-medium">Total Shortage (Staff Only)</span>
                    <div className="text-red-600 font-medium mt-1">
                      = {(siteData.totalAbsent || 0) + (siteData.totalLeave || 0)} absent + leave
                    </div>
                    <div className="text-red-600 font-medium mt-1">
                      = {siteData.periodShortage}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-muted-foreground">
                  <strong>Note:</strong> Weekly Off is only counted when explicitly marked as 'weekly-off' in attendance. 
                  Employees with no attendance record are counted as Absent, not Weekly Off.
                  All calculations above exclude managers and supervisors. Only staff positions count toward the requirement.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters and Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg">
                  <Button
                    variant={activeTab === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setActiveTab('all');
                      setCurrentPage(1);
                    }}
                    className="text-xs"
                  >
                    All Employees ({allEmployees.length})
                  </Button>
                  <Button
                    variant={activeTab === 'present' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setActiveTab('present');
                      setCurrentPage(1);
                    }}
                    className="text-xs"
                  >
                    Present ({presentEmployees.length})
                  </Button>
                  <Button
                    variant={activeTab === 'weekly-off' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setActiveTab('weekly-off');
                      setCurrentPage(1);
                    }}
                    className="text-xs"
                  >
                    Weekly Off ({weeklyOffEmployees.length})
                  </Button>
                  <Button
                    variant={activeTab === 'leave' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setActiveTab('leave');
                      setCurrentPage(1);
                    }}
                    className="text-xs"
                  >
                    Leave ({leaveEmployees.length})
                  </Button>
                  <Button
                    variant={activeTab === 'absent' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setActiveTab('absent');
                      setCurrentPage(1);
                    }}
                    className="text-xs"
                  >
                    Absent ({absentEmployees.length})
                  </Button>
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full lg:w-64"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Employee Table with Photo View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>
                  Employee Details - {filteredEmployees.length} employees found
                  {dailyView ? ` for ${formatDateDisplay(selectedDate)}` : ` across ${siteData.daysInPeriod} days (cumulative)`}
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Showing {paginatedEmployees.length} of {filteredEmployees.length} filtered employees
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {refreshing ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                  <span className="text-muted-foreground">Loading employee data...</span>
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Employee ID
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Name
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Department
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Position
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Role Type
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Status
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Check In
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Check Out
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Check In Photo
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Check Out Photo
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Date
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Action
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Remark
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedEmployees.map((employee: Employee) => (
                          <tr key={employee.id} className={`border-b hover:bg-muted/50 ${(employee.isManager || employee.isSupervisor) ? 'bg-amber-50/30' : ''}`}>
                            <td className="p-4 align-middle font-medium">
                              <div className="font-mono text-xs">{employee.employeeId || employee.id.split('_')[0]}</div>
                              {employee.email && (
                                <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {employee.email}
                                </div>
                              )}
                            </td>
                            <td className="p-4 align-middle">
                              <div className="font-medium">{employee.name}</div>
                              {employee.phone && (
                                <div className="text-xs text-muted-foreground">{employee.phone}</div>
                              )}
                            </td>
                            <td className="p-4 align-middle">
                              <Badge variant="outline">{employee.department}</Badge>
                            </td>
                            <td className="p-4 align-middle">
                              {employee.position}
                            </td>
                            <td className="p-4 align-middle">
                              {employee.isManager ? (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200">Manager</Badge>
                              ) : employee.isSupervisor ? (
                                <Badge className="bg-teal-100 text-teal-800 border-teal-200">Supervisor</Badge>
                              ) : (
                                <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">Staff</Badge>
                              )}
                            </td>
                            <td className="p-4 align-middle">
                              <Badge 
                                variant={
                                  employee.status === 'present' ? 'default' :
                                  employee.status === 'weekly-off' ? 'secondary' :
                                  employee.status === 'leave' ? 'outline' :
                                  'destructive'
                                }
                              >
                                {employee.status === 'weekly-off' ? 'Weekly Off' : 
                                 employee.status === 'leave' ? 'Leave' :
                                 employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="p-4 align-middle">
                              {employee.checkInTime || '-'}
                            </td>
                            <td className="p-4 align-middle">
                              {employee.checkOutTime || '-'}
                            </td>
                            <td className="p-4 align-middle">
                              {employee.checkInPhoto ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewPhoto(employee.checkInPhoto, 'checkin')}
                                  className="h-8 px-2"
                                >
                                  <Camera className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </td>
                            <td className="p-4 align-middle">
                              {employee.checkOutPhoto ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewPhoto(employee.checkOutPhoto, 'checkout')}
                                  className="h-8 px-2"
                                >
                                  <Camera className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </td>
                            <td className="p-4 align-middle">
                              {employee.date ? formatDateDisplay(employee.date) : '-'}
                            </td>
                            <td className="p-4 align-middle">
                              <Select 
                                value={employee.action || 'none'}
                                onValueChange={(value) => updateEmployeeAction(employee.id, value === 'none' ? '' : value as 'fine' | 'advance' | 'other' | '')}
                              >
                                <SelectTrigger className="h-8 text-xs w-32">
                                  <SelectValue placeholder="Select action" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Action</SelectItem>
                                  <SelectItem value="fine">Fine</SelectItem>
                                  <SelectItem value="advance">Advance</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-4 align-middle">
                              <Input
                                value={employee.remark || ''}
                                placeholder="Add remark..."
                                className="h-8 text-xs"
                                onChange={(e) => updateEmployeeRemark(employee.id, e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {filteredEmployees.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} entries
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Empty State */}
                  {filteredEmployees.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground">
                        No employees found for the selected filters.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Photo Modal */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPhotoType === 'checkin' ? 'Check-in Photo' : 'Check-out Photo'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {selectedPhoto && (
              <img
                src={selectedPhoto}
                alt={`${selectedPhotoType} photo`}
                className="max-w-full h-auto rounded-lg shadow-lg"
                onError={(e) => {
                  console.error('Failed to load image:', selectedPhoto);
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"%3E%3Crect x="2" y="2" width="20" height="20" rx="2.18"%3E%3C/rect%3E%3Cpath d="M8 2v20M16 2v20M2 8h20M2 16h20"%3E%3C/path%3E%3C/svg%3E';
                  toast.error('Failed to load photo');
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoModalOpen(false)}>Close</Button>
            {selectedPhoto && (
              <Button onClick={() => window.open(selectedPhoto, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" /> Open Original
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const SuperAdminAttendanceView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const searchParams = new URLSearchParams(location.search);
  const initialViewType = searchParams.get('view') || 'site';
  const initialDepartment = searchParams.get('department') || '';
  const today = new Date().toISOString().split('T')[0];
  const initialStartDate = searchParams.get('startDate') || today;
  const initialEndDate = searchParams.get('endDate') || today;
  const initialSiteDetails = searchParams.get('siteDetails') === 'true';
  const initialSelectedSiteId = searchParams.get('selectedSiteId') || '';

  const [viewType, setViewType] = useState<'site' | 'department'>(initialViewType as 'site' | 'department');
  const [selectedDepartment, setSelectedDepartment] = useState(initialDepartment);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSiteDetails, setShowSiteDetails] = useState(initialSiteDetails);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [displayData, setDisplayData] = useState<any[]>([]);
  
  const itemsPerPage = 10;

  // Fetch sites data on component mount and when filters change
  const fetchSitesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching sites from server...');
      const sitesData = await siteService.getAllSites();
      
      if (sitesData && Array.isArray(sitesData)) {
        console.log(`✅ Successfully fetched ${sitesData.length} sites`);
        setSites(sitesData);
        
        await calculateDisplayData(sitesData);
      } else {
        console.warn('⚠️ No sites data received or invalid format');
        setSites([]);
        setDisplayData([]);
        toast.error('No sites data available');
      }
    } catch (err: any) {
      console.error('❌ Error fetching sites:', err);
      setError(err.message || 'Failed to fetch sites');
      toast.error('Failed to fetch sites', {
        description: err.message || 'Please try again later'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate display data with real employee data
  const calculateDisplayData = async (sitesData: Site[]) => {
    try {
      setRefreshing(true);
      
      const calculatedData = [];
      
      for (const site of sitesData) {
        let siteData;
        if (viewType === 'department' && selectedDepartment) {
          siteData = await calculateDepartmentSiteData(site, startDate, endDate, selectedDepartment);
        } else {
          siteData = await calculateSiteAttendanceData(site, startDate, endDate);
        }
        
        if (!siteData.employees) {
          siteData.employees = [];
        }
        
        calculatedData.push(siteData);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setDisplayData(calculatedData);
      console.log(`✅ Calculated display data for ${calculatedData.length} sites`);
    } catch (error) {
      console.error('Error calculating display data:', error);
      setDisplayData(sitesData.map(site => ({
        ...site,
        employees: [],
        isRealData: false,
        daysInPeriod: calculateDaysBetween(startDate, endDate),
        startDate,
        endDate,
        dailyRequirement: 0,
        totalEmployees: 0,
        totalRequiredForPeriod: 0,
        totalPresent: 0,
        totalWeeklyOff: 0,
        totalLeave: 0,
        totalAbsent: 0,
        deploymentStats: {
          totalStaff: 0,
          managerCount: 0,
          supervisorCount: 0,
          staffCount: 0,
          managerRequirement: site.managerCount || 0,
          supervisorRequirement: site.supervisorCount || 0,
          staffRequirement: 0,
          dailyStaffRequirement: 0,
          totalStaffRequirementForPeriod: 0,
          isStaffFull: false,
          remainingStaff: 0
        }
      })));
    } finally {
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchSitesData();
  }, []);

  // Recalculate data when filters change
  useEffect(() => {
    if (sites.length > 0) {
      calculateDisplayData(sites);
    }
  }, [viewType, selectedDepartment, startDate, endDate]);

  const daysInPeriod = useMemo(() => {
    return calculateDaysBetween(startDate, endDate);
  }, [startDate, endDate]);

  const filteredData = useMemo(() => {
    if (!displayData || displayData.length === 0) return [];
    
    return displayData.filter(item =>
      item.siteName?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      item.name?.toLowerCase().includes(searchTerm?.toLowerCase())
    );
  }, [displayData, searchTerm]);

  const overallTotals = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalEmployees: 0,
        durationTotalRequired: 0,
        durationWeeklyOff: 0,
        durationOnSiteRequirement: 0,
        durationPresent: 0,
        durationAbsent: 0,
        totalRequiredAttendance: 0,
        totalPresentAttendance: 0,
        totalShortage: 0,
        attendanceRate: '0.0',
        totalManagers: 0,
        totalSupervisors: 0,
        totalStaff: 0
      };
    }
    
    const durationTotalRequired = filteredData.reduce((sum, item) => sum + (item.totalRequiredForPeriod || item.durationTotalRequired || 0), 0);
    const durationWeeklyOff = filteredData.reduce((sum, item) => sum + (item.totalWeeklyOff || item.weeklyOffCount || 0), 0);
    const durationOnSiteRequirement = filteredData.reduce((sum, item) => sum + (item.durationOnSiteRequirement || 0), 0);
    const durationPresent = filteredData.reduce((sum, item) => sum + (item.totalPresent || item.presentCount || 0), 0);
    const durationAbsent = filteredData.reduce((sum, item) => sum + (item.totalAbsent || 0) + (item.totalLeave || 0), 0);
    
    const totalManagers = filteredData.reduce((sum, item) => sum + (item.deploymentStats?.managerCount || 0), 0);
    const totalSupervisors = filteredData.reduce((sum, item) => sum + (item.deploymentStats?.supervisorCount || 0), 0);
    const totalStaff = filteredData.reduce((sum, item) => sum + (item.deploymentStats?.staffCount || 0), 0);
    
    const totalEmployees = filteredData.reduce((sum, item) => sum + (item.dailyRequirement || item.totalEmployees || item.total), 0);
    const totalRequiredAttendance = filteredData.reduce((sum, item) => sum + (item.totalRequiredForPeriod || item.totalRequiredAttendance || 0), 0);
    const totalPresentAttendance = filteredData.reduce((sum, item) => sum + (item.totalPresentAttendance || 0), 0);
    const totalShortage = filteredData.reduce((sum, item) => sum + (item.periodShortage || 0), 0);
    const attendanceRate = totalRequiredAttendance > 0 ? ((totalPresentAttendance / totalRequiredAttendance) * 100).toFixed(1) : '0.0';
    
    return {
      totalEmployees,
      durationTotalRequired,
      durationWeeklyOff,
      durationOnSiteRequirement,
      durationPresent,
      durationAbsent,
      totalRequiredAttendance,
      totalPresentAttendance,
      totalShortage,
      attendanceRate,
      totalManagers,
      totalSupervisors,
      totalStaff
    };
  }, [filteredData]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const handleExportToExcel = () => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Site Name', 'Department', 'Period', 'Days', 'Daily Staff Requirement', 'Total Required', 'Weekly Off (Staff)', 'On Site Requirement', 'Total Present (Staff)', 'Leave (Staff)', 'Absent (Staff)', 'Managers', 'Supervisors', 'Total Staff', 'Attendance Rate', 'Data Source'];
    const filename = viewType === 'department' 
      ? `Attendance_${selectedDepartment}_${startDate}_to_${endDate}.csv`
      : `Sitewise_Attendance_${startDate}_to_${endDate}.csv`;
    
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => {
        const dailyRequirement = item.dailyRequirement || 0;
        const totalRequired = item.totalRequiredForPeriod || item.durationTotalRequired || (dailyRequirement * daysInPeriod);
        
        const weeklyOff = item.totalWeeklyOff || item.weeklyOffCount || 0;
        const onSiteRequirement = totalRequired - weeklyOff;
        const present = item.totalPresent || item.presentCount || 0;
        const leave = item.totalLeave || item.leaveCount || 0;
        const absent = item.totalAbsent || item.absentCount || 0;
        
        const managers = item.deploymentStats?.managerCount || 0;
        const supervisors = item.deploymentStats?.supervisorCount || 0;
        const staff = item.deploymentStats?.staffCount || 0;
        
        const rate = totalRequired > 0 ? ((present / totalRequired) * 100).toFixed(1) + '%' : '0.0%';
        const dataSource = item.isRealData ? 'Real Data' : 'Demo Data';
        
        return [
          `"${item.siteName || item.name}"`,
          `"${viewType === 'department' ? selectedDepartment : 'General'}"`,
          `"${item.startDate} to ${item.endDate}"`,
          item.daysInPeriod,
          dailyRequirement,
          totalRequired,
          weeklyOff,
          onSiteRequirement,
          present,
          leave,
          absent,
          managers,
          supervisors,
          staff,
          rate,
          dataSource
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    toast.success(`Data exported to ${filename}`);
  };

  const handleBack = () => {
    navigate('/superadmin/dashboard');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewTypeChange = (newViewType: 'site' | 'department') => {
    setViewType(newViewType);
    setCurrentPage(1);
    if (newViewType === 'site') {
      setSelectedDepartment('');
    } else if (newViewType === 'department' && !selectedDepartment) {
      setSelectedDepartment(departments[0]);
    }
  };

  const handleViewDetails = (siteData: any) => {
    if (!siteData) return;
    
    setSelectedSite(siteData);
    setShowSiteDetails(true);
    
    const params = new URLSearchParams();
    params.set('view', viewType);
    if (viewType === 'department') {
      params.set('department', selectedDepartment);
    }
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    params.set('siteDetails', 'true');
    params.set('selectedSiteId', siteData?.siteId || siteData?.id || '');
    
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleBackFromDetails = () => {
    setShowSiteDetails(false);
    setSelectedSite(null);
    
    const params = new URLSearchParams();
    params.set('view', viewType);
    if (viewType === 'department') {
      params.set('department', selectedDepartment);
    }
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    
    navigate(`?${params.toString()}`, { replace: true });
  };

  useEffect(() => {
    if (initialSiteDetails && initialSelectedSiteId && displayData.length > 0) {
      const site = displayData.find(item => item.id === initialSelectedSiteId || item.siteId === initialSelectedSiteId);
      if (site) {
        setSelectedSite(site);
        setShowSiteDetails(true);
      }
    }
  }, [initialSiteDetails, initialSelectedSiteId, displayData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const Pagination = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredData.length);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-4 gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {filteredData.length} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
        </div>
      </div>
    );
  };

  const handleRefreshAll = async () => {
    try {
      setRefreshing(true);
      await fetchSitesData();
      toast.success('All data refreshed successfully');
    } catch (err: any) {
      toast.error('Failed to refresh data', {
        description: err.message || 'Please try again'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const hasRealEmployeeData = useMemo(() => {
    return displayData.some(item => item.isRealData);
  }, [displayData]);

  if (loading && sites.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Sites Data</h2>
          <p className="text-gray-600">Fetching sites and employee data from the server...</p>
        </div>
      </div>
    );
  }

  if (error && sites.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  if (showSiteDetails) {
    return (
      <SiteEmployeeDetails
        siteData={selectedSite}
        onBack={handleBackFromDetails}
        viewType={viewType}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {viewType === 'department' 
                  ? `${selectedDepartment} Department Attendance`
                  : 'Site-wise Attendance Overview'
                }
              </h1>
              <p className="text-sm text-muted-foreground">
                {viewType === 'department'
                  ? `Showing cumulative attendance data for ${selectedDepartment} department across ${sites.length} sites`
                  : `Showing cumulative attendance data for ${sites.length} sites`
                } - {formatDateDisplay(startDate)} to {formatDateDisplay(endDate)} ({daysInPeriod} days)
                {hasRealEmployeeData && (
                  <span className="ml-2 text-green-600 font-medium">
                    • Connected to Employee API
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshAll}
              disabled={refreshing || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Data Source Status */}
      {hasRealEmployeeData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-green-800">Employee API Connected</h3>
                    <p className="text-sm text-green-700">
                      Real employee data is being fetched from the server for the selected date range. Photos are included when available.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  Live Data
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* View Type Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">View Type</label>
                <Select value={viewType} onValueChange={handleViewTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select View Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Site View (Cumulative)
                      </div>
                    </SelectItem>
                    <SelectItem value="department">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Department View (Cumulative)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Selector */}
              {viewType === 'department' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Range Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Sites</label>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by site name..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading indicator */}
      {(refreshing || loading) && (
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-muted-foreground">
                  {refreshing ? 'Refreshing employee data for selected date range...' : 'Loading data...'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <Card className="bg-gray-50">
          <CardContent className="p-6">
            <div className="text-sm">
              <h3 className="font-semibold mb-2 text-lg">Cumulative Totals for {daysInPeriod} Days (Staff Only):</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-green-700">Total Required</div>
                  <div className="text-green-600 font-medium mt-2 text-2xl">
                    {overallTotals.durationTotalRequired.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = Daily Staff Req × {daysInPeriod} days
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-purple-700">Total Weekly Off</div>
                  <div className="text-purple-600 font-medium mt-2 text-2xl">
                    {overallTotals.durationWeeklyOff.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Only explicit weekly-off status
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-amber-700">On Site Requirement</div>
                  <div className="text-amber-600 font-medium mt-2 text-2xl">
                    {overallTotals.durationOnSiteRequirement.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Required - Weekly Off
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-blue-700">Total Present</div>
                  <div className="text-blue-600 font-medium mt-2 text-2xl">
                    {overallTotals.durationPresent.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Actual present count
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-red-700">Total Absent</div>
                  <div className="text-red-600 font-medium mt-2 text-2xl">
                    {overallTotals.durationAbsent.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Absent + Leave (no attendance record)
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-amber-700">Total Managers</div>
                  <div className="text-amber-600 font-medium mt-2 text-2xl">
                    {overallTotals.totalManagers}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-teal-700">Total Supervisors</div>
                  <div className="text-teal-600 font-medium mt-2 text-2xl">
                    {overallTotals.totalSupervisors}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-cyan-700">Total Staff</div>
                  <div className="text-cyan-600 font-medium mt-2 text-2xl">
                    {overallTotals.totalStaff}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-green-700">Total Required Attendance</div>
                  <div className="text-green-600 font-medium mt-2 text-2xl">
                    {overallTotals.totalRequiredAttendance.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = Staff Req × {daysInPeriod} days
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-blue-700">Total Present Attendance</div>
                  <div className="text-blue-600 font-medium mt-2 text-2xl">
                    {overallTotals.totalPresentAttendance.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Actual present count (weekly-off excluded)
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-yellow-700">Attendance Rate</div>
                  <div className="text-yellow-600 font-medium mt-2 text-2xl">
                    {overallTotals.attendanceRate}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = (Total Present ÷ Total Required) × 100
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-1">Important Note:</h4>
                <p className="text-yellow-700 text-sm">
                  <strong>Weekly Off is only counted when explicitly marked as 'weekly-off' in attendance.</strong> 
                  Employees with no attendance record are counted as Absent, not Weekly Off.
                  All calculations above exclude managers and supervisors. Only staff positions count toward the requirement.
                  Attendance photos are displayed in the employee details view.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {viewType === 'department' 
                  ? `Showing cumulative totals for ${selectedDepartment} department from ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)} (${daysInPeriod} days)`
                  : `Showing cumulative totals for ${filteredData.length} sites from ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)} (${daysInPeriod} days)`
                }
                {hasRealEmployeeData && (
                  <span className="ml-2 text-green-600">
                    • Real employee data available with photos
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefreshAll}
                  disabled={refreshing || loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={filteredData.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>
                {viewType === 'department' 
                  ? `${selectedDepartment} Sites Attendance - Cumulative Totals (${daysInPeriod} days)`
                  : `All Sites Attendance - Cumulative Totals (${daysInPeriod} days)`
                }
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {hasRealEmployeeData 
                  ? `${displayData.filter(item => item.isRealData).length} sites with real employee data`
                  : 'Using demo employee data'
                }
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Sites Found</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm
                    ? 'No sites match your search criteria. Try a different search term.'
                    : 'No sites available or all sites are filtered out.'}
                </p>
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Site Name
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Department
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-indigo-700 bg-indigo-50">
                          Daily Staff Req
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-blue-700 bg-blue-50">
                          Total Required
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-purple-700 bg-purple-50">
                          Weekly Off
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-amber-700 bg-amber-50">
                          On Site Req
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-green-700 bg-green-50">
                          Total Present
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-orange-700 bg-orange-50">
                          Leave
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-red-700 bg-red-50">
                          Absent
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-amber-700 bg-amber-50">
                          Mgrs
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-teal-700 bg-teal-50">
                          Sups
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-cyan-700 bg-cyan-50">
                          Staff
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Rate
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Actions
                        </th>
                       </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, index) => {
                        const dailyRequirement = item.dailyRequirement || 0;
                        const totalRequired = item.totalRequiredForPeriod || item.durationTotalRequired || (dailyRequirement * daysInPeriod);
                        
                        const weeklyOff = item.totalWeeklyOff || item.weeklyOffCount || 0;
                        const onSiteRequirement = totalRequired - weeklyOff;
                        const present = item.totalPresent || item.presentCount || 0;
                        const leave = item.totalLeave || item.leaveCount || 0;
                        const absent = item.totalAbsent || item.absentCount || 0;
                        
                        const managers = item.deploymentStats?.managerCount || 0;
                        const supervisors = item.deploymentStats?.supervisorCount || 0;
                        const staff = item.deploymentStats?.staffCount || 0;
                        
                        const rate = totalRequired > 0 ? ((present / totalRequired) * 100).toFixed(1) : '0.0';
                        const status = parseFloat(rate) >= 90 ? 'Excellent' :
                                      parseFloat(rate) >= 80 ? 'Good' :
                                      parseFloat(rate) >= 70 ? 'Average' : 'Poor';

                        const departmentsFromEmp = item.employees?.map((emp: Employee) => emp.department) || [];
                        const departmentCounts = departmentsFromEmp.reduce((acc: {[key: string]: number}, dept: string) => {
                          acc[dept] = (acc[dept] || 0) + 1;
                          return acc;
                        }, {});
                        const primaryDepartment = Object.keys(departmentCounts).length > 0 
                          ? Object.keys(departmentCounts).reduce((a, b) => 
                              departmentCounts[a] > departmentCounts[b] ? a : b
                            )
                          : 'General';

                        return (
                          <tr key={item.siteId || item.id || index} className="border-b hover:bg-muted/50">
                            <td className="p-4 align-middle font-medium">
                              <div className="font-medium text-sm">{item.siteName || item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.daysInPeriod} {item.daysInPeriod === 1 ? 'day' : 'days'}
                              </div>
                             </td>
                            <td className="p-4 align-middle">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {viewType === 'department' ? selectedDepartment : primaryDepartment}
                              </Badge>
                             </td>
                            <td className="p-4 align-middle font-bold text-indigo-700 bg-indigo-50">
                              {dailyRequirement}
                             </td>
                            <td className="p-4 align-middle font-bold text-blue-700 bg-blue-50">
                              {totalRequired}
                              <div className="text-xs text-blue-600 mt-1">
                                {dailyRequirement} × {daysInPeriod}
                              </div>
                             </td>
                            <td className="p-4 align-middle font-bold text-purple-700 bg-purple-50">
                              {weeklyOff}
                              <div className="text-xs text-purple-600 mt-1">
                                Explicit weekly-off
                              </div>
                             </td>
                            <td className="p-4 align-middle font-bold text-amber-700 bg-amber-50">
                              {onSiteRequirement.toLocaleString()}
                              <div className="text-xs text-amber-600 mt-1">
                                Req - WO
                              </div>
                             </td>
                            <td className="p-4 align-middle font-bold text-green-700 bg-green-50">
                              {present}
                              <div className="text-xs text-green-600 mt-1">
                                Actual present
                              </div>
                             </td>
                            <td className="p-4 align-middle font-bold text-orange-700 bg-orange-50">
                              {leave}
                              <div className="text-xs text-orange-600 mt-1">
                                Over {daysInPeriod} days
                              </div>
                             </td>
                            <td className="p-4 align-middle font-bold text-red-700 bg-red-50">
                              {absent}
                              <div className="text-xs text-red-600 mt-1">
                                No record / absent
                              </div>
                             </td>
                            <td className="p-4 align-middle font-bold text-amber-700 bg-amber-50">
                              {managers}
                             </td>
                            <td className="p-4 align-middle font-bold text-teal-700 bg-teal-50">
                              {supervisors}
                             </td>
                            <td className="p-4 align-middle font-bold text-cyan-700 bg-cyan-50">
                              {staff}
                             </td>
                            <td className="p-4 align-middle font-bold">
                              {rate}%
                             </td>
                            <td className="p-4 align-middle">
                              <Badge variant={
                                status === 'Excellent' ? 'default' :
                                status === 'Good' ? 'secondary' :
                                status === 'Average' ? 'outline' : 'destructive'
                              }>
                                {status}
                              </Badge>
                             </td>
                            <td className="p-4 align-middle">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(item)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                             </td>
                           </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredData.length > 0 && <Pagination />}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Sites Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Sites Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Sites Loaded</span>
                  <span className="text-lg font-bold text-blue-600">{sites.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Active Sites</span>
                  <span className="text-lg font-bold text-green-600">
                    {sites.filter(site => site.status === 'active').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Inactive Sites</span>
                  <span className="text-lg font-bold text-red-600">
                    {sites.filter(site => site.status === 'inactive').length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Staff Across All Sites</span>
                  <span className="text-lg font-bold text-purple-600">
                    {siteService.getTotalStaffAcrossSites(sites)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Contract Value</span>
                  <span className="text-lg font-bold text-amber-600">
                    {siteService.formatCurrency(siteService.getTotalContractValue(sites))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Sites with Real Data</span>
                  <span className="text-lg font-bold text-green-600">
                    {displayData.filter(item => item.isRealData).length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Last Updated:</span>{' '}
                  {sites.length > 0 ? 
                    new Date(Math.max(...sites.map(s => new Date(s.updatedAt || s.createdAt || Date.now()).getTime()))).toLocaleString() 
                    : 'Never'
                  }
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Employee Data Source:</span>{' '}
                  {hasRealEmployeeData ? 'Live API Connection' : 'Demo Data'}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">API Status:</span>{' '}
                  <a 
                    href={`${API_URL}/employees`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {hasRealEmployeeData ? 'Connected ✓' : 'Check Connection'}
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SuperAdminAttendanceView;