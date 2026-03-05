import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Eye, Trash2, Edit, MapPin, Building, DollarSign, Square, 
  Search, Users, Filter, BarChart, Calendar, RefreshCw, User, Briefcase,
  Loader2, AlertCircle, ChevronDown, Phone, Mail
} from "lucide-react";
import { toast } from "sonner";
import { FormField } from "./sharedA";
import { Label } from "@/components/ui/label";
import { siteService, Site, Client, SiteStats, CreateSiteRequest } from "@/services/SiteService";
import { crmService } from "@/services/crmService";

// Define Services and Roles
const ServicesList = [
  "Housekeeping",
  "Security",
  "Parking",
  "Waste Management"
];

const StaffRoles = [
  "Manager",
  "Supervisor",
  "Housekeeping Staff",
  "Security Guard",
  "Parking Attendant",
  "Waste Collector"
];

// Unified Client Service to fetch from CRM
class ClientService {
  async getAllClients(searchTerm?: string): Promise<Client[]> {
    try {
      console.log('👥 Fetching clients from CRM...');
      // Fetch from CRM
      const crmClients = await crmService.clients.getAll(searchTerm);
      console.log('👥 CRM clients fetched:', crmClients);
      
      // Transform CRM clients to match SiteService Client interface
      const transformedClients = crmClients.map(client => ({
        _id: client._id,
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        city: client.city || "",
        state: "" // CRM might not have state, you can add if available
      }));
      
      return transformedClients;
    } catch (error) {
      console.error('❌ Failed to fetch from CRM, falling back to site service:', error);
      
      // Fallback to siteService
      try {
        if (searchTerm) {
          return await siteService.searchClients(searchTerm);
        } else {
          return await siteService.getAllClients();
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  async searchClients(query: string): Promise<Client[]> {
    return this.getAllClients(query);
  }
}

const SitesSection = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staffDeployment, setStaffDeployment] = useState<Array<{ role: string; count: number }>>([]);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState<SiteStats>(siteService.getDefaultStats());
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [clientSearch, setClientSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Initialize client service
  const clientService = new ClientService();

  // Fetch sites, stats, and clients on component mount
  useEffect(() => {
    fetchSites();
    fetchStats();
    fetchClients();
  }, []);

  // Fetch all sites using SiteService
  const fetchSites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const sitesData = await siteService.getAllSites();
      setSites(sitesData || []);
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      setError(error.message || "Failed to load sites");
      toast.error(error.message || "Failed to load sites");
      setSites([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all clients from CRM using unified service
  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const clientsData = await clientService.getAllClients();
      setClients(clientsData || []);
      
      // Auto-select first client if available
      if (clientsData && clientsData.length > 0) {
        setSelectedClient(clientsData[0]._id);
      }
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Search clients using unified service
  const searchClients = async (searchTerm: string) => {
    try {
      setIsLoadingClients(true);
      const clientsData = await clientService.searchClients(searchTerm);
      setClients(clientsData || []);
    } catch (error) {
      console.error("Error searching clients:", error);
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Fetch site statistics using SiteService
  const fetchStats = async () => {
    try {
      const statsData = await siteService.getSiteStats();
      setStats(statsData || siteService.getDefaultStats());
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Fallback to calculated stats
      const safeSites = sites || [];
      const statusCounts = siteService.getSiteStatusCounts(safeSites);
      setStats({
        totalSites: safeSites.length,
        totalStaff: siteService.getTotalStaffAcrossSites(safeSites),
        activeSites: statusCounts.active,
        inactiveSites: statusCounts.inactive,
        totalContractValue: siteService.getTotalContractValue(safeSites)
      });
    }
  };

  // Search sites using SiteService
  const searchSites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const searchResults = await siteService.searchSites({
        query: searchQuery,
        status: statusFilter
      });
      setSites(searchResults || []);
    } catch (error: any) {
      console.error("Error searching sites:", error);
      setError(error.message || "Failed to search sites");
      toast.error(error.message || "Failed to search sites");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle service selection
  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  // Update staff deployment count
  const updateStaffCount = (role: string, count: number) => {
    setStaffDeployment(prev => {
      const existing = prev.find(item => item.role === role);
      if (existing) {
        return prev.map(item =>
          item.role === role ? { ...item, count: Math.max(0, count) } : item
        );
      }
      return [...prev, { role, count }];
    });
  };

  // Reset form to initial state
  const resetForm = () => {
    setSelectedServices([]);
    setStaffDeployment([]);
    setEditMode(false);
    setEditingSiteId(null);
    setSelectedClient("");
    setClientSearch("");
  };

  // View site details
  const handleViewSite = (site: Site) => {
    setSelectedSite(site);
    setViewDialogOpen(true);
  };

  // Edit site - populate form with site data
  const handleEditSite = (site: Site) => {
    setEditMode(true);
    setEditingSiteId(site._id);
    setSelectedServices(site.services || []);
    setStaffDeployment(site.staffDeployment || []);
    
    // Set client if exists in clients list
    if (site.clientId) {
      const client = clients.find(c => c._id === site.clientId);
      if (client) {
        setSelectedClient(client._id);
      }
    } else {
      // Find client by name if ID is not available
      const client = clients.find(c => c.name === site.clientName);
      if (client) {
        setSelectedClient(client._id);
      } else {
        setSelectedClient("");
      }
    }
    
    // Set form values for editing
    setTimeout(() => {
      const form = document.getElementById('site-form') as HTMLFormElement;
      if (form) {
        const safeAreaSqft = site.areaSqft || 0;
        const safeContractValue = site.contractValue || 0;
        const safeContractDate = site.contractEndDate 
          ? new Date(site.contractEndDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        
        (form.elements.namedItem('site-name') as HTMLInputElement).value = site.name || '';
        (form.elements.namedItem('location') as HTMLInputElement).value = site.location || '';
        (form.elements.namedItem('area-sqft') as HTMLInputElement).value = safeAreaSqft.toString();
        (form.elements.namedItem('contract-value') as HTMLInputElement).value = safeContractValue.toString();
        (form.elements.namedItem('contract-end-date') as HTMLInputElement).value = safeContractDate;
      }
    }, 0);
    
    setDialogOpen(true);
  };

  // Add or update site using SiteService
  const handleAddOrUpdateSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);

    let clientName = "";
    let clientId = "";

    if (selectedClient) {
      // Use selected client from dropdown
      const client = clients.find(c => c._id === selectedClient);
      if (client) {
        clientName = client.name;
        clientId = client._id;
      }
    } else {
      toast.error("Please select a client from the list");
      return;
    }

    if (!clientName?.trim()) {
      toast.error("Please select a valid client");
      return;
    }

    // Prepare site data
    const siteData: CreateSiteRequest = {
      name: formData.get("site-name") as string,
      clientName: clientName.trim(),
      clientId: clientId || undefined,
      location: formData.get("location") as string,
      areaSqft: Number(formData.get("area-sqft")) || 0,
      contractValue: Number(formData.get("contract-value")) || 0,
      contractEndDate: formData.get("contract-end-date") as string,
      services: selectedServices,
      staffDeployment: staffDeployment.filter(item => item.count > 0),
      status: 'active'
    };

    // Validate data
    const validationErrors = siteService.validateSiteData(siteData);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    try {
      if (editMode && editingSiteId) {
        // Update existing site
        const updatedSite = await siteService.updateSite(editingSiteId, siteData);
        if (updatedSite) {
          toast.success("Site updated successfully!");
        }
      } else {
        // Create new site
        const newSite = await siteService.createSite(siteData);
        if (newSite) {
          toast.success("Site added successfully!");
        }
      }

      setDialogOpen(false);
      resetForm();
      (e.target as HTMLFormElement).reset();
      
      // Refresh sites list and stats
      await fetchSites();
      await fetchStats();
      
    } catch (error: any) {
      console.error("Error saving site:", error);
      
      // Check for specific error types
      if (error.message?.includes('Duplicate entry') || error.message?.includes('duplicate')) {
        toast.error("Site name might already exist. Please try a different name.");
      } else if (error.message?.includes('id')) {
        toast.error("There was an issue with the site ID. Please try again.");
      } else {
        toast.error(error.message || "Failed to save site");
      }
    }
  };

  // Delete site using SiteService
  const handleDeleteSite = async (siteId: string) => {
    if (!confirm("Are you sure you want to delete this site?")) {
      return;
    }

    try {
      const result = await siteService.deleteSite(siteId);
      if (result?.success) {
        toast.success("Site deleted successfully!");
      } else {
        toast.error("Failed to delete site");
      }
      
      // Refresh sites list and stats
      await fetchSites();
      await fetchStats();
    } catch (error: any) {
      console.error("Error deleting site:", error);
      toast.error(error.message || "Failed to delete site");
    }
  };

  // Toggle site status using SiteService
  const handleToggleStatus = async (siteId: string) => {
    try {
      const updatedSite = await siteService.toggleSiteStatus(siteId);
      if (updatedSite) {
        toast.success("Site status updated!");
      }
      
      // Refresh sites list and stats
      await fetchSites();
      await fetchStats();
    } catch (error: any) {
      console.error("Error toggling site status:", error);
      toast.error(error.message || "Failed to update site status");
    }
  };

  // Formatting helpers using service methods
  const formatCurrency = (amount: number | undefined): string => {
    return siteService.formatCurrency(amount);
  };

  const formatDate = (dateString: string | undefined): string => {
    return siteService.formatDate(dateString);
  };

  const formatNumber = (num: number | undefined): string => {
    return siteService.formatNumber(num);
  };

  const getTotalStaff = (site: Site): number => {
    return siteService.getTotalStaff(site);
  };

  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setDialogOpen(open);
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchSites();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    fetchSites();
  };

  // Calculate average area using service method
  const calculateAverageArea = (): string => {
    const average = siteService.calculateAverageArea(sites);
    return Math.round(average / 1000).toString();
  };

  // Safe stats accessor
  const getSafeStats = () => {
    return stats || siteService.getDefaultStats();
  };

  // Render clients dropdown with CRM data
  const renderClientsDropdown = () => {
    if (isLoadingClients) {
      return (
        <div className="flex items-center space-x-2 p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading clients from CRM...</span>
        </div>
      );
    }
    
    const safeClients = clients || [];
    
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients in CRM..."
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
              if (e.target.value.length >= 2) {
                searchClients(e.target.value);
              } else if (e.target.value.length === 0) {
                fetchClients(); // Reset to all clients
              }
            }}
            className="pl-10 mb-2"
          />
        </div>
        
        <div className="border rounded-md max-h-60 overflow-y-auto">
          {safeClients.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No clients found in CRM. 
              <br />
              <Button 
                variant="link" 
                size="sm" 
                className="mt-1"
                onClick={() => {
                  // Optionally open CRM in new tab or redirect
                  toast.info("Please add clients in the CRM section first");
                }}
              >
                Add clients in CRM
              </Button>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {safeClients.map((client) => (
                <div 
                  key={client._id}
                  className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${selectedClient === client._id ? 'bg-blue-50 border border-blue-200' : ''}`}
                  onClick={() => setSelectedClient(client._id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{client.name}</div>
                      <div className="text-xs text-muted-foreground">{client.company}</div>
                    </div>
                    {selectedClient === client._id && (
                      <Badge variant="outline" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                    {client.email && <div className="flex items-center"><Mail className="h-3 w-3 mr-1" /> {client.email}</div>}
                    {client.phone && <div className="flex items-center"><Phone className="h-3 w-3 mr-1" /> {client.phone}</div>}
                    {client.city && <div className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {client.city}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Selected client info */}
        {selectedClient && safeClients.length > 0 && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">Selected Client:</div>
                <div className="text-sm">
                  {(() => {
                    const client = safeClients.find(c => c._id === selectedClient);
                    if (!client) return null;
                    
                    return (
                      <>
                        <div className="font-semibold">{client.name} - {client.company}</div>
                        <div className="mt-1 space-y-1">
                          {client.email && <div className="flex items-center"><Mail className="h-3 w-3 mr-1" /> {client.email}</div>}
                          {client.phone && <div className="flex items-center"><Phone className="h-3 w-3 mr-1" /> {client.phone}</div>}
                          {client.city && <div className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {client.city}</div>}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedClient("")}
                className="h-6 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-700">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sites</p>
                <p className="text-2xl font-bold">{getSafeStats().totalSites}</p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm">
              <span className="text-green-600 font-medium">{getSafeStats().activeSites} active</span>
              <span className="mx-2">•</span>
              <span className="text-gray-600">{getSafeStats().inactiveSites} inactive</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{getSafeStats().totalStaff}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contract Value</p>
                <p className="text-2xl font-bold">{formatCurrency(getSafeStats().totalContractValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Area</p>
                <p className="text-2xl font-bold">{calculateAverageArea()}K sqft</p>
              </div>
              <BarChart className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sites by name, client, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-48">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={handleResetFilters}>
                  Reset
                </Button>
                <Button type="button" variant="outline" onClick={() => { fetchSites(); fetchStats(); fetchClients(); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh All
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Site Management</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMode ? "Edit Site" : "Add New Site"}</DialogTitle>
                <DialogDescription>
                  Select a client from your CRM database
                </DialogDescription>
              </DialogHeader>

              <form id="site-form" onSubmit={handleAddOrUpdateSite} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Site Name" id="site-name" required>
                    <Input 
                      id="site-name" 
                      name="site-name" 
                      placeholder="Enter site name" 
                      required 
                      defaultValue=""
                    />
                  </FormField>

                  <FormField label="Location" id="location" required>
                    <Input 
                      id="location" 
                      name="location" 
                      placeholder="Enter location" 
                      required 
                      defaultValue=""
                    />
                  </FormField>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Select Client from CRM <span className="text-muted-foreground">(Required)</span>
                  </Label>
                  <div className="text-xs text-muted-foreground mb-2">
                    Search and select a client from your CRM database
                  </div>
                  {renderClientsDropdown()}
                  
                  {!selectedClient && !isLoadingClients && clients.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-yellow-700">
                        Please select a client from the list above
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="Area (sqft)" id="area-sqft" required>
                    <Input 
                      id="area-sqft" 
                      name="area-sqft" 
                      type="number" 
                      placeholder="Enter area in sqft" 
                      required 
                      min="1"
                      defaultValue="1000"
                    />
                  </FormField>
                  <FormField label="Contract Value (₹)" id="contract-value" required>
                    <Input 
                      id="contract-value" 
                      name="contract-value" 
                      type="number" 
                      placeholder="Enter contract value" 
                      required 
                      min="0"
                      defaultValue="100000"
                    />
                  </FormField>
                  <FormField label="Contract End Date" id="contract-end-date" required>
                    <Input 
                      id="contract-end-date" 
                      name="contract-end-date" 
                      type="date" 
                      required 
                      min={new Date().toISOString().split('T')[0]}
                      defaultValue={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    />
                  </FormField>
                </div>

                <div className="border p-4 rounded-md">
                  <p className="font-medium mb-3">Services for this Site</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ServicesList.map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service}`}
                          checked={selectedServices.includes(service)}
                          onCheckedChange={() => toggleService(service)}
                        />
                        <label htmlFor={`service-${service}`} className="cursor-pointer text-sm">
                          {service}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border p-4 rounded-md">
                  <p className="font-medium mb-3">Staff Deployment</p>
                  <div className="space-y-3">
                    {StaffRoles.map((role) => {
                      const deployment = staffDeployment.find(item => item.role === role);
                      const count = deployment?.count || 0;
                      return (
                        <div key={role} className="flex items-center justify-between">
                          <span className="text-sm">{role}</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateStaffCount(role, count - 1)}
                              disabled={count <= 0}
                              className="h-8 w-8"
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={count}
                              onChange={(e) => updateStaffCount(role, parseInt(e.target.value) || 0)}
                              className="w-16 text-center h-8"
                              min="0"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateStaffCount(role, count + 1)}
                              className="h-8 w-8"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={!selectedClient}>
                    {editMode ? "Update Site" : "Add Site"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Loading sites...</span>
            </div>
          ) : !sites || sites.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Sites Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search filters'
                  : 'Get started by adding your first site'
                }
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Site
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Area (sqft)</TableHead>
                    <TableHead>Contract Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => {
                    // Safely get values
                    const safeAreaSqft = site.areaSqft || 0;
                    const safeContractValue = site.contractValue || 0;
                    const safeStaffDeployment = Array.isArray(site.staffDeployment) ? site.staffDeployment : [];
                    const safeServices = Array.isArray(site.services) ? site.services : [];
                    
                    return (
                      <TableRow key={site._id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{site.name || 'Unnamed Site'}</div>
                            <div className="text-xs text-muted-foreground">
                              Added: {formatDate(site.createdAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{site.clientName || 'Unknown Client'}</div>
                            {site.clientDetails && (
                              <div className="text-xs text-muted-foreground">
                                {site.clientDetails.company}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{site.location || 'Unknown Location'}</TableCell>
                        <TableCell className="w-[160px]">
                          <div className="flex flex-wrap gap-1">
                            {safeServices.map((srv, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {srv}
                              </Badge>
                            ))}
                            {safeServices.length === 0 && (
                              <span className="text-xs text-muted-foreground">No services</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="mr-1">
                              Total: {getTotalStaff(site)}
                            </Badge>
                            {safeStaffDeployment.slice(0, 2).map((deploy, i) => (
                              <div key={i} className="text-xs text-muted-foreground">
                                {deploy.role}: {deploy.count}
                              </div>
                            ))}
                            {safeStaffDeployment.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{safeStaffDeployment.length - 2} more
                              </div>
                            )}
                            {safeStaffDeployment.length === 0 && (
                              <div className="text-xs text-muted-foreground">No staff assigned</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(safeAreaSqft)}</TableCell>
                        <TableCell>{formatCurrency(safeContractValue)}</TableCell>
                        <TableCell>
                          <Badge variant={site.status === "active" ? "default" : "secondary"}>
                            {site.status || 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewSite(site)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSite(site)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(site._id)}
                            >
                              {site.status === "active" ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSite(site._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* View Site Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Site Details</DialogTitle>
          </DialogHeader>
          
          {selectedSite && (
            <div className="space-y-6">
              {/* Site Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Site Name</h3>
                    <p className="text-lg font-semibold">{selectedSite.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Client</h3>
                    <p className="text-lg font-semibold">{selectedSite.clientName}</p>
                    {selectedSite.clientDetails && (
                      <div className="text-sm text-muted-foreground mt-1">
                        <div>{selectedSite.clientDetails.company}</div>
                        <div>{selectedSite.clientDetails.email}</div>
                        <div>{selectedSite.clientDetails.phone}</div>
                        <div>{selectedSite.clientDetails.city}, {selectedSite.clientDetails.state}</div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-semibold">{selectedSite.location}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Area</h3>
                    <div className="flex items-center gap-2">
                      <Square className="h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-semibold">{formatNumber(selectedSite.areaSqft)} sqft</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Contract Value</h3>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-semibold">{formatCurrency(selectedSite.contractValue)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Contract End Date</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-semibold">{formatDate(selectedSite.contractEndDate)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                    <Badge variant={selectedSite.status === "active" ? "default" : "secondary"}>
                      {selectedSite.status?.toUpperCase() || 'ACTIVE'}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                    <p className="text-sm">{formatDate(selectedSite.createdAt)}</p>
                  </div>
                </div>
              </div>
              
              {/* Services Section */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Services</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedSite.services) && selectedSite.services.length > 0 ? (
                    selectedSite.services.map((service, index) => (
                      <Badge key={index} variant="secondary">
                        {service}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No services assigned</p>
                  )}
                </div>
              </div>
              
              {/* Staff Deployment Section */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Staff Deployment</h3>
                <div className="space-y-3">
                  {Array.isArray(selectedSite.staffDeployment) && selectedSite.staffDeployment.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedSite.staffDeployment.map((deploy, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                            <span className="text-sm font-medium">{deploy.role}</span>
                            <Badge variant="outline">{deploy.count} staff</Badge>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Total Staff:</span>
                          <span className="text-lg font-bold">{getTotalStaff(selectedSite)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No staff deployed</p>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleEditSite(selectedSite);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Site
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleToggleStatus(selectedSite._id)}
                >
                  {selectedSite.status === "active" ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleDeleteSite(selectedSite._id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Site
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SitesSection;