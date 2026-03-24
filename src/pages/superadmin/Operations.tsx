import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Calculator, ClipboardList, ChevronDown, ChevronUp, Filter, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { StatsCards } from "./components/StatsCards";
import TasksSection from "./components/TasksSection";
import AssignTaskSection from "./components/AssignTaskSection";
import SitesSection from "./components/SitesSection";
import RosterSection from "./components/RosterSection";
import ServicesSection from "./components/ServicesSection";
import AlertsSection from "./components/AlertsSection";
import PriceCalculator from "./components/PriceCalculator";
import { initialTasks, initialSites, initialRoster, serviceTypes, initialAlerts } from "./data";
import AssignTaskPage from "./components/AssignTaskPage";

// Mobile responsive tab selector
const MobileTabSelector = ({
  activeTab,
  onTabChange,
  tabs
}: {
  activeTab: string;
  onTabChange: (value: string) => void;
  tabs: { value: string; label: string; icon?: React.ReactNode }[];
}) => {
  const [open, setOpen] = useState(false);
  const currentTab = tabs.find(t => t.value === activeTab);

  return (
    <div className="lg:hidden mb-4">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center">
              {currentTab?.icon}
              <span className="ml-2">{currentTab?.label || 'Select Tab'}</span>
            </span>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[calc(100vw-2rem)] sm:w-[400px]">
          {tabs.map((tab) => (
            <DropdownMenuItem
              key={tab.value}
              onClick={() => {
                onTabChange(tab.value);
                setOpen(false);
              }}
              className={activeTab === tab.value ? "bg-muted" : ""}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
              {activeTab === tab.value && (
                <Badge variant="secondary" className="ml-auto">Active</Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const Operations = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks] = useState(initialTasks);
  
  // Mobile responsive state
  const [isMobileView, setIsMobileView] = useState(false);

  // Check for mobile view on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Define tabs for mobile selector
  const tabs = [
    { value: "tasks", label: "Tasks", icon: <ClipboardList className="h-4 w-4" /> },
     { value: "assign", label: "Assign Task", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "sites", label: "Sites", icon: <Building className="h-4 w-4" /> },
    { value: "roster", label: "Roster", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "services", label: "Services", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "alerts", label: "Alerts & Issues", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "calculator", label: "Calculator", icon: <Calculator className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Operations & Task Management" 
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 md:p-6 space-y-4 md:space-y-6"
      >
        {/* Mobile Tab Selector */}
        <MobileTabSelector
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />

        {/* Desktop Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="hidden lg:grid w-full grid-cols-7">
            <TabsTrigger value="tasks" className="text-sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
           <TabsTrigger value="assign" className="text-sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Assign Task
            </TabsTrigger>
            <TabsTrigger value="sites" className="text-sm">
              <Building className="h-4 w-4 mr-2" />
              Sites
            </TabsTrigger>
            <TabsTrigger value="roster" className="text-sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="services" className="text-sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Alerts & Issues
            </TabsTrigger>
            <TabsTrigger value="calculator" className="text-sm">
              <Calculator className="h-4 w-4 mr-2" />
              Calculator
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4 md:space-y-6">
            <StatsCards tasks={tasks} sites={initialSites} />
            <TasksSection />
          </TabsContent>

          {/* Assign Task Tab */}
          <TabsContent value="assign">
            <AssignTaskPage />
          </TabsContent> 

          {/* Sites Tab */}
          <TabsContent value="sites">
            <SitesSection />
          </TabsContent>

          {/* Roster Tab */}
          <TabsContent value="roster">
            <RosterSection />
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <ServicesSection />
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <AlertsSection />
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator">
            <PriceCalculator />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Operations;