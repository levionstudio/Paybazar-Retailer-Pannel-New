import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Receipt as ReceiptIcon } from "lucide-react";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  transaction_id: string;
  phone_number: string;
  bank_name: string;
  beneficiary_name: string;
  amount: string;
  commission: string;
  transfer_type: string;
  transaction_status: string;
  transaction_date_and_time: string;
}

export default function ReceiptPage() {
  const navigate = useNavigate();
  const { transactionId } = useParams<{ transactionId: string }>();
  const location = useLocation();
  const { toast } = useToast();
  const [transaction, setTransaction] = useState<Transaction | null>(
    location.state?.transaction || null
  );

  useEffect(() => {
    if (!transaction && transactionId) {
      // If transaction is not in state, you could fetch it here
      // For now, we'll use the state from navigation
      toast({
        title: "Error",
        description: "Transaction details not found",
        variant: "destructive",
      });
      navigate("/reports");
    }
  }, [transaction, transactionId, navigate, toast]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatDateShort = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  };

  const downloadPDF = () => {
    if (!transaction) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    const centerX = pageWidth / 2;
    let yPosition = margin;

    // Helper function to add centered text
    const addCenteredText = (text: string, y: number, fontSize: number, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.text(text, centerX, y, { align: "center" });
      return fontSize * 0.5;
    };

    // Helper function to add left-aligned text in a box
    const addBoxText = (label: string, value: string, y: number, fontSize: number = 10) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "bold");
      doc.text(label, margin + 10, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, margin + 10, y + 5);
      return fontSize * 1.2;
    };

    // Header with gradient effect
    doc.setFillColor(13, 49, 84);
    doc.rect(0, 0, pageWidth, 45, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text("PAYBAZAAR", centerX, 22, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Transaction Receipt", centerX, 35, { align: "center" });
    
    yPosition = 55;

    // Receipt Details Box - Centered Content
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPosition, contentWidth, 45, 3, 3, "FD");
    
    yPosition += 12;
    doc.setTextColor(0, 0, 0);
    
    // Transaction ID - Centered
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("Transaction ID", centerX, yPosition, { align: "center" });
    yPosition += 5;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(transaction.transaction_id, centerX, yPosition, { align: "center" });
    
    yPosition += 8;
    
    // Date & Status in two columns - Centered
    const col1X = pageWidth * 0.3;
    const col2X = pageWidth * 0.7;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("Date & Time", col1X, yPosition, { align: "center" });
    doc.text("Status", col2X, yPosition, { align: "center" });
    
    yPosition += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(formatDate(transaction.transaction_date_and_time), col1X, yPosition, { align: "center" });
    
    const statusColor = transaction.transaction_status === "SUCCESS" ? [0, 150, 0] : [220, 38, 38];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(transaction.transaction_status, col2X, yPosition, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    yPosition += 15;
    
    // Beneficiary Details Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPosition, contentWidth, 55, 3, 3, "FD");
    
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 49, 84);
    doc.text("BENEFICIARY DETAILS", centerX, yPosition, { align: "center" });
    
    yPosition += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    
    // Three columns for beneficiary details
    const benefCol1 = margin + contentWidth * 0.17;
    const benefCol2 = margin + contentWidth * 0.5;
    const benefCol3 = margin + contentWidth * 0.83;
    
    doc.text("Beneficiary Name", benefCol1, yPosition, { align: "center" });
    doc.text("Bank Name", benefCol2, yPosition, { align: "center" });
    doc.text("Phone Number", benefCol3, yPosition, { align: "center" });
    
    yPosition += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    // Wrap long names if needed
    const maxWidth = contentWidth * 0.28;
    const nameLines = doc.splitTextToSize(transaction.beneficiary_name, maxWidth);
    const bankLines = doc.splitTextToSize(transaction.bank_name, maxWidth);
    
    doc.text(nameLines, benefCol1, yPosition, { align: "center" });
    doc.text(bankLines, benefCol2, yPosition, { align: "center" });
    doc.text(transaction.phone_number, benefCol3, yPosition, { align: "center" });
    
    yPosition += Math.max(nameLines.length, bankLines.length) * 5 + 10;
    
    // Transaction Details Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPosition, contentWidth, 50, 3, 3, "FD");
    
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 49, 84);
    doc.text("TRANSACTION DETAILS", centerX, yPosition, { align: "center" });
    
    yPosition += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    
    // Three columns for transaction details
    doc.text("Transfer Type", benefCol1, yPosition, { align: "center" });
    doc.text("Amount", benefCol2, yPosition, { align: "center" });
    
    yPosition += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    doc.text(transaction.transfer_type, benefCol1, yPosition, { align: "center" });
    
    // Amount in larger, bold font
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 49, 84);
    doc.text(
      `₹${parseFloat(transaction.amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      benefCol2,
      yPosition,
      { align: "center" }
    );
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    // Footer
    yPosition = pageHeight - 30;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    
    yPosition += 8;
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("This is a computer-generated receipt.", centerX, yPosition, { align: "center" });
    
    yPosition += 5;
    doc.setFont("helvetica", "normal");
    doc.text("For any queries, contact: info@paybazaar.in | +91 9319187762", centerX, yPosition, { align: "center" });
    
    // Save PDF
    const fileName = `Receipt_${transaction.transaction_id}_${formatDateShort(transaction.transaction_date_and_time).replace(/\//g, "-")}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "Success",
      description: "Receipt downloaded successfully",
    });
  };

  if (!transaction) {
    return (
      <div className="flex min-h-screen bg-background w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header  />
          <main className="flex-1 overflow-auto bg-muted/20 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground mb-2">
                Transaction not found
              </p>
              <Button onClick={() => navigate("/reports")} variant="outline">
                Go Back
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header  />

        <main className="flex-1 overflow-auto bg-muted/20">
          {/* Header Section */}
          <div className="paybazaar-gradient text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/reports")}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold">Transaction Receipt</h1>
              </div>
              <Button
                onClick={downloadPDF}
                className="bg-white text-primary hover:bg-white/90"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Receipt Content */}
          <div className="p-6 flex justify-center">
            <div className="w-full max-w-2xl">
              <div className="bg-white rounded-lg shadow-xl border border-border overflow-hidden">
                {/* Receipt Header */}
                <div className="paybazaar-gradient text-white p-8 text-center">
                  <ReceiptIcon className="h-12 w-12 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2">PAYBAZAAR</h2>
                  <p className="text-white/90">Transaction Receipt</p>
                </div>

                {/* Receipt Body */}
                <div className="p-8 space-y-6">
                  {/* Transaction Info */}
                  <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm font-semibold text-slate-600">
                        Transaction ID:
                      </span>
                      <span className="text-sm font-mono font-bold text-black">
                        {transaction.transaction_id}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm font-semibold text-slate-600">
                        Date & Time:
                      </span>
                      <span className="text-sm font-semibold text-black">
                        {formatDate(transaction.transaction_date_and_time)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-600">
                        Status:
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          transaction.transaction_status === "SUCCESS"
                            ? "bg-green-600 text-white"
                            : transaction.transaction_status === "FAILED"
                            ? "bg-red-600 text-white"
                            : "bg-yellow-600 text-white"
                        }`}
                      >
                        {transaction.transaction_status}
                      </span>
                    </div>
                  </div>

                  {/* Beneficiary Details */}
                  <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-bold text-[#0d3154] border-b pb-2">
                      Beneficiary Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-semibold text-slate-600 block mb-1">
                          Beneficiary Name:
                        </span>
                        <span className="text-sm font-bold text-black">
                          {transaction.beneficiary_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-600 block mb-1">
                          Bank Name:
                        </span>
                        <span className="text-sm font-bold text-black">
                          {transaction.bank_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-600 block mb-1">
                          Phone Number:
                        </span>
                        <span className="text-sm font-mono font-bold text-black">
                          {transaction.phone_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-bold text-[#0d3154] border-b pb-2">
                      Transaction Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-semibold text-slate-600 block mb-1">
                          Transfer Type:
                        </span>
                        <span className="text-sm font-bold text-black">
                          {transaction.transfer_type}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-600 block mb-1">
                          Amount:
                        </span>
                        <span className="text-xl font-bold text-black">
                          ₹{parseFloat(transaction.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  Footer Note
                  <div className="text-center pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500">
                      This is a computer-generated receipt.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      For any queries, contact: info@paybazaar.in | +91 9319187762
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}