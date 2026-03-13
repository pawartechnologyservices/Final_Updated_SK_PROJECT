import React, { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle, XCircle, Clock, Users, BarChart3, Download, CalendarDays, LogIn, LogOut, ChevronLeft, ChevronRight, FileSpreadsheet, Crown, RefreshCw, AlertCircle, Search, FileText, Loader2, MapPin, Shield, Building, Target, AlertTriangle, UserCheck, UserX, UserMinus, Info, Mail, Edit, Save, MoreVertical, Menu, Filter } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/context/RoleContext";
import { useOutletContext } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from "axios";

// API URL
const API_URL = process.env.NODE_ENV === 'development' 
  ? `http://${window.location.hostname}:5001/api` 
  : '/api';

// Types from your backend
interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber?: string;
  panNumber?: string;
  esicNumber?: string;
  uanNumber?: string;
  dateOfBirth?: string;
  dateOfJoining: string;
  dateOfExit?: string;
  bloodGroup?: string;
  gender?: string;
  maritalStatus?: string;
  permanentAddress?: string;
  permanentPincode?: string;
  localAddress?: string;
  localPincode?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  bankBranch?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  numberOfChildren?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  department: string;
  position: string;
  siteName?: string;
  salary: number;
  status: "active" | "inactive" | "left";
  role?: string;
  pantSize?: string;
  shirtSize?: string;
  capSize?: string;
  idCardIssued?: boolean;
  westcoatIssued?: boolean;
  apronIssued?: boolean;
  photo?: string;
  photoPublicId?: string;
  employeeSignature?: string;
  employeeSignaturePublicId?: string;
  authorizedSignature?: string;
  authorizedSignaturePublicId?: string;
  createdAt?: string;
  updatedAt?: string;
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
}

interface WeeklyAttendanceSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  weekStartDate: string;
  weekEndDate: string;
  daysPresent: number;
  daysAbsent: number;
  daysHalfDay: number;
  daysLeave: number;
  daysWeeklyOff: number;
  totalHours: number;
  totalBreakTime: number;
  overallStatus: 'present' | 'absent' | 'mixed';
}

interface SupervisorAttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  supervisorId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  status: string;
  shift: string;
  hours: number;
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
  lastCheckInDate?: string | null;
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

interface Site {
  _id: string;
  name: string;
  clientName?: string;
  location?: string;
  status?: string;
}

// Interface for status update
interface StatusUpdateData {
  employeeId: string;
  employeeName: string;
  attendanceId: string;
  currentStatus: string;
  newStatus: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  date: string;
  remarks: string;
}

// Interface for attendance summary (same as in SupervisorDashboard)
interface AttendanceSummary {
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  weeklyOffCount: number;
  leaveCount: number;
  halfDayCount: number;
}

// Mobile responsive employee attendance card
const MobileEmployeeAttendanceCard = ({
  employee,
  attendanceRecord,
  onCheckIn,
  onCheckOut,
  onBreakIn,
  onBreakOut,
  onManual,
  onStatusUpdate,
  formatTimeForDisplay,
  formatHours,
  getStatusBadge,
  getStatusIcon,
  supervisorSites,
  updatingStatus
}: {
  employee: Employee;
  attendanceRecord: AttendanceRecord | undefined;
  onCheckIn: (employee: Employee) => void;
  onCheckOut: (employee: Employee) => void;
  onBreakIn: (employee: Employee) => void;
  onBreakOut: (employee: Employee) => void;
  onManual: (employee: Employee) => void;
  onStatusUpdate: (employee: Employee, record: AttendanceRecord | null) => void;
  formatTimeForDisplay: (time: string | null) => string;
  formatHours: (hours: number) => string;
  getStatusBadge: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element | null;
  supervisorSites: Site[];
  updatingStatus: boolean;
}) => {
  return (
    <Card className="mb-4 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-base">{employee.name}</h3>
            <p className="text-xs text-muted-foreground">ID: {employee.employeeId}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onManual(employee)}>
                <FileText className="h-4 w-4 mr-2" /> Manual Entry
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusUpdate(employee, attendanceRecord || null)}>
                <Edit className="h-4 w-4 mr-2" /> Update Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-sm font-medium">{employee.department}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Site</p>
            <Badge variant="outline" className="text-xs mt-1 max-w-full truncate">
              {employee.siteName || 'Not Assigned'}
            </Badge>
          </div>
        </div>

        {/* Attendance Details */}
        {attendanceRecord ? (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-muted-foreground">Check In</p>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <LogIn className="h-3 w-3" />
                  {formatTimeForDisplay(attendanceRecord.checkInTime)}
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-muted-foreground">Check Out</p>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <LogOut className="h-3 w-3" />
                  {formatTimeForDisplay(attendanceRecord.checkOutTime)}
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-muted-foreground">Break In</p>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <Clock className="h-3 w-3" />
                  {formatTimeForDisplay(attendanceRecord.breakStartTime)}
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-muted-foreground">Break Out</p>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <Clock className="h-3 w-3" />
                  {formatTimeForDisplay(attendanceRecord.breakEndTime)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Hours</p>
                <p className="text-sm font-bold">{formatHours(attendanceRecord.totalHours)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusBadge(attendanceRecord.status)}>
                  {getStatusIcon(attendanceRecord.status)}
                  {attendanceRecord.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => onStatusUpdate(employee, attendanceRecord)}
                  disabled={updatingStatus}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {attendanceRecord.isCheckedIn ? (
                <>
                  {attendanceRecord.isOnBreak ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onBreakOut(employee)}
                      className="w-full"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      End Break
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onBreakIn(employee)}
                      className="w-full"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Start Break
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCheckOut(employee)}
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Check Out
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCheckIn(employee)}
                  className="w-full col-span-2"
                  disabled={!!attendanceRecord?.checkOutTime}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Check In
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <Badge variant="outline" className="mb-3">No Record</Badge>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCheckIn(employee)}
                className="w-full"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Check In
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onManual(employee)}
                className="w-full"
              >
                <FileText className="mr-2 h-4 w-4" />
                Manual
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Mobile responsive supervisor attendance card
const MobileSupervisorAttendanceCard = ({
  record,
  formatTimeForDisplay,
  getStatusBadge
}: {
  record: SupervisorAttendanceRecord;
  formatTimeForDisplay: (time: string | null) => string;
  getStatusBadge: (status: string) => string;
}) => {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{record.date}</span>
          </div>
          <Badge className={getStatusBadge(record.status.toLowerCase())}>
            {record.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Check In</p>
            <div className="flex items-center gap-1 text-sm">
              <LogIn className="h-3 w-3" />
              {record.checkInTime || "-"}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Check Out</p>
            <div className="flex items-center gap-1 text-sm">
              <LogOut className="h-3 w-3" />
              {record.checkOutTime || "-"}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hours</p>
            <p className="text-sm font-bold">{record.hours.toFixed(2)} hrs</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Break</p>
            <p className="text-sm">{record.breakTime.toFixed(2)} hrs</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mobile responsive weekly summary card
const MobileWeeklySummaryCard = ({
  summary,
  getStatusBadge,
  getStatusIcon
}: {
  summary: WeeklyAttendanceSummary;
  getStatusBadge: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element | null;
}) => {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-semibold">{summary.employeeName}</h4>
            <p className="text-xs text-muted-foreground">ID: {summary.employeeId}</p>
          </div>
          <Badge className={getStatusBadge(summary.overallStatus)}>
            {getStatusIcon(summary.overallStatus)}
            {summary.overallStatus.charAt(0).toUpperCase() + summary.overallStatus.slice(1)}
          </Badge>
        </div>
        
        <p className="text-xs text-muted-foreground mb-2">{summary.department}</p>
        
        <div className="grid grid-cols-5 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">P</p>
            <p className="text-sm font-bold text-green-600">{summary.daysPresent}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">A</p>
            <p className="text-sm font-bold text-red-600">{summary.daysAbsent}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">HD</p>
            <p className="text-sm font-bold text-yellow-600">{summary.daysHalfDay}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">L</p>
            <p className="text-sm font-bold text-blue-600">{summary.daysLeave}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">WO</p>
            <p className="text-sm font-bold text-purple-600">{summary.daysWeeklyOff}</p>
          </div>
        </div>
        
        <div className="mt-3 pt-2 border-t flex justify-between">
          <span className="text-sm">Total Hours:</span>
          <span className="text-sm font-bold">{summary.totalHours.toFixed(2)} hrs</span>
        </div>
      </CardContent>
    </Card>
  );
};

const Attendance = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const { user: currentUser, isAuthenticated } = useRole();
  const [activeTab, setActiveTab] = useState("my-attendance");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Mobile responsive state
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Current supervisor info from RoleContext
  const [currentSupervisor, setCurrentSupervisor] = useState({
    id: currentUser?._id || currentUser?.id || '',
    name: currentUser?.name || 'Supervisor',
    supervisorId: currentUser?._id || currentUser?.id || '',
    email: currentUser?.email || ''
  });
  
  // Supervisor attendance states - ONLY CURRENT SUPERVISOR'S DATA
  const [supervisorAttendance, setSupervisorAttendance] = useState<SupervisorAttendanceRecord[]>([]);
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus | null>(null);
  const [loadingSupervisor, setLoadingSupervisor] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Employee attendance states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklyAttendanceSummary[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);
  
  // Sites from tasks
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [supervisorSites, setSupervisorSites] = useState<Site[]>([]);
  const [supervisorSiteNames, setSupervisorSiteNames] = useState<string[]>([]);
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Debug info
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // Manual attendance dialog
  const [manualAttendanceDialogOpen, setManualAttendanceDialogOpen] = useState(false);
  const [selectedEmployeeForManual, setSelectedEmployeeForManual] = useState<Employee | null>(null);
  const [manualAttendanceData, setManualAttendanceData] = useState({
    date: new Date().toISOString().split('T')[0],
    checkInTime: "",
    checkOutTime: "",
    breakStartTime: "",
    breakEndTime: "",
    status: "present" as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off',
    remarks: ""
  });

  // New state for status update
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [selectedEmployeeForStatusUpdate, setSelectedEmployeeForStatusUpdate] = useState<Employee | null>(null);
  const [selectedAttendanceForStatusUpdate, setSelectedAttendanceForStatusUpdate] = useState<AttendanceRecord | null>(null);
  const [statusUpdateData, setStatusUpdateData] = useState<StatusUpdateData>({
    employeeId: '',
    employeeName: '',
    attendanceId: '',
    currentStatus: '',
    newStatus: 'present',
    date: new Date().toISOString().split('T')[0],
    remarks: ''
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Attendance summary state (same as in SupervisorDashboard)
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalEmployees: 0,
    presentCount: 0,
    absentCount: 0,
    weeklyOffCount: 0,
    leaveCount: 0,
    halfDayCount: 0
  });

  // Week selection for register view
  const [selectedWeek, setSelectedWeek] = useState<number>(2);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);

  // Check for mobile view on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Helper function to normalize site names for comparison - MODIFIED FOR EXACT MATCHING
  const normalizeSiteName = useCallback((siteName: string | null | undefined): string => {
    if (!siteName) return '';
    // Only trim and convert to lowercase, no special character removal
    return siteName.toString().toLowerCase().trim();
  }, []);

  // Update current supervisor when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setCurrentSupervisor({
        id: currentUser._id || currentUser.id || '',
        name: currentUser.name || 'Supervisor',
        supervisorId: currentUser._id || currentUser.id || '',
        email: currentUser.email || ''
      });
    }
  }, [currentUser]);

  // Fetch tasks where this specific supervisor is assigned
  const fetchSupervisorSitesFromTasks = useCallback(async () => {
    if (!currentUser) return { siteNames: [], siteIds: [] };
    
    try {
      const supervisorId = currentUser._id || currentUser.id;
      const supervisorName = currentUser.name;
      const supervisorEmail = currentUser.email;
      
      console.log("🔍 Fetching tasks for supervisor:", {
        id: supervisorId,
        name: supervisorName,
        email: supervisorEmail
      });
      
      // Fetch all tasks from your tasks API
      const response = await axios.get(`${API_URL}/tasks`, {
        params: {
          limit: 1000 // Get many tasks
        }
      });
      
      let supervisorSiteNamesSet = new Set<string>();
      let supervisorSiteIdsSet = new Set<string>();
      let tasksWithSupervisor: Task[] = [];
      
      // Handle response format
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
      
      // Filter tasks where this supervisor is assigned
      allTasks.forEach((task: Task) => {
        let isAssignedToThisSupervisor = false;
        
        // Check assignedUsers array
        if (task.assignedUsers && Array.isArray(task.assignedUsers)) {
          isAssignedToThisSupervisor = task.assignedUsers.some(user => {
            const userIdMatch = user.userId === supervisorId;
            const nameMatch = user.name?.toLowerCase() === supervisorName?.toLowerCase();
            return userIdMatch || nameMatch;
          });
        }
        
        // Check single assignee
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
      
      setDebugInfo((prev: any) => ({
        ...prev,
        supervisorId,
        supervisorName,
        totalTasks: allTasks.length,
        tasksWithSupervisor: tasksWithSupervisor.length,
        supervisorSitesFromTasks: supervisorSiteNames,
        supervisorSiteIds: supervisorSiteIds,
        tasksList: tasksWithSupervisor.map(t => ({
          title: t.title,
          site: t.siteName,
          status: t.status
        }))
      }));
      
      return { siteNames: supervisorSiteNames, siteIds: supervisorSiteIds };
      
    } catch (error: any) {
      console.error('❌ Error fetching tasks:', error);
      
      setDebugInfo((prev: any) => ({
        ...prev,
        taskFetchError: error.message
      }));
      
      return { siteNames: [], siteIds: [] };
    }
  }, [currentUser]);

  // Fetch all sites and filter by supervisor's task-assigned sites
  const fetchAllSites = useCallback(async () => {
    if (!currentUser) return [];
    
    try {
      setLoadingSites(true);
      
      // First, get supervisor's sites from tasks
      const { siteNames: taskSiteNames, siteIds: taskSiteIds } = await fetchSupervisorSitesFromTasks();
      
      console.log("🌐 Fetching all sites from API...");
      
      const response = await axios.get(`${API_URL}/sites`);
      
      let allSitesData: Site[] = [];
      
      if (response.data) {
        // Handle different response formats
        if (response.data.success && Array.isArray(response.data.data)) {
          allSitesData = response.data.data;
        } else if (Array.isArray(response.data)) {
          allSitesData = response.data;
        } else if (response.data.sites && Array.isArray(response.data.sites)) {
          allSitesData = response.data.sites;
        }
      }
      
      console.log(`📊 Fetched ${allSitesData.length} sites from API`);
      
      // Transform sites
      const transformedSites = allSitesData.map((site: any) => ({
        _id: site._id || site.id,
        name: site.name,
        clientName: site.clientName || site.client,
        location: site.location || "",
        status: site.status || "active"
      }));
      
      setAllSites(transformedSites);
      
      // Filter sites based on task assignments - EXACT MATCH ONLY
      let supervisorSiteList: Site[] = [];
      
      if (taskSiteNames.length > 0) {
        // Match sites by exact name from tasks - NO PARTIAL MATCHES
        supervisorSiteList = transformedSites.filter(site => {
          // Check exact match with site name
          const exactNameMatch = taskSiteNames.some(taskSiteName => 
            site.name === taskSiteName
          );
          
          // Check exact match with normalized names
          const exactNormalizedMatch = taskSiteNames.some(taskSiteName => 
            normalizeSiteName(site.name) === normalizeSiteName(taskSiteName)
          );
          
          // Check ID match
          const idMatch = taskSiteIds.includes(site._id);
          
          return exactNameMatch || exactNormalizedMatch || idMatch;
        });
        
        console.log(`✅ Matched ${supervisorSiteList.length} sites from task assignments (exact matches only)`);
      } else {
        console.log("⚠️ No sites found from tasks - supervisor has no assigned tasks");
      }
      
      setSupervisorSites(supervisorSiteList);
      setSupervisorSiteNames(supervisorSiteList.map(site => site.name));
      
      setDebugInfo((prev: any) => ({
        ...prev,
        allSitesCount: transformedSites.length,
        matchedSitesCount: supervisorSiteList.length,
        matchedSites: supervisorSiteList.map(s => s.name),
        taskSiteNames
      }));
      
      if (supervisorSiteList.length === 0) {
        toast.warning("You don't have any tasks assigned to any sites. No employees will be shown.");
      }
      
      return supervisorSiteList;
      
    } catch (error: any) {
      console.error('❌ Error fetching sites:', error);
      toast.error(`Failed to load sites: ${error.message}`);
      return [];
    } finally {
      setLoadingSites(false);
    }
  }, [currentUser, fetchSupervisorSitesFromTasks, normalizeSiteName]);

  // Fetch employees from your backend API - ONLY from task-assigned sites
  const fetchEmployees = useCallback(async () => {
    if (!currentUser) {
      console.log("No current user");
      setLoadingEmployees(false);
      return;
    }
    
    try {
      setLoadingEmployees(true);
      
      // First, ensure we have supervisor sites from tasks
      let supervisorSiteList = supervisorSites;
      let supervisorSiteNameList = supervisorSiteNames;
      
      if (supervisorSiteList.length === 0) {
        supervisorSiteList = await fetchAllSites() || [];
        supervisorSiteNameList = supervisorSiteList.map(site => site.name);
      }
      
      // If no sites from tasks, set empty employees array
      if (supervisorSiteNameList.length === 0) {
        console.log("❌ No sites from tasks - setting empty employees array");
        setEmployees([]);
        setFilteredEmployees([]);
        
        toast.warning("You have no tasks assigned to any sites. Please contact your administrator.");
        return;
      }
      
      // Fetch all employees from your API
      console.log("📡 Fetching all employees from API:", `${API_URL}/employees`);
      
      const response = await axios.get(`${API_URL}/employees`, {
        params: {
          limit: 1000 // Get all employees
        }
      });
      
      let fetchedEmployees: Employee[] = [];
      let allEmployees: Employee[] = [];
      
      if (response.data) {
        // Handle different response formats
        if (response.data.success) {
          allEmployees = response.data.data || response.data.employees || [];
        } else if (Array.isArray(response.data)) {
          allEmployees = response.data;
        } else if (response.data.employees && Array.isArray(response.data.employees)) {
          allEmployees = response.data.employees;
        }
        
        console.log(`📊 Total employees from API: ${allEmployees.length}`);
        console.log("📍 Supervisor's task-assigned sites:", supervisorSiteNameList);
        
        // IMPORTANT FIX: Filter employees by supervisor's task-assigned sites using EXACT MATCH ONLY
        // No partial matches, no "includes" matching
        fetchedEmployees = allEmployees.filter((emp: Employee) => {
          const employeeSite = emp.siteName || '';
          
          // EXACT MATCH ONLY - compare the full site name
          const exactMatch = supervisorSiteNameList.some(siteName => 
            siteName === employeeSite
          );
          
          // Normalized exact match (case insensitive, trimmed)
          const normalizedExactMatch = supervisorSiteNameList.some(siteName => 
            normalizeSiteName(siteName) === normalizeSiteName(employeeSite)
          );
          
          // Only match if it's an exact match - NO PARTIAL MATCHES
          const matches = exactMatch || normalizedExactMatch;
          
          if (matches) {
            console.log(`✅ Employee ${emp.name} (${emp.employeeId}) matches site: "${employeeSite}" exactly with supervisor site: "${supervisorSiteNameList.find(s => normalizeSiteName(s) === normalizeSiteName(employeeSite))}"`);
          } else {
            console.log(`❌ Employee ${emp.name} site: "${employeeSite}" does NOT exactly match any supervisor site: [${supervisorSiteNameList.join(', ')}]`);
          }
          
          return matches;
        });
        
        console.log(`✅ Filtered ${fetchedEmployees.length} employees for supervisor's task-assigned sites (exact matches only)`);
        
        // Log which sites have employees
        const siteCount: Record<string, number> = {};
        fetchedEmployees.forEach(emp => {
          const site = emp.siteName || 'Unknown';
          siteCount[site] = (siteCount[site] || 0) + 1;
        });
        console.log("📊 Employee distribution by site:", siteCount);
        
        // Calculate employee distribution by site for debugging
        const siteDistribution: Record<string, number> = {};
        allEmployees.forEach((emp: Employee) => {
          const site = emp.siteName || 'Unassigned';
          siteDistribution[site] = (siteDistribution[site] || 0) + 1;
        });
        
        setDebugInfo((prev: any) => ({
          ...prev,
          allEmployeesCount: allEmployees.length,
          filteredEmployeesCount: fetchedEmployees.length,
          supervisorSitesFromTasks: supervisorSiteNameList,
          employeeSiteDistribution: siteDistribution,
          matchedEmployees: fetchedEmployees.map(e => ({
            name: e.name,
            site: e.siteName
          }))
        }));
        
      } else {
        console.warn("⚠️ Unexpected API response format:", response.data);
        toast.error("Failed to fetch employees: Invalid response format");
      }
      
      setEmployees(fetchedEmployees);
      setFilteredEmployees(fetchedEmployees);
      
      if (fetchedEmployees.length > 0) {
        toast.success(`Loaded ${fetchedEmployees.length} employees for your task-assigned sites`);
      } else {
        toast.warning(`No employees found for your task-assigned sites: ${supervisorSiteNameList.join(', ')}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching employees:', error);
      
      // Handle different error types
      if (error.code === 'ERR_NETWORK') {
        toast.error("Network error: Cannot connect to server. Please check if backend is running.");
      } else if (error.response?.status === 404) {
        toast.error("API endpoint not found. Please check backend configuration.");
      } else {
        toast.error(`Failed to load employees: ${error.message}`);
      }
      
      setEmployees([]);
      setFilteredEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [currentUser, supervisorSites, supervisorSiteNames, fetchAllSites, normalizeSiteName]);

  // Initialize data
  useEffect(() => {
    if (currentUser && currentUser.role === "supervisor") {
      console.log("🚀 Initializing supervisor attendance data...", {
        id: currentUser._id || currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role
      });
      
      // First fetch sites from tasks, then employees
      const initializeData = async () => {
        await fetchAllSites();
        await fetchEmployees();
        await loadSupervisorAttendance();
      };
      
      initializeData();
    }
  }, [currentUser]);

  // Load attendance records when employees or selectedDate changes
  useEffect(() => {
    if (employees.length > 0) {
      loadAttendanceRecords(selectedDate);
    } else {
      setSummary({
        totalEmployees: 0,
        presentCount: 0,
        absentCount: 0,
        weeklyOffCount: 0,
        leaveCount: 0,
        halfDayCount: 0
      });
    }
  }, [employees, selectedDate]);

  // Filter employees based on search and filters
  useEffect(() => {
    let filtered = [...employees];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(query) ||
        emp.employeeId.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.phone?.includes(query) ||
        emp.department?.toLowerCase().includes(query) ||
        emp.position?.toLowerCase().includes(query)
      );
    }
    
    // Apply site filter
    if (selectedSiteFilter !== "all") {
      filtered = filtered.filter(emp => emp.siteName === selectedSiteFilter);
    }
    
    // Apply department filter
    if (selectedDepartment !== "all") {
      filtered = filtered.filter(emp => emp.department === selectedDepartment);
    }
    
    setFilteredEmployees(filtered);
  }, [employees, searchQuery, selectedSiteFilter, selectedDepartment]);

  // SUPERVISOR ATTENDANCE FUNCTIONS - FOR CURRENT SUPERVISOR ONLY
  const loadSupervisorAttendance = async () => {
    try {
      setLoadingSupervisor(true);
      setApiError(null);
      
      console.log('🔄 Loading supervisor attendance for:', currentSupervisor.id);
      
      // Load current status
      try {
        const statusResponse = await axios.get(`${API_URL}/attendance/status/${currentSupervisor.id}`);
        if (statusResponse.data && statusResponse.data.success) {
          setCurrentStatus(statusResponse.data.data);
          console.log('✅ Current status loaded:', statusResponse.data.data);
        }
      } catch (statusError) {
        console.log('Status API call failed:', statusError);
      }

      // Load attendance history - ONLY FOR CURRENT SUPERVISOR
      try {
        console.log('📋 Fetching attendance history for supervisor:', currentSupervisor.id);
        const historyResponse = await axios.get(`${API_URL}/attendance/history`, {
          params: { employeeId: currentSupervisor.id }
        });
        
        console.log('📊 Supervisor attendance history response:', historyResponse.data);
        
        if (historyResponse.data && historyResponse.data.success && Array.isArray(historyResponse.data.data)) {
          // Filter to include ONLY current supervisor's records
          const supervisorRecords = historyResponse.data.data.filter((record: any) => 
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
          
          setSupervisorAttendance(transformedRecords);
          return;
        }
      } catch (historyError) {
        console.log('History API call failed:', historyError);
      }
      
      // Sample data - ONLY FOR CURRENT SUPERVISOR (fallback)
      const sampleData: SupervisorAttendanceRecord[] = [
        {
          id: "today",
          employeeId: currentSupervisor.id,
          employeeName: currentSupervisor.name,
          supervisorId: currentSupervisor.supervisorId,
          date: new Date().toISOString().split('T')[0],
          checkInTime: currentStatus?.checkInTime ? formatTimeForDisplay(currentStatus.checkInTime) : "08:30 AM",
          checkOutTime: currentStatus?.checkOutTime ? formatTimeForDisplay(currentStatus.checkOutTime) : "-",
          breakStartTime: currentStatus?.breakStartTime ? formatTimeForDisplay(currentStatus.breakStartTime) : "-",
          breakEndTime: currentStatus?.breakEndTime ? formatTimeForDisplay(currentStatus.breakEndTime) : "-",
          totalHours: currentStatus?.totalHours || 0,
          breakTime: currentStatus?.breakTime || 0,
          status: currentStatus?.isCheckedIn ? 
                 (currentStatus.checkOutTime ? "Present" : "In Progress") : 
                 "Absent",
          shift: "Supervisor Shift",
          hours: currentStatus?.totalHours || 0
        },
        {
          id: "1",
          employeeId: currentSupervisor.id,
          employeeName: currentSupervisor.name,
          supervisorId: currentSupervisor.supervisorId,
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          checkInTime: "08:45 AM",
          checkOutTime: "05:15 PM",
          breakStartTime: "01:00 PM",
          breakEndTime: "01:30 PM",
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
          breakStartTime: null,
          breakEndTime: null,
          totalHours: 0,
          breakTime: 0,
          status: "Absent",
          shift: "Supervisor Shift",
          hours: 0
        }
      ];
      
      setSupervisorAttendance(sampleData);
      
    } catch (error) {
      console.error('Error loading supervisor attendance:', error);
      setApiError("Error loading attendance data");
    } finally {
      setLoadingSupervisor(false);
    }
  };

  // Handle check-in for current supervisor
  const handleCheckIn = async () => {
    try {
      console.log('🔄 Attempting check-in for supervisor:', currentSupervisor.id);
      
      const payload = {
        employeeId: currentSupervisor.id,
        employeeName: currentSupervisor.name,
        supervisorId: currentSupervisor.supervisorId,
      };
      
      const response = await axios.post(`${API_URL}/attendance/checkin`, payload);

      const data = response.data;
      
      if (data.success) {
        toast.success("Checked in successfully!");
        
        // Update local state
        const now = new Date().toISOString();
        const newStatus = {
          ...currentStatus,
          isCheckedIn: true,
          checkInTime: now,
          checkOutTime: null,
          lastCheckInDate: new Date().toDateString()
        } as AttendanceStatus;
        setCurrentStatus(newStatus);
        
        // Reload supervisor attendance
        loadSupervisorAttendance();
      } else {
        toast.error(data.message || "Error checking in");
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error("Error checking in");
      
      // Fallback: Update local state
      const now = new Date().toISOString();
      const newStatus = {
        ...currentStatus,
        isCheckedIn: true,
        checkInTime: now,
        checkOutTime: null,
        lastCheckInDate: new Date().toDateString()
      } as AttendanceStatus;
      setCurrentStatus(newStatus);
    }
  };

  // Handle check-out for current supervisor
  const handleCheckOut = async () => {
    try {
      console.log('🔄 Attempting check-out for supervisor:', currentSupervisor.id);
      
      const payload = {
        employeeId: currentSupervisor.id,
      };
      
      const response = await axios.post(`${API_URL}/attendance/checkout`, payload);

      const data = response.data;
      
      if (data.success) {
        toast.success("Checked out successfully!");
        
        // Update local state
        const now = new Date().toISOString();
        const totalHours = calculateTotalHours(currentStatus?.checkInTime, now);
        const newStatus = {
          ...currentStatus,
          isCheckedIn: false,
          isOnBreak: false,
          checkOutTime: now,
          totalHours: totalHours
        } as AttendanceStatus;
        setCurrentStatus(newStatus);
        
        // Reload supervisor attendance
        loadSupervisorAttendance();
      } else {
        toast.error(data.message || "Error checking out");
      }
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error("Error checking out");
      
      // Fallback: Update local state
      const now = new Date().toISOString();
      const totalHours = calculateTotalHours(currentStatus?.checkInTime, now);
      const newStatus = {
        ...currentStatus,
        isCheckedIn: false,
        isOnBreak: false,
        checkOutTime: now,
        totalHours: totalHours
      } as AttendanceStatus;
      setCurrentStatus(newStatus);
    }
  };

  // Handle break in for current supervisor
  const handleBreakIn = async () => {
    try {
      console.log('🔄 Starting break for supervisor:', currentSupervisor.id);
      
      const payload = {
        employeeId: currentSupervisor.id,
      };
      
      const response = await axios.post(`${API_URL}/attendance/breakin`, payload);

      const data = response.data;
      
      if (data.success) {
        toast.success("Break started successfully!");
        
        // Update local state
        const now = new Date().toISOString();
        const newStatus = {
          ...currentStatus,
          isOnBreak: true,
          breakStartTime: now
        } as AttendanceStatus;
        setCurrentStatus(newStatus);
        
        // Reload supervisor attendance
        loadSupervisorAttendance();
      } else {
        toast.error(data.message || "Error starting break");
      }
    } catch (error) {
      console.error('Break-in error:', error);
      toast.error("Error starting break");
      
      // Fallback: Update local state
      const now = new Date().toISOString();
      const newStatus = {
        ...currentStatus,
        isOnBreak: true,
        breakStartTime: now
      } as AttendanceStatus;
      setCurrentStatus(newStatus);
    }
  };

  // Handle break out for current supervisor
  const handleBreakOut = async () => {
    try {
      console.log('🔄 Ending break for supervisor:', currentSupervisor.id);
      
      const payload = {
        employeeId: currentSupervisor.id,
      };
      
      const response = await axios.post(`${API_URL}/attendance/breakout`, payload);

      const data = response.data;
      
      if (data.success) {
        toast.success("Break ended successfully!");
        
        // Update local state
        const now = new Date().toISOString();
        const breakTime = calculateBreakTime(currentStatus?.breakStartTime, now);
        const totalBreakTime = (Number(currentStatus?.breakTime) || 0) + breakTime;
        const newStatus = {
          ...currentStatus,
          isOnBreak: false,
          breakEndTime: now,
          breakTime: totalBreakTime
        } as AttendanceStatus;
        setCurrentStatus(newStatus);
        
        // Reload supervisor attendance
        loadSupervisorAttendance();
      } else {
        toast.error(data.message || "Error ending break");
      }
    } catch (error) {
      console.error('Break-out error:', error);
      toast.error("Error ending break");
      
      // Fallback: Update local state
      const now = new Date().toISOString();
      const breakTime = calculateBreakTime(currentStatus?.breakStartTime, now);
      const totalBreakTime = (Number(currentStatus?.breakTime) || 0) + breakTime;
      const newStatus = {
        ...currentStatus,
        isOnBreak: false,
        breakEndTime: now,
        breakTime: totalBreakTime
      } as AttendanceStatus;
      setCurrentStatus(newStatus);
    }
  };

  // Load attendance records for selected date - EXACT SAME AS SUPERVISORDASHBOARD
  const loadAttendanceRecords = async (date: string) => {
    try {
      setLoadingAttendance(true);
      console.log('📋 Fetching attendance for date:', date);
      
      if (employees.length === 0) {
        console.log("No employees to fetch attendance for");
        setAttendanceRecords([]);
        setSummary({
          totalEmployees: 0,
          presentCount: 0,
          absentCount: 0,
          weeklyOffCount: 0,
          leaveCount: 0,
          halfDayCount: 0
        });
        setLoadingAttendance(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { date }
      });
      
      console.log('Attendance API response:', response.data);
      
      if (response.data && response.data.success) {
        const allRecords = response.data.data || [];
        
        // Process records to ensure no negative hours
        const processedRecords = allRecords.map((record: any) => {
          if (record.checkInTime && record.checkOutTime) {
            const calculatedHours = calculateTotalHours(record.checkInTime, record.checkOutTime);
            if (calculatedHours > 0 && record.totalHours < 0) {
              record.totalHours = calculatedHours;
            }
          }
          return record;
        });
        
        const employeeIdsFromSites = new Set(employees.map(emp => emp._id));
        const employeeNamesFromSites = new Set(employees.map(emp => emp.name));
        
        const filteredRecords = processedRecords.filter((record: any) => 
          employeeIdsFromSites.has(record.employeeId) || 
          employeeNamesFromSites.has(record.employeeName)
        );
        
        console.log(`📊 Total attendance records: ${allRecords.length}, Filtered: ${filteredRecords.length}`);
        
        setAttendanceRecords(filteredRecords);
        
        // Calculate counts - EXACT SAME LOGIC AS SUPERVISORDASHBOARD
        const presentCount = filteredRecords.filter((r: AttendanceRecord) => r.status === 'present').length;
        const weeklyOffCount = filteredRecords.filter((r: AttendanceRecord) => r.status === 'weekly-off').length;
        const leaveCount = filteredRecords.filter((r: AttendanceRecord) => r.status === 'leave').length;
        const halfDayCount = filteredRecords.filter((r: AttendanceRecord) => r.status === 'half-day').length;
        
        // Employees with status 'absent' in records
        const absentFromRecords = filteredRecords.filter((r: AttendanceRecord) => r.status === 'absent').length;
        
        // Employees with NO attendance record at all
        const employeesWithRecords = new Set(filteredRecords.map(r => r.employeeId));
        const employeesWithoutRecords = employees.filter(emp => !employeesWithRecords.has(emp._id)).length;
        
        // Total absent = absent from records + employees without records
        // Employees on weekly off are NOT counted as absent
        const totalAbsentCount = absentFromRecords + employeesWithoutRecords;
        
        console.log(`📊 Summary - Present: ${presentCount}, Weekly Off: ${weeklyOffCount}, Leave: ${leaveCount}, Half Day: ${halfDayCount}, Absent: ${totalAbsentCount} (${absentFromRecords} from records + ${employeesWithoutRecords} without records)`);
        
        setSummary({
          totalEmployees: employees.length,
          presentCount,
          absentCount: totalAbsentCount,
          weeklyOffCount,
          leaveCount,
          halfDayCount
        });
      } else {
        console.error('Failed to load attendance:', response.data?.message);
        setAttendanceRecords([]);
        
        // If no attendance records at all, all employees are absent
        setSummary({
          totalEmployees: employees.length,
          presentCount: 0,
          absentCount: employees.length,
          weeklyOffCount: 0,
          leaveCount: 0,
          halfDayCount: 0
        });
      }
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      
      if (error.code === 'ERR_NETWORK') {
        toast.error("Network error: Cannot fetch attendance data");
      }
      
      setAttendanceRecords([]);
      
      // On error, all employees are considered absent
      setSummary({
        totalEmployees: employees.length,
        presentCount: 0,
        absentCount: employees.length,
        weeklyOffCount: 0,
        leaveCount: 0,
        halfDayCount: 0
      });
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Load weekly summaries
  const loadWeeklySummaries = async (weekStart: string, weekEnd: string) => {
    try {
      setLoadingWeekly(true);
      console.log('📋 Fetching weekly summary for:', { weekStart, weekEnd });
      
      // Try to get weekly summary from the API endpoint
      try {
        const weeklyResponse = await axios.get(`${API_URL}/attendance/weekly-summary`, {
          params: { startDate: weekStart, endDate: weekEnd }
        });
        
        console.log('Weekly summary API response:', weeklyResponse.data);
        
        if (weeklyResponse.data && weeklyResponse.data.success && Array.isArray(weeklyResponse.data.data)) {
          // Transform the data to match our interface
          const transformedSummaries = weeklyResponse.data.data.map((item: any) => ({
            employeeId: item.employeeId || item._id || `emp_${Math.random()}`,
            employeeName: item.employeeName || "Unknown Employee",
            department: item.department || "Unknown",
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            daysPresent: item.daysPresent || item.presentDays || 0,
            daysAbsent: item.daysAbsent || item.absentDays || 0,
            daysHalfDay: item.daysHalfDay || item.halfDays || 0,
            daysLeave: item.daysLeave || item.leaveDays || 0,
            daysWeeklyOff: item.daysWeeklyOff || item.weeklyOffDays || 0,
            totalHours: item.totalHours || item.workingHours || 0,
            totalBreakTime: item.totalBreakTime || item.breakHours || 0,
            overallStatus: (item.overallStatus || 'absent') as 'present' | 'absent' | 'mixed'
          }));
          
          console.log('Transformed weekly summaries:', transformedSummaries);
          setWeeklySummaries(transformedSummaries);
          return;
        }
      } catch (weeklyError) {
        console.log('Weekly summary API failed, calculating from employees:', weeklyError);
      }
      
      // If weekly summary API fails, create empty summaries from employees
      if (employees.length > 0) {
        const emptySummaries = employees.map(emp => ({
          employeeId: emp._id,
          employeeName: emp.name,
          department: emp.department,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          daysPresent: 0,
          daysAbsent: 0,
          daysHalfDay: 0,
          daysLeave: 0,
          daysWeeklyOff: 0,
          totalHours: 0,
          totalBreakTime: 0,
          overallStatus: 'absent' as const
        }));
        setWeeklySummaries(emptySummaries);
      } else {
        setWeeklySummaries([]);
      }
      
    } catch (error) {
      console.error('Error loading weekly summaries:', error);
      toast.error("Error loading weekly attendance data");
      
      // Show empty state
      if (employees.length > 0) {
        const emptySummaries = employees.map(emp => ({
          employeeId: emp._id,
          employeeName: emp.name,
          department: emp.department,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          daysPresent: 0,
          daysAbsent: 0,
          daysHalfDay: 0,
          daysLeave: 0,
          daysWeeklyOff: 0,
          totalHours: 0,
          totalBreakTime: 0,
          overallStatus: 'absent' as const
        }));
        setWeeklySummaries(emptySummaries);
      } else {
        setWeeklySummaries([]);
      }
    } finally {
      setLoadingWeekly(false);
    }
  };

  // Format time for display
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

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayAbbreviation = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getWeekDates = (year: number, month: number, weekNumber: number) => {
    const dates = [];
    const startDate = new Date(year, month, 1);
    
    while (startDate.getDay() !== 1) {
      startDate.setDate(startDate.getDate() + 1);
    }
    
    startDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatHours = (hours: number): string => {
    if (hours < 0) {
      return "0.00 hrs";
    }
    return `${hours.toFixed(2)} hrs`;
  };

  // Helper functions for time calculations
  const calculateTotalHours = (start: string | null, end: string | null): number => {
    if (!start || !end) return 0;
    
    try {
      // Parse times safely
      const parseTime = (timeStr: string): Date => {
        if (timeStr.includes('T')) {
          return new Date(timeStr);
        }
        
        // Handle time strings like "18:43"
        const today = new Date().toISOString().split('T')[0];
        return new Date(`${today}T${timeStr}`);
      };

      const checkIn = parseTime(start);
      const checkOut = parseTime(end);
      
      // Check if dates are valid
      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        return 0;
      }
      
      // If check-out is earlier than check-in, it might be next day (for night shifts)
      let diffMs = checkOut.getTime() - checkIn.getTime();
      
      // If negative, assume next day (for overnight shifts)
      if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000; // Add 24 hours
      }
      
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // Ensure hours are positive and reasonable
      return Math.max(0, Math.min(diffHours, 24)); // Max 24 hours per day
    } catch (error) {
      console.error('Error calculating hours:', error);
      return 0;
    }
  };

  const calculateBreakTime = (start: string | null, end: string | null): number => {
    if (!start || !end) return 0;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return (endTime - startTime) / (1000 * 60 * 60);
  };

  const getEmployeeAttendanceRecord = (employeeId: string) => {
    return attendanceRecords.find(record => 
      record.employeeId === employeeId && record.date === selectedDate
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return "bg-green-100 text-green-800 border-green-200";
      case 'absent':
        return "bg-red-100 text-red-800 border-red-200";
      case 'half-day':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'leave':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'weekly-off':
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="mr-1 h-3 w-3" />;
      case 'absent':
        return <XCircle className="mr-1 h-3 w-3" />;
      case 'half-day':
        return <Clock className="mr-1 h-3 w-3" />;
      case 'leave':
        return <Calendar className="mr-1 h-3 w-3" />;
      case 'weekly-off':
        return <Calendar className="mr-1 h-3 w-3" />;
      default:
        return null;
    }
  };

  const handleManualAttendance = (employee: Employee) => {
    setSelectedEmployeeForManual(employee);
    setManualAttendanceData({
      date: selectedDate,
      checkInTime: "",
      checkOutTime: "",
      breakStartTime: "",
      breakEndTime: "",
      status: "present",
      remarks: ""
    });
    setManualAttendanceDialogOpen(true);
  };

  const submitManualAttendance = async () => {
    if (!selectedEmployeeForManual) return;

    try {
      let totalHours = 0;
      if (manualAttendanceData.checkInTime && manualAttendanceData.checkOutTime) {
        totalHours = calculateTotalHours(
          `${manualAttendanceData.date}T${manualAttendanceData.checkInTime}`,
          `${manualAttendanceData.date}T${manualAttendanceData.checkOutTime}`
        );
      }

      const response = await axios.post(`${API_URL}/attendance/manual`, {
        employeeId: selectedEmployeeForManual._id,
        employeeName: selectedEmployeeForManual.name,
        date: manualAttendanceData.date,
        checkInTime: manualAttendanceData.checkInTime ? `${manualAttendanceData.date}T${manualAttendanceData.checkInTime}` : null,
        checkOutTime: manualAttendanceData.checkOutTime ? `${manualAttendanceData.date}T${manualAttendanceData.checkOutTime}` : null,
        breakStartTime: manualAttendanceData.breakStartTime ? `${manualAttendanceData.date}T${manualAttendanceData.breakStartTime}` : null,
        breakEndTime: manualAttendanceData.breakEndTime ? `${manualAttendanceData.date}T${manualAttendanceData.breakEndTime}` : null,
        status: manualAttendanceData.status,
        remarks: manualAttendanceData.remarks,
        totalHours: totalHours,
        isCheckedIn: !!manualAttendanceData.checkInTime && !manualAttendanceData.checkOutTime,
        supervisorId: currentSupervisor.supervisorId
      });

      const data = response.data;
      
      if (data.success) {
        toast.success("Attendance recorded successfully!");
        setManualAttendanceDialogOpen(false);
        // Force refresh attendance records
        await loadAttendanceRecords(selectedDate);
      } else {
        toast.error(data.message || "Error recording attendance");
      }
    } catch (error) {
      console.error('Error recording attendance:', error);
      toast.error("Error recording attendance");
    }
  };

  // Fixed: Handle status update - now properly updates state and forces refresh
  const handleStatusUpdate = (employee: Employee, attendanceRecord: AttendanceRecord | null) => {
    console.log('Opening status update dialog for:', employee.name, 'Record:', attendanceRecord);
    setSelectedEmployeeForStatusUpdate(employee);
    setSelectedAttendanceForStatusUpdate(attendanceRecord);
    setStatusUpdateData({
      employeeId: employee._id,
      employeeName: employee.name,
      attendanceId: attendanceRecord?._id || '',
      currentStatus: attendanceRecord?.status || 'absent',
      newStatus: (attendanceRecord?.status as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off') || 'present',
      date: selectedDate,
      remarks: attendanceRecord?.remarks || ''
    });
    setStatusUpdateDialogOpen(true);
  };

  // Fixed: Submit status update - now properly updates attendance records and UI
  const submitStatusUpdate = async () => {
    if (!selectedEmployeeForStatusUpdate) return;

    try {
      setUpdatingStatus(true);
      
      console.log('🔄 Updating attendance status:', {
        employeeId: statusUpdateData.employeeId,
        attendanceId: statusUpdateData.attendanceId,
        date: statusUpdateData.date,
        newStatus: statusUpdateData.newStatus,
        remarks: statusUpdateData.remarks,
        supervisorId: currentSupervisor.supervisorId
      });

      // Make API call to update status
      const response = await axios.post(`${API_URL}/attendance/update-status`, {
        employeeId: statusUpdateData.employeeId,
        attendanceId: statusUpdateData.attendanceId || null,
        date: statusUpdateData.date,
        status: statusUpdateData.newStatus,
        remarks: statusUpdateData.remarks,
        supervisorId: currentSupervisor.supervisorId,
        employeeName: selectedEmployeeForStatusUpdate.name
      });

      const data = response.data;
      
      if (data.success) {
        toast.success(`Status updated to ${statusUpdateData.newStatus.replace('-', ' ')} for ${selectedEmployeeForStatusUpdate.name}`);
        setStatusUpdateDialogOpen(false);
        
        // CRITICAL FIX: Immediately update local attendance records to reflect the change
        // This ensures the UI updates instantly without waiting for API refresh
        const newRecord: AttendanceRecord = {
          _id: data.data?._id || `temp-${Date.now()}`,
          employeeId: statusUpdateData.employeeId,
          employeeName: selectedEmployeeForStatusUpdate.name,
          date: statusUpdateData.date,
          checkInTime: data.data?.checkInTime || null,
          checkOutTime: data.data?.checkOutTime || null,
          breakStartTime: data.data?.breakStartTime || null,
          breakEndTime: data.data?.breakEndTime || null,
          totalHours: data.data?.totalHours || 0,
          breakTime: data.data?.breakTime || 0,
          status: statusUpdateData.newStatus,
          isCheckedIn: data.data?.isCheckedIn || false,
          isOnBreak: data.data?.isOnBreak || false,
          supervisorId: currentSupervisor.supervisorId,
          remarks: statusUpdateData.remarks
        };

        setAttendanceRecords(prevRecords => {
          // Check if we already have a record for this employee on this date
          const existingRecordIndex = prevRecords.findIndex(
            r => r.employeeId === statusUpdateData.employeeId && r.date === statusUpdateData.date
          );
          
          if (existingRecordIndex >= 0) {
            // Update existing record
            const updatedRecords = [...prevRecords];
            updatedRecords[existingRecordIndex] = {
              ...updatedRecords[existingRecordIndex],
              ...newRecord
            };
            return updatedRecords;
          } else {
            // Add new record
            return [...prevRecords, newRecord];
          }
        });

        // Also update the summary counts
        setSummary(prevSummary => {
          // If this was an existing record, adjust counts
          if (selectedAttendanceForStatusUpdate) {
            const oldStatus = selectedAttendanceForStatusUpdate.status;
            const newStatus = statusUpdateData.newStatus;
            
            // Create a new summary object with adjusted counts
            const newSummary = { ...prevSummary };
            
            // Decrement old status
            if (oldStatus === 'present') newSummary.presentCount--;
            else if (oldStatus === 'absent') newSummary.absentCount--;
            else if (oldStatus === 'half-day') newSummary.halfDayCount--;
            else if (oldStatus === 'leave') newSummary.leaveCount--;
            else if (oldStatus === 'weekly-off') newSummary.weeklyOffCount--;
            
            // Increment new status
            if (newStatus === 'present') newSummary.presentCount++;
            else if (newStatus === 'absent') newSummary.absentCount++;
            else if (newStatus === 'half-day') newSummary.halfDayCount++;
            else if (newStatus === 'leave') newSummary.leaveCount++;
            else if (newStatus === 'weekly-off') newSummary.weeklyOffCount++;
            
            return newSummary;
          } else {
            // This is a new record
            const newSummary = { ...prevSummary };
            
            // Increment new status
            if (statusUpdateData.newStatus === 'present') newSummary.presentCount++;
            else if (statusUpdateData.newStatus === 'absent') newSummary.absentCount++;
            else if (statusUpdateData.newStatus === 'half-day') newSummary.halfDayCount++;
            else if (statusUpdateData.newStatus === 'leave') newSummary.leaveCount++;
            else if (statusUpdateData.newStatus === 'weekly-off') newSummary.weeklyOffCount++;
            
            return newSummary;
          }
        });

        // Force refresh attendance records from API to ensure consistency
        await loadAttendanceRecords(selectedDate);
        
        // Also refresh weekly summaries
        const weekDates = getWeekDates(selectedYear, selectedMonth, selectedWeek);
        const weekStart = formatDate(weekDates[0]);
        const weekEnd = formatDate(weekDates[6]);
        await loadWeeklySummaries(weekStart, weekEnd);
        
        console.log('✅ Status update successful:', data);
      } else {
        console.error('Status update failed:', data.message);
        toast.error(data.message || "Error updating status");
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      
      // More detailed error handling
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
        if (error.response.status === 404) {
          toast.error("Status update API endpoint not found. Please check backend configuration.");
        } else if (error.response.status === 500) {
          toast.error(`Server error: ${error.response.data.message || "Internal server error"}`);
        } else {
          toast.error(`Error: ${error.response.data.message || "Failed to update status"}`);
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        toast.error("No response from server. Please check if backend is running.");
      } else {
        console.error('Error message:', error.message);
        toast.error(`Error: ${error.message}`);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleEmployeeCheckIn = async (employee: Employee) => {
    try {
      const response = await axios.post(`${API_URL}/attendance/checkin`, {
        employeeId: employee._id,
        employeeName: employee.name,
        supervisorId: currentSupervisor.supervisorId,
      });

      const data = response.data;
      
      if (data.success) {
        toast.success(`${employee.name} checked in successfully!`);
        await loadAttendanceRecords(selectedDate);
      } else {
        toast.error(data.message || "Error checking in");
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error("Error checking in");
    }
  };

  const handleEmployeeCheckOut = async (employee: Employee) => {
    try {
      const response = await axios.post(`${API_URL}/attendance/checkout`, {
        employeeId: employee._id,
      });

      const data = response.data;
      
      if (data.success) {
        toast.success(`${employee.name} checked out successfully!`);
        await loadAttendanceRecords(selectedDate);
      } else {
        toast.error(data.message || "Error checking out");
      }
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error("Error checking out");
    }
  };

  const handleEmployeeBreakIn = async (employee: Employee) => {
    try {
      const response = await axios.post(`${API_URL}/attendance/breakin`, {
        employeeId: employee._id,
      });

      const data = response.data;
      
      if (data.success) {
        toast.success(`${employee.name} break started!`);
        await loadAttendanceRecords(selectedDate);
      } else {
        toast.error(data.message || "Error starting break");
      }
    } catch (error) {
      console.error('Break-in error:', error);
      toast.error("Error starting break");
    }
  };

  const handleEmployeeBreakOut = async (employee: Employee) => {
    try {
      const response = await axios.post(`${API_URL}/attendance/breakout`, {
        employeeId: employee._id,
      });

      const data = response.data;
      
      if (data.success) {
        toast.success(`${employee.name} break ended!`);
        await loadAttendanceRecords(selectedDate);
      } else {
        toast.error(data.message || "Error ending break");
      }
    } catch (error) {
      console.error('Break-out error:', error);
      toast.error("Error ending break");
    }
  };

  const handlePreviousWeek = () => {
    if (selectedWeek > 1) {
      setSelectedWeek(selectedWeek - 1);
    } else {
      if (selectedMonth > 0) {
        setSelectedMonth(selectedMonth - 1);
        setSelectedWeek(5);
      } else {
        setSelectedYear(selectedYear - 1);
        setSelectedMonth(11);
        setSelectedWeek(5);
      }
    }
  };

  const handleNextWeek = () => {
    if (selectedWeek < 5) {
      setSelectedWeek(selectedWeek + 1);
    } else {
      if (selectedMonth < 11) {
        setSelectedMonth(selectedMonth + 1);
        setSelectedWeek(1);
      } else {
        setSelectedYear(selectedYear + 1);
        setSelectedMonth(0);
        setSelectedWeek(1);
      }
    }
  };

  const handleRefresh = async () => {
    toast.info("Refreshing data...");
    
    // Refresh current supervisor info
    if (currentUser) {
      setCurrentSupervisor({
        id: currentUser._id || currentUser.id || '',
        name: currentUser.name || 'Supervisor',
        supervisorId: currentUser._id || currentUser.id || '',
        email: currentUser.email || ''
      });
    }
    
    // Refresh data
    await fetchAllSites();
    await fetchEmployees();
    await loadSupervisorAttendance();
    await loadAttendanceRecords(selectedDate);
    
    // Also refresh weekly data
    const weekDates = getWeekDates(selectedYear, selectedMonth, selectedWeek);
    const weekStart = formatDate(weekDates[0]);
    const weekEnd = formatDate(weekDates[6]);
    await loadWeeklySummaries(weekStart, weekEnd);
    
    toast.success("Attendance data refreshed!");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSiteFilter("all");
    setSelectedDepartment("all");
  };

  const departments = Array.from(new Set(employees.map(emp => emp.department))).filter(Boolean);
  const siteOptions = Array.from(new Set(employees.map(emp => emp.siteName))).filter(Boolean);

  const sortedAttendanceData = [...supervisorAttendance].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const weekDates = getWeekDates(selectedYear, selectedMonth, selectedWeek);

  // Load weekly summaries when week changes
  useEffect(() => {
    if (employees.length > 0) {
      const weekDates = getWeekDates(selectedYear, selectedMonth, selectedWeek);
      const weekStart = formatDate(weekDates[0]);
      const weekEnd = formatDate(weekDates[6]);
      loadWeeklySummaries(weekStart, weekEnd);
    }
  }, [selectedYear, selectedMonth, selectedWeek, employees]);

  // Check if user is a supervisor
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Please login to access this page</p>
        </div>
      </div>
    );
  }

  if (currentUser.role !== "supervisor") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-4">This page is only accessible to supervisors</p>
          <div className="space-y-2">
            <Badge variant="outline" className="text-lg capitalize">
              Your role: {currentUser.role}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  if (loadingSupervisor && activeTab === "my-attendance") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Attendance Management" 
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 md:p-6 space-y-4 md:space-y-6"
      >
        {/* Supervisor Info Card */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="truncate">{currentSupervisor.name}</span>
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="default" className="text-xs md:text-sm capitalize">
                    <Crown className="h-3 w-3 mr-1" />
                    {currentUser.role}
                  </Badge>
                  {supervisorSites.length > 0 ? (
                    <Badge variant="outline" className="text-xs md:text-sm max-w-full">
                      <Building className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        Task-Assigned Sites: {supervisorSites.length}
                      </span>
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs md:text-sm">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      No Task-Assigned Sites
                    </Badge>
                  )}
                  {currentSupervisor.email && (
                    <Badge variant="outline" className="text-xs md:text-sm max-w-full">
                      <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{currentSupervisor.email}</span>
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size={isMobileView ? "sm" : "default"}
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-xs"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    {!isMobileView && "Debug"}
                  </Button>
                  <Button
                    variant="outline"
                    size={isMobileView ? "sm" : "default"}
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-xs"
                  >
                    <Filter className="h-3 w-3 mr-1" />
                    {!isMobileView && "Filters"}
                  </Button>
                  <Button
                    variant="outline"
                    size={isMobileView ? "sm" : "default"}
                    onClick={handleRefresh}
                    disabled={loadingEmployees || loadingAttendance}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loadingEmployees ? 'animate-spin' : ''}`} />
                    {!isMobileView && "Refresh"}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {filteredEmployees.length} employees • {supervisorSites.length} task-assigned site(s)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        {showDebug && debugInfo && (
          <Card className="bg-black/5 border-muted">
            <CardContent className="p-4 md:p-6">
              <h4 className="font-semibold mb-2">Debug Information</h4>
              <pre className="text-xs bg-black/10 p-3 md:p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Task-Assigned Sites Info */}
        {supervisorSites.length > 0 ? (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold">Sites from Your Task Assignments</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    You have tasks assigned at these sites. Showing employees from these sites only.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {supervisorSites.map(site => (
                      <Badge key={site._id} variant="outline" className="bg-white text-xs">
                        {site.name}
                        {site.clientName && <span className="ml-1 text-muted-foreground hidden sm:inline">({site.clientName})</span>}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-800">No Task-Assigned Sites Found</h4>
                  <p className="text-sm text-yellow-700">
                    You don't have any tasks assigned to you yet. No employees will be shown until you are assigned to tasks.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Site</label>
                  <Select value={selectedSiteFilter} onValueChange={setSelectedSiteFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sites" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sites</SelectItem>
                      {siteOptions.map(site => (
                        <SelectItem key={site} value={site} className="truncate">
                          {site}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {apiError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">Note</p>
              <p className="text-sm text-yellow-700">{apiError}</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto">
            <TabsTrigger value="my-attendance" className="text-sm md:text-base py-2">
              <Crown className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">My Attendance</span>
              <span className="xs:hidden">Mine</span>
            </TabsTrigger>
            <TabsTrigger value="employee-attendance" className="text-sm md:text-base py-2">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Team Attendance</span>
              <span className="xs:hidden">Team</span>
            </TabsTrigger>
            <TabsTrigger value="weekly-register" className="text-sm md:text-base py-2">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Weekly Register</span>
              <span className="xs:hidden">Weekly</span>
            </TabsTrigger>
          </TabsList>

          {/* My Attendance Tab - Shows ONLY current supervisor's data */}
          <TabsContent value="my-attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Today's Actions - {currentSupervisor.name}
                </CardTitle>
                <CardDescription>
                  Check in/out and manage breaks for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Current Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Check In Status</p>
                        <p className={`text-xl font-bold ${currentStatus?.isCheckedIn ? 'text-green-600' : 'text-red-600'}`}>
                          {currentStatus?.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Break Status</p>
                        <p className={`text-xl font-bold ${currentStatus?.isOnBreak ? 'text-yellow-600' : 'text-blue-600'}`}>
                          {currentStatus?.isOnBreak ? 'On Break' : 'Not on Break'}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Check In Time</p>
                        <p className="text-xl font-bold">
                          {currentStatus?.checkInTime ? formatTimeForDisplay(currentStatus.checkInTime) : '--:--'}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Hours</p>
                        <p className="text-xl font-bold">
                          {currentStatus?.totalHours ? currentStatus.totalHours.toFixed(2) : '0.00'} hrs
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={handleCheckIn}
                        disabled={currentStatus?.isCheckedIn}
                        className="h-12"
                        size={isMobileView ? "sm" : "default"}
                      >
                        <LogIn className="mr-2 h-5 w-5" />
                        {!isMobileView && "Check In"}
                        {isMobileView && "In"}
                      </Button>
                      <Button 
                        onClick={handleCheckOut}
                        disabled={!currentStatus?.isCheckedIn}
                        variant="outline"
                        className="h-12"
                        size={isMobileView ? "sm" : "default"}
                      >
                        <LogOut className="mr-2 h-5 w-5" />
                        {!isMobileView && "Check Out"}
                        {isMobileView && "Out"}
                      </Button>
                      <Button 
                        onClick={handleBreakIn}
                        disabled={!currentStatus?.isCheckedIn || currentStatus?.isOnBreak}
                        variant="secondary"
                        className="h-12"
                        size={isMobileView ? "sm" : "default"}
                      >
                        <Clock className="mr-2 h-5 w-5" />
                        {!isMobileView && "Start Break"}
                        {isMobileView && "Break"}
                      </Button>
                      <Button 
                        onClick={handleBreakOut}
                        disabled={!currentStatus?.isOnBreak}
                        variant="secondary"
                        className="h-12"
                        size={isMobileView ? "sm" : "default"}
                      >
                        <Clock className="mr-2 h-5 w-5" />
                        {!isMobileView && "End Break"}
                        {isMobileView && "End"}
                      </Button>
                    </div>
                    <div className="pt-4">
                      <Button 
                        onClick={handleRefresh}
                        variant="outline"
                        className="w-full"
                        size={isMobileView ? "sm" : "default"}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Status
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <div>
                    <CardTitle>My Attendance History</CardTitle>
                    <CardDescription>
                      Your personal attendance records
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleRefresh}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Data exported!")}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> Showing only your attendance records. You are viewing: <strong>{currentSupervisor.name}</strong>
                  </p>
                </div>
                
                {isMobileView ? (
                  <div className="space-y-3">
                    {sortedAttendanceData.map((record) => (
                      <MobileSupervisorAttendanceCard
                        key={record.id}
                        record={record}
                        formatTimeForDisplay={formatTimeForDisplay}
                        getStatusBadge={getStatusBadge}
                      />
                    ))}
                    
                    {sortedAttendanceData.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No attendance records found for you.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Break In</TableHead>
                          <TableHead>Break Out</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="text-right">Break Time</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedAttendanceData.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium whitespace-nowrap">{record.date}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 whitespace-nowrap">
                                {record.shift}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <LogIn className="h-4 w-4 text-muted-foreground" />
                                {record.checkInTime || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <LogOut className="h-4 w-4 text-muted-foreground" />
                                {record.checkOutTime || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {record.breakStartTime || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {record.breakEndTime || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium whitespace-nowrap">
                              {record.hours.toFixed(2)} hrs
                            </TableCell>
                            <TableCell className="text-right font-medium whitespace-nowrap">
                              {record.breakTime.toFixed(2)} hrs
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusBadge(record.status.toLowerCase())} whitespace-nowrap`}>
                                {record.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {sortedAttendanceData.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              No attendance records found for you.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employee Attendance Tab - Using summary state for counts */}
          <TabsContent value="employee-attendance" className="space-y-6">
            {/* Main Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {/* Total Employees Card */}
              <Card>
                <CardHeader className="p-3 md:p-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Total Employees</CardTitle>
                  <CardContent className="p-0 pt-2">
                    <div className="text-xl md:text-2xl font-bold">{summary.totalEmployees}</div>
                    <p className="text-xs text-muted-foreground">From task-assigned sites</p>
                  </CardContent>
                </CardHeader>
              </Card>

              {/* Present Card - Clickable like SupervisorDashboard */}
              <motion.div
                whileHover={summary.presentCount > 0 ? { scale: 1.02 } : {}}
                whileTap={summary.presentCount > 0 ? { scale: 0.98 } : {}}
                className={summary.presentCount > 0 ? "cursor-pointer" : "cursor-default opacity-75"}
                onClick={() => {
                  if (summary.presentCount > 0) {
                    toast.info(`Showing ${summary.presentCount} present employees`);
                  }
                }}
              >
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow">
                  <CardHeader className="p-3 md:p-6">
                    <CardTitle className="text-xs md:text-sm font-medium text-green-800 dark:text-green-300">Present Today</CardTitle>
                    <CardContent className="p-0 pt-2">
                      <div className="text-xl md:text-2xl font-bold text-green-600">{summary.presentCount}</div>
                      <p className="text-xs text-green-700 dark:text-green-500">
                        {summary.totalEmployees > 0 ? Math.round((summary.presentCount / summary.totalEmployees) * 100) : 0}% of total
                      </p>
                    </CardContent>
                  </CardHeader>
                </Card>
              </motion.div>

              {/* Absent Card - Clickable like SupervisorDashboard */}
              <motion.div
                whileHover={summary.absentCount > 0 ? { scale: 1.02 } : {}}
                whileTap={summary.absentCount > 0 ? { scale: 0.98 } : {}}
                className={summary.absentCount > 0 ? "cursor-pointer" : "cursor-default opacity-75"}
                onClick={() => {
                  if (summary.absentCount > 0) {
                    toast.info(`Showing ${summary.absentCount} absent employees`);
                  }
                }}
              >
                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:shadow-lg transition-shadow">
                  <CardHeader className="p-3 md:p-6">
                    <CardTitle className="text-xs md:text-sm font-medium text-red-800 dark:text-red-300">Absent Today</CardTitle>
                    <CardContent className="p-0 pt-2">
                      <div className="text-xl md:text-2xl font-bold text-red-600">{summary.absentCount}</div>
                      <p className="text-xs text-red-700 dark:text-red-500">
                        {summary.totalEmployees > 0 ? Math.round((summary.absentCount / summary.totalEmployees) * 100) : 0}% of total
                      </p>
                    </CardContent>
                  </CardHeader>
                </Card>
              </motion.div>

              {/* Attendance Rate Card */}
              <Card>
                <CardHeader className="p-3 md:p-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Attendance Rate</CardTitle>
                  <CardContent className="p-0 pt-2">
                    <div className="text-xl md:text-2xl font-bold text-blue-600">
                      {summary.totalEmployees > 0 ? Math.round((summary.presentCount / summary.totalEmployees) * 100) : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Overall rate</p>
                  </CardContent>
                </CardHeader>
              </Card>
            </div>

            {/* Additional Stats - Half Day, Leave, Weekly Off (Same as SupervisorDashboard) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {/* Half Day Card */}
              <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Half Day Today</p>
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.halfDayCount}</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
                        {summary.totalEmployees > 0 ? Math.round((summary.halfDayCount / summary.totalEmployees) * 100) : 0}% of total
                      </p>
                    </div>
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-full">
                      <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* On Leave Card */}
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">On Leave Today</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.leaveCount}</p>
                      <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                        {summary.totalEmployees > 0 ? Math.round((summary.leaveCount / summary.totalEmployees) * 100) : 0}% of total
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                      <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Off Card */}
              <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Weekly Off Today</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.weeklyOffCount}</p>
                      <p className="text-xs text-purple-700 dark:text-purple-500 mt-1">
                        {summary.totalEmployees > 0 ? Math.round((summary.weeklyOffCount / summary.totalEmployees) * 100) : 0}% of total
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-full">
                      <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Footer - Same as SupervisorDashboard */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
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
                      <span className="text-sm">Leave: {summary.leaveCount}</span>
                    </div>
                    <div className="flex items-center ml-4">
                      <Clock className="h-4 w-4 text-yellow-600 mr-1" />
                      <span className="text-sm">Half Day: {summary.halfDayCount}</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Attendance Table Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    <div>
                      <CardTitle>Team Attendance - {selectedDate}</CardTitle>
                      <CardDescription>Manage attendance for team employees</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="attendance-date" className="text-sm whitespace-nowrap">Date:</Label>
                      <Input
                        id="attendance-date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-32 sm:w-40"
                      />
                    </div>
                    <Button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} size={isMobileView ? "sm" : "default"}>
                      Today
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingEmployees || loadingAttendance ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading data...</span>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-8 md:py-12">
                    <Users className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm md:text-base text-muted-foreground">No employees found for your task-assigned sites</p>
                    {supervisorSites.length > 0 ? (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">Your task-assigned sites:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {supervisorSites.map(site => (
                            <Badge key={site._id} variant="outline" className="text-xs">
                              {site.name}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          No employees are currently assigned to these sites.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground">You don't have any sites assigned through tasks.</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Please contact your administrator to assign you to tasks.
                        </p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      className="mt-4"
                      size={isMobileView ? "sm" : "default"}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                ) : (
                  <>
                    {isMobileView ? (
                      <div className="space-y-4">
                        {filteredEmployees.map((employee) => {
                          const attendanceRecord = getEmployeeAttendanceRecord(employee._id);
                          return (
                            <MobileEmployeeAttendanceCard
                              key={employee._id}
                              employee={employee}
                              attendanceRecord={attendanceRecord}
                              onCheckIn={handleEmployeeCheckIn}
                              onCheckOut={handleEmployeeCheckOut}
                              onBreakIn={handleEmployeeBreakIn}
                              onBreakOut={handleEmployeeBreakOut}
                              onManual={handleManualAttendance}
                              onStatusUpdate={handleStatusUpdate}
                              formatTimeForDisplay={formatTimeForDisplay}
                              formatHours={formatHours}
                              getStatusBadge={getStatusBadge}
                              getStatusIcon={getStatusIcon}
                              supervisorSites={supervisorSites}
                              updatingStatus={updatingStatus}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="whitespace-nowrap">Employee</TableHead>
                                <TableHead className="whitespace-nowrap">Department</TableHead>
                                <TableHead className="whitespace-nowrap">Site</TableHead>
                                <TableHead className="whitespace-nowrap">Check In</TableHead>
                                <TableHead className="whitespace-nowrap">Check Out</TableHead>
                                <TableHead className="whitespace-nowrap">Break In</TableHead>
                                <TableHead className="whitespace-nowrap">Break Out</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Hours</TableHead>
                                <TableHead className="whitespace-nowrap">Status</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredEmployees.map((employee) => {
                                const attendanceRecord = getEmployeeAttendanceRecord(employee._id);
                                
                                return (
                                  <TableRow key={employee._id}>
                                    <TableCell>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{employee.name}</span>
                                        <span className="text-sm text-muted-foreground">{employee.employeeId}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{employee.department}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="max-w-[150px] truncate">
                                        {employee.siteName || 'Not Assigned'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {attendanceRecord?.checkInTime ? (
                                        <div className="flex items-center gap-2">
                                          <LogIn className="h-4 w-4 text-muted-foreground" />
                                          {formatTimeForDisplay(attendanceRecord.checkInTime)}
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {attendanceRecord?.checkOutTime ? (
                                        <div className="flex items-center gap-2">
                                          <LogOut className="h-4 w-4 text-muted-foreground" />
                                          {formatTimeForDisplay(attendanceRecord.checkOutTime)}
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {attendanceRecord?.breakStartTime ? (
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4 text-muted-foreground" />
                                          {formatTimeForDisplay(attendanceRecord.breakStartTime)}
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {attendanceRecord?.breakEndTime ? (
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4 text-muted-foreground" />
                                          {formatTimeForDisplay(attendanceRecord.breakEndTime)}
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right font-medium whitespace-nowrap">
                                      {attendanceRecord?.totalHours ? formatHours(attendanceRecord.totalHours) : "-"}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {attendanceRecord ? (
                                          <Badge className={getStatusBadge(attendanceRecord.status)}>
                                            {getStatusIcon(attendanceRecord.status)}
                                            {attendanceRecord.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline">No Record</Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        {attendanceRecord?.isCheckedIn ? (
                                          <>
                                            {attendanceRecord.isOnBreak ? (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEmployeeBreakOut(employee)}
                                                className="whitespace-nowrap"
                                              >
                                                End Break
                                              </Button>
                                            ) : (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEmployeeBreakIn(employee)}
                                                className="whitespace-nowrap"
                                              >
                                                Start Break
                                              </Button>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleEmployeeCheckOut(employee)}
                                              className="whitespace-nowrap"
                                            >
                                              Check Out
                                            </Button>
                                          </>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEmployeeCheckIn(employee)}
                                            disabled={!!attendanceRecord?.checkOutTime}
                                            className="whitespace-nowrap"
                                          >
                                            Check In
                                          </Button>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleManualAttendance(employee)}
                                          className="whitespace-nowrap"
                                        >
                                          <FileText className="h-4 w-4 mr-1" />
                                          Manual
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Register Tab */}
          <TabsContent value="weekly-register" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Weekly Attendance Register</CardTitle>
                    <CardDescription>Team-wise weekly attendance summary</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-center min-w-[200px]">
                        <div className="font-medium text-sm md:text-base">
                          Week {selectedWeek}, {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleNextWeek}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => toast.success("Report exported!")} size={isMobileView ? "sm" : "default"}>
                        <Download className="mr-2 h-4 w-4" />
                        {!isMobileView && "Export Report"}
                        {isMobileView && "Export"}
                      </Button>
                      <Button variant="outline" onClick={handleRefresh} size={isMobileView ? "sm" : "default"}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {!isMobileView && "Refresh"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Present (P)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600">
                      <XCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Absent (A)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Half Day (HD)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Leave (L)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Weekly Off (WO)</span>
                  </div>
                </div>

                {loadingWeekly ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading weekly attendance data...</span>
                  </div>
                ) : (
                  <>
                    {isMobileView ? (
                      <div className="space-y-4">
                        {weeklySummaries.length > 0 ? (
                          weeklySummaries.map((summary) => (
                            <MobileWeeklySummaryCard
                              key={summary.employeeId}
                              summary={summary}
                              getStatusBadge={getStatusBadge}
                              getStatusIcon={getStatusIcon}
                            />
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No weekly attendance data available.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="whitespace-nowrap">Employee</TableHead>
                                <TableHead className="whitespace-nowrap">Employee ID</TableHead>
                                <TableHead className="whitespace-nowrap">Department</TableHead>
                                <TableHead className="whitespace-nowrap">Present</TableHead>
                                <TableHead className="whitespace-nowrap">Absent</TableHead>
                                <TableHead className="whitespace-nowrap">Half Day</TableHead>
                                <TableHead className="whitespace-nowrap">Leave</TableHead>
                                <TableHead className="whitespace-nowrap">Weekly Off</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Total Hours</TableHead>
                                <TableHead className="whitespace-nowrap">Overall Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {weeklySummaries.length > 0 ? (
                                weeklySummaries.map((summary) => (
                                  <TableRow key={summary.employeeId}>
                                    <TableCell className="font-medium whitespace-nowrap">
                                      {summary.employeeName}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <span className="text-sm text-muted-foreground">{summary.employeeId}</span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{summary.department}</TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <div className="text-green-600 font-medium">{summary.daysPresent}</div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <div className="text-red-600 font-medium">{summary.daysAbsent}</div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <div className="text-yellow-600 font-medium">{summary.daysHalfDay}</div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <div className="text-blue-600 font-medium">{summary.daysLeave}</div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <div className="text-purple-600 font-medium">{summary.daysWeeklyOff}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium whitespace-nowrap">
                                      {summary.totalHours.toFixed(2)} hrs
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <Badge className={getStatusBadge(summary.overallStatus)}>
                                        {getStatusIcon(summary.overallStatus)}
                                        {summary.overallStatus.charAt(0).toUpperCase() + summary.overallStatus.slice(1)}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                    No weekly attendance data available.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
                      <Card>
                        <CardHeader className="pb-2 p-3 md:p-6">
                          <CardTitle className="text-xs md:text-sm font-medium">Weekly Present Rate</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 md:p-6 pt-0">
                          <div className="text-lg md:text-2xl font-bold text-green-600">
                            {(() => {
                              const totalDays = weeklySummaries.reduce((sum, s) => sum + s.daysPresent + s.daysAbsent + s.daysHalfDay + s.daysLeave + s.daysWeeklyOff, 0);
                              const presentDays = weeklySummaries.reduce((sum, s) => sum + s.daysPresent, 0);
                              return totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
                            })()}%
                          </div>
                          <div className="text-xs text-muted-foreground">Average attendance rate</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2 p-3 md:p-6">
                          <CardTitle className="text-xs md:text-sm font-medium">Best Attendance</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 md:p-6 pt-0">
                          <div className="text-lg md:text-2xl font-bold">
                            {(() => {
                              const bestEmp = weeklySummaries.reduce((best, emp) => 
                                emp.daysPresent > best.daysPresent ? emp : best
                              , weeklySummaries[0] || { daysPresent: 0, employeeName: 'N/A' });
                              return `${bestEmp.daysPresent}/7`;
                            })()}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {weeklySummaries.reduce((best, emp) => 
                              emp.daysPresent > best.daysPresent ? emp : best
                            , weeklySummaries[0] || { daysPresent: 0, employeeName: 'N/A' }).employeeName || "N/A"}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2 p-3 md:p-6">
                          <CardTitle className="text-xs md:text-sm font-medium">Total Working Hours</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 md:p-6 pt-0">
                          <div className="text-lg md:text-2xl font-bold">
                            {weeklySummaries.reduce((sum, emp) => sum + emp.totalHours, 0).toFixed(2)} hrs
                          </div>
                          <div className="text-xs text-muted-foreground">Weekly total</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2 p-3 md:p-6">
                          <CardTitle className="text-xs md:text-sm font-medium">Full Attendance</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 md:p-6 pt-0">
                          <div className="text-lg md:text-2xl font-bold">
                            {weeklySummaries.filter(emp => emp.daysPresent === 7).length}
                          </div>
                          <div className="text-xs text-muted-foreground">Employees with 7/7</div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Manual Attendance Dialog */}
      <Dialog open={manualAttendanceDialogOpen} onOpenChange={setManualAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manual Attendance Entry</DialogTitle>
            <DialogDescription>
              Record attendance for {selectedEmployeeForManual?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-date">Date</Label>
              <Input
                id="manual-date"
                type="date"
                value={manualAttendanceData.date}
                onChange={(e) => setManualAttendanceData({...manualAttendanceData, date: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="check-in-time">Check In Time</Label>
                <Input
                  id="check-in-time"
                  type="time"
                  value={manualAttendanceData.checkInTime}
                  onChange={(e) => setManualAttendanceData({...manualAttendanceData, checkInTime: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="check-out-time">Check Out Time</Label>
                <Input
                  id="check-out-time"
                  type="time"
                  value={manualAttendanceData.checkOutTime}
                  onChange={(e) => setManualAttendanceData({...manualAttendanceData, checkOutTime: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="break-start-time">Break Start</Label>
                <Input
                  id="break-start-time"
                  type="time"
                  value={manualAttendanceData.breakStartTime}
                  onChange={(e) => setManualAttendanceData({...manualAttendanceData, breakStartTime: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="break-end-time">Break End</Label>
                <Input
                  id="break-end-time"
                  type="time"
                  value={manualAttendanceData.breakEndTime}
                  onChange={(e) => setManualAttendanceData({...manualAttendanceData, breakEndTime: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={manualAttendanceData.status}
                onValueChange={(value: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off') => 
                  setManualAttendanceData({...manualAttendanceData, status: value})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                  <SelectItem value="weekly-off">Weekly Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={manualAttendanceData.remarks}
                onChange={(e) => setManualAttendanceData({...manualAttendanceData, remarks: e.target.value})}
                placeholder="Enter any remarks or notes..."
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setManualAttendanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitManualAttendance}>
              Save Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusUpdateDialogOpen} onOpenChange={setStatusUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Attendance Status</DialogTitle>
            <DialogDescription>
              Update status for {selectedEmployeeForStatusUpdate?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={statusUpdateData.date}
                onChange={(e) => setStatusUpdateData({...statusUpdateData, date: e.target.value})}
              />
            </div>
            
            <div>
              <Label>Current Status</Label>
              <div className="p-2 border rounded-md bg-gray-50">
                <Badge className={getStatusBadge(statusUpdateData.currentStatus)}>
                  {getStatusIcon(statusUpdateData.currentStatus)}
                  {statusUpdateData.currentStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label htmlFor="new-status">New Status</Label>
              <Select
                value={statusUpdateData.newStatus}
                onValueChange={(value: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off') => 
                  setStatusUpdateData({...statusUpdateData, newStatus: value})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      Present
                    </div>
                  </SelectItem>
                  <SelectItem value="absent">
                    <div className="flex items-center">
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      Absent
                    </div>
                  </SelectItem>
                  <SelectItem value="half-day">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                      Half Day
                    </div>
                  </SelectItem>
                  <SelectItem value="leave">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                      Leave
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly-off">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-purple-600" />
                      Weekly Off
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status-remarks">Remarks</Label>
              <Textarea
                id="status-remarks"
                value={statusUpdateData.remarks}
                onChange={(e) => setStatusUpdateData({...statusUpdateData, remarks: e.target.value})}
                placeholder="Enter reason for status update..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setStatusUpdateDialogOpen(false)} disabled={updatingStatus}>
              Cancel
            </Button>
            <Button onClick={submitStatusUpdate} disabled={updatingStatus}>
              {updatingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;