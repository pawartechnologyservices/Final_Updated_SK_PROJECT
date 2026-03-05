import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building } from "lucide-react";
import { Site, Task } from "../data";

interface StatsCardsProps {
  tasks: Task[];
  sites: Site[];
}

export const StatsCards = ({ tasks, sites }: StatsCardsProps) => {
  const getSiteStats = () => {
    const siteStats: { [key: string]: { total: number; completed: number; pending: number; inProgress: number } } = {};
    
    sites.forEach(site => {
      const siteTasks = tasks.filter(task => task.siteId === site.id);
      siteStats[site.id] = {
        total: siteTasks.length,
        completed: siteTasks.filter(t => t.status === "completed").length,
        pending: siteTasks.filter(t => t.status === "pending").length,
        inProgress: siteTasks.filter(t => t.status === "in-progress").length
      };
    });

    return siteStats;
  };

  const siteStats = getSiteStats();
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter(t => t.status === "in-progress").length;
  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4">
    
      </div>

     
    </div>
  );
};