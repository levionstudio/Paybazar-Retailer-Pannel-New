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
  FileSpreadsheet,
  Download,
  Printer,
  Filter,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface TokenData {
  user_id: string;
  user_unique_id: string;
  user_name: string;
  admin_id: string;
  distributor_id: string;
  master_distributor_id: string;
  exp: number;
}

interface Transaction {
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
  retailer_commision: number;
  payout_transaction_status: string;
  created_at: string;
  updated_at: string;
}

export default function ServiceReportSettlement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Filter states
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isExporting, setIsExporting] = useState(false);

  // Receipt dialog
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

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

  // Build query params helper
  const buildQueryParams = (params: {
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.status && params.status !== 'ALL') queryParams.append('status', params.status);
    
    return queryParams.toString();
  };

  // Fetch transactions with query params
  const fetchTransactions = async () => {
    if (!tokenData?.user_id) return;

    const token = localStorage.getItem("authToken");
    setLoading(true);

    try {
      const offset = (currentPage - 1) * entriesPerPage;
      const queryString = buildQueryParams({
        limit: entriesPerPage,
        offset: offset,
        start_date: startDate,
        end_date: endDate,
        status: statusFilter,
      });

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/payout/get/${tokenData.user_id}?${queryString}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (
        response.data?.status === "success" &&
        Array.isArray(response.data.data?.payout_transactions)

      ) {
        console.log("=== Sorting Transactions ===");
        console.log("Response:", response.data);
        const sortedTransactions = response.data.data.payout_transactions.sort(
          (a: Transaction, b: Transaction) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setTransactions(sortedTransactions);
        setTotalRecords(response.data.data?.total || sortedTransactions.length);
        
        if (sortedTransactions.length > 0) {
          toast({
            title: "Success",
            description: `Loaded ${sortedTransactions.length} transactions`,
          });
        }
      } else {
        setTransactions([]);
        setTotalRecords(0);
      }
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
      setTotalRecords(0);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions when filters or pagination changes
  useEffect(() => {
    if (tokenData) {
      fetchTransactions();
    }
  }, [tokenData, currentPage, entriesPerPage, startDate, endDate, statusFilter]);

  // Auto-open receipt if navigated with transaction ID
  useEffect(() => {
    const state = location.state as { openReceiptFor?: string };
    const txnIdFromState = state?.openReceiptFor;
    const txnIdFromStorage = localStorage.getItem("autoOpenReceipt");
    const txnIdToOpen = txnIdFromState || txnIdFromStorage;

    if (txnIdToOpen && transactions.length > 0) {
      const transaction = transactions.find(
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
  }, [location.state, transactions]);

  // Client-side search filter
  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase().trim();
    const searchableFields = [
      transaction.operator_transaction_id,
      transaction.mobile_number,
      transaction.beneficiary_bank_name,
      transaction.beneficiary_name,
      transaction.beneficiary_account_number,
      getTransferTypeName(transaction.transfer_type),
      transaction.payout_transaction_status,
      transaction.amount.toString(),
      formatDate(transaction.created_at),
    ];
    return searchableFields.some((field) =>
      String(field).toLowerCase().includes(searchLower)
    );
  });

  // Clear filters
  const clearFilters = () => {
    setStartDate(getTodayDate());
    setEndDate(getTodayDate());
    setStatusFilter("ALL");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Export to Excel - fetch all data
  const exportToExcel = async () => {
    if (!tokenData?.user_id) return;

    setIsExporting(true);

    try {
      toast({
        title: "Exporting",
        description: "Fetching all data for export...",
      });

      const token = localStorage.getItem("authToken");
      const queryString = buildQueryParams({
        limit: 10000,
        offset: 0,
        start_date: startDate,
        end_date: endDate,
        status: statusFilter,
      });

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/payout/get/${tokenData.user_id}?${queryString}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let allData: Transaction[] = response.data?.data?.payout_transactions || [];

      // Apply search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        allData = allData.filter((transaction) => {
          const searchableFields = [
            transaction.operator_transaction_id,
            transaction.mobile_number,
            transaction.beneficiary_bank_name,
            transaction.beneficiary_name,
            transaction.beneficiary_account_number,
            getTransferTypeName(transaction.transfer_type),
            transaction.payout_transaction_status,
            transaction.amount.toString(),
          ];
          return searchableFields.some((field) =>
            String(field).toLowerCase().includes(searchLower)
          );
        });
      }

      if (allData.length === 0) {
        toast({
          title: "No Data",
          description: "No transactions to export",
          variant: "destructive",
        });
        return;
      }

      const exportData = allData.map((tx, index) => ({
        "S.No": index + 1,
        "Transaction ID": tx.operator_transaction_id  || "-",
        "Date & Time": formatDate(tx.created_at),
        "Phone Number": tx.mobile_number,
        "Bank Name": tx.beneficiary_bank_name,
        "Beneficiary Name": tx.beneficiary_name,
        "Account Number": tx.beneficiary_account_number,
        "IFSC Code": tx.beneficiary_ifsc_code,
        "Amount (₹)": tx.amount.toFixed(2),
        "Transfer Type": getTransferTypeName(tx.transfer_type),
        Status: tx.payout_transaction_status,
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
        description: `Exported ${allData.length} transactions to Excel`,
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

  const formatAmount = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toLocaleString("en-IN", {
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
  const totalPages = Math.ceil(totalRecords / entriesPerPage);

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
      pdf.save(
        `settlement-receipt-${selectedTransaction.operator_transaction_id}.pdf`
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

  // Use OUTER HTML so wrapper styles are preserved
  const receiptHTML = receiptRef.current.outerHTML;

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt</title>

        <!-- Tailwind CSS (required for same styling as UI/PDF) -->
        <script src="https://cdn.tailwindcss.com"></script>

        <style>
          body {
            background: white;
            margin: 0;
            padding: 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            size: A4;
            margin: 15mm;
          }

          @media print {
            body {
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        ${receiptHTML}

        <script>
          window.onload = () => {
            window.focus();
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
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
                  <h1 className="text-2xl font-bold">Settlement Report</h1>
                  <p className="text-white/90 text-sm mt-1">
                    Detailed settlement transaction reports
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={exportToExcel}
                  disabled={isExporting || transactions.length === 0}
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export to Excel"}
                </Button>
                <Button
                  onClick={fetchTransactions}
                  disabled={loading}
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white"
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
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  max={endDate || new Date().toISOString().split("T")[0]}
                  className="h-9"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  min={startDate}
                  max={new Date().toISOString().split("T")[0]}
                  className="h-9"
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Transaction Status</Label>
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}>
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
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  type="text"
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
                (Showing {filteredTransactions.length} of {totalRecords} records)
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center whitespace-nowrap">DATE & TIME</TableHead>
                    <TableHead className="text-center whitespace-nowrap">TRANSACTION ID</TableHead>
                    <TableHead className="text-center whitespace-nowrap">PHONE</TableHead>
                    <TableHead className="text-center whitespace-nowrap">BANK NAME</TableHead>
                    <TableHead className="text-center whitespace-nowrap">BENEFICIARY</TableHead>
                    <TableHead className="text-center whitespace-nowrap">ACCOUNT NO.</TableHead>
                    <TableHead className="text-center whitespace-nowrap">AMOUNT (₹)</TableHead>
                    <TableHead className="text-center whitespace-nowrap">TYPE</TableHead>
                    <TableHead className="text-center whitespace-nowrap">COMMISSION (₹)</TableHead>
                    <TableHead className="text-center whitespace-nowrap">STATUS</TableHead>
                    <TableHead className="text-center whitespace-nowrap">ACTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                          <p className="text-gray-500">
                            Loading transactions...
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <ReceiptIcon className="h-12 w-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">
                            {searchTerm ||
                            startDate !== getTodayDate() ||
                            endDate !== getTodayDate() ||
                            statusFilter !== "ALL"
                              ? "No matching transactions found"
                              : "No transactions found"}
                          </p>
                          <p className="text-sm text-gray-400">
                            {searchTerm ||
                            startDate !== getTodayDate() ||
                            endDate !== getTodayDate() ||
                            statusFilter !== "ALL"
                              ? "Try adjusting your filters"
                              : "Your settlement transactions will appear here"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.operator_transaction_id}>
                        <TableCell className="whitespace-nowrap text-center">
                          {formatDate(transaction.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-center">
                          {transaction.operator_transaction_id ||"-"}
                        </TableCell>
                        <TableCell className="text-center">{transaction.mobile_number}</TableCell>
                        <TableCell className="text-center">
                          {transaction.beneficiary_bank_name}
                        </TableCell>
                        <TableCell className="text-center">{transaction.beneficiary_name}</TableCell>
                        <TableCell className="font-mono text-xs text-center">
                          {transaction.beneficiary_account_number}
                        </TableCell>
                        <TableCell className="font-semibold text-center">
                          ₹{formatAmount(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                            {getTransferTypeName(transaction.transfer_type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          ₹{formatAmount(transaction.retailer_commision)}
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
                            onClick={() => handleViewReceipt(transaction)}
                            size="sm"
                            variant="outline"
                            className="shadow-sm h-8 px-2"
                          >
                            <ReceiptIcon className="h-4 w-4 mr-1" />
                            Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalRecords > 0 && totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages} ({totalRecords} total records)
                </div>

                <div className="flex gap-2">
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

                  <div className="flex gap-1">
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
                          variant="outline"
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle> Receipt</DialogTitle>
          </DialogHeader>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button onClick={handlePrintReceipt} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={handleDownloadReceipt}
              variant="default"
              size="sm"
              className="paybazaar-gradient"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          {selectedTransaction && (
            <div
              ref={receiptRef}
              className="bg-white p-8 space-y-6 border rounded-lg"
            >
              {/* Header */}
              <div className="text-center border-b pb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                   RECEIPT
                </h2>
                <p className="text-sm text-black font-bold">
                  Paybazaar Technologies Pvt. Ltd.
                </p>
              </div>

              {/* Transaction Status */}
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-xs text-black mb-1">Transaction ID</p>
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
                <h3 className="font-semibold text-black pb-2 border-b">
                  Transaction Details
                </h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-black">Date & Time</p>
                    <p className="font-medium">
                      {formatDate(selectedTransaction.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-black">Transfer Type</p>
                    <p className="font-medium">
                      {getTransferTypeName(selectedTransaction.transfer_type)}
                    </p>
                  </div>

                  <div>
                    <p className="text-black">Phone Number</p>
                    <p className="font-medium">
                      {selectedTransaction.mobile_number}
                    </p>
                  </div>

                  <div>
                    <p className="text-black">Bank Name</p>
                    <p className="font-medium">
                      {selectedTransaction.beneficiary_bank_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-black">Beneficiary Name</p>
                    <p className="font-medium">
                      {selectedTransaction.beneficiary_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-black">Account Number</p>
                    <p className="font-medium font-mono">
                      {selectedTransaction.beneficiary_account_number}
                    </p>
                  </div>

                  <div>
                    <p className="text-black">IFSC Code</p>
                    <p className="font-medium font-mono">
                      {selectedTransaction.beneficiary_ifsc_code}
                    </p>
                  </div>

                  {/* {selectedTransaction.order_id && (
                    <div>
                      <p className="text-gray-500">Order ID</p>
                      <p className="font-medium font-mono">
                        {selectedTransaction.order_id}
                      </p>
                    </div>
                  )} */}
                </div>
              </div>

              {/* Amount Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black pb-2 border-b">
                  Amount Details
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-black font-medium">Transfer Amount</span>
                    <span className="font-bold text-2xl text-black">
                      ₹{formatAmount(selectedTransaction.amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t pt-6 text-center space-y-2">
                <p className="text-xs text-gray-500">
                  This is a computer-generated receipt and does not require a
                  signature.
                </p>
                           <p className="text-xs text-gray-500">
  For any technical queries, contact{" "}
  <a
    href="https://www.gvinfotech.org"
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 underline hover:text-blue-800"
  >
    www.gvinfotech.org
  </a>{" "}
  or{" "}
  <a
    href="https://www.paybazaar.in"
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 underline hover:text-blue-800"
  >
    www.paybazaar.in
  </a>
</p>

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}