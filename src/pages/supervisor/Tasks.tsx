"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Paperclip, 
  Download,
  Eye,
  Upload,
  MessageSquare,
  Calendar,
  User,
  Shield,
  Building,
  Filter,
  Loader2,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import taskService, { Task, Attachment } from "@/services/TaskService";
import { siteService, Site } from "@/services/SiteService";

const SupervisorTasksSection = () => {
  const { user: authUser, isAuthenticated } = useRole();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignedSites, setAssignedSites] = useState<Site[]>([]); // Only sites where supervisor has tasks
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showUpdatesDialog, setShowUpdatesDialog] = useState(false);
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [hourlyUpdateText, setHourlyUpdateText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0
  });

  useEffect(() => {
    if (authUser && isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [authUser, isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const supervisorId = authUser?._id || authUser?.id;
      if (!supervisorId) {
        throw new Error("Supervisor ID not found");
      }

      console.log(`👤 Fetching tasks for supervisor: ${supervisorId}`);

      // Fetch all tasks and sites
      const [allSites, allTasks] = await Promise.all([
        siteService.getAllSites(),
        taskService.getAllTasks()
      ]);

      // Filter tasks where this supervisor is assigned
      const supervisorTasks = allTasks.filter(task => {
        // Check new format (assignedUsers array)
        const isAssignedInNewFormat = task.assignedUsers?.some(
          user => user.userId === supervisorId && user.role === 'supervisor'
        );
        
        // Check old format (single assignee)
        const isAssignedInOldFormat = task.assignedTo === supervisorId;
        
        return isAssignedInNewFormat || isAssignedInOldFormat;
      });

      console.log(`✅ Found ${supervisorTasks.length} tasks assigned to supervisor`);
      setTasks(supervisorTasks);

      // Extract unique site IDs from supervisor's tasks
      const uniqueSiteIds = [...new Set(supervisorTasks.map(task => task.siteId))];
      
      // Filter sites to only those where supervisor has tasks
      const sitesWithTasks = allSites.filter(site => uniqueSiteIds.includes(site._id));
      
      console.log(`🏢 Found ${sitesWithTasks.length} sites with assigned tasks`);
      setAssignedSites(sitesWithTasks);

      // Calculate stats
      calculateStats(supervisorTasks);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (taskList: Task[]) => {
    const now = new Date();
    const stats = {
      totalTasks: taskList.length,
      completedTasks: taskList.filter(t => t.status === 'completed').length,
      pendingTasks: taskList.filter(t => t.status === 'pending').length,
      inProgressTasks: taskList.filter(t => t.status === 'in-progress').length,
      overdueTasks: taskList.filter(t => 
        t.status !== 'completed' && 
        t.status !== 'cancelled' && 
        new Date(t.dueDateTime) < now
      ).length
    };
    setStats(stats);
  };

  const handleUpdateStatus = async (taskId: string, status: Task["status"]) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      
      if (!task) {
        toast.error("Task not found");
        return;
      }
      
      const supervisorId = authUser?._id || authUser?.id;
      
      if (!supervisorId) {
        toast.error("Supervisor ID not found");
        return;
      }
      
      // Update with userId to track individual supervisor's status
      await taskService.updateTaskStatus(taskId, { 
        status,
        userId: supervisorId 
      });
      
      await fetchData();
      toast.success("Task status updated!");
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error(error.message || "Failed to update task");
    }
  };

  const handleAddHourlyUpdate = async (taskId: string) => {
    if (!hourlyUpdateText.trim()) {
      toast.error("Please enter an update");
      return;
    }

    const supervisorId = authUser?._id || authUser?.id;
    if (!supervisorId) {
      toast.error("Supervisor ID not found");
      return;
    }

    try {
      await taskService.addHourlyUpdate(taskId, {
        content: hourlyUpdateText,
        submittedBy: supervisorId
      });

      await fetchData();
      setHourlyUpdateText("");
      toast.success("Hourly update added!");
      setShowUpdatesDialog(false);
    } catch (error: any) {
      console.error("Error adding hourly update:", error);
      toast.error(error.message || "Failed to add update");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      if (files.length === 1) {
        await taskService.uploadAttachment(taskId, files[0]);
      } else {
        await taskService.uploadMultipleAttachments(taskId, Array.from(files));
      }
      
      await fetchData();
      toast.success(`${files.length} file(s) uploaded successfully!`);
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast.error(error.message || "Failed to upload files");
    }
  };

  const handleDeleteAttachment = async (taskId: string, attachmentId: string) => {
    try {
      await taskService.deleteAttachment(taskId, attachmentId);
      await fetchData();
      toast.success("Attachment deleted!");
    } catch (error: any) {
      console.error("Error deleting attachment:", error);
      toast.error(error.message || "Failed to delete attachment");
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      await taskService.downloadAttachment(attachment);
    } catch (error: any) {
      console.error("Error downloading attachment:", error);
      toast.error(error.message || "Failed to download attachment");
    }
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const getSupervisorName = () => {
    return authUser?.name || "Supervisor";
  };

  const getSiteName = (siteId: string) => {
    const site = assignedSites.find(s => s._id === siteId);
    return site ? site.name : "Unknown Site";
  };

  const getClientName = (siteId: string) => {
    const site = assignedSites.find(s => s._id === siteId);
    return site ? site.clientName : "Unknown Client";
  };

  const getAssignedByName = (task: Task): string => {
    // Try to find the manager who assigned this task
    // This would need to be enhanced with a users service
    return "Manager";
  };

  const getTaskSpecificStatus = (task: Task): string => {
    const supervisorId = authUser?._id || authUser?.id;
    if (!supervisorId) return task.status;
    
    const user = task.assignedUsers?.find(u => u.userId === supervisorId);
    return user ? user.status : task.status;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return "No date set";
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid date";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'in-progress': return <Clock className="h-3 w-3" />;
      case 'pending': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const getHourlyUpdatesCount = (task: Task) => {
    return (task.hourlyUpdates || []).length;
  };

  const getAttachmentsCount = (task: Task) => {
    return (task.attachments || []).length;
  };

  const isOverdue = (task: Task): boolean => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.dueDateTime) < new Date();
  };

  const filteredTasks = tasks.filter(task => {
    if (!task) return false;
    
    // Filter by site
    const matchesSite = selectedSite === "all" || task.siteId === selectedSite;
    
    // Filter by status
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    
    // Filter by search query
    const matchesSearch = 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSiteName(task.siteId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSite && matchesStatus && matchesSearch;
  });

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="My Tasks" subtitle="Tasks assigned to you" />
        <div className="p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-4">
                Please log in to view your tasks.
              </p>
              <Button onClick={() => window.location.href = '/login'}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="My Tasks" subtitle="Loading your assigned tasks..." />
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading your tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="My Tasks" 
        subtitle="View and manage tasks assigned to you" 
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>My Assigned Tasks</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-muted-foreground">
                    Logged in as <span className="font-medium text-green-600">{getSupervisorName()}</span>
                  </p>
                  <Badge variant="outline" className="ml-2">
                    Supervisor
                  </Badge>
                </div>
              </div>
              <Button variant="outline" onClick={fetchData}>
                <Loader2 className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Supervisor Dashboard Summary */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Total Tasks</p>
                        <p className="text-2xl font-bold text-blue-900">{stats.totalTasks}</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Completed</p>
                        <p className="text-2xl font-bold text-green-900">{stats.completedTasks}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-700">In Progress</p>
                        <p className="text-2xl font-bold text-yellow-900">{stats.inProgressTasks}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-700">Pending</p>
                        <p className="text-2xl font-bold text-purple-900">{stats.pendingTasks}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-700">Overdue</p>
                        <p className="text-2xl font-bold text-red-900">{stats.overdueTasks}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search your tasks by title, description, site..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Site filter now only shows sites where supervisor has tasks */}
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger className="w-[180px]">
                      <Building className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sites ({assignedSites.length})</SelectItem>
                      {assignedSites.map(site => (
                        <SelectItem key={site._id} value={site._id}>
                          <div className="flex items-center gap-2">
                            <Building className="h-3 w-3" />
                            {site.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Tasks Table */}
              {filteredTasks.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Tasks Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {tasks.length === 0 ? (
                        "You don't have any tasks assigned to you yet."
                      ) : (
                        "No tasks match your filters. Try adjusting your search criteria."
                      )}
                    </p>
                    {tasks.length > 0 && (
                      <Button variant="outline" onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setSelectedSite("all");
                      }}>
                        Clear Filters
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Details</TableHead>
                        <TableHead>Site & Client</TableHead>
                        <TableHead>Assigned By</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>My Status</TableHead>
                        <TableHead>Due Date & Time</TableHead>
                        <TableHead>Updates</TableHead>
                        <TableHead>Attachments</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => {
                        const taskStatus = getTaskSpecificStatus(task);
                        const overdue = isOverdue(task);
                        
                        return (
                          <TableRow key={task._id} className={overdue ? "bg-red-50/50" : ""}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-semibold flex items-center gap-2">
                                  {task.title || "Untitled Task"}
                                  {overdue && (
                                    <Badge variant="destructive" className="text-xs">
                                      Overdue
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground line-clamp-2">
                                  {task.description || "No description"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  <span className="font-medium">{getSiteName(task.siteId)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {task.clientName}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{getAssignedByName(task)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getPriorityColor(task.priority) as any}>
                                {task.priority === "high" && <AlertCircle className="mr-1 h-3 w-3" />}
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(taskStatus) as any}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(taskStatus)}
                                  {taskStatus}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(task.dueDateTime)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowUpdatesDialog(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4" />
                                {getHourlyUpdatesCount(task)}
                                <span className="sr-only">View updates</span>
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowAttachmentsDialog(true);
                                }}
                              >
                                <Paperclip className="h-4 w-4" />
                                {getAttachmentsCount(task)}
                                <span className="sr-only">View attachments</span>
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewTask(task)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                
                                {taskStatus !== "completed" && taskStatus !== "cancelled" && (
                                  <>
                                    {taskStatus !== "in-progress" && (
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUpdateStatus(task._id, "in-progress")}
                                        className="text-blue-600"
                                      >
                                        <Clock className="h-3 w-3 mr-1" />
                                        Start
                                      </Button>
                                    )}
                                    
                                    <Button 
                                      size="sm"
                                      onClick={() => handleUpdateStatus(task._id, "completed")}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Complete
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Details Dialog */}
      {selectedTask && (
        <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Task Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Task Info */}
              <div>
                <h3 className="font-semibold mb-2">{selectedTask.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Site</div>
                  <div className="font-medium flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {getSiteName(selectedTask.siteId)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Client</div>
                  <div className="font-medium">{getClientName(selectedTask.siteId)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Priority</div>
                  <Badge variant={getPriorityColor(selectedTask.priority) as any}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">My Status</div>
                  <Badge variant={getStatusColor(getTaskSpecificStatus(selectedTask)) as any}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(getTaskSpecificStatus(selectedTask))}
                      {getTaskSpecificStatus(selectedTask)}
                    </span>
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Deadline</div>
                  <div className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedTask.deadline)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Due Date & Time</div>
                  <div className="font-medium">
                    {formatDate(selectedTask.dueDateTime)}
                  </div>
                </div>
              </div>

              {/* All Assignees */}
              {selectedTask.assignedUsers && selectedTask.assignedUsers.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">All Assignees</div>
                  <div className="space-y-2">
                    {selectedTask.assignedUsers.map((user, index) => {
                      const isMe = user.userId === (authUser?._id || authUser?.id);
                      return (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <User className="h-4 w-4" />
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.name}
                              {isMe && (
                                <Badge variant="outline" className="text-xs bg-green-50">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-auto">
                            {user.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {getTaskSpecificStatus(selectedTask) !== 'completed' && 
                 getTaskSpecificStatus(selectedTask) !== 'cancelled' && (
                  <>
                    {getTaskSpecificStatus(selectedTask) !== 'in-progress' && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          handleUpdateStatus(selectedTask._id, 'in-progress');
                          setShowTaskDetails(false);
                        }}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Start Task
                      </Button>
                    )}
                    <Button
                      className="flex-1"
                      onClick={() => {
                        handleUpdateStatus(selectedTask._id, 'completed');
                        setShowTaskDetails(false);
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Completed
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowTaskDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Hourly Updates Dialog */}
      {selectedTask && (
        <Dialog open={showUpdatesDialog} onOpenChange={setShowUpdatesDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Hourly Updates: {selectedTask.title || "Untitled Task"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-3">
                {selectedTask.hourlyUpdates && selectedTask.hourlyUpdates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hourly updates yet
                  </div>
                ) : (
                  selectedTask.hourlyUpdates?.map((update, index) => (
                    <div key={update.id || `update-${index}`} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">Update #{selectedTask.hourlyUpdates!.length - index}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(update.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm">{update.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4">
                <Textarea
                  placeholder="Add a new hourly update..."
                  value={hourlyUpdateText}
                  onChange={(e) => setHourlyUpdateText(e.target.value)}
                  rows={3}
                  className="mb-3"
                />
                <Button 
                  onClick={() => handleAddHourlyUpdate(selectedTask._id)}
                  className="w-full"
                >
                  Add Hourly Update
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Attachments Dialog */}
      {selectedTask && (
        <Dialog open={showAttachmentsDialog} onOpenChange={setShowAttachmentsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments: {selectedTask.title || "Untitled Task"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {(selectedTask.attachments || []).length} file(s) attached
                </span>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Files
                      <Input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, selectedTask._id)}
                      />
                    </div>
                  </Button>
                </label>
              </div>
              
              <div className="space-y-3">
                {!selectedTask.attachments || selectedTask.attachments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attachments yet
                  </div>
                ) : (
                  selectedTask.attachments.map((attachment) => (
                    <div key={attachment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{attachment.filename || "Unnamed file"}</div>
                            <div className="text-xs text-muted-foreground">
                              {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : "Unknown size"} • {formatDateTime(attachment.uploadedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => taskService.previewAttachment(attachment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadAttachment(attachment)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(selectedTask._id, attachment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SupervisorTasksSection;