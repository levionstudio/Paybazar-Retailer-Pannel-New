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
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import axios from "axios";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  operator_code: number;
  operator_name: string;
}

interface BillFetchResponse {
  error: number;
  msg: string;
  status: number;
  billAmount: any;
}

interface BillDetails {
  billAmount: string;
  billDate: string;
  consumerId: string;
  consumerName: string;
  dueDate: string;
}

interface PaymentHistory {
  electricity_transaction_id: number;
  retailer_id: string;
  customer_id: string;
  customer_email: string;
  operator_name: string;
  operator_code: string;
  amount: number;
  partner_request_id: string;
  status: string;
  created_at: string;
  commission: number;
}

const ElectricityBillPayment = () => {
  const { toast } = useToast();
  const [retailerId, setRetailerId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOperators, setIsLoadingOperators] = useState(true);
  const [isFetchingBill, setIsFetchingBill] = useState(false);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [billAmount, setBillAmount] = useState<number | null>(null);
  const [billDetails, setBillDetails] = useState<BillDetails | null>(null);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    customerId: "",
    customerEmail: "",
    operatorCode: "",
    operatorName: "",
    amount: "",
  });

  // Extract retailer ID from JWT token
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please login again",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const decoded: JwtPayload = jwtDecode(token);
      
      //@ts-ignore
      const userId =
        decoded.retailer_id || decoded.data?.user_id || decoded.user_id;

      if (!userId) {
        toast({
          title: "Error",
          description: "Unable to identify user. Please login again.",
          variant: "destructive",
        });
        return;
      }

      setRetailerId(userId);
    } catch (error) {
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
      setIsLoadingOperators(true);
      try {
        const url = `${API_BASE_URL}/bbps/get/electricity/operators`;
        const response = await axios.get(url, getAuthHeaders());
        
        const operatorsData = response.data?.data?.operators || [];
        
        if (!Array.isArray(operatorsData)) {
          throw new Error("Invalid response format");
        }
        
        setOperators(operatorsData);
      } catch (error: any) {
        setOperators([]);
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to load operators",
          variant: "destructive",
        });
      } finally {
        setIsLoadingOperators(false);
      }
    };

    fetchOperators();
  }, [toast]);

  // Fetch payment history
  const fetchPaymentHistory = async () => {
    if (!retailerId) {
      return;
    }

    setIsLoadingHistory(true);
    
    try {
      const url = `${API_BASE_URL}/bbps/get/electricity/${retailerId}`;
      const response = await axios.get(url, getAuthHeaders());
      
      const historyData = response.data?.data?.payments || [];
      
      if (!Array.isArray(historyData)) {
        throw new Error("Invalid response format");
      }
      
      setPaymentHistory(historyData);
    } catch (error: any) {
      setPaymentHistory([]);
      
      if (error.response?.status !== 404) {
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to load payment history",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (retailerId) {
      fetchPaymentHistory();
    }
  }, [retailerId]);

  // Handle operator change
  const handleOperatorChange = (value: string) => {
    const selectedOperator = operators.find(
      (op) => op.operator_code.toString() === value
    );
    
    if (selectedOperator) {
      setPaymentForm({
        ...paymentForm,
        operatorCode: value,
        operatorName: selectedOperator.operator_name,
      });
      
      // Reset bill amount and details when operator changes
      setBillAmount(null);
      setBillDetails(null);
    }
  };

  // Validate customer ID
  const validateCustomerId = (id: string): boolean => {
    // Electricity customer IDs vary by operator, typically 8-15 alphanumeric characters
    return id.length >= 6 && id.length <= 20;
  };

  // Validate email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Fetch bill amount
  const handleFetchBill = async () => {
    if (!validateCustomerId(paymentForm.customerId)) {
      toast({
        title: "Invalid Customer ID",
        description: "Please enter a valid customer ID",
        variant: "destructive",
      });
      return;
    }

    if (!paymentForm.operatorCode) {
      toast({
        title: "Select Operator",
        description: "Please select an electricity operator",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingBill(true);
    setBillAmount(null);
    setBillDetails(null);

    try {
      const requestBody = {
        customer_id: paymentForm.customerId,
        operator_code: parseInt(paymentForm.operatorCode),
      };

      const response = await axios.post(
        `${API_BASE_URL}/bbps/get/electricity/balance`,
        requestBody,
        getAuthHeaders()
      );

      const apiResponse = response.data?.data?.response;

      if (apiResponse?.status === 1 && apiResponse?.billAmount) {
        const billData = apiResponse.billAmount;
        const amount = parseFloat(billData.billAmount);
        
        // Set bill amount and details
        setBillAmount(amount);
        setBillDetails({
          billAmount: billData.billAmount,
          billDate: billData.billDate || "",
          consumerId: billData.consumerId || paymentForm.customerId,
          consumerName: billData.consumerName || "",
          dueDate: billData.dueDate || "",
        });
        
        // Update form amount
        setPaymentForm({
          ...paymentForm,
          amount: amount.toString(),
        });
        
        // Show dialog with bill details
        setIsBillDialogOpen(true);
        
        toast({
          title: "Bill Fetched Successfully",
          description: `Bill amount: ₹${amount.toFixed(2)}`,
        });
      } else {
        toast({
          title: "Bill Not Found",
          description: apiResponse?.msg || "Unable to fetch bill amount",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      let errorMessage = "Failed to fetch bill";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.data?.response?.msg) {
        errorMessage = error.response.data.data.response.msg;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsFetchingBill(false);
    }
  };

  // Handle payment submission
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("=== Electricity Bill Payment Submission Started ===");

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
    console.log("Form data:", paymentForm);

    // Validation
    if (!validateCustomerId(paymentForm.customerId)) {
      console.error("Invalid customer ID:", paymentForm.customerId);
      toast({
        title: "Invalid Customer ID",
        description: "Please enter a valid customer ID",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(paymentForm.customerEmail)) {
      console.error("Invalid email:", paymentForm.customerEmail);
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      console.error("Invalid amount:", paymentForm.amount);
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    console.log("Validation passed");
    setIsLoading(true);

    try {
      const requestBody = {
        retailer_id: retailerId,
        customer_id: paymentForm.customerId,
        customer_email: paymentForm.customerEmail,
        operator_name: paymentForm.operatorName,
        operator_code: parseInt(paymentForm.operatorCode),
        amount: amount,
      };

      console.log("Request URL:", `${API_BASE_URL}/bbps/create/electricity`);
      console.log("Request body:", requestBody);
      console.log("Request headers:", getAuthHeaders());

      const response = await axios.post(
        `${API_BASE_URL}/bbps/create/electricity`,
        requestBody,
        getAuthHeaders()
      );

      console.log("Response status:", response.status);
      console.log("Response data:", response.data);

      // Backend returns: { status: "success", message: "electricity bill paid successfully" }
      if (response.status === 200 || response.status === 201) {
        const responseMessage = response.data?.message || "Electricity bill paid successfully";
        
        console.log("Payment successful:", responseMessage);
        
        toast({
          title: "Success",
          description: responseMessage,
        });

        // Reset form
        console.log("Resetting form");
        setPaymentForm({
          customerId: "",
          customerEmail: "",
          operatorCode: "",
          operatorName: "",
          amount: "",
        });
        setBillAmount(null);
        setBillDetails(null);

        // Refresh history
        console.log("Refreshing payment history");
        fetchPaymentHistory();
      }
    } catch (error: any) {
      console.error("=== Electricity Bill Payment Error ===");
      console.error("Error object:", error);
      console.error("Error response:", error.response);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);
      console.error("Error message:", error.message);

      let errorMessage = "Failed to process payment. Please try again.";

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
      console.log("=== Electricity Bill Payment Submission Ended ===");
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
            {/* Electricity Bill Payment Card */}
            <Card className="shadow-lg border-border/50">
              <CardHeader className="paybazaar-gradient text-white rounded-t-xl space-y-1 pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Zap className="w-5 h-5" />
                  Electricity Bill Payment
                </CardTitle>
                <p className="text-sm text-white/90">
                  Pay your electricity bills instantly for all operators
                </p>
              </CardHeader>

              <CardContent className="pt-6 pb-8 px-6">
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {/* Customer ID */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="customerId"
                      className="text-sm font-medium text-foreground"
                    >
                      Customer ID / Consumer Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customerId"
                      type="text"
                      placeholder="Enter customer ID or consumer number"
                      value={paymentForm.customerId}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        if (value.length <= 20) {
                          setPaymentForm({
                            ...paymentForm,
                            customerId: value,
                          });
                          // Reset bill amount and details when customer ID changes
                          setBillAmount(null);
                          setBillDetails(null);
                        }
                      }}
                      maxLength={20}
                      required
                      disabled={isLoading}
                      className="h-12 text-base"
                    />
                    {paymentForm.customerId.length > 0 &&
                      paymentForm.customerId.length < 6 && (
                        <p className="text-xs text-amber-600">
                          Enter complete customer ID (minimum 6 characters)
                        </p>
                      )}
                  </div>

                  {/* Operator */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="operator"
                      className="text-sm font-medium text-foreground"
                    >
                      Electricity Operator <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={paymentForm.operatorCode}
                      onValueChange={handleOperatorChange}
                      disabled={isLoading || isLoadingOperators}
                      required
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder={isLoadingOperators ? "Loading operators..." : "Select electricity operator"} />
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
                              value={operator.operator_code.toString()}
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

                  {/* Fetch Bill Button */}
                  {paymentForm.customerId && paymentForm.operatorCode && (
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleFetchBill}
                        disabled={isFetchingBill || isLoading}
                        className="w-full h-12"
                      >
                        {isFetchingBill ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Fetching Bill...
                          </span>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Fetch Bill Amount
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Bill Amount Display */}
                  {billAmount !== null && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          Bill Amount:
                        </span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ₹{billAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Customer Email */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="customerEmail"
                      className="text-sm font-medium text-foreground"
                    >
                      Customer Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      placeholder="Enter customer email"
                      value={paymentForm.customerEmail}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          customerEmail: e.target.value,
                        })
                      }
                      required
                      disabled={isLoading}
                      className="h-12 text-base"
                    />
                    {paymentForm.customerEmail.length > 0 &&
                      !validateEmail(paymentForm.customerEmail) && (
                        <p className="text-xs text-red-600">
                          Please enter a valid email address
                        </p>
                      )}
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
                        value={paymentForm.amount}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            amount: e.target.value,
                          })
                        }
                        min="1"
                        step="0.01"
                        required
                        disabled={isLoading}
                        className="h-12 text-base pl-8"
                      />
                    </div>
                  </div>

                  {/* Information Box */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Important Information:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Ensure you have sufficient balance in your account</li>
                      <li>Payment will be processed instantly</li>
                      <li>Verify customer ID and operator before submitting</li>
                      <li>Transaction once done cannot be reversed</li>
                      <li>You will receive a confirmation email after payment</li>
                      <li>For any issues, contact support immediately</li>
                    </ul>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={
                      isLoading ||
                      !validateCustomerId(paymentForm.customerId) ||
                      !validateEmail(paymentForm.customerEmail) ||
                      !paymentForm.operatorCode ||
                      parseFloat(paymentForm.amount) <= 0
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
                        Processing Payment...
                      </span>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Pay Bill Now
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Payment History Card */}
            <Card className="shadow-lg border-border/50">
              <CardHeader className="paybazaar-gradient text-white rounded-t-xl space-y-1 pb-6">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xl">
                    <RefreshCw className="w-5 h-5" />
                    Recent Payment History
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchPaymentHistory}
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
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No payment history found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(paymentHistory) && paymentHistory.slice(0, 10).map((history) => (
                      <div
                        key={history.electricity_transaction_id}
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
                              {history.customer_email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(history.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">
                              ₹{history.amount.toFixed(2)}
                            </p>
                            {history.commission > 0 && (
                              <p className="text-xs text-green-600">
                                Commission: ₹{history.commission.toFixed(2)}
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

      {/* Bill Details Dialog */}
      <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Bill Details Fetched
            </DialogTitle>
            <DialogDescription>
              Review your electricity bill details below
            </DialogDescription>
          </DialogHeader>
          
          {billDetails && (
            <div className="space-y-4 py-4">
              {/* Bill Amount - Highlighted */}
              <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    Bill Amount
                  </span>
                  <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ₹{parseFloat(billDetails.billAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Other Details */}
              <div className="space-y-3">
                {billDetails.consumerName && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium text-muted-foreground">
                      Consumer Name
                    </span>
                    <span className="text-sm font-semibold">
                      {billDetails.consumerName}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-muted-foreground">
                    Consumer ID
                  </span>
                  <span className="text-sm font-semibold font-mono">
                    {billDetails.consumerId}
                  </span>
                </div>

                {billDetails.billDate && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium text-muted-foreground">
                      Bill Date
                    </span>
                    <span className="text-sm font-semibold">
                      {billDetails.billDate}
                    </span>
                  </div>
                )}

                {billDetails.dueDate && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium text-muted-foreground">
                      Due Date
                    </span>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {new Date(billDetails.dueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsBillDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setIsBillDialogOpen(false);
                    // Scroll to amount field
                    document.getElementById("amount")?.focus();
                  }}
                  className="flex-1 paybazaar-gradient text-white"
                >
                  Proceed to Pay
                </Button>
              </div>

              {/* Info Note */}
              <p className="text-xs text-center text-muted-foreground pt-2">
                The bill amount has been automatically filled in the payment form
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ElectricityBillPayment;