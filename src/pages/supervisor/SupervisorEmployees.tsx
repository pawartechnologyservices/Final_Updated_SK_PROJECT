import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useRole } from "@/context/RoleContext";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Users, 
  UserPlus, 
  UserMinus ,
  Loader2, 
  AlertCircle, 
  Building,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  UserCheck,
  UserX,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  User,
  Upload,
  DownloadCloud,
  Target
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

// Import the comprehensive onboarding tab
import SupervisorOnboardingTab from "./SupervisorOnboardingTab";

// API URL
const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5001/api' 
  : '/api';

// Types from your backend
interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
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

interface SalaryStructure {
  id: number;
  employeeId: string;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  otherAllowances: number;
  pf: number;
  esic: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  workingDays: number;
  paidDays: number;
  lopDays: number;
}

interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  site?: string | string[];
  department?: string;
  phone?: string;
  isActive?: boolean;
}

// Schema for employee form
const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  site: z.string().min(1, "Please select a site"),
  shift: z.string().min(1, "Please select a shift"),
  department: z.string().min(1, "Please select department"),
  role: z.string().min(1, "Please enter job role"),
});

const SupervisorEmployees = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useRole();
  
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [activeTab, setActiveTab] = useState("employees");
  
  const [loading, setLoading] = useState({
    employees: false,
    sites: false,
    tasks: false,
    initial: true
  });
  
  const [sites, setSites] = useState<Site[]>([]);
  const [supervisorSites, setSupervisorSites] = useState<Site[]>([]);
  const [supervisorSiteNames, setSupervisorSiteNames] = useState<string[]>([]);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("all");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [employeeTasks, setEmployeeTasks] = useState<Map<string, Task[]>>(new Map());
  const [tasksLoading, setTasksLoading] = useState<Map<string, boolean>>(new Map());
  
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Helper function to normalize site names for comparison
  const normalizeSiteName = useCallback((siteName: string | null | undefined): string => {
    if (!siteName) return '';
    return siteName
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '');
  }, []);

  // Fetch tasks where this specific supervisor is assigned - USING YOUR TASK CONTROLLER
  const fetchSupervisorSitesFromTasks = useCallback(async () => {
    if (!currentUser) return [];
    
    try {
      setLoading(prev => ({ ...prev, tasks: true }));
      
      const supervisorId = currentUser._id || currentUser.id;
      const supervisorName = currentUser.name;
      const supervisorEmail = currentUser.email;
      
      console.log("🔍 Fetching tasks for supervisor:", {
        id: supervisorId,
        name: supervisorName,
        email: supervisorEmail
      });
      
      // Fetch all tasks from your tasks API (getAllTasks endpoint)
      const response = await axios.get(`${API_URL}/tasks`, {
        params: {
          limit: 1000 // Get many tasks
        }
      });
      
      let supervisorSiteNamesSet = new Set<string>();
      let supervisorSiteIdsSet = new Set<string>();
      let tasksWithSupervisor: Task[] = [];
      
      // Handle response format - your controller returns array directly or {success, data}
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
      
      // Filter tasks where this supervisor is assigned in assignedUsers array
      allTasks.forEach((task: Task) => {
        let isAssignedToThisSupervisor = false;
        
        // Check assignedUsers array (your controller uses this format)
        if (task.assignedUsers && Array.isArray(task.assignedUsers)) {
          isAssignedToThisSupervisor = task.assignedUsers.some(user => {
            // Check by userId
            const userIdMatch = user.userId === supervisorId;
            // Check by name
            const nameMatch = user.name?.toLowerCase() === supervisorName?.toLowerCase();
            
            return userIdMatch || nameMatch;
          });
        }
        
        // Check single assignee (old format - fallback)
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
      
      if (tasksWithSupervisor.length > 0) {
        tasksWithSupervisor.forEach(task => {
          console.log(`   - Task: "${task.title}" at site: "${task.siteName}"`);
        });
      } else {
        console.log("⚠️ No tasks found for this supervisor");
      }
      
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
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }));
    }
  }, [currentUser]);

  // Fetch all sites and filter by supervisor's task-assigned sites
  const fetchAllSites = useCallback(async () => {
    if (!currentUser) return [];
    
    try {
      setLoading(prev => ({ ...prev, sites: true }));
      
      // First, get supervisor's sites from tasks
      const { siteNames: taskSiteNames, siteIds: taskSiteIds } = await fetchSupervisorSitesFromTasks();
      
      console.log("🌐 Fetching all sites from API...");
      
      const response = await axios.get(`${API_URL}/sites`);
      
      let allSites: Site[] = [];
      
      if (response.data) {
        // Handle different response formats
        if (response.data.success && Array.isArray(response.data.data)) {
          allSites = response.data.data;
        } else if (Array.isArray(response.data)) {
          allSites = response.data;
        } else if (response.data.sites && Array.isArray(response.data.sites)) {
          allSites = response.data.sites;
        }
      }
      
      console.log(`📊 Fetched ${allSites.length} sites from API`);
      
      // Transform sites
      const transformedSites = allSites.map((site: any) => ({
        _id: site._id || site.id,
        name: site.name,
        clientName: site.clientName || site.client,
        location: site.location || "",
        status: site.status || "active"
      }));
      
      setSites(transformedSites);
      
      // Filter sites based ONLY on task assignments
      let supervisorSiteList: Site[] = [];
      
      if (taskSiteNames.length > 0) {
        // Match sites by name from tasks
        supervisorSiteList = transformedSites.filter(site => 
          taskSiteNames.some(taskSiteName => 
            site.name === taskSiteName || 
            normalizeSiteName(site.name) === normalizeSiteName(taskSiteName)
          ) || taskSiteIds.includes(site._id)
        );
        
        console.log(`✅ Matched ${supervisorSiteList.length} sites from task assignments`);
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
      setLoading(prev => ({ ...prev, sites: false }));
    }
  }, [currentUser, fetchSupervisorSitesFromTasks, normalizeSiteName]);

  // Fetch employees from your backend API - ONLY from task-assigned sites
  const fetchEmployees = useCallback(async () => {
    if (!currentUser) {
      console.log("No current user");
      setLoading(prev => ({ ...prev, initial: false }));
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, employees: true, initial: true }));
      
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
        setLoading(prev => ({ ...prev, employees: false, initial: false }));
        
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
      
      if (response.data && response.data.success) {
        allEmployees = response.data.data || response.data.employees || [];
        
        console.log(`📊 Total employees from API: ${allEmployees.length}`);
        console.log("📍 Supervisor's task-assigned sites:", supervisorSiteNameList);
        
        // Filter employees by supervisor's task-assigned sites ONLY
        const supervisorSiteNormalizedNames = supervisorSiteNameList.map(name => normalizeSiteName(name));
        
        fetchedEmployees = allEmployees.filter((emp: Employee) => {
          const employeeSite = emp.siteName || '';
          const employeeSiteNormalized = normalizeSiteName(employeeSite);
          
          // Check if employee's site matches any of supervisor's sites from tasks
          const matchesExactName = supervisorSiteNameList.includes(employeeSite);
          const matchesNormalizedName = supervisorSiteNormalizedNames.includes(employeeSiteNormalized);
          const matchesPartial = supervisorSiteNormalizedNames.some(siteNorm => 
            employeeSiteNormalized.includes(siteNorm) || 
            siteNorm.includes(employeeSiteNormalized)
          );
          
          const matches = matchesExactName || matchesNormalizedName || matchesPartial;
          
          if (matches) {
            console.log(`✅ Employee ${emp.name} (${emp.employeeId}) matches site: ${employeeSite}`);
          }
          
          return matches;
        });
        
        console.log(`✅ Filtered ${fetchedEmployees.length} employees for supervisor's task-assigned sites`);
        
        // Log which sites have employees
        const siteCount: Record<string, number> = {};
        fetchedEmployees.forEach(emp => {
          const site = emp.siteName || 'Unknown';
          siteCount[site] = (siteCount[site] || 0) + 1;
        });
        console.log("📊 Employee distribution by site:", siteCount);
        
      } else {
        console.warn("⚠️ Unexpected API response format:", response.data);
        toast.error("Failed to fetch employees: Invalid response format");
      }
      
      setEmployees(fetchedEmployees);
      
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
    } finally {
      setLoading(prev => ({ ...prev, employees: false, initial: false }));
    }
  }, [currentUser, supervisorSites, supervisorSiteNames, fetchAllSites, normalizeSiteName]);

  // Initialize data
  useEffect(() => {
    if (currentUser && currentUser.role === "supervisor") {
      console.log("🚀 Initializing supervisor data...", {
        id: currentUser._id || currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role
      });
      fetchAllSites().then(() => {
        // After sites are loaded from tasks, fetch employees
        fetchEmployees();
      });
    }
  }, [currentUser]);

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
        emp.phone.includes(query) ||
        emp.department.toLowerCase().includes(query) ||
        emp.position.toLowerCase().includes(query)
      );
    }
    
    // Apply site filter
    if (selectedSiteFilter !== "all") {
      filtered = filtered.filter(emp => emp.siteName === selectedSiteFilter);
    }
    
    // Apply department filter
    if (selectedDepartmentFilter !== "all") {
      filtered = filtered.filter(emp => emp.department === selectedDepartmentFilter);
    }
    
    // Apply status filter
    if (selectedStatusFilter !== "all") {
      filtered = filtered.filter(emp => emp.status === selectedStatusFilter);
    }
    
    setFilteredEmployees(filtered);
  }, [employees, searchQuery, selectedSiteFilter, selectedDepartmentFilter, selectedStatusFilter]);

  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      site: "",
      shift: "Day",
      department: "",
      role: "",
    },
  });

  // Handle form submission for adding/editing employee
  const onSubmit = async (values: z.infer<typeof employeeSchema>) => {
    try {
      if (editingEmployee) {
        // Update existing employee via API
        const response = await axios.put(`${API_URL}/employees/${editingEmployee._id}`, {
          name: values.name,
          email: values.email,
          phone: values.phone,
          siteName: values.site,
          department: values.department,
          position: values.role,
          // Keep other fields unchanged
        });
        
        if (response.data.success) {
          // Update local state
          setEmployees(employees.map(e => 
            e._id === editingEmployee._id 
              ? { 
                  ...e, 
                  name: values.name, 
                  email: values.email,
                  phone: values.phone, 
                  siteName: values.site,
                  department: values.department,
                  position: values.role,
                } 
              : e
          ));
          toast.success("Employee updated successfully!");
        }
      } else {
        // Create new employee via API
        const response = await axios.post(`${API_URL}/employees`, {
          name: values.name,
          email: values.email,
          phone: values.phone,
          aadharNumber: "000000000000", // Placeholder - should be collected
          department: values.department,
          position: values.role,
          siteName: values.site,
          dateOfJoining: new Date().toISOString(),
          salary: 0,
          status: "active"
        });
        
        if (response.data.success) {
          // Add to local state
          setEmployees([response.data.employee || response.data.data, ...employees]);
          toast.success("Employee added successfully!");
        }
      }
      setDialogOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Error saving employee:", error);
      toast.error(error.response?.data?.message || "Failed to save employee");
    }
  };

  const toggleEmployeeStatus = async (id: string) => {
    try {
      const employee = employees.find(e => e._id === id);
      if (!employee) return;
      
      const newStatus = employee.status === "active" ? "inactive" : "active";
      
      const response = await axios.patch(`${API_URL}/employees/${id}/status`, {
        status: newStatus
      });
      
      if (response.data.success) {
        setEmployees(employees.map(employee =>
          employee._id === id 
            ? { ...employee, status: newStatus as "active" | "inactive" | "left" } 
            : employee
        ));
        toast.success(`Employee marked as ${newStatus}`);
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    
    try {
      const response = await axios.delete(`${API_URL}/employees/${employeeToDelete}`);
      
      if (response.data.success) {
        setEmployees(employees.filter(e => e._id !== employeeToDelete));
        toast.success("Employee deleted successfully!");
      }
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      toast.error(error.response?.data?.message || "Failed to delete employee");
    } finally {
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const toggleEmployeeExpand = (employeeId: string) => {
    if (expandedEmployee === employeeId) {
      setExpandedEmployee(null);
    } else {
      setExpandedEmployee(employeeId);
      // Fetch tasks if not already fetched
      if (!employeeTasks.has(employeeId)) {
        fetchEmployeeTasks(employeeId);
      }
    }
  };

  // Fetch tasks for a specific employee
  const fetchEmployeeTasks = async (employeeId: string) => {
    try {
      setTasksLoading(prev => new Map(prev).set(employeeId, true));
      
      const response = await axios.get(`${API_URL}/tasks`, {
        params: {
          assignedTo: employeeId,
          limit: 50
        }
      });
      
      let tasks: Task[] = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          tasks = response.data;
        } else if (response.data.success && Array.isArray(response.data.data)) {
          tasks = response.data.data;
        } else if (response.data.tasks && Array.isArray(response.data.tasks)) {
          tasks = response.data.tasks;
        }
      }
      
      setEmployeeTasks(prev => new Map(prev).set(employeeId, tasks));
    } catch (error) {
      console.error(`Error fetching tasks for employee ${employeeId}:`, error);
    } finally {
      setTasksLoading(prev => new Map(prev).set(employeeId, false));
    }
  };

  const handleRefresh = async () => {
    setLoading(prev => ({ ...prev, initial: true }));
    await fetchAllSites();
    await fetchEmployees();
  };

  const handleExportEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/employees/export`, {
        responseType: 'blob',
        params: {
          department: selectedDepartmentFilter !== 'all' ? selectedDepartmentFilter : undefined,
          status: selectedStatusFilter !== 'all' ? selectedStatusFilter : undefined,
          siteName: supervisorSiteNames.length > 0 ? supervisorSiteNames.join(',') : undefined
        }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `employees_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Employees exported successfully!");
    } catch (error: any) {
      console.error("Error exporting employees:", error);
      toast.error(error.response?.data?.message || "Failed to export employees");
    }
  };

  const getUniqueDepartments = () => {
    return Array.from(new Set(employees.map(e => e.department))).filter(Boolean);
  };

  const getUniqueSites = () => {
    return Array.from(new Set(employees.map(e => e.siteName))).filter(Boolean);
  };

  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-yellow-500 text-xs">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary" className="text-xs">Low</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="bg-blue-500 text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> In Progress</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === "active").length,
    inactive: employees.filter(e => e.status === "inactive").length,
    left: employees.filter(e => e.status === "left").length,
    sites: supervisorSites.length,
  };

  // Check if user is a supervisor
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Employee Management"
        subtitle={supervisorSites.length > 0 
          ? `Showing employees from your ${stats.sites} task-assigned site(s)`
          : "No task-assigned sites found"}
        onMenuClick={onMenuClick}
      />
      
      <div className="p-6 space-y-6">
        {/* Supervisor Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{currentUser.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="default" className="text-sm capitalize">
                    <Users className="h-3 w-3 mr-1" />
                    {currentUser.role}
                  </Badge>
                  {supervisorSites.length > 0 ? (
                    <Badge variant="outline" className="text-sm">
                      <Building className="h-3 w-3 mr-1" />
                      Task-Assigned Sites: {supervisorSites.map(s => s.name).join(', ')}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-sm">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      No Task-Assigned Sites
                    </Badge>
                  )}
                  {currentUser.email && (
                    <Badge variant="outline" className="text-sm">
                      <Mail className="h-3 w-3 mr-1" />
                      {currentUser.email}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-xs"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Debug
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportEmployees}
                    className="text-xs"
                    disabled={employees.length === 0}
                  >
                    <DownloadCloud className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading.employees || loading.sites}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loading.employees ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-xs"
                  >
                    <Filter className="h-3 w-3 mr-1" />
                    Filters
                    {showFilters ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {stats.total} employees • {stats.active} active • {stats.sites} site(s) from tasks
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        {showDebug && debugInfo && (
          <Card className="bg-black/5 border-muted">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-2">Debug Information</h4>
              <pre className="text-xs bg-black/10 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                </div>
                <UserX className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Left</p>
                  <p className="text-2xl font-bold">{stats.left}</p>
                </div>
                <UserMinus className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Task-Assigned Sites</p>
                  <p className="text-2xl font-bold">{stats.sites}</p>
                </div>
                <MapPin className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      {getUniqueSites().map(site => (
                        <SelectItem key={site} value={site}>{site}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Department</label>
                  <Select value={selectedDepartmentFilter} onValueChange={setSelectedDepartmentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {getUniqueDepartments().map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSiteFilter("all");
                    setSelectedDepartmentFilter("all");
                    setSelectedStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task-Assigned Sites Info */}
        {supervisorSites.length > 0 ? (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold">Sites from Your Task Assignments</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    You have tasks assigned at these sites. Showing employees from these sites only.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {supervisorSites.map(site => (
                      <Badge key={site._id} variant="outline" className="bg-white">
                        {site.name}
                        {site.clientName && <span className="ml-1 text-muted-foreground">({site.clientName})</span>}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Found {supervisorSites.length} site(s) from {debugInfo?.tasksWithSupervisor || 0} task(s)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
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

        {/* HRMS Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="employees" className="flex-1 min-w-[120px]">
                  Employees
                </TabsTrigger>
                <TabsTrigger value="onboarding" className="flex-1 min-w-[120px]">
                  Onboarding
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="employees" className="space-y-4">
                {loading.initial ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-4">Loading your data...</p>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No employees found for your task-assigned sites</p>
                    {supervisorSites.length > 0 ? (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">Your task-assigned sites:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {supervisorSites.map(site => (
                            <Badge key={site._id} variant="outline">
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
                        <p className="text-muted-foreground">You don't have any sites assigned through tasks.</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Please contact your administrator to assign you to tasks.
                        </p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      className="mt-4"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        Showing {filteredEmployees.length} of {employees.length} employees from your task-assigned sites
                      </p>
                    </div>
                    
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Site</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEmployees.map((employee) => {
                            const isExpanded = expandedEmployee === employee._id;
                            const employeeTaskList = employeeTasks.get(employee._id) || [];
                            const isLoadingTasks = tasksLoading.get(employee._id) || false;
                            
                            return (
                              <>
                                <TableRow key={employee._id} className="cursor-pointer hover:bg-muted/50">
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => toggleEmployeeExpand(employee._id)}
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {employee.photo ? (
                                        <img 
                                          src={employee.photo} 
                                          alt={employee.name}
                                          className="h-8 w-8 rounded-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                                          }}
                                        />
                                      ) : (
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                          <User className="h-4 w-4 text-primary" />
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-medium">{employee.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          ID: {employee.employeeId}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="flex items-center gap-1 text-sm">
                                        <Mail className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate max-w-[150px]">{employee.email}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                        <Phone className="h-3 w-3 flex-shrink-0" />
                                        {employee.phone}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{employee.department}</TableCell>
                                  <TableCell>{employee.position}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="max-w-[150px] truncate">
                                      {employee.siteName || 'Not Assigned'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={employee.status === "active" ? "default" : 
                                              employee.status === "inactive" ? "secondary" : "destructive"}
                                      className="cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleEmployeeStatus(employee._id);
                                      }}
                                    >
                                      {employee.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingEmployee(employee);
                                          form.reset({
                                            name: employee.name,
                                            email: employee.email,
                                            phone: employee.phone,
                                            site: employee.siteName || '',
                                            shift: 'Day',
                                            department: employee.department,
                                            role: employee.position,
                                          });
                                          setDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEmployeeToDelete(employee._id);
                                          setDeleteDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                
                                {/* Expanded row with tasks */}
                                {isExpanded && (
                                  <TableRow className="bg-muted/30">
                                    <TableCell colSpan={8} className="p-4">
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <h4 className="font-semibold flex items-center gap-2">
                                            <Briefcase className="h-4 w-4" />
                                            Assigned Tasks
                                          </h4>
                                          <Badge variant="outline">
                                            {employeeTaskList.length} task(s)
                                          </Badge>
                                        </div>
                                        
                                        {isLoadingTasks ? (
                                          <div className="text-center py-4">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                            <p className="text-sm text-muted-foreground mt-2">Loading tasks...</p>
                                          </div>
                                        ) : employeeTaskList.length === 0 ? (
                                          <div className="text-center py-4 text-muted-foreground">
                                            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>No tasks assigned to this employee</p>
                                          </div>
                                        ) : (
                                          <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {employeeTaskList.map((task) => (
                                              <Card key={task._id} className="border-l-4" style={{
                                                borderLeftColor: task.priority === 'high' ? '#ef4444' : 
                                                                task.priority === 'medium' ? '#eab308' : 
                                                                task.priority === 'low' ? '#22c55e' : '#6b7280'
                                              }}>
                                                <CardContent className="p-4">
                                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="flex-1">
                                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h5 className="font-medium">{task.title}</h5>
                                                        {getPriorityBadge(task.priority)}
                                                      </div>
                                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {task.description}
                                                      </p>
                                                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                          <Building className="h-3 w-3 flex-shrink-0" />
                                                          <span className="truncate max-w-[150px]">{task.siteName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <Calendar className="h-3 w-3 flex-shrink-0" />
                                                          Deadline: {new Date(task.deadline).toLocaleDateString()}
                                                        </div>
                                                        {task.dueDateTime && (
                                                          <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3 flex-shrink-0" />
                                                            Due: {new Date(task.dueDateTime).toLocaleString()}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                      {getStatusBadge(task.status)}
                                                    </div>
                                                  </div>
                                                </CardContent>
                                              </Card>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="onboarding" className="space-y-4">
                <SupervisorOnboardingTab 
                  employees={employees}
                  setEmployees={setEmployees}
                  salaryStructures={salaryStructures}
                  setSalaryStructures={setSalaryStructures}
                  sites={supervisorSites}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter employee name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter employee email" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="site"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supervisorSites.map(site => (
                          <SelectItem key={site._id} value={site.name}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Day">Day Shift</SelectItem>
                        <SelectItem value="Night">Night Shift</SelectItem>
                        <SelectItem value="Rotating">Rotating Shift</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter department" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Role *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter job role" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full">
                {editingEmployee ? "Update Employee" : "Add Employee"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupervisorEmployees;