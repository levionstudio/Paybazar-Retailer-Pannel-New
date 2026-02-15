import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tv,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Search,
  X,
  Loader2,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

// Types
interface Operator {
  operator_code: string;
  operator_name: string;
}

interface RechargeHistory {
  dth_transaction_id: number;
  retailer_id: string;
  customer_id: string;
  operator_name: string;
  operator_code: number;
  amount: number;
  partner_request_id: string;
  status: string;
  created_at: string;
  commision: number;
}

const DTHRecharge = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [retailerId, setRetailerId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOperators, setIsLoadingOperators] = useState(true);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [filteredOperators, setFilteredOperators] = useState<Operator[]>([]);
  const [operatorSearchQuery, setOperatorSearchQuery] = useState("");
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Recharge form state
  const [rechargeForm, setRechargeForm] = useState({
    customerId: "",
    operatorCode: "",
    operatorName: "",
    amount: "",
  });

  // Extract retailer ID from JWT token
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    
    if (!token) {
      toast({
        title: "⚠️ Authentication Required",
        description: "Please log in to access DTH recharge services",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    
    try {
      const decoded: JwtPayload = jwtDecode(token);
      
      //@ts-ignore
      const userId =
        decoded.retailer_id || decoded.data?.user_id || decoded.user_id;

      if (!userId) {
        toast({
          title: "⚠️ Session Error",
          description: "Unable to verify your identity. Please log in again.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      setRetailerId(userId);
    } catch (error) {
      console.error("JWT Decode Error:", error);
      toast({
        title: "⚠️ Session Expired",
        description: "Your session has expired. Please log in again to continue.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [toast, navigate]);

  // Fetch operators
  useEffect(() => {
    const fetchOperators = async () => {
      setIsLoadingOperators(true);
      try {
        const url = `${API_BASE_URL}/dth_recharge/get/operators`;

        const response = await axios.get(url, getAuthHeaders());

        const operatorsData = response.data?.data?.operators || [];
        
        if (!Array.isArray(operatorsData)) {
          throw new Error("Invalid response format");
        }

        if (operatorsData.length === 0) {
          toast({
            title: "⚠️ No Operators Available",
            description: "No DTH operators are currently available. Please try again later.",
            variant: "destructive",
          });
        }
        
        setOperators(operatorsData);
        setFilteredOperators(operatorsData);
      } catch (error: any) {
        console.error("Error fetching operators:", error);
        
        setOperators([]);
        setFilteredOperators([]);
        
        let errorMessage = "Unable to load DTH operators. Please try again.";
        
        if (!navigator.onLine) {
          errorMessage = "No internet connection. Please check your network and try again.";
        } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
          errorMessage = "Request timed out. Please check your connection and try again.";
        } else if (error.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (error.response?.status === 500) {
          errorMessage = "Server error. Our team has been notified. Please try again later.";
        }
        
        toast({
          title: "❌ Failed to Load Operators",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingOperators(false);
      }
    };

    fetchOperators();
  }, [toast]);

  // Filter operators based on search query
  useEffect(() => {
    if (operatorSearchQuery.trim() === "") {
      setFilteredOperators(operators);
    } else {
      const filtered = operators.filter((operator) =>
        operator.operator_name
          .toLowerCase()
          .includes(operatorSearchQuery.toLowerCase())
      );
      setFilteredOperators(filtered);
    }
  }, [operatorSearchQuery, operators]);

  // Fetch recharge history
  const fetchRechargeHistory = async () => {
    if (!retailerId) {
      return;
    }

    setIsLoadingHistory(true);
    
    try {
      const url = `${API_BASE_URL}/dth_recharge/get/${retailerId}`;

      const response = await axios.get(url, getAuthHeaders());
      
      const historyData = response.data?.data?.recharges || [];

      if (!Array.isArray(historyData)) {
        throw new Error("Invalid response format");
      }
      
      setRechargeHistory(historyData);
      
      // Show success message only if there's history
      if (historyData.length > 0) {
        toast({
          title: "✓ History Loaded",
          description: `Found ${historyData.length} recent recharge${historyData.length > 1 ? 's' : ''}`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching recharge history:", error);
      
      setRechargeHistory([]);
      
      // Only show toast if it's not a "no data" error
      if (error.response?.status !== 404) {
        let errorMessage = "Unable to load your recharge history.";
        
        if (!navigator.onLine) {
          errorMessage = "No internet connection. Please check your network.";
        } else if (error.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (error.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        }
        
        toast({
          title: "⚠️ History Load Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (retailerId) {
      fetchRechargeHistory();
    }
  }, [retailerId]);

  // Handle operator change
  const handleOperatorChange = (value: string) => {
    const selectedOperator = operators.find(
      (op) => op.operator_code === value
    );
    
    if (selectedOperator) {
      setRechargeForm({
        ...rechargeForm,
        operatorCode: value,
        operatorName: selectedOperator.operator_name,
      });
      
      toast({
        title: "✓ Operator Selected",
        description: `${selectedOperator.operator_name} selected`,
      });
    }
  };

  // Validate customer ID
  const validateCustomerId = (id: string): boolean => {
    // DTH customer IDs are typically 8-12 digits
    const customerIdRegex = /^\d{8,12}$/;
    return customerIdRegex.test(id);
  };

  // Handle recharge submission
  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!retailerId) {
      toast({
        title: "⚠️ Session Error",
        description: "Your session has expired. Please log in again to continue.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    // Comprehensive validation
    if (!rechargeForm.customerId) {
      toast({
        title: "⚠️ Customer ID Required",
        description: "Please enter your DTH customer ID or subscriber ID",
        variant: "destructive",
      });
      return;
    }

    if (!validateCustomerId(rechargeForm.customerId)) {
      toast({
        title: "⚠️ Invalid Customer ID",
        description: "DTH customer ID must be 8 to 12 digits. Please check and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!rechargeForm.operatorCode) {
      toast({
        title: "⚠️ Operator Not Selected",
        description: "Please select your DTH operator",
        variant: "destructive",
      });
      return;
    }

    if (!rechargeForm.amount) {
      toast({
        title: "⚠️ Amount Required",
        description: "Please enter the recharge amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(rechargeForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "⚠️ Invalid Amount",
        description: "Please enter a valid recharge amount greater than ₹0",
        variant: "destructive",
      });
      return;
    }

    if (amount < 200) {
      toast({
        title: "⚠️ Amount Too Low",
        description: "Minimum DTH recharge amount is ₹200. Please enter at least ₹200.",
        variant: "destructive",
      });
      return;
    }

    if (amount > 50000) {
      toast({
        title: "⚠️ Amount Too High",
        description: "Maximum DTH recharge amount is ₹50,000 per transaction",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const requestBody = {
        retailer_id: retailerId,
        customer_id: rechargeForm.customerId,
        operator_name: rechargeForm.operatorName,
        operator_code: parseInt(rechargeForm.operatorCode),
        amount: amount,
      };

      const response = await axios.post(
        `${API_BASE_URL}/dth_recharge/create`,
        requestBody,
        getAuthHeaders()
      );

      if (response.status === 200 || response.status === 201) {
        const responseMessage = response.data?.message || "DTH recharge initiated successfully";
        
        toast({
          title: "🎉 Recharge Successful!",
          description: `₹${amount.toLocaleString('en-IN')} recharged successfully for ${rechargeForm.customerId} (${rechargeForm.operatorName})`,
        });

        // Reset form
        setRechargeForm({
          customerId: "",
          operatorCode: "",
          operatorName: "",
          amount: "",
        });

        // Refresh history
        fetchRechargeHistory();
      }
    } catch (error: any) {
      console.error("Recharge error:", error);

      let errorTitle = "❌ Recharge Failed";
      let errorMessage = "Unable to process your DTH recharge. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorTitle = "⚠️ Invalid Request";
        errorMessage = "The recharge information provided is invalid. Please check and try again.";
      } else if (error.response?.status === 401) {
        errorTitle = "🔒 Session Expired";
        errorMessage = "Your session has expired. Please log in again to continue.";
      } else if (error.response?.status === 402) {
        errorTitle = "💰 Insufficient Balance";
        errorMessage = "You don't have enough balance to complete this recharge. Please add funds to your wallet.";
      } else if (error.response?.status === 403) {
        errorTitle = "🚫 Access Denied";
        errorMessage = "You don't have permission to perform this recharge.";
      } else if (error.response?.status === 404) {
        errorTitle = "⚠️ Service Not Found";
        errorMessage = "The recharge service is temporarily unavailable. Please try again later.";
      } else if (error.response?.status === 500) {
        errorTitle = "⚠️ Server Error";
        errorMessage = "Our server encountered an error. Our team has been notified. Please try again later.";
      } else if (error.response?.status === 503) {
        errorTitle = "⚠️ Service Unavailable";
        errorMessage = "The recharge service is temporarily down for maintenance. Please try again in a few minutes.";
      } else if (!navigator.onLine) {
        errorTitle = "📡 No Internet Connection";
        errorMessage = "Please check your internet connection and try again.";
      } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorTitle = "⏱️ Request Timeout";
        errorMessage = "The request took too long. Please check your connection and try again.";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
            <RefreshCw className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate("/recharge")}
              className="gap-2 hover:bg-muted/50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Recharge
            </Button>

            {/* DTH Recharge Card */}
            <Card className="shadow-lg border-border/50">
              <CardHeader className="paybazaar-gradient text-white rounded-t-xl space-y-1 pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Tv className="w-5 h-5" />
                  DTH Recharge
                </CardTitle>
                <p className="text-sm text-white/90">
                  Instant DTH recharge for all major satellite TV operators
                </p>
              </CardHeader>

              <CardContent className="pt-6 pb-8 px-6">
                <form onSubmit={handleRechargeSubmit} className="space-y-6">
                  {/* Customer ID */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="customerId"
                      className="text-sm font-medium text-foreground"
                    >
                      DTH Customer ID / Subscriber ID <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customerId"
                      type="text"
                      placeholder="Enter 8 to 12 digit customer ID"
                      value={rechargeForm.customerId}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value.length <= 12) {
                          setRechargeForm({
                            ...rechargeForm,
                            customerId: value,
                          });
                        }
                      }}
                      maxLength={12}
                      inputMode="numeric"
                      required
                      disabled={isLoading}
                      className="h-12 text-base"
                    />
                    {rechargeForm.customerId.length > 0 &&
                      rechargeForm.customerId.length < 8 && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {8 - rechargeForm.customerId.length} more digit{8 - rechargeForm.customerId.length > 1 ? 's' : ''} required (minimum 8)
                        </p>
                      )}
                    {rechargeForm.customerId.length >= 8 &&
                      !validateCustomerId(rechargeForm.customerId) && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Customer ID must be 8-12 digits
                        </p>
                      )}
                    {rechargeForm.customerId.length >= 8 &&
                      validateCustomerId(rechargeForm.customerId) && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Valid customer ID
                        </p>
                      )}
                  </div>

                  {/* Operator */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="operator"
                      className="text-sm font-medium text-foreground"
                    >
                      DTH Operator <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={rechargeForm.operatorCode}
                      onValueChange={handleOperatorChange}
                      disabled={isLoading || isLoadingOperators}
                      required
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder={isLoadingOperators ? "Loading operators..." : "Select your DTH operator"} />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Search Input Inside Dropdown */}
                        <div className="sticky top-0 bg-background z-10 p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Search operators..."
                              value={operatorSearchQuery}
                              onChange={(e) => {
                                e.stopPropagation();
                                setOperatorSearchQuery(e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="h-9 pl-9 pr-9"
                            />
                            {operatorSearchQuery && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOperatorSearchQuery("");
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Operators List */}
                        <div className="max-h-[300px] overflow-y-auto">
                          {isLoadingOperators ? (
                            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                              <Loader2 className="w-6 h-6 animate-spin mb-2" />
                              <p className="text-sm">Loading operators...</p>
                            </div>
                          ) : Array.isArray(filteredOperators) && filteredOperators.length > 0 ? (
                            filteredOperators.map((operator) => (
                              <SelectItem
                                key={operator.operator_code}
                                value={operator.operator_code}
                              >
                                {operator.operator_name}
                              </SelectItem>
                            ))
                          ) : operatorSearchQuery ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              No operators found for "{operatorSearchQuery}"
                            </div>
                          ) : (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              No DTH operators available
                            </div>
                          )}
                        </div>

                        {/* Results Count */}
                        {operatorSearchQuery && filteredOperators.length > 0 && (
                          <div className="sticky bottom-0 bg-background border-t p-2 text-xs text-center text-muted-foreground">
                            Showing {filteredOperators.length} of {operators.length} operators
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="amount"
                      className="text-sm font-medium text-foreground"
                    >
                      Recharge Amount <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        ₹
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter recharge amount"
                        value={rechargeForm.amount}
                        onChange={(e) =>
                          setRechargeForm({
                            ...rechargeForm,
                            amount: e.target.value,
                          })
                        }
                        min="200"
                        max="50000"
                        step="1"
                        required
                        disabled={isLoading}
                        className="h-12 text-base pl-8"
                      />
                    </div>
                    {parseFloat(rechargeForm.amount) > 0 &&
                      parseFloat(rechargeForm.amount) < 200 && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Minimum DTH recharge amount is ₹200
                        </p>
                      )}
                    {parseFloat(rechargeForm.amount) > 50000 && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Maximum recharge amount is ₹50,000 per transaction
                      </p>
                    )}
                    {parseFloat(rechargeForm.amount) >= 200 &&
                      parseFloat(rechargeForm.amount) <= 50000 && (
                        <p className="text-xs text-muted-foreground">
                          Recharging ₹{parseFloat(rechargeForm.amount).toLocaleString('en-IN')} to your DTH account
                        </p>
                      )}
                  </div>

                  {/* Information Box */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Important Information
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-disc list-inside ml-1">
                      <li>Ensure you have sufficient balance in your wallet</li>
                      <li>Recharge will be processed instantly upon confirmation</li>
                      <li>Double-check your customer ID before submitting</li>
                      <li>Completed transactions cannot be reversed or cancelled</li>
                      <li>Your DTH service will be activated within a few minutes</li>
                      <li>Contact support immediately if you face any issues</li>
                    </ul>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={
                      isLoading ||
                      !validateCustomerId(rechargeForm.customerId) ||
                      !rechargeForm.operatorCode ||
                      parseFloat(rechargeForm.amount) < 200 ||
                      parseFloat(rechargeForm.amount) > 50000
                    }
                    className="w-full paybazaar-gradient text-white hover:opacity-90 transition-opacity h-12 text-base font-medium disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing Your Recharge...
                      </span>
                    ) : (
                      <>
                        <Tv className="w-4 h-4 mr-2" />
                        Recharge ₹{rechargeForm.amount || '0'} Now
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Recharge History Card */}
            <Card className="shadow-lg border-border/50">
              <CardHeader className="paybazaar-gradient text-white rounded-t-xl space-y-1 pb-6">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xl">
                    <RefreshCw className="w-5 h-5" />
                    Recent Recharge History
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchRechargeHistory}
                    disabled={isLoadingHistory}
                    title="Refresh recharge history"
                  >
                    {isLoadingHistory ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                      </>
                    )}
                  </Button>
                </CardTitle>
                <p className="text-sm text-white/90">
                  View your last 10 DTH recharge transactions
                </p>
              </CardHeader>

              <CardContent className="pt-6">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Loading your recharge history...</p>
                  </div>
                ) : rechargeHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                      <Tv className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">
                      No Recharge History
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your DTH recharge transactions will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(rechargeHistory) && rechargeHistory.slice(0, 10).map((history) => (
                      <div
                        key={history.dth_transaction_id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-base font-mono">
                                {history.customer_id}
                              </p>
                              {getStatusBadge(history.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {history.operator_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(history.created_at).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">
                              ₹{history.amount.toLocaleString('en-IN')}
                            </p>
                            {history.commision > 0 && (
                              <p className="text-xs text-green-600 flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-3 h-3" />
                                +₹{history.commision.toFixed(2)} earned
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DTHRecharge;