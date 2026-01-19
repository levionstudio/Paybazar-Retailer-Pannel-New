import { useState, useEffect } from "react";
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
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Calendar,
  Loader2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

/* -------------------- INTERFACES -------------------- */

interface DecodedToken {
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

interface WalletTransactionRaw {
  wallet_transaction_id: string;
  user_id: string;
  reference_id: string;
  credit_amount?: string;
  debit_amount?: string;
  before_balance: string;
  after_balance: string;
  transaction_reason: string;
  remarks: string;
  created_at: string;
}

interface WalletTransaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  reason: string;
  remarks: string;
  beforeBalance: number;
  afterBalance: number;
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/* -------------------- COMPONENT -------------------- */

const UserWalletTransactions = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  /* -------------------- HELPER: Get Today's Date -------------------- */
  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };


  const [userId, setUserId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  /* -------------------- TOKEN VALIDATION -------------------- */

  /* -------------------- HELPER: Get Today's Date -------------------- */


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
      const decoded = jwtDecode<DecodedToken>(token);

      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("authToken");
        toast({
          title: "Session expired",
          description: "Your session has expired. Please login again.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Check if user role is retailer
      if (decoded.user_role !== "retailer") {
        localStorage.removeItem("authToken");
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      setUserId(decoded.user_id);
    } catch (error) {
      console.error("Token decode error:", error);
      localStorage.removeItem("authToken");
      toast({
        title: "Invalid session",
        description: "Please login again.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [navigate, toast]);

  /* -------------------- VALIDATE DATES -------------------- */

  const validateDates = (): boolean => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        toast({
          title: "Invalid Date Range",
          description: "Start date cannot be after end date.",
          variant: "destructive",
        });
        return false;
      }

      const today = new Date(getTodayDate());
      if (start > today || end > today) {
        toast({
          title: "Invalid Date",
          description: "Dates cannot be in the future.",
          variant: "destructive",
        });
        return false;
      }
    }
    
    return true;
  };

  /* -------------------- FETCH TRANSACTIONS WITH LIMIT/OFFSET -------------------- */

  const fetchTransactions = async (resetPage = false) => {
    if (!userId) return;

    if (!validateDates()) return;

    const token = localStorage.getItem("authToken");
    setLoading(true);

    const page = resetPage ? 1 : currentPage;
    const limit = entriesPerPage;
    const offset = (page - 1) * limit;

    // Validate limit and offset
    if (limit < 1 || limit > 100) {
      toast({
        title: "Invalid Limit",
        description: "Entries per page must be between 1 and 100.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (offset < 0) {
      toast({
        title: "Invalid Page",
        description: "Page number is invalid.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Build query params
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      if (startDate) {
        params.append("start_date", startDate);
      }

      if (endDate) {
        params.append("end_date", endDate);
      }

      const res = await axios.get(
        import.meta.env.VITE_API_BASE_URL + `/wallet/get/transaction/retailer/${userId}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.status === "success") {
        const raw: WalletTransactionRaw[] = res.data?.data?.transactions || [];
        const total = res.data?.data?.total || raw.length;

        const mapped: WalletTransaction[] = raw.map((tx) => {
          const isCredit = !!tx.credit_amount;

          return {
            id: tx.wallet_transaction_id,
            type: isCredit ? "CREDIT" : "DEBIT",
            amount: parseFloat(tx.credit_amount || tx.debit_amount || "0"),
            reason: tx.transaction_reason,
            remarks: tx.remarks,
            beforeBalance: parseFloat(tx.before_balance),
            afterBalance: parseFloat(tx.after_balance),
            createdAt: tx.created_at,
          };
        });

        setTransactions(mapped);
        setTotalCount(total);

        if (resetPage) {
          setCurrentPage(1);
        }

        if (mapped.length > 0) {
          toast({
            title: "Success",
            description: `Loaded ${mapped.length} of ${total} transaction${total > 1 ? 's' : ''}`,
          });
        }
      } else {
        setTransactions([]);
        setTotalCount(0);
      }
    } catch (error: any) {
      console.error("Error fetching wallet transactions:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Unable to fetch transactions",
        variant: "destructive",
      });
      setTransactions([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (userId) {
      fetchTransactions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, searchTerm, startDate, endDate, entriesPerPage]);

  // Fetch when page changes
  useEffect(() => {
    if (userId && currentPage > 1) {
      fetchTransactions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  /* -------------------- CLEAR FILTERS -------------------- */

  const clearAllFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || startDate || endDate;

  /* -------------------- EXPORT TO EXCEL (ALL DATA) -------------------- */

  const exportToExcel = async () => {
    if (!userId) return;

    if (totalCount === 0) {
      toast({
        title: "No Data",
        description: "No transactions to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const token = localStorage.getItem("authToken");
      
      // Fetch all data for export
      const params = new URLSearchParams({
        limit: totalCount.toString(),
        offset: "0",
      });

      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      if (startDate) {
        params.append("start_date", startDate);
      }

      if (endDate) {
        params.append("end_date", endDate);
      }

      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/wallet/get/transaction/retailer/${userId}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.status === "success") {
        const raw: WalletTransactionRaw[] = res.data?.data?.transactions || [];

        const exportData = raw.map((tx, index) => {
          const isCredit = !!tx.credit_amount;
          const amount = parseFloat(tx.credit_amount || tx.debit_amount || "0");
          
          return {
            "S.No": index + 1,
            "Date & Time": formatDateTimeExport(tx.created_at),
            "Transaction ID": tx.wallet_transaction_id,
            "Type": isCredit ? "CREDIT" : "DEBIT",
            "Reason": tx.transaction_reason,
            "Amount (₹)": amount.toFixed(2),
            "Before Balance (₹)": parseFloat(tx.before_balance).toFixed(2),
            "After Balance (₹)": parseFloat(tx.after_balance).toFixed(2),
            "Remarks": tx.remarks,
          };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Wallet Transactions");

        // Set column widths
        worksheet["!cols"] = [
          { wch: 8 },  // S.No
          { wch: 20 }, // Date & Time
          { wch: 20 }, // Transaction ID
          { wch: 12 }, // Type
          { wch: 20 }, // Reason
          { wch: 15 }, // Amount
          { wch: 18 }, // Before Balance
          { wch: 18 }, // After Balance
          { wch: 30 }, // Remarks
        ];

        const fileName = `Wallet_Transactions_${new Date().toISOString().split("T")[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        toast({
          title: "Success",
          description: `Exported ${exportData.length} transaction${exportData.length > 1 ? 's' : ''}`,
        });
      }
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

  /* -------------------- HELPERS -------------------- */

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return (
        <div className="text-center">
          <div className="font-medium text-sm">
            {date.toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            {date.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </div>
        </div>
      );
    } catch {
      return "-";
    }
  };

  const formatDateTimeExport = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("en-IN");
    } catch {
      return "-";
    }
  };

  const getTypeBadge = (type: "CREDIT" | "DEBIT") =>
    type === "CREDIT" ? (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
        Credit
      </span>
    ) : (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
        Debit
      </span>
    );

  /* -------------------- PAGINATION -------------------- */

  const totalPages = Math.ceil(totalCount / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + transactions.length, totalCount);

  /* -------------------- RENDER -------------------- */

  if (loading && !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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
                  <h1 className="text-2xl font-bold">Wallet Transactions</h1>
                  <p className="text-white/80 text-sm mt-1">
                    View and export your wallet transaction history
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={exportToExcel}
                  className="bg-white text-primary hover:bg-white/90 font-semibold"
                  disabled={loading || isExporting || totalCount === 0}
                >
                  <FileSpreadsheet
                    className={`h-4 w-4 mr-2 ${isExporting ? "animate-pulse" : ""}`}
                  />
                  {isExporting ? "Exporting..." : "Export to Excel"}
                </Button>
                <Button
                  onClick={() => fetchTransactions(true)}
                  className="bg-white text-primary hover:bg-white/90 font-semibold"
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

          {/* Filters Section */}
          <div className="p-6 pb-0">
            <div className="bg-card rounded-lg border border-border shadow-sm p-4 mb-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Filters
                  </h3>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Search</Label>
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by ID, reason, remarks..."
                      className="h-9"
                    />
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">From Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate || getTodayDate()}
                      className="h-9"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">To Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      max={getTodayDate()}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="px-6 pb-6">
            <div className="bg-card rounded-lg border border-border shadow-lg overflow-hidden">
              {/* Table Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b bg-gray-50 px-4 md:px-6 py-4 gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Show</span>
                  <Select
                    value={entriesPerPage.toString()}
                    onValueChange={(value) => {
                      setEntriesPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-20 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm font-medium text-gray-700">entries</span>
                </div>
                <div className="text-sm text-gray-700">
                  Showing {totalCount > 0 ? startIndex + 1 : 0} to {endIndex} of {totalCount} entries
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-semibold text-gray-900">
                      No transactions found
                    </p>
                    <p className="text-sm text-gray-600">
                      {hasActiveFilters
                        ? "Try adjusting your filters"
                        : "Your transactions will appear here"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          S.No
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          Date & Time
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          Transaction ID
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          Type
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          Reason
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          Amount (₹)
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          Before Balance
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          After Balance
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          Remarks
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx, idx) => (
                        <TableRow
                          key={tx.id}
                          className={`border-b hover:bg-gray-50 ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                          }`}
                        >
                          <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                            {startIndex + idx + 1}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                            {formatDateTime(tx.createdAt)}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center font-mono text-sm text-gray-900 whitespace-nowrap">
                            {tx.id}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                            {getTypeBadge(tx.type)}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                            {tx.reason}
                          </TableCell>
                          <TableCell
                            className={`py-3 px-4 text-center font-semibold text-sm whitespace-nowrap ${
                              tx.type === "CREDIT" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {tx.type === "CREDIT" ? "+" : "-"}₹
                            {tx.amount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                            ₹
                            {tx.beforeBalance.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                            ₹
                            {tx.afterBalance.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center text-sm text-gray-600">
                            {tx.remarks}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {totalCount > 0 && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t px-4 md:px-6 py-4 gap-3">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserWalletTransactions;