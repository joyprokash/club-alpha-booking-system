import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileUp, AlertCircle, CheckCircle2, Download, Info } from "lucide-react";

export default function AdminClientImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [csvData, setCsvData] = useState("");
  const [results, setResults] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (data: string) => {
      const response = await apiRequest("POST", "/api/clients/bulk-import", { csvData: data });
      return response.json();
    },
    onSuccess: (data: any) => {
      setResults(data);
      
      toast({
        title: "Import completed",
        description: `${data.imported} clients imported successfully, ${data.failed} failed`,
      });

      // Invalidate users cache
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message,
      });
    },
  });

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
    
    setResults(null);
    importMutation.mutate(csvData);
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
client1@example.com
client2@example.com
client3@example.com`;
    
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
      failedRows.map((r: any) => `${r.row.email},"${r.error}"`).join('\n');
    
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
            <CardTitle>CSV Format & Instructions</CardTitle>
            <CardDescription>
              Simple one-column format for fast processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Format:</strong> Just one column with header "email"
                <br />
                <strong>Processing:</strong> Batched in groups of 100 for optimal performance
                <br />
                <strong>Credentials:</strong> Usernames extracted from emails (part before @), temporary passwords auto-generated
                <br />
                <strong>First login:</strong> All clients will be required to set their own password on first login
                <br />
                <strong>Performance:</strong> 14,000 clients typically process in 2-3 minutes
              </AlertDescription>
            </Alert>

            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Large Imports:</strong> For 14,000+ clients:
                <br />
                • Keep the browser tab open during import
                <br />
                • Don't navigate away until complete
                <br />
                • Processing time: ~1-3 minutes per 1,000 clients
                <br />
                • Duplicate emails will be skipped automatically
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
                disabled={importMutation.isPending}
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
                disabled={importMutation.isPending}
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
              disabled={importMutation.isPending || !csvData.trim()}
              className="w-full"
              size="lg"
              data-testid="button-import"
            >
              <FileUp className="h-4 w-4 mr-2" />
              {importMutation.isPending ? "Importing..." : "Import Clients"}
            </Button>

            {importMutation.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing...</span>
                  <span className="font-medium">Please wait</span>
                </div>
                <Progress value={undefined} className="w-full" />
                <p className="text-xs text-muted-foreground text-center">
                  Processing in batches. This may take several minutes for large imports.
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
                          <p className="font-medium">{result.row.email}</p>
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
