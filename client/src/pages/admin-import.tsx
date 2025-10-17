import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileUp, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminImport() {
  const { toast } = useToast();
  const [csvData, setCsvData] = useState("");
  const [results, setResults] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (data: string) => {
      const response = await apiRequest("POST", "/api/schedule/import", { csvData: data });
      return response.json();
    },
    onSuccess: (data: any) => {
      setResults(data);
      const successCount = data.results.filter((r: any) => r.success).length;
      const failCount = data.results.filter((r: any) => !r.success).length;
      
      toast({
        title: "Import completed",
        description: `${successCount} succeeded, ${failCount} failed`,
      });
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
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Import Schedule</h1>
        <p className="text-muted-foreground">
          Upload or paste CSV data to bulk update hostess weekly schedules
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>CSV Format</CardTitle>
            <CardDescription>
              Upload a CSV file or paste CSV data with the following format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Expected format:</strong> id,hostess,sun_day,sun_night,mon_day,mon_night,...
                <br />
                <strong>Time format:</strong> HH:mm-HH:mm (e.g., 10:00-18:00)
                <br />
                <strong>Example:</strong> 1,Jane-D,10:00-18:00,19:00-23:00,12:00-20:00,D,...
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90"
                  data-testid="input-file-upload"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Or Paste CSV Data
                </label>
                <Textarea
                  placeholder="Paste CSV data here..."
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  data-testid="textarea-csv-data"
                />
              </div>

              <Button
                onClick={handleImport}
                disabled={importMutation.isPending || !csvData.trim()}
                className="w-full"
                data-testid="button-import"
              >
                <FileUp className="h-4 w-4 mr-2" />
                {importMutation.isPending ? "Importing..." : "Import Schedule"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
              <CardDescription>
                {results.total} rows processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.results.map((result: any, index: number) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 p-3 rounded-md ${
                      result.success ? "bg-green-500/10" : "bg-red-500/10"
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {result.success ? "Success" : "Failed"}
                      </p>
                      {!result.success && result.error && (
                        <p className="text-sm text-muted-foreground">{result.error}</p>
                      )}
                      {result.row && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                          {JSON.stringify(result.row)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
