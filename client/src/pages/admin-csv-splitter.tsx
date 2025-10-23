import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { FileUp, Download, Scissors, Info } from "lucide-react";

export default function AdminCSVSplitter() {
  const { toast } = useToast();
  const [csvData, setCsvData] = useState("");
  const [batches, setBatches] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvData(text);
        
        const lines = text.trim().split('\n');
        const rowCount = lines.length - 1; // Subtract header
        setTotalRows(rowCount);
        
        toast({
          title: "File loaded",
          description: `${rowCount.toLocaleString()} rows ready to split`,
        });
      };
      reader.readAsText(file);
    }
  };

  const splitCSV = () => {
    if (!csvData.trim()) {
      toast({
        variant: "destructive",
        title: "No CSV data",
        description: "Please upload a CSV file first",
      });
      return;
    }

    const lines = csvData.trim().split('\n');
    const header = lines[0];
    const dataRows = lines.slice(1);
    
    const BATCH_SIZE = 3000;
    const newBatches: string[] = [];
    
    for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
      const batchRows = dataRows.slice(i, i + BATCH_SIZE);
      const batchContent = [header, ...batchRows].join('\n');
      newBatches.push(batchContent);
    }
    
    setBatches(newBatches);
    
    toast({
      title: "CSV split complete",
      description: `Created ${newBatches.length} batches of up to ${BATCH_SIZE.toLocaleString()} rows each`,
    });
  };

  const downloadBatch = (batchIndex: number) => {
    const content = batches[batchIndex];
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-${batchIndex + 1}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: `Batch ${batchIndex + 1} downloaded`,
    });
  };

  const downloadAllBatches = () => {
    batches.forEach((_, index) => {
      setTimeout(() => downloadBatch(index), index * 500);
    });
    
    toast({
      title: "Downloading all batches",
      description: `${batches.length} files will download shortly`,
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">CSV Splitter</h1>
        <p className="text-muted-foreground">
          Split large CSV files into smaller batches for easier importing
        </p>
      </div>

      <div className="grid gap-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong>
            <br />
            • Upload your large CSV file (e.g., 10,884 emails)
            <br />
            • Click "Split CSV" to divide it into batches of 3,000 rows each
            <br />
            • Download each batch separately
            <br />
            • Import each batch one at a time using the "Import Clients" page
            <br />
            • Each 3,000-client batch imports in 2-3 minutes reliably
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Upload Large CSV</CardTitle>
            <CardDescription>
              Upload your CSV file to split into manageable batches
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
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90"
                data-testid="input-file-upload"
              />
              {totalRows > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>{totalRows.toLocaleString()} rows</strong> loaded and ready to split
                </p>
              )}
            </div>

            {csvData && (
              <Button
                onClick={splitCSV}
                className="w-full"
                size="lg"
                data-testid="button-split"
              >
                <Scissors className="h-4 w-4 mr-2" />
                Split CSV into Batches (3,000 rows each)
              </Button>
            )}
          </CardContent>
        </Card>

        {batches.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Split Results</CardTitle>
                  <CardDescription>
                    {batches.length} batches created
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={downloadAllBatches}
                  className="gap-2"
                  data-testid="button-download-all"
                >
                  <Download className="h-4 w-4" />
                  Download All Batches
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {batches.map((batch, index) => {
                  const rowCount = batch.split('\n').length - 1;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-md border bg-card hover-elevate"
                    >
                      <div>
                        <p className="font-medium">
                          Batch {index + 1}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {rowCount.toLocaleString()} rows
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadBatch(index)}
                        className="gap-2"
                        data-testid={`button-download-batch-${index + 1}`}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Alert className="mt-6 border-green-500/50 bg-green-500/10">
                <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>Next Steps:</strong>
                  <br />
                  1. Download each batch file
                  <br />
                  2. Go to the "Import Clients" page
                  <br />
                  3. Import Batch 1, wait for completion
                  <br />
                  4. Import Batch 2, wait for completion
                  <br />
                  5. Continue until all batches are imported
                  <br />
                  <br />
                  <strong>Each 3,000-client batch will take 2-3 minutes to import.</strong>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
