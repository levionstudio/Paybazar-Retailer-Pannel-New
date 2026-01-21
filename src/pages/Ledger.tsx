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
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
}

interface LedgerTransaction {
  payout_transaction_id: string;
  partner_request_id: string;
  operator_transaction_id: string;
  retailer_id: string;
  order_id: string;
  mobile_number: string;
  beneficiary_bank_name: string;
  beneficiary_name: string;
  beneficiary_account_number: string;
  beneficiary_ifsc_code: string;
  amount: number;
  transfer_type: string;
  admin_commision: number;
  master_distributor_commision: number;
  distributor_commision: number;
  retailer_commision: number;
  payout_transaction_status: string;
  payout_created_at: string;
  payout_updated_at: string;
  // TDS fields
  tds_commision_id?: number;
  tds_transaction_id?: string;
  tds_user_id?: string;
  tds_user_name?: string;
  tds_commision?: number;
  tds?: number;
  paid_commision?: number;
  pan_number?: string;
  tds_status?: string;
  tds_created_at?: string;
  // Wallet fields
  wallet_transaction_id?: number;
  wallet_user_id?: string;
  wallet_reference_id?: string;
  credit_amount?: number;
  debit_amount?: number;
  before_balance?: number;
  after_balance?: number;
  transaction_reason?: string;
  remarks?: string;
  wallet_created_at?: string;
}

export default function UserLedger() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [allTransactions, setAllTransactions] = useState<LedgerTransaction[]>(
    []
  );
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Get today's date
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Filter states
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isExporting, setIsExporting] = useState(false);

  // Receipt dialog
  const [selectedTransaction, setSelectedTransaction] =
    useState<LedgerTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Helper function to get transfer type name
  const getTransferTypeName = (transferType: string) => {
    switch (transferType) {
      case "5":
        return "IMPS";
      case "6":
        return "NEFT";
      default:
        return transferType;
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
      navigate("/login");
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
        navigate("/login");
        return;
      }

      setTokenData(decoded);
    } catch (error) {
      toast({
        title: "Invalid token",
        description: "Please login.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [navigate]);

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!tokenData?.user_id) return;

    const token = localStorage.getItem("authToken");
    setLoading(true);

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/payout/get/ledger/${
          tokenData.user_id
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
        response.data.data?.payout_ledger_transactions
      ) {
        const sortedTransactions =
          response.data.data.payout_ledger_transactions.sort(
            (a: LedgerTransaction, b: LedgerTransaction) => {
              const dateA = new Date(a.payout_created_at).getTime();
              const dateB = new Date(b.payout_created_at).getTime();
              return dateB - dateA;
            }
          );
        setAllTransactions(sortedTransactions);
        setTransactions(sortedTransactions);
        toast({
          title: "Success",
          description: `Loaded ${sortedTransactions.length} transactions`,
        });
      } else {
        setAllTransactions([]);
        setTransactions([]);
        toast({
          title: "No Data",
          description: "No transactions found",
        });
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
        (txn) => txn.operator_transaction_id === txnIdToOpen
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
          transaction.operator_transaction_id,
          transaction.mobile_number,
          transaction.beneficiary_bank_name,
          transaction.beneficiary_name,
          transaction.beneficiary_account_number,
          getTransferTypeName(transaction.transfer_type),
          transaction.payout_transaction_status,
          transaction.amount.toString(),
          formatDate(transaction.payout_created_at),
        ];

        return searchableFields.some((field) =>
          String(field).toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((transaction) => {
        const transactionDate = transaction.payout_created_at;
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
          transaction.payout_transaction_status.toUpperCase() ===
          statusFilter.toUpperCase()
      );
    }

    setTransactions(filtered);
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, statusFilter, allTransactions]);

  // Clear filters
  const clearFilters = () => {
    setStartDate(getTodayDate());
    setEndDate(getTodayDate());
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
        "Transaction ID": tx.operator_transaction_id,
        "Date & Time": formatDate(tx.payout_created_at),
        "Phone Number": tx.mobile_number,
        "Bank Name": tx.beneficiary_bank_name,
        "Beneficiary Name": tx.beneficiary_name,
        "Account Number": tx.beneficiary_account_number,
        "IFSC Code": tx.beneficiary_ifsc_code,
        "Amount (₹)": tx.amount.toFixed(2),
        "Retailer Commission (₹)": (tx.retailer_commision || 0).toFixed(2),
        "TDS (₹)": (tx.tds || 0).toFixed(2),
        "Debit Amount (₹)": (tx.debit_amount || 0).toFixed(2),
        "Before Balance (₹)": (tx.before_balance || 0).toFixed(2),
        "After Balance (₹)": (tx.after_balance || 0).toFixed(2),
        "Transfer Type": getTransferTypeName(tx.transfer_type),
        Status: tx.payout_transaction_status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");

      const colWidths = [
        { wch: 8 },
        { wch: 38 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 12 },
        { wch: 18 },
        { wch: 15 },
        { wch: 18 },
        { wch: 18 },
        { wch: 15 },
        { wch: 12 },
      ];
      worksheet["!cols"] = colWidths;

      const fileName = `Ledger_${new Date().toISOString().split("T")[0]}.xlsx`;
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

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("en-IN", {
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
        return "text-green-600 bg-green-50 border-green-200";
      case "FAILED":
      case "FAILURE":
        return "text-red-600 bg-red-50 border-red-200";
      case "PENDING":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  // Pagination
  const totalPages = Math.ceil(transactions.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  const handleViewReceipt = (transaction: LedgerTransaction) => {
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
      pdf.save(
        `ledger-receipt-${selectedTransaction.operator_transaction_id}.pdf`
      );

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
          <title> Receipt</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              background: white;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header Section */}
          <div className="paybazaar-gradient rounded-lg p-6 text-white shadow-lg">
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
                  <p className="text-white/90 text-sm mt-1">
                    View and export your transaction ledger
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
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold">Filters</h2>
              </div>
              {(startDate !== getTodayDate() ||
                endDate !== getTodayDate() ||
                statusFilter !== "ALL" ||
                searchTerm) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 hover:bg-red-50"
                >
                  Clear All Filters
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || new Date().toISOString().split("T")[0]}
                  className="h-9"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="endDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={new Date().toISOString().split("T")[0]}
                  className="h-9"
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Transaction Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search transactions..."
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select
                  value={entriesPerPage.toString()}
                  onValueChange={(value) => {
                    setEntriesPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
              <div className="text-sm text-gray-600">
                (Showing {transactions.length} of {allTransactions.length})
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center whitespace-nowrap">
                      DATE & TIME
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">TRANSACTION ID</TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      PHONE
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      BANK NAME
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      BENEFICIARY
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      AMOUNT (₹)
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      COMMISSION (₹)
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      TDS (₹)
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      DEBIT (₹)
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      BEFORE BAL (₹)
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      AFTER BAL (₹)
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      TYPE
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      STATUS
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      ACTION
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center">
                          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                          <p className="text-sm text-gray-500">
                            Loading transactions...
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="h-12 w-12 text-gray-300 mb-4" />
                          <p className="text-lg font-semibold text-gray-700 mb-2">
                            {searchTerm ||
                            startDate !== getTodayDate() ||
                            endDate !== getTodayDate() ||
                            statusFilter !== "ALL"
                              ? "No matching transactions found"
                              : "No transactions found"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {searchTerm ||
                            startDate !== getTodayDate() ||
                            endDate !== getTodayDate() ||
                            statusFilter !== "ALL"
                              ? "Try adjusting your filters"
                              : "Your ledger transactions will appear here"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransactions.map((transaction, index) => (
                      <TableRow
                        key={transaction.operator_transaction_id}
                        className={`hover:bg-gray-50 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        }`}
                      >
                        <TableCell className="text-center text-sm whitespace-nowrap">
                          {formatDate(transaction.payout_created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-center">
                          {transaction.operator_transaction_id ||"-"}
                        </TableCell>

                        <TableCell className="text-center font-mono">
                          {transaction.mobile_number}
                        </TableCell>
                        <TableCell className="text-center">
                          {transaction.beneficiary_bank_name}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {transaction.beneficiary_name}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          ₹{formatAmount(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-green-600">
                          ₹{formatAmount(transaction.retailer_commision || 0)}
                        </TableCell>
                        <TableCell className="text-center text-red-600">
                          ₹{formatAmount(transaction.tds || 0)}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          ₹{formatAmount(transaction.debit_amount || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          ₹{formatAmount(transaction.before_balance || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          ₹{formatAmount(transaction.after_balance || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                            {getTransferTypeName(transaction.transfer_type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                              transaction.payout_transaction_status
                            )}`}
                          >
                            {transaction.payout_transaction_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewReceipt(transaction)}
                            className="shadow-sm h-8 px-2"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {transactions.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t">
                <div className="text-sm text-gray-600">
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
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                    })}
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
        </main>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle> Receipt</DialogTitle>
          </DialogHeader>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
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
            <div
              ref={receiptRef}
              className="bg-white p-8 space-y-6 border rounded-lg"
            >
              {/* Header */}
              <div className="text-center border-b-2 pb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  RECEIPT
                </h1>
                <p className="text-sm text-gray-600">
                  Paybazaar Technologies Pvt. Ltd.
                </p>
              </div>

              {/* Transaction Status */}
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                  <p className="font-mono text-sm font-semibold">
                    {selectedTransaction.operator_transaction_id}
                  </p>
                </div>

                <div
                  className={`text-center py-3 rounded-lg border-2 ${getStatusColorForReceipt(
                    selectedTransaction.payout_transaction_status
                  )}`}
                >
                  <p className="font-bold text-lg uppercase">
                    {selectedTransaction.payout_transaction_status}
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 pb-2 border-b">
                  Transaction Details
                </h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Date & Time</p>
                    <p className="font-medium">
                      {formatDate(selectedTransaction.payout_created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Transfer Type</p>
                    <p className="font-medium">
                      {getTransferTypeName(selectedTransaction.transfer_type)}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Phone Number</p>
                    <p className="font-medium font-mono">
                      {selectedTransaction.mobile_number}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Bank Name</p>
                    <p className="font-medium">
                      {selectedTransaction.beneficiary_bank_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Beneficiary Name</p>
                    <p className="font-medium">
                      {selectedTransaction.beneficiary_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Account Number</p>
                    <p className="font-medium font-mono">
                      {selectedTransaction.beneficiary_account_number}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">IFSC Code</p>
                    <p className="font-medium font-mono">
                      {selectedTransaction.beneficiary_ifsc_code}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 pb-2 border-b">
                  Amount Details
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Transfer Amount</span>
                    <span className="font-semibold text-lg">
                      ₹{formatAmount(selectedTransaction.amount)}
                    </span>
                  </div>

                  {/* <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Commission</span>
                    <span className="font-semibold text-green-600">
                      ₹{formatAmount(selectedTransaction.retailer_commision || 0)}
                    </span>
                  </div> */}
                  {/* 
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">TDS</span>
                    <span className="font-semibold text-red-600">
                      ₹{formatAmount(selectedTransaction.tds || 0)}
                    </span>
                  </div> */}

                  {/* <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Debit Amount</span>
                    <span className="font-semibold">
                      ₹{formatAmount(selectedTransaction.debit_amount || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Before Balance</span>
                    <span className="font-semibold">
                      ₹{formatAmount(selectedTransaction.before_balance || 0)}
                    </span>
                  </div> */}

                  {/* <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">After Balance</span>
                    <span className="font-semibold">
                      ₹{formatAmount(selectedTransaction.after_balance || 0)}
                    </span>
                  </div> */}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t pt-6 text-center space-y-2">
                <p className="text-xs text-gray-500">
                  This is a computer-generated receipt and does not require a
                  signature.
                </p>
                <p className="text-xs text-gray-500">
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
