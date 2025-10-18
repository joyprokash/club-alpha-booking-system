import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { FileDown, Download } from "lucide-react";

export default function AdminExport() {
  const { toast } = useToast();
  const [location, setLocation] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const token = localStorage.getItem("auth_token");
      const url = location === "all" 
        ? "/api/schedule/export"
        : `/api/schedule/export?location=${location}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `schedule-${location}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export successful",
        description: "Schedule CSV has been downloaded",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Export Schedule</h1>
        <p className="text-muted-foreground">
          Download hostess weekly schedules as CSV
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Options
          </CardTitle>
          <CardDescription>
            Select location and download the schedule CSV file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription>
              The exported CSV will include all hostesses and their weekly schedules in the format:
              <br />
              <code className="text-xs">id,hostess,monday,tuesday,wednesday,thursday,friday,saturday,sunday</code>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Location Filter
              </label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger data-testid="select-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="DOWNTOWN">Downtown</SelectItem>
                  <SelectItem value="WEST_END">West End</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
              size="lg"
              data-testid="button-export"
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Download Schedule CSV"}
            </Button>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-md">
            <h3 className="font-semibold mb-2">CSV Format Details</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Each row represents one hostess</li>
              <li>• Columns: id, hostess name, Monday-Sunday schedules</li>
              <li>• Time format: HH:mm-HH:mm (24-hour)</li>
              <li>• One time range per day (e.g., 10:00-18:00)</li>
              <li>• Empty cells indicate hostess is not scheduled that day</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
