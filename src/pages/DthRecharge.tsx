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
} from "lucide-react";
import axios from "axios";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { Badge } from "@/components/ui/badge";

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
  const [retailerId, setRetailerId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOperators, setIsLoadingOperators] = useState(true);
  const [operators, setOperators] = useState<Operator[]>([]);
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
    console.log("=== Extracting Retailer ID from JWT ===");
    const token = localStorage.getItem("authToken");
    
    if (!token) {
      console.error("No auth token found in localStorage");
      toast({
        title: "Authentication Error",
        description: "Please login again",
        variant: "destructive",
      });
      return;
    }

    console.log("Token found, decoding...");
    
    try {
      const decoded: JwtPayload = jwtDecode(token);
      console.log("Decoded JWT payload:", decoded);
      
      //@ts-ignore
      const userId =
        decoded.retailer_id || decoded.data?.user_id || decoded.user_id;

      console.log("Extracted user ID:", userId);

      if (!userId) {
        console.error("User ID not found in token payload");
        toast({
          title: "Error",
          description: "Unable to identify user. Please login again.",
          variant: "destructive",
        });
        return;
      }

      console.log("Setting retailer ID:", userId);
      setRetailerId(userId);
      console.log("Retailer ID set successfully");
    } catch (error) {
      console.error("=== JWT Decode Error ===");
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Session expired. Please login again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Fetch operators
  useEffect(() => {
    const fetchOperators = async () => {
      console.log("=== Fetching DTH Operators ===");
      setIsLoadingOperators(true);
      try {
        const url = `${API_BASE_URL}/dth_recharge/get/operators`;
        console.log("Fetching from URL:", url);
        console.log("Auth headers:", getAuthHeaders());

        const response = await axios.get(
          url,
          getAuthHeaders()
        );
        
        console.log("Operators API response:", response);
        console.log("Response status:", response.status);
        console.log("Response data:", response.data);
        
        // Backend returns: { status, message, data: { operators: [...] } }
        const operatorsData = response.data?.data?.operators || [];
        
        console.log("Extracted operators data:", operatorsData);
        console.log("Operators count:", operatorsData.length);
        
        if (!Array.isArray(operatorsData)) {
          console.error("Invalid response format - operators is not an array");
          throw new Error("Invalid response format");
        }
        
        console.log("Setting operators state with", operatorsData.length, "items");
        setOperators(operatorsData);
        console.log("Operators loaded successfully");
      } catch (error: any) {
        console.error("=== Error Fetching Operators ===");
        console.error("Error object:", error);
        console.error("Error response:", error.response);
        console.error("Error response data:", error.response?.data);
        console.error("Error message:", error.message);
        
        setOperators([]); // Set to empty array on error
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to load operators",
          variant: "destructive",
        });
      } finally {
        console.log("=== Operators Fetch Completed ===");
        setIsLoadingOperators(false);
      }
    };

    fetchOperators();
  }, [toast]);

  // Fetch recharge history
  const fetchRechargeHistory = async () => {
    if (!retailerId) {
      console.log("Skipping history fetch - no retailer ID");
      return;
    }

    console.log("=== Fetching DTH Recharge History ===");
    console.log("Retailer ID:", retailerId);
    setIsLoadingHistory(true);
    
    try {
      const url = `${API_BASE_URL}/dth_recharge/get/${retailerId}`;
      console.log("Fetching from URL:", url);
      console.log("Auth headers:", getAuthHeaders());

      const response = await axios.get(
        url,
        getAuthHeaders()
      );
      
      console.log("History API response:", response);
      console.log("Response status:", response.status);
      console.log("Response data:", response.data);
      
      // Backend returns: { status, message, data: { recharges: [...] } }
      const historyData = response.data?.data?.recharges || [];
      
      console.log("Extracted history data:", historyData);
      console.log("History records count:", historyData.length);
      
      if (!Array.isArray(historyData)) {
        console.error("Invalid response format - recharges is not an array");
        throw new Error("Invalid response format");
      }
      
      console.log("Setting recharge history state with", historyData.length, "items");
      setRechargeHistory(historyData);
      console.log("History loaded successfully");
    } catch (error: any) {
      console.error("=== Error Fetching Recharge History ===");
      console.error("Error object:", error);
      console.error("Error response:", error.response);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);
      console.error("Error message:", error.message);
      
      setRechargeHistory([]); // Set to empty array on error
      
      // Only show toast if it's not a "no data" error
      if (error.response?.status !== 404) {
        console.log("Showing error toast (not 404)");
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to load recharge history",
          variant: "destructive",
        });
      } else {
        console.log("404 error - no history data available (not showing toast)");
      }
    } finally {
      console.log("=== Recharge History Fetch Completed ===");
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
    console.log("=== Operator Changed ===");
    console.log("Selected operator code:", value);
    
    const selectedOperator = operators.find(
      (op) => op.operator_code === value
    );
    
    console.log("Found operator:", selectedOperator);
    
    if (selectedOperator) {
      console.log("Updating form with operator:", {
        operatorCode: value,
        operatorName: selectedOperator.operator_name
      });
      
      setRechargeForm({
        ...rechargeForm,
        operatorCode: value,
        operatorName: selectedOperator.operator_name,
      });
    } else {
      console.warn("Operator not found in list");
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
    console.log("=== DTH Recharge Submission Started ===");

    if (!retailerId) {
      console.error("Retailer ID not found");
      toast({
        title: "Error",
        description: "User ID not found. Please login again.",
        variant: "destructive",
      });
      return;
    }

    console.log("Retailer ID:", retailerId);
    console.log("Form data:", rechargeForm);

    // Validation
    if (!validateCustomerId(rechargeForm.customerId)) {
      console.error("Invalid customer ID:", rechargeForm.customerId);
      toast({
        title: "Invalid Customer ID",
        description: "Please enter a valid DTH customer ID (8-12 digits)",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(rechargeForm.amount);
    if (isNaN(amount) || amount <= 0) {
      console.error("Invalid amount:", rechargeForm.amount);
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (amount < 200) {
      console.error("Amount too low:", amount);
      toast({
        title: "Amount Too Low",
        description: "Minimum recharge amount is ₹200",
        variant: "destructive",
      });
      return;
    }

    console.log("Validation passed");
    setIsLoading(true);

    try {
      const requestBody = {
        retailer_id: retailerId,
        customer_id: rechargeForm.customerId,
        operator_name: rechargeForm.operatorName,
        operator_code: parseInt(rechargeForm.operatorCode),
        amount: amount,
      };

      console.log("Request URL:", `${API_BASE_URL}/dth_recharge/create`);
      console.log("Request body:", requestBody);
      console.log("Request headers:", getAuthHeaders());

      const response = await axios.post(
        `${API_BASE_URL}/dth_recharge/create`,
        requestBody,
        getAuthHeaders()
      );

      console.log("Response status:", response.status);
      console.log("Response data:", response.data);

      // Backend returns: { status: "success", message: "dth recharge successfull" }
      if (response.status === 200 || response.status === 201) {
        const responseMessage = response.data?.message || "DTH recharge initiated successfully";
        
        console.log("Recharge successful:", responseMessage);
        
        toast({
          title: "Success",
          description: responseMessage,
        });

        // Reset form
        console.log("Resetting form");
        setRechargeForm({
          customerId: "",
          operatorCode: "",
          operatorName: "",
          amount: "",
        });

        // Refresh history
        console.log("Refreshing recharge history");
        fetchRechargeHistory();
      }
    } catch (error: any) {
      console.error("=== DTH Recharge Error ===");
      console.error("Error object:", error);
      console.error("Error response:", error.response);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);
      console.error("Error message:", error.message);

      let errorMessage = "Failed to process recharge. Please try again.";

      // Backend error format: { status: "failed", message: "error message" }
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        console.error("Backend error message:", errorMessage);
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid request data";
        console.error("Bad request (400)");
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
        console.error("Unauthorized (401)");
      } else if (error.response?.status === 402) {
        errorMessage = "Insufficient balance";
        console.error("Payment required (402)");
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      console.log("=== DTH Recharge Submission Ended ===");
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
            {/* DTH Recharge Card */}
            <Card className="shadow-lg border-border/50">
              <CardHeader className="paybazaar-gradient text-white rounded-t-xl space-y-1 pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Tv className="w-5 h-5" />
                  DTH Recharge
                </CardTitle>
                <p className="text-sm text-white/90">
                  Quick and easy DTH recharge for all operators
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
                      DTH Customer ID <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customerId"
                      type="text"
                      placeholder="Enter DTH customer ID"
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
                        <p className="text-xs text-amber-600">
                          Enter complete customer ID (minimum 8 digits)
                        </p>
                      )}
                    {rechargeForm.customerId.length >= 8 &&
                      !validateCustomerId(rechargeForm.customerId) && (
                        <p className="text-xs text-red-600">
                          Invalid customer ID format
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
                        <SelectValue placeholder={isLoadingOperators ? "Loading operators..." : "Select DTH operator"} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingOperators ? (
                          <SelectItem value="loading" disabled>
                            Loading operators...
                          </SelectItem>
                        ) : Array.isArray(operators) && operators.length > 0 ? (
                          operators.map((operator) => (
                            <SelectItem
                              key={operator.operator_code}
                              value={operator.operator_code}
                            >
                              {operator.operator_name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-operators" disabled>
                            No operators available
                          </SelectItem>
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
                      Amount <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        ₹
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={rechargeForm.amount}
                        onChange={(e) =>
                          setRechargeForm({
                            ...rechargeForm,
                            amount: e.target.value,
                          })
                        }
                        min="200"
                        step="1"
                        required
                        disabled={isLoading}
                        className="h-12 text-base pl-8"
                      />
                    </div>
                    {parseFloat(rechargeForm.amount) > 0 &&
                      parseFloat(rechargeForm.amount) < 200 && (
                        <p className="text-xs text-amber-600">
                          Minimum recharge amount is ₹200
                        </p>
                      )}
                  </div>

                  {/* Information Box */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Important Information:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Ensure you have sufficient balance in your account</li>
                      <li>Recharge will be processed instantly</li>
                      <li>Check your customer ID carefully before submitting</li>
                      <li>Transaction once done cannot be reversed</li>
                      <li>For any issues, contact support immediately</li>
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
                      parseFloat(rechargeForm.amount) < 10
                    }
                    className="w-full paybazaar-gradient text-white hover:opacity-90 transition-opacity h-12 text-base font-medium disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing Recharge...
                      </span>
                    ) : (
                      <>
                        <Tv className="w-4 h-4 mr-2" />
                        Recharge Now
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
                  >
                    {isLoadingHistory ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-6">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : rechargeHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tv className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No recharge history found</p>
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
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-base">
                                {history.customer_id}
                              </p>
                              {getStatusBadge(history.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {history.operator_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(history.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">
                              ₹{history.amount.toFixed(2)}
                            </p>
                            {history.commision > 0 && (
                              <p className="text-xs text-green-600">
                                Commission: ₹{history.commision.toFixed(2)}
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