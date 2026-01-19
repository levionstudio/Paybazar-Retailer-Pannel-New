import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Calendar,
  Receipt,
  Download,
  Printer,
  Filter,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface TokenData {
  data: {
    user_id: string;
    user_unique_id: string;
    user_name: string;
    admin_id: string;
    distributor_id: string;
    master_distributor_id: string;
  };
  exp: number;
}

interface Transaction {
  transaction_id: string;
  phone_number: string;
  bank_name: string;
  beneficiary_name: string;
  account_number: string;
  amount: string;
  commission: string;
  tds: string;
  before_balance: string;
  after_balance: string;
  transfer_type: string;
  transaction_status: string;
  transaction_date_and_time: string;
  created_at?: string;
}

export default function UserPayouts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isExporting, setIsExporting] = useState(false);

  // Receipt dialog
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Commission calculation constants
  const THIRTY_NINE_USERS_ONE_PERCENT = new Set<string>([
    "9abc983a-6751-4578-b091-782c20ca518c",
    "588f08ba-99c0-45d4-ad10-3e0ba2f0f5ba",
    "3038eb4b-df7e-40d7-806a-5b0e93e51e33",
    "d20d9650-6ddf-45bf-9267-01795e8301f3",
    "10161525-f8b6-4e09-9378-c8320c597c35",
    "8522a1a8-7e2e-43f2-8b89-0e63fdee85af",
    "e0edcd84-0783-4bbb-943f-7d50471d402c",
    "ca36d7a2-9f13-4997-88e1-7512d6355650",
    "3e222ad0-33a0-4822-9f87-8c392ecb5cec",
    "5a5d9433-b2de-4d4c-a2ce-ef984b0fa3c1",
    "d25f700d-9186-4f4a-a410-8be16ee3ea35",
    "75e33916-4339-4f91-b2e3-6800a14da56f",
    "ea3b2b66-3042-4e1f-8aca-7c037dc70cc6",
    "6ede16d1-7c4b-4cc0-9a04-2896d2273ff2",
    "ef9d9491-3024-4f39-8e42-28e20203e004",
    "a5e61077-418a-4792-8247-fae90e9d4a8d",
    "b1bb7498-561b-451c-b0b7-83f24a113175",
    "0b45ef0c-8214-4eff-abec-b33e10fdab1e",
    "e081e9b5-2674-4c76-8fe4-d7e97ed9c76e",
    "9059e173-207f-4a7a-8986-b4291f5f9862",
    "c2576845-9399-4eca-b0ed-792883403ea7",
    "4c80845d-063a-40e9-8c5d-820223aefd25",
    "1aad7bf8-dce8-4946-a050-b160079d04f1",
    "c7856f40-de06-4313-845f-be18730d1e46",
    "0ee30163-b777-4db8-a54f-968fd6334cda",
    "9a61b72c-ab1b-4fae-96e3-934d2aa2a697",
    "39324029-4f37-41a8-8fa1-596d1b71570a",
    "912bfe33-cc18-42a9-95e5-6601e9792d2e",
    "e97abd42-3602-47e7-86c1-941849d5bfc7",
    "cf315988-3a63-4e3e-a043-b82e29645a27",
    "087adc59-29a6-40ee-9143-80d811e37691",
    "44ca46d-b7aa-4075-8cc9-c5b1c728af51",
    "cbc50485-4ff4-4670-bd00-d01071c0d44a",
    "141a55fd-f8d6-4bb9-b079-7e33a0f4c103",
    "71ebb8f6-9725-4b29-ab8d-2e18e905da0a",
    "85f1bd2a-aa1a-4005-b19c-8423a0746789",
    "91da3ca8-aa20-4584-9149-c2ebd624dcd7",
    "6e0e1dd1-7c4b-4ec0-9a04-2096d2273ff2",
    "ef9d9491-3024-4f39-8e42-28e20203a004",
    "b1bb7498-5d1b-451c-b0b7-83f24a113176",
  ]);

  const TWO_SPECIAL_USERS_ONE_PERCENT = new Set([
    "fca6741b-e405-4c06-9ebb-3f1e9951c22c",
    "df2704ad-7cb1-4b28-a29d-866dfdded0ae",
  ]);

  const getRetailerCommission = (transaction: Transaction) => {
    const totalCommission = Number(transaction.commission);

    if (TWO_SPECIAL_USERS_ONE_PERCENT.has(tokenData?.data.user_id ?? "")) {
      return totalCommission * 0.45;
    } else if (
      THIRTY_NINE_USERS_ONE_PERCENT.has(tokenData?.data.user_id ?? "")
    ) {
      return totalCommission * 0.5;
    } else {
      return totalCommission * 0.5;
    }
  };

  // Decode token
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please login to continue.",
        variant: "destructive",
      });
      window.location.href = "/login";
      return;
    }

    try {
      const decoded: TokenData = jwtDecode(token);

      if (!decoded?.exp || decoded.exp * 1000 < Date.now()) {
        toast({
          title: "Session expired",
          description: "Login again.",
          variant: "destructive",
        });
        localStorage.removeItem("authToken");
        window.location.href = "/login";
        return;
      }

      setTokenData(decoded);
    } catch (error) {
      toast({
        title: "Invalid token",
        description: "Please login.",
        variant: "destructive",
      });
      window.location.href = "/login";
    }
  }, []);

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!tokenData) return;

    const token = localStorage.getItem("authToken");
    setLoading(true);

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/user/payout/get/transactions/${
          tokenData.data.user_id
        }`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (
        response.data.status === "success" &&
        response.data.data?.transactions
      ) {
        const sortedTransactions = response.data.data.transactions.sort(
          (a: Transaction, b: Transaction) => {
            const dateA = new Date(a.transaction_date_and_time).getTime();
            const dateB = new Date(b.transaction_date_and_time).getTime();
            return dateB - dateA;
          }
        );
        setAllTransactions(sortedTransactions);
        setTransactions(sortedTransactions);
        toast({
          title: "Success",
          description: "Transactions loaded successfully",
        });
      } else {
        setAllTransactions([]);
        setTransactions([]);
      }
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      setAllTransactions([]);
      setTransactions([]);
      if (error.response?.status !== 404) {
        toast({
          title: "Error",
          description:
            error.response?.data?.message || "Failed to fetch transactions",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenData) fetchTransactions();
  }, [tokenData]);

  // Auto-open receipt if navigated with transaction ID
  useEffect(() => {
    const state = location.state as { openReceiptFor?: string };
    const txnIdFromState = state?.openReceiptFor;
    const txnIdFromStorage = localStorage.getItem("autoOpenReceipt");

    const txnIdToOpen = txnIdFromState || txnIdFromStorage;

    if (txnIdToOpen && allTransactions.length > 0) {
      const transaction = allTransactions.find(
        (txn) => txn.transaction_id === txnIdToOpen
      );

      if (transaction) {
        setTimeout(() => {
          setSelectedTransaction(transaction);
          setIsReceiptOpen(true);
          localStorage.removeItem("autoOpenReceipt");
          window.history.replaceState({}, document.title);
        }, 500);
      }
    }
  }, [location.state, allTransactions]);

  // Combined Filter Effect (Search + Date Range + Status)
  useEffect(() => {
    let filtered = [...allTransactions];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((transaction) => {
        const searchableFields = [
          transaction.transaction_id,
          transaction.phone_number,
          transaction.bank_name,
          transaction.beneficiary_name,
          transaction.amount,
          transaction.commission,
          transaction.transfer_type,
          transaction.transaction_status,
          formatDate(transaction.transaction_date_and_time),
        ];

        return searchableFields.some((field) =>
          String(field).toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((transaction) => {
        const transactionDate =
          transaction.transaction_date_and_time || transaction.created_at;
        if (!transactionDate) return false;

        const txDate = new Date(transactionDate);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (end) {
          end.setHours(23, 59, 59, 999);
        }

        if (start && end) {
          return txDate >= start && txDate <= end;
        } else if (start) {
          return txDate >= start;
        } else if (end) {
          return txDate <= end;
        }

        return true;
      });
    }

    // Apply status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(
        (transaction) =>
          transaction.transaction_status.toUpperCase() ===
          statusFilter.toUpperCase()
      );
    }

    setTransactions(filtered);
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, statusFilter, allTransactions]);

  // Clear filters
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setStatusFilter("ALL");
    setSearchTerm("");
  };

  // Export to Excel
  const exportToExcel = () => {
    if (transactions.length === 0) {
      toast({
        title: "No Data",
        description: "No transactions to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportData = transactions.map((tx, index) => ({
        "S.No": index + 1,
        "Transaction ID": tx.transaction_id,
        "Date & Time": formatDate(tx.transaction_date_and_time),
        "Phone Number": tx.phone_number,
        "Bank Name": tx.bank_name,
        "Beneficiary Name": tx.beneficiary_name,
        "Account Number": tx.account_number,
        "Amount (₹)": parseFloat(tx.amount).toFixed(2),
        "Commission (₹)": getRetailerCommission(tx).toFixed(2),
        "TDS (₹)": parseFloat(tx.tds || "0").toFixed(2),
        "Before Balance (₹)": parseFloat(tx.before_balance || "0").toFixed(2),
        "After Balance (₹)": parseFloat(tx.after_balance || "0").toFixed(2),
        "Transfer Type": tx.transfer_type,
        Status: tx.transaction_status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Settlement Report");

      const colWidths = [
        { wch: 8 },
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 15 },
        { wch: 12 },
      ];
      worksheet["!cols"] = colWidths;

      const fileName = `Settlement_Report_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Success",
        description: `Exported ${transactions.length} transactions to Excel`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Unable to export transactions",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatAmount = (amount: string) => {
    return parseFloat(amount || "0").toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return "bg-green-600 text-white";
      case "FAILED":
      case "FAILURE":
        return "bg-red-600 text-white";
      case "PENDING":
        return "bg-yellow-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getStatusColorForReceipt = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return "text-green-600 bg-green-50";
      case "FAILED":
      case "FAILURE":
        return "text-red-600 bg-red-50";
      case "PENDING":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  // Pagination
  const totalPages = Math.ceil(transactions.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  const handleViewReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsReceiptOpen(true);
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || !selectedTransaction) return;

    try {
      toast({
        title: "Generating PDF",
        description: "Please wait...",
      });

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(
        imgData,
        "PNG",
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      );
      pdf.save(`settlement-receipt-${selectedTransaction.transaction_id}.pdf`);

      toast({
        title: "Success",
        description: "Receipt downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive",
      });
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const receiptContent = receiptRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${selectedTransaction?.transaction_id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; padding: 20mm; }
            @media print { @page { size: A4; margin: 15mm; } body { padding: 0; } }
            .receipt-container { max-width: 800px; margin: 0 auto; background: white; }
            .border-b-2 { border-bottom: 2px solid #e5e7eb; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t-2 { border-top: 2px solid #e5e7eb; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; color: #000000; }
            .font-semibold { font-weight: 600; }
            .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
            .text-2xl { font-size: 1.5rem; line-height: 2rem; }
            .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .text-xs { font-size: 0.75rem; line-height: 1rem; }
            .text-black { color: #000000 !important; }
            .text-gray-800 { color: #1f2937; }
            .text-gray-700 { color: #374151; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-500 { color: #6b7280; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-green-50 { background-color: #f0fdf4; }
            .text-green-600 { color: #16a34a !important; }
            .text-red-600 { color: #dc2626 !important; }
            .text-yellow-600 { color: #ca8a04 !important; }
            .rounded-lg { border-radius: 0.5rem; }
            .p-8 { padding: 2rem; }
            .p-4 { padding: 1rem; }
            .px-4 { padding-left: 1rem; padding-right: 1rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .pb-6 { padding-bottom: 1.5rem; }
            .pt-6 { padding-top: 1.5rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .space-y-4 > * + * { margin-top: 1rem; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-4 { gap: 1rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #000000; }
          </style>
        </head>
        <body>
          <div class="receipt-container">${receiptContent}</div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex min-h-screen bg-background w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 overflow-auto bg-muted/20">
          {/* Header Section */}
          <div className="paybazaar-gradient text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">User Ledger</h1>
                  <p className="text-white/80 text-sm mt-1">
                    View and export your user ledger transaction history
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={exportToExcel}
                  className="bg-white text-primary hover:bg-white/90"
                  disabled={loading || isExporting || transactions.length === 0}
                >
                  <FileSpreadsheet
                    className={`h-4 w-4 mr-2 ${
                      isExporting ? "animate-pulse" : ""
                    }`}
                  />
                  {isExporting ? "Exporting..." : "Export to Excel"}
                </Button>
                <Button
                  onClick={fetchTransactions}
                  className="bg-white text-primary hover:bg-white/90"
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="p-6 pb-0">
            <div className="bg-card rounded-lg border border-border shadow-sm p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Filters
                </span>
                {(startDate || endDate || statusFilter !== "ALL" || searchTerm) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-auto h-8"
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Start Date */}
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || new Date().toISOString().split("T")[0]}
                    className="h-9"
                  />
                </div>

                {/* End Date */}
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={new Date().toISOString().split("T")[0]}
                    className="h-9"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">
                    Transaction Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="SUCCESS">Success</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="FAILURE">Failure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Search</Label>
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search transactions..."
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="px-6 pb-6">
            <div className="bg-card rounded-lg border border-border shadow-lg overflow-hidden">
              <div className="paybazaar-gradient p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-medium">Show</span>
                    <Select
                      value={entriesPerPage.toString()}
                      onValueChange={(value) => {
                        setEntriesPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20 h-9 bg-white/10 border-white/20 text-white hover:bg-white/20">
                        <SelectValue className="text-white" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-white font-medium">
                      entries
                    </span>
                    <span className="text-sm text-white/80 ml-2">
                      (Showing {transactions.length} of {allTransactions.length}
                      )
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="w-full min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="paybazaar-gradient hover:opacity-95">
                        <TableHead className="font-bold text-white text-center w-[140px] min-w-[140px]">
                          DATE & TIME
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[180px] min-w-[180px]">
                          TRANSACTION ID
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[130px] min-w-[130px]">
                          PHONE
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[160px] min-w-[160px]">
                          BANK NAME
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[160px] min-w-[160px]">
                          BENEFICIARY
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[140px] min-w-[140px]">
                          ACCOUNT NO.
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[120px] min-w-[120px]">
                          AMOUNT (₹)
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[120px] min-w-[120px]">
                          COMMISSION (₹)
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[100px] min-w-[100px]">
                          TDS (₹)
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[130px] min-w-[130px]">
                          BEFORE BAL (₹)
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[130px] min-w-[130px]">
                          AFTER BAL (₹)
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[120px] min-w-[120px]">
                          TYPE
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[110px] min-w-[110px]">
                          STATUS
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[100px] min-w-[100px]">
                          ACTION
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={14} className="text-center py-16">
                            <div className="flex flex-col items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                              <p className="text-sm text-muted-foreground">
                                Loading transactions...
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : paginatedTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={14} className="text-center py-16">
                            <div className="flex flex-col items-center justify-center">
                              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                                <FileText className="h-10 w-10 text-muted-foreground" />
                              </div>
                              <p className="text-lg font-semibold text-foreground mb-2">
                                {searchTerm ||
                                startDate ||
                                endDate ||
                                statusFilter !== "ALL"
                                  ? "No matching transactions found"
                                  : "No transactions found"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {searchTerm ||
                                startDate ||
                                endDate ||
                                statusFilter !== "ALL"
                                  ? "Try adjusting your filters"
                                  : "Your settlement transactions will appear here"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedTransactions.map((transaction, index) => (
                          <TableRow
                            key={transaction.transaction_id}
                            className={`hover:bg-muted/50 transition-colors ${
                              index % 2 === 0 ? "bg-background" : "bg-muted/20"
                            }`}
                          >
                            <TableCell className="text-center text-sm py-4">
                              {formatDate(transaction.transaction_date_and_time)}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs py-4">
                              {transaction.transaction_id}
                            </TableCell>
                            <TableCell className="text-center font-mono py-4">
                              {transaction.phone_number}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              {transaction.bank_name}
                            </TableCell>
                            <TableCell className="text-center font-medium py-4">
                              {transaction.beneficiary_name}
                            </TableCell>
                            <TableCell className="text-center font-mono py-4">
                              {transaction.account_number}
                            </TableCell>
                            <TableCell className="text-center font-semibold py-4">
                              ₹{formatAmount(transaction.amount)}
                            </TableCell>
                            <TableCell className="text-center font-semibold py-4">
                              ₹
                              {formatAmount(
                                getRetailerCommission(transaction).toString()
                              )}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              ₹{formatAmount(transaction.tds || "0")}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              ₹{formatAmount(transaction.before_balance || "0")}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              ₹{formatAmount(transaction.after_balance || "0")}
                            </TableCell>
                            <TableCell className="text-center text-sm py-4">
                              {transaction.transfer_type}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                  transaction.transaction_status
                                )}`}
                              >
                                {transaction.transaction_status}
                              </span>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewReceipt(transaction)}
                                className="shadow-sm h-8 px-2"
                              >
                                <Receipt className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination */}
              {transactions.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, transactions.length)} of{" "}
                    {transactions.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={
                                currentPage === pageNum ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className={
                                currentPage === pageNum
                                  ? "paybazaar-gradient text-white"
                                  : ""
                              }
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settlement Receipt</DialogTitle>
          </DialogHeader>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end -mt-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintReceipt}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadReceipt}
              className="gap-2 paybazaar-gradient text-white"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>

          {selectedTransaction && (
            <div ref={receiptRef} className="bg-white p-8">
              {/* Header */}
              <div className="text-center border-b-2 border-gray-200 pb-6 mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  SETTLEMENT RECEIPT
                </h1>
                <p className="text-sm text-gray-500">
                  Paybazaar Technologies Pvt. Ltd.
                </p>
              </div>

              {/* Transaction Status */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Transaction ID</p>
                  <p className="text-lg font-mono font-bold text-black">
                    {selectedTransaction.transaction_id}
                  </p>
                </div>
                <div
                  className={`px-4 py-2 rounded-lg font-semibold ${getStatusColorForReceipt(
                    selectedTransaction.transaction_status
                  )}`}
                >
                  {selectedTransaction.transaction_status.toUpperCase()}
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">
                  Transaction Details
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Date & Time</p>
                    <p className="font-bold text-black">
                      {formatDate(selectedTransaction.transaction_date_and_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Transfer Type</p>
                    <p className="font-bold text-black">
                      {selectedTransaction.transfer_type}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                    <p className="font-bold text-black font-mono">
                      {selectedTransaction.phone_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Bank Name</p>
                    <p className="font-bold text-black">
                      {selectedTransaction.bank_name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      Beneficiary Name
                    </p>
                    <p className="font-bold text-black">
                      {selectedTransaction.beneficiary_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Account Number</p>
                    <p className="font-bold text-black font-mono">
                      {selectedTransaction.account_number}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">
                  Amount Details
                </h2>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Transfer Amount</span>
                  <span className="text-xl font-bold text-black">
                    ₹{formatAmount(selectedTransaction.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Commission</span>
                  <span className="font-semibold text-green-600">
                    ₹
                    {formatAmount(
                      getRetailerCommission(selectedTransaction).toString()
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-600">TDS</span>
                  <span className="font-semibold text-red-600">
                    ₹{formatAmount(selectedTransaction.tds || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Before Balance</span>
                  <span className="font-semibold text-gray-700">
                    ₹{formatAmount(selectedTransaction.before_balance || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">After Balance</span>
                  <span className="font-semibold text-gray-700">
                    ₹{formatAmount(selectedTransaction.after_balance || "0")}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-6 border-t-2 border-gray-200">
                <p className="text-sm text-gray-500 mb-2">
                  This is a computer-generated receipt and does not require a
                  signature.
                </p>
                <p className="text-xs text-gray-400">
                  For any queries, please contact customer support.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}