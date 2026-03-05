import { useState } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Calculator } from "lucide-react";
import { motion } from "framer-motion";
import { StatsCards } from "./components/StatsCards";
import TasksSection from "./components/TasksSection";
import SitesSection from "./components/SitesSection";
import RosterSection from "./components/RosterSection";
import ServicesSection from "./components/ServicesSection";
import AlertsSection from "./components/AlertsSection";
import PriceCalculator from "./components/PriceCalculator";
import { initialTasks, initialSites, initialRoster, serviceTypes, initialAlerts } from "./data";

const ManagerOperations = () => {
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks] = useState(initialTasks);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Operations & Task Management" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        <StatsCards tasks={tasks} sites={initialSites} />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="sites">Sites</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="alerts">Alerts & Issues</TabsTrigger>
            <TabsTrigger value="Training">
              <Calculator className="h-4 w-4 mr-2" />
              Training
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <TasksSection />
          </TabsContent>

          <TabsContent value="sites">
            <SitesSection />
          </TabsContent>

          <TabsContent value="roster">
            <RosterSection />
          </TabsContent>

          <TabsContent value="services">
            <ServicesSection />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsSection />
          </TabsContent>

          <TabsContent value="calculator">
            <PriceCalculator />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default ManagerOperations;