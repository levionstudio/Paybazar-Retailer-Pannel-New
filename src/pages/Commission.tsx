import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, TrendingUp, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CommissionData {
  minAmount: number;
  maxAmount: number;
  commissionAmount: number;
}

const commissionData: CommissionData[] = [
  { minAmount: 100, maxAmount: 1000, commissionAmount: 1 },
  { minAmount: 1001, maxAmount: 4000, commissionAmount: 3 },
  { minAmount: 4001, maxAmount: 8000, commissionAmount: 7 },
  { minAmount: 8001, maxAmount: 10000, commissionAmount: 10 },
];

const MyCommission = () => {
  const navigate = useNavigate();

  const totalEarnings = 12750.5;
  const lastUpdated = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleDownload = (format: "csv" | "pdf") => {
    // Implementation for download functionality
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header  />
        <div className="flex-1 bg-muted/10">
          {/* Header */}
          <header className="paybazaar-gradient text-white p-4 border-b">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-slate-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">My Margin</h1>
            </div>
          </header>

          {/* Main Content */}
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
            {/* Commission Table Card */}
            <Card className="w-full overflow-hidden rounded-2xl border border-border/60 shadow-xl">
              <CardHeader className="paybazaar-gradient rounded-none border-b border-border/40 text-white">
                <CardTitle className="text-center text-xl font-semibold">
                  Aadhar Enable Payment System
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="w-full text-center">
                    <TableHeader>
                      <TableRow className="bg-slate-50 text-center">
                        <TableHead className="py-4 text-center text-base font-semibold uppercase tracking-wide text-slate-700">
                          <div className="mx-auto flex w-full items-center justify-center gap-2">
                            <div className="text-slate-700">
                            Amount(RS)
                            </div>
                        
                          </div>
                        </TableHead>
                        <TableHead className="py-4 text-center text-base font-semibold uppercase tracking-wide text-slate-700">
                          <div className="mx-auto flex w-full items-center justify-center gap-2">
                            <div className="text-slate-700">
                            Commission (RS)
                            </div>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissionData.map((row, index) => (
                        <TableRow
                          key={index}
                          className={`
                          ${index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                          transition-colors duration-200 hover:bg-paybazaar-blue/5
                        `}
                        >
                          <TableCell className="py-4 text-center text-base font-semibold text-slate-700">
                            ₹{row.minAmount.toLocaleString("en-IN")} - ₹
                            {row.maxAmount.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="py-4 text-center text-base font-semibold text-slate-700">
                            ₹{row.commissionAmount.toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

        
          </main>
        </div>
      </div>
    </div>
  );
};

export default MyCommission;
