import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Calendar,
  Filter,
  Loader2,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

/* -------------------- INTERFACES -------------------- */

interface DecodedToken {
  admin_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

interface FundRequestRaw {
  fund_request_id: number;
  requester_id: string;
  request_to_id: string;
  amount: number;
  bank_name: string;
  request_date: string;
  utr_number: string;
  request_status: string;
  remarks: string;
  admin_remarks?: string;
  reject_remarks: string;
  created_at: string;
  updated_at: string;
}

interface FundRequest {
  id: number;
  requesterId: string;
  requestToId: string;
  amount: number;
  bankName: string;
  requestDate: string;
  utrNumber: string;
  status: string;
  remarks: string;
  rejectRemarks: string;
  adminRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

/* -------------------- COMPONENT -------------------- */

const GetFundRequests = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const [userId, setUserId] = useState<string | null>(null);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states - Initialize with today's date
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [statusFilter, setStatusFilter] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  /* -------------------- TOKEN VALIDATION -------------------- */

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("authToken");

      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access this page.",
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
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
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
      } catch (err) {
        console.error("Token decode error:", err);
        localStorage.removeItem("authToken");
        toast({
          title: "Authentication Error",
          description: "Invalid session. Please log in again.",
          variant: "destructive",
        });
        navigate("/login");
      }
    };

    checkAuth();
  }, [toast, navigate]);

  /* -------------------- FETCH FUND REQUESTS -------------------- */

  const fetchRequests = async () => {
    if (!userId) return;

    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      setLoading(true);

      // Calculate offset for pagination
      const offset = (currentPage - 1) * entriesPerPage;

      // Build payload
      const payload: any = {
        id: userId,
        limit: entriesPerPage,
        offset: offset,
      };

      // Add optional filters
      if (startDate) {
        payload.start_date = new Date(startDate).toISOString();
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        payload.end_date = end.toISOString();
      }
      if (statusFilter && statusFilter !== "") {
        payload.status = statusFilter;
      }

      const { data } = await axios.post(
       import.meta.env.VITE_API_BASE_URL + "/fund_request/get/requester",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data.status === "success") {
        const raw: FundRequestRaw[] = data.data?.fund_requests || [];

        const mapped: FundRequest[] = raw.map((req) => ({
          id: req.fund_request_id,
          requesterId: req.requester_id,
          requestToId: req.request_to_id,
          amount: req.amount,
          bankName: req.bank_name,
          requestDate: req.request_date,
          utrNumber: req.utr_number,
          status: req.request_status,
          remarks: req.remarks,
          adminRemarks: req.admin_remarks,
          rejectRemarks: req.reject_remarks,
          createdAt: req.created_at,
          updatedAt: req.updated_at,
        }));

        setFundRequests(mapped);
        setTotalRecords(data.data?.total || mapped.length);
      } else {
        setFundRequests([]);
        setTotalRecords(0);
      }
    } catch (err: any) {
      console.error("Fetch request error:", err);
      setFundRequests([]);
      setTotalRecords(0);
      toast({
        title: "Error",
        description:
          err.response?.data?.message || "Failed to fetch fund requests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentPage, entriesPerPage, startDate, endDate, statusFilter]);

  /* -------------------- CLEAR FILTERS -------------------- */

  const clearFilters = () => {
    const today = getTodayDate();
    setStartDate(today);
    setEndDate(today);
    setStatusFilter("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || statusFilter;

  /* -------------------- CLIENT-SIDE SEARCH -------------------- */

  const filteredRequests = fundRequests.filter((request) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      request.utrNumber.toLowerCase().includes(searchLower) ||
      request.bankName.toLowerCase().includes(searchLower) ||
      request.remarks.toLowerCase().includes(searchLower) ||
      request.adminRemarks?.toLowerCase().includes(searchLower) ||
      request.status.toLowerCase().includes(searchLower) ||
      request.amount.toString().includes(searchLower)
    );
  });

  /* -------------------- EXPORT TO EXCEL -------------------- */

  const exportToExcel = () => {
    if (filteredRequests.length === 0) {
      toast({
        title: "No Data",
        description: "No fund requests to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportData = filteredRequests.map((request, index) => ({
        "S.No": index + 1,
        "Date & Time": formatDateTime(request.createdAt),
        "Request Date": formatDate(request.requestDate),
        "Amount (₹)": request.amount.toFixed(2),
        "Bank Name": request.bankName,
        "UTR Number": request.utrNumber,
        "User Remarks": request.remarks,
        "Admin Remarks": request.adminRemarks || "-",
        Status: request.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fund Requests");

      worksheet["!cols"] = [
        { wch: 8 },  // S.No
        { wch: 20 }, // Date & Time
        { wch: 15 }, // Request Date
        { wch: 15 }, // Amount
        { wch: 20 }, // Bank Name
        { wch: 20 }, // UTR Number
        { wch: 30 }, // User Remarks
        { wch: 30 }, // Admin Remarks
        { wch: 12 }, // Status
      ];

      const fileName = `Fund_Requests_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Success",
        description: `Exported ${filteredRequests.length} fund request${
          filteredRequests.length > 1 ? "s" : ""
        }`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Unable to export fund requests",
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
      return new Date(dateString).toLocaleString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case "APPROVED":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
            Rejected
          </span>
        );
      case "PENDING":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
            Pending
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
            {status}
          </span>
        );
    }
  };

  /* -------------------- PAGINATION -------------------- */

  const totalPages = Math.ceil(totalRecords / entriesPerPage);

  /* -------------------- LOADING STATE -------------------- */

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  /* -------------------- RENDER -------------------- */

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
                  <h1 className="text-2xl font-bold">My Fund Requests</h1>
                  <p className="text-white/80 text-sm mt-1">
                    View and export your fund request history
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={exportToExcel}
                  className="bg-white text-primary hover:bg-white/90"
                  disabled={loading || isExporting || filteredRequests.length === 0}
                >
                  <FileSpreadsheet
                    className={`h-4 w-4 mr-2 ${
                      isExporting ? "animate-pulse" : ""
                    }`}
                  />
                  {isExporting ? "Exporting..." : "Export to Excel"}
                </Button>
                <Button
                  onClick={fetchRequests}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    Filters
                  </h3>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Start Date
                    </Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-9"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      End Date
                    </Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      min={startDate}
                      className="h-9"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={statusFilter || "ALL"}
                      onValueChange={(value) => {
                        setStatusFilter(value === "ALL" ? "" : value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Search</Label>
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search UTR, bank, remarks..."
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
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm font-medium text-gray-700">entries</span>
                </div>
                <div className="text-sm text-gray-700">
                  Showing {filteredRequests.length > 0 ? ((currentPage - 1) * entriesPerPage) + 1 : 0} to{" "}
                  {Math.min(currentPage * entriesPerPage, totalRecords)} of {totalRecords} entries
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Loading fund requests...
                    </p>
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-semibold text-gray-900">
                      No fund requests found
                    </p>
                    <p className="text-sm text-gray-600">
                      {hasActiveFilters
                        ? "Try adjusting your filters"
                        : "Your fund requests will appear here"}
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
                          Request Date
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          Amount (₹)
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          Bank Name
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          UTR Number
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          User Remarks
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          Admin Remarks
                        </TableHead>
                        
                        <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request, idx) => (
                        <TableRow
                          key={request.id}
                          className={`border-b hover:bg-gray-50 ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                          }`}
                        >
                          <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                            {(currentPage - 1) * entriesPerPage + idx + 1}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                            {formatDateTime(request.createdAt)}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                            {formatDate(request.requestDate)}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center font-semibold text-sm text-gray-900 whitespace-nowrap">
                            ₹{request.amount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                            {request.bankName}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center font-mono text-sm text-gray-900 whitespace-nowrap">
                            {request.utrNumber}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center text-sm text-gray-600">
                            <div
                              className="max-w-[200px] mx-auto truncate"
                              title={request.remarks}
                            >
                              {request.remarks}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center text-sm text-gray-600">
                            <div
                              className="max-w-[200px] mx-auto truncate"
                              title={request.rejectRemarks}
                            >
                              {request.rejectRemarks || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                            {getStatusBadge(request.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {totalRecords > 0 && totalPages > 1 && (
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

export default GetFundRequests;