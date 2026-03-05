import { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  Filter, 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  User, 
  Loader2, 
  Coffee, 
  Timer, 
  Users, 
  Building, 
  Eye, 
  UserCheck, 
  UserX, 
  Crown,
  ArrowLeft,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Briefcase,
  Percent,
  UserCog,
  Mail,
  Phone,
  UserCircle,
  LogIn,
  LogOut,
  CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import userService from "@/services/userService";
import { useRole } from "@/context/RoleContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import taskService, { Task } from "@/services/TaskService";
import { siteService, Site } from "@/services/SiteService";

// API Base URL
const API_URL = import.meta.env.VITE_API_URL || `http://localhost:5001/api`;

// Interface for Attendance Record (My Attendance)
interface MyAttendanceRecord {
  id: string;
  date: string;
  day: string;
  checkIn: string;
  checkOut: string;
  status: "Present" | "Absent" | "Half Day" | "Late" | "Checked In" | "Weekly Off" | "Leave";
  totalHours: string;
  breakTime: string;
  breakDuration: string;
  breaks: number;
  overtime: string;
  isOnBreak?: boolean;
  hasCheckedOutToday?: boolean;
}

// Interface for My Attendance Stats
interface MyAttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  checkedInDays: number;
  weeklyOffDays: number;
  leaveDays: number;
  averageHours: string;
  totalOvertime: string;
  totalBreakTime: string;
  attendanceRate: number;
}

// Interface for Employee (Team)
interface Employee {
  id: string;
  _id?: string;
  employeeId?: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: 'present' | 'absent' | 'leave' | 'weekly-off';
  checkInTime?: string;
  checkOutTime?: string;
  site: string;
  siteName?: string;
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
}

// Interface for Attendance Record (Team)
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

// Interface for Site Attendance Data
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

// Get day of week from date string
const getDayOfWeek = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

// Calculate days between dates
const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff + 1;
};

// Fetch employees from API
const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    console.log('🔄 Fetching employees from API...');
    
    const response = await fetch(`${API_URL}/employees?limit=1000`); // Increased limit to get all employees
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
        date: new Date().toISOString().split('T')[0]
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

// Fetch attendance records for a specific date
const fetchAttendanceRecords = async (date: string): Promise<AttendanceRecord[]> => {
  try {
    console.log(`🔄 Fetching attendance records for date: ${date}`);
    const response = await fetch(`${API_URL}/attendance?date=${date}&limit=1000`); // Increased limit
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

// Fetch attendance records for a date range
const fetchAttendanceRecordsRange = async (startDate: string, endDate: string): Promise<AttendanceRecord[]> => {
  try {
    console.log(`🔄 Fetching attendance records from ${startDate} to ${endDate}`);
    const response = await fetch(`${API_URL}/attendance/range?startDate=${startDate}&endDate=${endDate}&limit=1000`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        return data.data.map((record: any) => ({
          _id: record._id || record.id,
          employeeId: record.employeeId || '',
          employeeName: record.employeeName || 'Unknown',
          date: record.date || '',
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
    console.error('Error fetching attendance range:', error);
    return [];
  }
};

// Generate employee data for site for a specific date
const generateEmployeeData = async (siteName: string, date: string): Promise<Employee[]> => {
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

// Calculate site attendance data for a specific date
const calculateSiteAttendanceData = async (site: Site, date: string): Promise<SiteAttendanceData> => {
  const employees = await generateEmployeeData(site.name, date);
  
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
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    if (siteData?.employees && siteData.employees.length > 0) {
      console.log(`Setting ${siteData.employees.length} employees in details view`);
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
            Back to Sites
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

const ManagerAttendance = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated } = useRole();
  
  // Current user state
  const [managerId, setManagerId] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  const [managerSite, setManagerSite] = useState<string>('');
  
  // Tab state
  const [activeTab, setActiveTab] = useState("my-attendance");
  
  // My Attendance States
  const [myAttendanceRecords, setMyAttendanceRecords] = useState<MyAttendanceRecord[]>([]);
  const [myAllRecords, setMyAllRecords] = useState<MyAttendanceRecord[]>([]);
  const [myStats, setMyStats] = useState<MyAttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    checkedInDays: 0,
    weeklyOffDays: 0,
    leaveDays: 0,
    averageHours: "0.0",
    totalOvertime: "0.0",
    totalBreakTime: "0.0",
    attendanceRate: 0
  });
  
  // Team Attendance States
  const [sites, setSites] = useState<Site[]>([]);
  const [siteData, setSiteData] = useState<SiteAttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states for team attendance
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [currentPage, setCurrentPage] = useState(1);
  const [showSiteDetails, setShowSiteDetails] = useState(false);
  const [selectedSite, setSelectedSite] = useState<SiteAttendanceData | null>(null);
  
  // My Attendance filter states
  const [myFilter, setMyFilter] = useState<string>("all");
  const [mySelectedMonth, setMySelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [mySelectedDate, setMySelectedDate] = useState<string>("");
  const [myIsLoading, setMyIsLoading] = useState(false);
  
  // Current status for manager self attendance
  const [currentStatus, setCurrentStatus] = useState<any>(null);
  const [isTodayCheckedIn, setIsTodayCheckedIn] = useState(false);
  const [isTodayOnBreak, setIsTodayOnBreak] = useState(false);
  
  const itemsPerPage = 10;

  // Initialize current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        if (authUser) {
          const userId = authUser._id || authUser.id;
          
          if (userId) {
            const allUsersResponse = await userService.getAllUsers();
            const foundUser = allUsersResponse.allUsers.find(user => 
              user._id === userId || user.id === userId
            );
            
            if (foundUser) {
              setManagerId(foundUser._id);
              setManagerName(foundUser.name || foundUser.firstName || 'Manager');
              setManagerSite(foundUser.siteName || foundUser.site || '');
            } else {
              const storedUser = localStorage.getItem("sk_user");
              if (storedUser) {
                const user = JSON.parse(storedUser);
                setManagerId(user._id || user.id);
                setManagerName(user.name || user.firstName || 'Manager');
                setManagerSite(user.siteName || user.site || '');
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

  // Fetch manager's own attendance data for a specific month
  const fetchMyAttendanceData = async () => {
    if (!managerId) return;
    
    setMyIsLoading(true);
    try {
      const [year, month] = mySelectedMonth.split('-').map(Number);
      
      console.log(`Fetching my attendance for ${year}-${month}`);
      
      const response = await fetch(
        `${API_URL}/manager-attendance/summary/${managerId}?year=${year}&month=${month}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          const { dailyRecords, stats, currentStatus } = data.data;
          
          setCurrentStatus(currentStatus);
          setIsTodayCheckedIn(currentStatus?.isCheckedIn || false);
          setIsTodayOnBreak(currentStatus?.isOnBreak || false);
          
          const processedRecords: MyAttendanceRecord[] = dailyRecords.map((record: any) => ({
            id: `record-${record.date}`,
            date: record.date,
            day: record.day,
            checkIn: record.checkIn || "-",
            checkOut: record.checkOut || "-",
            status: record.status,
            totalHours: record.totalHours || "0.0",
            breakTime: record.breakTime || "0.0",
            breakDuration: record.breakDuration || "0m",
            breaks: record.breaks || 0,
            overtime: record.overtime || "0.0",
            isOnBreak: record.isOnBreak || false,
            hasCheckedOutToday: record.hasCheckedOutToday || false
          }));
          
          setMyAllRecords(processedRecords);
          setMyAttendanceRecords(processedRecords);
          
          setMyStats({
            totalDays: stats.totalDays || 0,
            presentDays: stats.presentDays || 0,
            absentDays: stats.absentDays || 0,
            lateDays: stats.lateDays || 0,
            halfDays: stats.halfDays || 0,
            checkedInDays: stats.checkedInDays || 0,
            weeklyOffDays: stats.weeklyOffDays || 0,
            leaveDays: stats.leaveDays || 0,
            averageHours: stats.averageHours || "0.0",
            totalOvertime: stats.totalOvertime || "0.0",
            totalBreakTime: stats.totalBreakTime || "0.0",
            attendanceRate: stats.attendanceRate || 0
          });
          
          toast.success(`Loaded attendance data for ${getCurrentMonthName()}`);
        }
      } else {
        throw new Error('Failed to fetch attendance data');
      }
    } catch (error) {
      console.error('Error fetching my attendance:', error);
      toast.error('Failed to load your attendance data');
    } finally {
      setMyIsLoading(false);
    }
  };

  // Fetch tasks and sites where manager is assigned
  const fetchManagerSites = async () => {
    if (!managerId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching tasks for manager:', managerId);
      
      const [allSites, allTasks] = await Promise.all([
        siteService.getAllSites(),
        taskService.getAllTasks()
      ]);

      // Filter sites where manager is assigned (based on tasks)
      const managerSites = allSites.filter(site => {
        const siteTasks = allTasks.filter(task => task.siteId === site._id);
        
        const isManagerAssigned = siteTasks.some(task => 
          task.assignedUsers?.some(user => 
            user.userId === managerId && user.role === 'manager'
          ) || task.assignedTo === managerId
        );

        return isManagerAssigned;
      });

      setSites(managerSites);
      console.log(`Found ${managerSites.length} sites for manager`);

      // Calculate attendance data for each site for the selected date
      await calculateSiteData(managerSites, selectedDate);
      
    } catch (error: any) {
      console.error('Error fetching manager sites:', error);
      setError(error.message || 'Failed to load sites');
      toast.error('Failed to load sites data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate attendance data for sites for a specific date
  const calculateSiteData = async (sitesList: Site[], date: string) => {
    try {
      setRefreshing(true);
      
      const data: SiteAttendanceData[] = [];
      
      for (const site of sitesList) {
        const siteAttendance = await calculateSiteAttendanceData(site, date);
        data.push(siteAttendance);
      }
      
      setSiteData(data);
      console.log(`Calculated attendance data for ${data.length} sites for date ${date}`);
      
    } catch (error) {
      console.error('Error calculating site data:', error);
      toast.error('Error calculating attendance data');
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch current attendance status
  const fetchCurrentStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/manager-attendance/today/${managerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentStatus(data.data);
          setIsTodayCheckedIn(data.data?.isCheckedIn || false);
          setIsTodayOnBreak(data.data?.isOnBreak || false);
        }
      }
    } catch (error) {
      console.error('Error fetching current status:', error);
    }
  };

  // Load data when managerId is available
  useEffect(() => {
    if (managerId) {
      fetchMyAttendanceData();
      fetchManagerSites();
      fetchCurrentStatus();
    }
  }, [managerId]);

  // Recalculate when date changes for team attendance
  useEffect(() => {
    if (sites.length > 0 && activeTab === "team-attendance") {
      calculateSiteData(sites, selectedDate);
    }
  }, [selectedDate, activeTab]);

  // Recalculate when month changes for my attendance
  useEffect(() => {
    if (managerId && activeTab === "my-attendance") {
      fetchMyAttendanceData();
    }
  }, [mySelectedMonth, activeTab]);

  // Apply filters for my attendance
  useEffect(() => {
    let filtered = [...myAllRecords];
    
    if (mySelectedDate) {
      filtered = filtered.filter(record => record.date === mySelectedDate);
    }
    
    if (myFilter === "present") {
      filtered = filtered.filter(record => record.status === "Present");
    } else if (myFilter === "present_half") {
      filtered = filtered.filter(record => record.status === "Present" || record.status === "Half Day");
    } else if (myFilter === "absent") {
      filtered = filtered.filter(record => record.status === "Absent");
    } else if (myFilter === "late") {
      filtered = filtered.filter(record => record.status === "Late");
    } else if (myFilter === "halfday") {
      filtered = filtered.filter(record => record.status === "Half Day");
    } else if (myFilter === "checkedin") {
      filtered = filtered.filter(record => record.status === "Checked In");
    } else if (myFilter === "weeklyoff") {
      filtered = filtered.filter(record => record.status === "Weekly Off");
    } else if (myFilter === "leave") {
      filtered = filtered.filter(record => record.status === "Leave");
    }
    
    setMyAttendanceRecords(filtered);
  }, [myAllRecords, mySelectedDate, myFilter]);

  // Filter sites based on search
  const filteredSites = useMemo(() => {
    if (!siteData || siteData.length === 0) return [];
    
    return siteData.filter(site =>
      site.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [siteData, searchTerm]);

  // Calculate overall totals for team attendance
  const overallTotals = useMemo(() => {
    if (filteredSites.length === 0) {
      return {
        totalEmployees: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalWeeklyOff: 0,
        totalLeave: 0,
        totalShortage: 0,
        attendanceRate: 0
      };
    }
    
    const totalEmployees = filteredSites.reduce((sum, site) => sum + site.totalEmployees, 0);
    const totalPresent = filteredSites.reduce((sum, site) => sum + site.present, 0);
    const totalAbsent = filteredSites.reduce((sum, site) => sum + site.absent, 0);
    const totalWeeklyOff = filteredSites.reduce((sum, site) => sum + site.weeklyOff, 0);
    const totalLeave = filteredSites.reduce((sum, site) => sum + site.leave, 0);
    const totalShortage = filteredSites.reduce((sum, site) => sum + site.shortage, 0);
    const attendanceRate = totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0;
    
    return {
      totalEmployees,
      totalPresent,
      totalAbsent,
      totalWeeklyOff,
      totalLeave,
      totalShortage,
      attendanceRate
    };
  }, [filteredSites]);

  // Paginate sites
  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSites.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSites, currentPage]);

  const totalPages = Math.ceil(filteredSites.length / itemsPerPage);

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

  // Handle refresh all data
  const handleRefresh = async () => {
    await fetchMyAttendanceData();
    await fetchManagerSites();
    await fetchCurrentStatus();
    toast.success('All data refreshed successfully');
  };

  // Handle date change for team attendance
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setCurrentPage(1);
  };

  // Handle export for team attendance
  const handleExportTeam = () => {
    const headers = ['Site Name', 'Client', 'Location', 'Total Employees', 'Present', 'Weekly Off', 'Leave', 'Absent', 'Shortage', 'Attendance Rate'];
    const csvContent = [
      headers.join(','),
      ...filteredSites.map(site => [
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
    link.setAttribute('download', `team_attendance_${selectedDate}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Team data exported successfully');
  };

  // Handle export for my attendance
  const handleExportMyAttendance = () => {
    const headers = ["Date", "Day", "Check In", "Check Out", "Status", "Total Hours", "Break Time", "Break Duration", "Breaks", "Overtime"];
    const csvContent = [
      headers.join(","),
      ...myAttendanceRecords.map(record => [
        record.date,
        record.day,
        record.checkIn,
        record.checkOut,
        record.status,
        record.totalHours,
        record.breakTime,
        record.breakDuration,
        record.breaks,
        record.overtime
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `my_attendance_${mySelectedMonth}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    toast.success("My attendance exported successfully!");
  };

  // Handle break actions
  const handleBreakIn = async () => {
    try {
      const response = await fetch(`${API_URL}/manager-attendance/breakin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Break started!");
        fetchCurrentStatus();
        fetchMyAttendanceData();
      } else {
        toast.error(data.message || "Failed to start break");
      }
    } catch (error) {
      toast.error("Failed to start break");
    }
  };

  const handleBreakOut = async () => {
    try {
      const response = await fetch(`${API_URL}/manager-attendance/breakout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Break ended!");
        fetchCurrentStatus();
        fetchMyAttendanceData();
      } else {
        toast.error(data.message || "Failed to end break");
      }
    } catch (error) {
      toast.error("Failed to end break");
    }
  };

  const handleCheckIn = async () => {
    try {
      const response = await fetch(`${API_URL}/manager-attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId, managerName })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Checked in successfully!");
        fetchCurrentStatus();
        fetchMyAttendanceData();
      } else {
        toast.error(data.message || "Failed to check in");
      }
    } catch (error) {
      toast.error("Failed to check in");
    }
  };

  const handleCheckOut = async () => {
    try {
      const response = await fetch(`${API_URL}/manager-attendance/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Checked out successfully!");
        fetchCurrentStatus();
        fetchMyAttendanceData();
      } else {
        toast.error(data.message || "Failed to check out");
      }
    } catch (error) {
      toast.error("Failed to check out");
    }
  };

  // Get status badge color for team attendance
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Excellent: "bg-green-100 text-green-800 border-green-200",
      Good: "bg-blue-100 text-blue-800 border-blue-200",
      Average: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Poor: "bg-red-100 text-red-800 border-red-200"
    };
    return styles[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Get status badge for my attendance
  const getMyStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Present: "bg-green-100 text-green-800 border-green-200",
      Absent: "bg-red-100 text-red-800 border-red-200",
      Late: "bg-yellow-100 text-yellow-800 border-yellow-200",
      "Half Day": "bg-blue-100 text-blue-800 border-blue-200",
      "Checked In": "bg-purple-100 text-purple-800 border-purple-200",
      "Weekly Off": "bg-gray-100 text-gray-800 border-gray-200",
      Leave: "bg-orange-100 text-orange-800 border-orange-200"
    };
    return styles[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getMyStatusIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      Present: <CheckCircle className="h-4 w-4" />,
      Absent: <XCircle className="h-4 w-4" />,
      Late: <Clock className="h-4 w-4" />,
      "Half Day": <AlertCircle className="h-4 w-4" />,
      "Checked In": <Clock className="h-4 w-4" />,
      "Weekly Off": <Calendar className="h-4 w-4" />,
      Leave: <Calendar className="h-4 w-4" />
    };
    return icons[status] || <Clock className="h-4 w-4" />;
  };

  // Check if today's date is in the selected month
  const isTodayInSelectedMonth = () => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayYear = today.getFullYear();
    const [selectedYear, selectedMonthNum] = mySelectedMonth.split('-').map(Number);
    
    return todayYear === selectedYear && todayMonth === selectedMonthNum;
  };

  const getCurrentMonthName = () => {
    return new Date(mySelectedMonth + "-01").toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const clearMyDateFilter = () => {
    setMySelectedDate("");
  };

  // If showing site details, render the details component
  if (showSiteDetails && selectedSite) {
    return (
      <SiteEmployeeDetails
        siteData={selectedSite}
        onBack={handleBackFromDetails}
        selectedDate={selectedDate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Attendance Management" 
        subtitle="Track your attendance and manage team sites"
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* Manager Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  {managerName}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="default" className="text-sm capitalize">
                    Manager
                  </Badge>
                  {managerSite && (
                    <Badge variant="outline" className="text-sm">
                      <Building className="h-3 w-3 mr-1" />
                      {managerSite}
                    </Badge>
                  )}
                  {sites.length > 0 && (
                    <Badge variant="outline" className="text-sm bg-blue-50">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {sites.length} Assigned Sites
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="my-attendance" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              My Attendance
            </TabsTrigger>
            <TabsTrigger value="team-attendance" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Team Sites
            </TabsTrigger>
          </TabsList>

          {/* My Attendance Tab */}
          <TabsContent value="my-attendance" className="space-y-6">
            {/* Current Status Card */}
            {currentStatus && isTodayInSelectedMonth() && (
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-blue-600" />
                    Today's Status
                  </CardTitle>
                  <CardDescription>
                    {currentStatus.isCheckedIn ? (
                      currentStatus.isOnBreak ? (
                        "Currently on break"
                      ) : (
                        "Currently checked in"
                      )
                    ) : (
                      currentStatus.hasCheckedOutToday ? "Checked out for today" : "Not checked in today"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Status</div>
                      <Badge className={
                        currentStatus.isCheckedIn ? 
                          (currentStatus.isOnBreak ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800') 
                          : (currentStatus.hasCheckedOutToday ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800')
                      }>
                        {currentStatus.isCheckedIn ? 
                          (currentStatus.isOnBreak ? 'On Break' : 'Checked In') 
                          : (currentStatus.hasCheckedOutToday ? 'Checked Out' : 'Not Checked In')}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Check In Time</div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {currentStatus.checkInTime ? 
                            new Date(currentStatus.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : '--:--'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Break Time</div>
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {formatDuration(currentStatus.breakTime || 0)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Actions</div>
                      <div className="flex gap-2">
                        {currentStatus.isCheckedIn ? (
                          <>
                            {!currentStatus.isOnBreak ? (
                              <Button size="sm" onClick={handleBreakIn}>
                                <Coffee className="h-3 w-3 mr-1" />
                                Break
                              </Button>
                            ) : (
                              <Button size="sm" onClick={handleBreakOut}>
                                <Timer className="h-3 w-3 mr-1" />
                                Back
                              </Button>
                            )}
                            <Button size="sm" onClick={handleCheckOut} variant="outline">
                              <LogOut className="h-3 w-3 mr-1" />
                              Check Out
                            </Button>
                          </>
                        ) : !currentStatus.hasCheckedOutToday ? (
                          <Button size="sm" onClick={handleCheckIn}>
                            <LogIn className="h-3 w-3 mr-1" />
                            Check In
                          </Button>
                        ) : (
                          <Button size="sm" disabled variant="outline">
                            Already Checked Out
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Attendance Statistics */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Days</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myStats.totalDays}</div>
                  <p className="text-xs text-muted-foreground">{getCurrentMonthName()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Present Days</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{myStats.presentDays}</div>
                  <p className="text-xs text-muted-foreground">
                    +{myStats.lateDays} late, +{myStats.halfDays} half day
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Absent/Leave</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{myStats.absentDays + myStats.leaveDays}</div>
                  <p className="text-xs text-muted-foreground">
                    {myStats.absentDays} absent, {myStats.leaveDays} leave
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{myStats.attendanceRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    Avg. {myStats.averageHours}h/day
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* My Attendance Controls with Date Selection */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      My Attendance Records
                    </CardTitle>
                    <CardDescription>
                      Showing records for {getCurrentMonthName()}
                      {mySelectedDate && (
                        <span className="ml-2">
                          | Filtered: {formatDateDisplay(mySelectedDate)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 px-2"
                            onClick={clearMyDateFilter}
                          >
                            Clear
                          </Button>
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="month"
                        value={mySelectedMonth}
                        onChange={(e) => setMySelectedMonth(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="date"
                        value={mySelectedDate}
                        onChange={(e) => setMySelectedDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        placeholder="Filter by date"
                      />
                    </div>
                    <select
                      value={myFilter}
                      onChange={(e) => setMyFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="present">Present Only</option>
                      <option value="present_half">Present & Half Day</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="halfday">Half Day</option>
                      <option value="checkedin">Checked In</option>
                      <option value="weeklyoff">Weekly Off</option>
                      <option value="leave">Leave</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={handleExportMyAttendance}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {myIsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-muted-foreground">Loading your attendance data...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Day</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Break Time</TableHead>
                          <TableHead>Breaks</TableHead>
                          <TableHead>Overtime</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myAttendanceRecords.length > 0 ? (
                          myAttendanceRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                {formatDateDisplay(record.date)}
                                {record.date === formatDate(new Date()) && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Today
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{record.day}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {record.checkIn}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {record.checkOut}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={getMyStatusBadge(record.status)}>
                                  <span className="flex items-center gap-1">
                                    {getMyStatusIcon(record.status)}
                                    {record.status}
                                  </span>
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{record.totalHours}h</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Coffee className="h-4 w-4 text-muted-foreground" />
                                  <span>{record.breakTime}h</span>
                                  <span className="text-xs text-muted-foreground">({record.breakDuration})</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{record.breaks}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  parseFloat(record.overtime) > 0 
                                    ? "bg-orange-100 text-orange-800 border-orange-200" 
                                    : "bg-gray-100 text-gray-800 border-gray-200"
                                }>
                                  {record.overtime}h
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8">
                              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-medium">No records found</h3>
                              <p className="text-muted-foreground mt-2">
                                No attendance records match your current filters.
                              </p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Attendance Summary */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Monthly Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Working Days</span>
                      <span className="font-medium">{myStats.totalDays - myStats.absentDays - myStats.leaveDays} days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Hours Worked</span>
                      <span className="font-medium">
                        {((parseFloat(myStats.averageHours) * myStats.presentDays) || 0).toFixed(1)}h
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Average Daily Hours</span>
                      <span className="font-medium">{myStats.averageHours}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Break Time</span>
                      <span className="font-medium text-blue-600">{myStats.totalBreakTime}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overtime Rate</span>
                      <span className="font-medium text-orange-600">
                        {((parseFloat(myStats.totalOvertime) / myStats.presentDays) || 0).toFixed(1)}h/day
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Punctuality Score</span>
                      <Badge variant="default">
                        {myStats.presentDays > 0 ? Math.round((myStats.presentDays / (myStats.presentDays + myStats.lateDays)) * 100) : 0}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Consistency</span>
                      <Badge variant="default">
                        {myStats.attendanceRate}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overtime Contribution</span>
                      <Badge variant="default">
                        {myStats.totalOvertime}h
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Leave Balance</span>
                      <Badge variant="default">
                        {Math.max(0, 18 - myStats.leaveDays)} days
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team Attendance Tab */}
          <TabsContent value="team-attendance" className="space-y-6">
            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sites.length}</div>
                  <p className="text-xs text-muted-foreground">Assigned to you</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallTotals.totalEmployees}</div>
                  <p className="text-xs text-muted-foreground">Across all sites</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{overallTotals.totalPresent}</div>
                  <p className="text-xs text-muted-foreground">Including weekly off</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{overallTotals.attendanceRate}%</div>
                  <p className="text-xs text-muted-foreground">Overall for {formatDateDisplay(selectedDate)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters with Date Selection */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={handleDateChange}
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

                  <Button variant="outline" size="sm" onClick={handleExportTeam}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Showing attendance data for {formatDateDisplay(selectedDate)}
                </div>
              </CardContent>
            </Card>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading sites data...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={handleRefresh}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sites Table */}
            {!loading && !error && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Sites Attendance - {formatDateDisplay(selectedDate)}
                  </CardTitle>
                  <CardDescription>
                    Showing {filteredSites.length} sites • {overallTotals.totalEmployees} total employees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredSites.length === 0 ? (
                    <div className="text-center py-12">
                      <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Sites Found</h3>
                      <p className="text-gray-500">
                        {searchTerm
                          ? 'No sites match your search criteria.'
                          : 'No sites are currently assigned to you.'}
                      </p>
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
                              <th className="h-12 px-4 text-left font-medium">Status</th>
                              <th className="h-12 px-4 text-left font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedSites.map((site) => {
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
                                  <td className="p-4 align-middle">
                                    <Badge className={getStatusBadge(status)}>
                                      {status}
                                    </Badge>
                                  </td>
                                  <td className="p-4 align-middle">
                                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(site)}>
                                      <Eye className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {filteredSites.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4">
                          <div className="text-sm text-muted-foreground">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSites.length)} of {filteredSites.length} sites
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
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default ManagerAttendance;