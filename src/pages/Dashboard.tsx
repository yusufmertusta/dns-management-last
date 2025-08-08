import { StatsCards } from "@/components/dashboard/StatsCards";

export const Dashboard = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your domains and DNS management
        </p>
      </div>
      
      <StatsCards />
    </div>
  );
};