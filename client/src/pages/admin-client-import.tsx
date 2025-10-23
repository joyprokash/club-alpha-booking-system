import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { FileUp, AlertCircle, CheckCircle2, Download, Info } from "lucide-react";

export default function AdminClientImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [csvData, setCsvData] = useState("");
  const [results, setResults] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentEmail: "" });

  const startImport = async (data: string) => {
    setIsImporting(true);
    setResults(null);
    setProgress({ current: 0, total: 0, currentEmail: "" });

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/clients/bulk-import-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: JSON.stringify({ csvData: data }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to start import: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to read response stream");
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === "total") {
              setProgress(prev => ({ ...prev, total: data.count }));
            } else if (data.type === "progress") {
              setProgress(prev => ({
                current: data.index,
                total: prev.total,
                currentEmail: data.email
              }));
            } else if (data.type === "complete") {
              setResults(data);
              toast({
                title: "Import completed",
                description: `${data.imported} clients imported, ${data.failed} failed`,
              });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          }
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = () => {
    if (!csvData.trim()) {
      toast({
        variant: "destructive",
        title: "No CSV data",
        description: "Please paste CSV data to import",
      });
      return;
    }
    
    const lineCount = csvData.trim().split('\n').length - 1; // Subtract header
    if (lineCount > 20000) {
      toast({
        variant: "destructive",
        title: "Too many records",
        description: "Please limit imports to 20,000 records at a time",
      });
      return;
    }
    
    startImport(csvData);
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
          description: `${lineCount.toLocaleString()} clients ready to import`,
        });
      };
      reader.readAsText(file);
    }
  };

  const downloadTemplate = () => {
    const template = `email
john.doe@example.com
jane.smith@clubalpha.ca
michael.johnson@gmail.com
sarah.williams@yahoo.com
david.brown@outlook.com
emma.davis@hotmail.com
james.wilson@example.org
olivia.martinez@example.net
robert.anderson@example.co
sophia.taylor@example.io`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadFailedRows = () => {
    if (!results || !results.results) return;
    
    const failedRows = results.results.filter((r: any) => !r.success);
    const csvContent = 'email,error\n' + 
      failedRows.map((r: any) => `${r.email || r.row?.email || 'unknown'},"${r.error}"`).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'failed-imports.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Import Clients</h1>
        <p className="text-muted-foreground">
          Bulk upload client email addresses - optimized for large datasets (up to 20,000 records)
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>How to Import Clients</CardTitle>
            <CardDescription>
              Follow these steps to successfully import your client list
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-2">Step 1: Prepare Your CSV File</h4>
                <p className="text-sm text-muted-foreground">
                  Your CSV file should have just one column with the header "email". Download the template below to get started.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-2">Step 2: Upload or Paste</h4>
                <p className="text-sm text-muted-foreground">
                  Either upload your CSV file using the file picker below, or paste the CSV data directly into the text area.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-2">Step 3: Review Count & Import</h4>
                <p className="text-sm text-muted-foreground">
                  The system will show you how many clients are ready to import. Click "Import Clients" to start the process.
                </p>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>What Happens During Import:</strong>
                <br />
                • <strong>Usernames:</strong> Automatically extracted from emails (part before @)
                <br />
                • <strong>Example:</strong> john.smith@example.com → username: "john.smith"
                <br />
                • <strong>Default Password:</strong> Set to their username (e.g., john.smith logs in with "john.smith" as password)
                <br />
                • <strong>Password Change Required:</strong> All imported clients must change their password on first login
                <br />
                • <strong>Duplicates:</strong> Existing emails are automatically skipped (no duplicates created)
              </AlertDescription>
            </Alert>

            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Performance & Capacity:</strong>
                <br />
                • <strong>Speed:</strong> ~1,000 clients per minute (~2-3 min for 14,000 clients)
                <br />
                • <strong>Batch Processing:</strong> Clients processed in groups of 100 for optimal performance
                <br />
                • <strong>Maximum:</strong> Up to 20,000 clients per import
                <br />
                • <strong>After Import:</strong> Clients appear immediately in the clients list (cache auto-refreshes)
              </AlertDescription>
            </Alert>

            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Important for Large Imports (14,000+ clients):</strong>
                <br />
                • Keep this browser tab open during the entire import
                <br />
                • Don't navigate away or refresh the page until complete
                <br />
                • Wait for the "Import completed" message before proceeding
                <br />
                • If any clients fail, you can download the failed rows and try again
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="gap-2"
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Client List</CardTitle>
            <CardDescription>
              Upload CSV file or paste email list below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="input-file-upload"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Or Paste CSV Data
              </label>
              <Textarea
                placeholder="email&#10;client1@example.com&#10;client2@example.com&#10;..."
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                disabled={isImporting}
                rows={10}
                className="font-mono text-sm"
                data-testid="textarea-csv-data"
              />
              {csvData && (
                <p className="text-sm text-muted-foreground mt-2">
                  {(csvData.trim().split('\n').length - 1).toLocaleString()} clients ready to import
                </p>
              )}
            </div>

            <Button
              onClick={handleImport}
              disabled={isImporting || !csvData.trim()}
              className="w-full"
              size="lg"
              data-testid="button-import"
            >
              <FileUp className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import Clients"}
            </Button>

            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Importing {progress.current.toLocaleString()} of {progress.total.toLocaleString()}...
                  </span>
                  <span className="font-medium">{progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%</span>
                </div>
                <Progress value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} className="w-full" />
                <p className="text-xs text-muted-foreground text-center truncate">
                  Current: {progress.currentEmail || "Preparing..."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Import Results</CardTitle>
                  <CardDescription>
                    {results.total.toLocaleString()} rows processed
                  </CardDescription>
                </div>
                {results.failed > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadFailedRows}
                    className="gap-2"
                    data-testid="button-download-failed"
                  >
                    <Download className="h-4 w-4" />
                    Download Failed Rows
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-500/10 p-4 rounded-md border border-green-500/20">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {results.imported.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Successfully imported</div>
                </div>
                <div className="bg-red-500/10 p-4 rounded-md border border-red-500/20">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {results.failed.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>

              {results.failed > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <h4 className="font-medium text-sm mb-2">Failed Imports:</h4>
                  {results.results
                    .filter((r: any) => !r.success)
                    .slice(0, 100) // Show first 100 failures
                    .map((result: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 rounded-md bg-red-500/10"
                      >
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{result.email || result.row?.email || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{result.error}</p>
                        </div>
                      </div>
                    ))}
                  {results.failed > 100 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Showing first 100 failures. Download the full list using the button above.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
