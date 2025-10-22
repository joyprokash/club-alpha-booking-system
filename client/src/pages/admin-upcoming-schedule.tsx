import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileUp, AlertCircle, CheckCircle2, Download, Info, Trash2, Calendar } from "lucide-react";

export default function AdminUpcomingSchedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [csvData, setCsvData] = useState("");
  const [results, setResults] = useState<any>(null);

  const uploadMutation = useMutation({
    mutationFn: async (data: string) => {
      const response = await apiRequest("POST", "/api/upcoming-schedule/bulk", { csvData: data });
      return response.json();
    },
    onSuccess: (data: any) => {
      setResults(data);
      
      const successCount = data.results.filter((r: any) => r.success).length;
      const failedCount = data.results.filter((r: any) => !r.success).length;
      
      toast({
        title: "Upload completed",
        description: `${successCount} schedule slots uploaded, ${failedCount} failed`,
      });

      // Invalidate schedule cache
      queryClient.invalidateQueries({ queryKey: ["/api/upcoming-schedule"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/upcoming-schedule/clear");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule cleared",
        description: "All upcoming schedule data has been deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/upcoming-schedule"] });
      setResults(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Clear failed",
        description: error.message,
      });
    },
  });

  const handleUpload = () => {
    if (!csvData.trim()) {
      toast({
        variant: "destructive",
        title: "No CSV data",
        description: "Please paste CSV data to upload",
      });
      return;
    }
    
    setResults(null);
    uploadMutation.mutate(csvData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvData(text);
        
        const lineCount = text.trim().split('\n').length - 1;
        toast({
          title: "File loaded",
          description: `${lineCount.toLocaleString()} schedule slots ready to upload`,
        });
      };
      reader.readAsText(file);
    }
  };

  const downloadTemplate = () => {
    const template = `date,hostess,startTime,endTime,service,notes
2025-10-29,Sophia,10:00,11:00,Premium Experience,
2025-10-29,Amelia,14:00,15:30,VIP Session,
2025-10-29,Olivia,18:00,19:00,Standard Session,
2025-10-30,Isabella,10:30,12:00,Premium Experience,Preview slot
2025-10-30,Charlotte,15:00,16:30,VIP Session,`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upcoming-schedule-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadFailedRows = () => {
    if (!results || !results.results) return;
    
    const failedRows = results.results.filter((r: any) => !r.success);
    const csvContent = 'date,hostess,startTime,endTime,service,notes,error\n' + 
      failedRows.map((r: any) => {
        const row = r.row || {};
        return `${row.date || ''},${row.hostess || ''},${row.startTime || ''},${row.endTime || ''},${row.service || ''},${row.notes || ''},"${r.error}"`;
      }).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'failed-uploads.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Upcoming Schedule Upload</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Upload the preview schedule for the upcoming week. Clients can view but cannot book through the app.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              How to Upload Schedule
            </CardTitle>
            <CardDescription>
              Follow these steps to upload the upcoming schedule for client preview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">CSV Format:</h3>
              <p className="text-sm text-muted-foreground">
                Your CSV must have the following columns: <code className="bg-muted px-1 rounded">date,hostess,startTime,endTime,service,notes</code>
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                <li><strong>date:</strong> Format YYYY-MM-DD (e.g., 2025-10-29)</li>
                <li><strong>hostess:</strong> Hostess display name (e.g., Sophia, Amelia)</li>
                <li><strong>startTime:</strong> Format HH:MM in 24-hour time (e.g., 14:00)</li>
                <li><strong>endTime:</strong> Format HH:MM in 24-hour time (e.g., 15:30)</li>
                <li><strong>service:</strong> Service name (optional, e.g., Premium Experience)</li>
                <li><strong>notes:</strong> Optional notes (e.g., Preview slot)</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>

              <label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button variant="outline" asChild>
                  <span>
                    <FileUp className="h-4 w-4 mr-2" />
                    Choose CSV File
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV Data</CardTitle>
            <CardDescription>
              Paste your CSV data or use the file upload button above
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste CSV data here..."
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              data-testid="input-csv-data"
            />

            {uploadMutation.isPending && (
              <div className="space-y-2">
                <Progress value={undefined} className="w-full" data-testid="progress-upload" />
                <p className="text-sm text-muted-foreground text-center">
                  Uploading schedule...
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleUpload} 
                disabled={!csvData.trim() || uploadMutation.isPending}
                data-testid="button-upload"
              >
                <FileUp className="h-4 w-4 mr-2" />
                Upload Schedule
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Are you sure you want to clear all upcoming schedule data? This cannot be undone.")) {
                    clearMutation.mutate();
                  }
                }}
                disabled={clearMutation.isPending}
                data-testid="button-clear-all"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
              <CardDescription>
                Summary of uploaded schedule slots
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Successful</p>
                    <p className="text-2xl font-bold" data-testid="text-success-count">
                      {results.results.filter((r: any) => r.success).length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold" data-testid="text-failed-count">
                      {results.results.filter((r: any) => !r.success).length}
                    </p>
                  </div>
                </div>
              </div>

              {results.results.some((r: any) => !r.success) && (
                <>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Some schedule slots failed to upload. Download the error report to see details.
                    </AlertDescription>
                  </Alert>

                  <Button 
                    variant="outline" 
                    onClick={downloadFailedRows}
                    data-testid="button-download-failed"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Failed Rows
                  </Button>

                  <div className="max-h-60 overflow-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Hostess</th>
                          <th className="text-left p-2">Time</th>
                          <th className="text-left p-2">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.results
                          .filter((r: any) => !r.success)
                          .map((r: any, i: number) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{r.row?.date || 'N/A'}</td>
                              <td className="p-2">{r.row?.hostess || 'N/A'}</td>
                              <td className="p-2 font-mono">
                                {r.row?.startTime && r.row?.endTime 
                                  ? `${r.row.startTime}-${r.row.endTime}`
                                  : 'N/A'
                                }
                              </td>
                              <td className="p-2 text-destructive">{r.error}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
