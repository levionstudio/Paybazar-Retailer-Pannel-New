import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, FileSpreadsheet, Filter } from "lucide-react";
import * as XLSX from "xlsx";

interface MobileRechargeTransaction {
  mobile_recharge_transaction_id: number;
  retailer_id: string;
  retailer_name: string;
  business_name: string;
  mobile_number: number;
  operator_code: number;
  operator_name: string;
  circle_code: number;
  circle_name: string;
  recharge_type: string;
  partner_request_id: string;
  amount: number;
  commision: number;
  before_balance: number;
  after_balance: number;
  status: string;
  created_at: string;
}

interface MobileRechargeLedgerProps {
  userId: string;
}

export default function MobileRechargeLedger({ userId }: MobileRechargeLedgerProps) {
  const { toast } = useToast();
  
  const getTodayDate = () => new Date().toISOString().split("T")[0];
  
  const [transactions, setTransactions] = useState<MobileRechargeTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());

  const buildQueryParams = (params: any) => {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.offset !== undefined) queryParams.append("offset", params.offset.toString());
    if (params.start_date) queryParams.append("start_date", params.start_date);
    if (params.end_date) queryParams.append("end_date", params.end_date);
    if (params.status && params.status !== "ALL") queryParams.append("status", params.status);
    return queryParams.toString();
  };

  const fetchTransactions = async () => {
    if (!userId) return;
    const token = localStorage.getItem("authToken");
    setLoading(true);

    try {
      const offset = (currentPage - 1) * entriesPerPage;
      const queryString = buildQueryParams({
        limit: entriesPerPage,
        offset,
        start_date: startDate,
        end_date: endDate,
        status: statusFilter,
      });

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/mobile_recharge/get/${userId}?${queryString}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.status === "success" && Array.isArray(response.data.data?.recharges)) {
        console.log("Mobile Recharge Transactions:", response.data.data.recharges);
        const sorted = response.data.data.recharges.sort(
          (a: MobileRechargeTransaction, b: MobileRechargeTransaction) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setTransactions(sorted);
        setTotalRecords(response.data.data?.total || sorted.length);
      } else {
        setTransactions([]);
        setTotalRecords(0);
      }
    } catch (error: any) {
      setTransactions([]);
      setTotalRecords(0);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch mobile recharge transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchTransactions();
  }, [userId, currentPage, entriesPerPage, startDate, endDate, statusFilter]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount: number) =>
    amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS": return "bg-green-600 text-white";
      case "FAILED": case "FAILURE": return "bg-red-600 text-white";
      case "PENDING": return "bg-yellow-600 text-white";
      default: return "bg-gray-600 text-white";
    }
  };

  const getRechargeTypeName = (rechargeType: string) => {
    switch (rechargeType) {
      case "1": return "Prepaid";
      case "2": return "Postpaid";
      case "3": return "DTH";
      default: return rechargeType;
    }
  };

  const exportToExcel = () => {
    if (transactions.length === 0) {
      toast({ title: "No Data", description: "No transactions to export", variant: "destructive" });
      return;
    }

    const exportData = transactions.map((tx, i) => ({
      "S.No": i + 1,
      "Transaction ID": tx.mobile_recharge_transaction_id,
      "Date & Time": formatDate(tx.created_at),
      "Retailer ID": tx.retailer_id,
      "Retailer Name": tx.retailer_name,
      "Mobile Number": tx.mobile_number,
      "Business Name": tx.business_name,
      "Operator": tx.operator_name,
      "Circle": tx.circle_name,
      "Recharge Type": getRechargeTypeName(tx.recharge_type),
      "Before Balance (₹)": tx.before_balance.toFixed(2),
      "After Balance (₹)": tx.after_balance.toFixed(2),
      "Amount (₹)": tx.amount.toFixed(2),
      "Commission (₹)": (tx.commision || 0).toFixed(2),
      "Status": tx.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mobile Recharge");
    XLSX.writeFile(workbook, `Mobile_Recharge_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "Success", description: `Exported ${transactions.length} transactions` });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setStartDate(getTodayDate());
    setEndDate(getTodayDate());
    setCurrentPage(1);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      tx.mobile_recharge_transaction_id.toString().includes(searchLower) ||
      tx.mobile_number.toString().includes(searchLower) ||
      tx.operator_name.toLowerCase().includes(searchLower) ||
      tx.circle_name.toLowerCase().includes(searchLower) ||
      tx.status.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(totalRecords / entriesPerPage);

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          {(searchTerm || statusFilter !== "ALL" || startDate !== getTodayDate() || endDate !== getTodayDate()) && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="text-red-600 hover:bg-red-50">
              Clear All Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              max={endDate || getTodayDate()}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              min={startDate}
              max={getTodayDate()}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label>Transaction Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
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

          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions..."
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Table */}
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
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              (Showing {filteredTransactions.length} of {totalRecords} records)
            </div>
            <Button onClick={exportToExcel} disabled={filteredTransactions.length === 0} variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={fetchTransactions} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-center">DATE & TIME</TableHead>
                <TableHead className="text-center">TRANSACTION ID</TableHead>
                <TableHead className="text-center">MOBILE NUMBER</TableHead>
                <TableHead className="text-center">OPERATOR</TableHead>
                <TableHead className="text-center">CIRCLE</TableHead>
                <TableHead className="text-center">TYPE</TableHead>
                <TableHead className="text-center">BEFORE BAL (₹)</TableHead>
                <TableHead className="text-center">AFTER BAL (₹)</TableHead>
                <TableHead className="text-center">AMOUNT (₹)</TableHead>
                <TableHead className="text-center">COMMISSION (₹)</TableHead>
                <TableHead className="text-center">STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Loading transactions...</p>
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
                    <p className="text-gray-500 font-medium">No transactions found</p>
                    <p className="text-sm text-gray-400">
                      {searchTerm || statusFilter !== "ALL" ? "Try adjusting your filters" : "Your mobile recharge transactions will appear here"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.mobile_recharge_transaction_id}>
                    <TableCell className="text-center">{formatDate(transaction.created_at)}</TableCell>
                    <TableCell className="text-center font-mono text-xs">{transaction.mobile_recharge_transaction_id}</TableCell>
                    <TableCell className="text-center">{transaction.mobile_number}</TableCell>
                    <TableCell className="text-center">{transaction.operator_name}</TableCell>
                    <TableCell className="text-center">{transaction.circle_name}</TableCell>
                    <TableCell className="text-center">{getRechargeTypeName(transaction.recharge_type)}</TableCell>
                    <TableCell className="text-center text-blue-600">₹{formatAmount(transaction.before_balance)}</TableCell>
                    <TableCell className="text-center text-blue-600">₹{formatAmount(transaction.after_balance)}</TableCell>
                    <TableCell className="text-center font-semibold text-green-600">₹{formatAmount(transaction.amount)}</TableCell>
                    <TableCell className="text-center">₹{formatAmount(transaction.commision || 0)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
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
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                      className={currentPage === pageNum ? "paybazaar-gradient text-white" : ""}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}